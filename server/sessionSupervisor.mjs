import pty from 'node-pty';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const DEFAULT_CMD = process.env.CODEX_CMD || 'codex';
const DEFAULT_ARGS_RAW = process.env.CODEX_ARGS || 'run';
const DEFAULT_COLS = Number.parseInt(process.env.CODEX_PTY_COLS || '120', 10);
const DEFAULT_ROWS = Number.parseInt(process.env.CODEX_PTY_ROWS || '30', 10);
const DEFAULT_CWD = process.cwd();
const DEFAULT_SHELL = process.env.CODEX_SHELL
  || process.env.SHELL
  || (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh');

function parseArgs(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(' ').filter(Boolean);
}

function replaceTokens(value, replacements) {
  return value.replace(/\{(\w+)\}/g, (_, key) => {
    const replacement = replacements[key];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

function resolveExecutable(command, args) {
  if (!command || typeof command !== 'string') {
    return { cmd: command, args };
  }

  if (!command.includes(path.sep)) {
    return { cmd: command, args };
  }

  try {
    const resolved = fs.realpathSync(command);
    const ext = path.extname(resolved).toLowerCase();
    if (['.js', '.mjs', '.cjs'].includes(ext)) {
      return {
        cmd: process.execPath,
        args: [resolved, ...args],
      };
    }
  } catch {
    // Fall through to original command.
  }

  return { cmd: command, args };
}

function createRunId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createSessionSupervisor({ onEvent, logger } = {}) {
  const sessions = new Map();
  const baseArgs = parseArgs(DEFAULT_ARGS_RAW);

  function emit(message) {
    if (typeof onEvent === 'function') {
      onEvent(message);
    }
  }

  function buildCommand({ prompt, repoPath, sessionId, profile }) {
    const replacements = { prompt, repoPath, sessionId, profile };
    const args = baseArgs.map((arg) => replaceTokens(arg, replacements));
    const usesPrompt = baseArgs.some((arg) => arg.includes('{prompt}'));
    return {
      cmd: DEFAULT_CMD || DEFAULT_SHELL,
      args: args.length > 0 ? args : [],
      usesPrompt,
    };
  }

  function startSession({ sessionId, repoPath, prompt, templateId, profile } = {}) {
    if (!sessionId) {
      throw new Error('sessionId is required to start a session.');
    }

    const existing = sessions.get(sessionId);
    if (existing && existing.status === 'running') {
      return existing;
    }

    const runId = createRunId();
    const cwd = repoPath || DEFAULT_CWD;
    try {
      const stat = fs.statSync(cwd);
      if (!stat.isDirectory()) {
        throw new Error();
      }
    } catch {
      throw new Error(`Repo path not found or not a directory: ${cwd}`);
    }
    const { cmd, args, usesPrompt } = buildCommand({
      prompt,
      repoPath: cwd,
      sessionId,
      profile,
    });
    const spawnSpec = resolveExecutable(cmd, args);
    if (spawnSpec.cmd && typeof spawnSpec.cmd === 'string' && spawnSpec.cmd.includes(path.sep)) {
      try {
        fs.accessSync(spawnSpec.cmd, fs.constants.X_OK);
      } catch {
        throw new Error(`Command is not executable: ${spawnSpec.cmd}`);
      }
    }

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(spawnSpec.cmd, spawnSpec.args, {
        name: 'xterm-color',
        cols: Number.isFinite(DEFAULT_COLS) ? DEFAULT_COLS : 120,
        rows: Number.isFinite(DEFAULT_ROWS) ? DEFAULT_ROWS : 30,
        cwd,
        env: { ...process.env },
      });
    } catch (error) {
      const message = error?.message || 'Failed to spawn Codex session.';
      emit({
        type: 'session.update',
        sessionId,
        status: 'error',
        runId,
        error: message,
      });
      throw new Error(message);
    }

    const session = {
      id: sessionId,
      repoPath: cwd,
      status: 'running',
      runId,
      prompt: prompt || '',
      templateId: templateId || null,
      profile: profile || null,
      pty: ptyProcess,
      pid: ptyProcess.pid,
      startedAt: nowIso(),
      lastActiveAt: nowIso(),
    };

    sessions.set(sessionId, session);

    emit({
      type: 'session.update',
      sessionId,
      status: 'running',
      runId,
      taskCount: 0,
    });

    emit({
      type: 'run.status',
      runId,
      status: 'running',
    });

    ptyProcess.onData((data) => {
      session.lastActiveAt = nowIso();
      emit({
        type: 'run.output',
        runId,
        entry: {
          type: 'log',
          level: 'info',
          message: data,
          timestamp: nowIso(),
        },
      });
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      const status = exitCode === 0 ? 'done' : 'error';
      session.status = status;
      emit({
        type: 'run.status',
        runId,
        status,
      });
      emit({
        type: 'session.update',
        sessionId,
        status,
        runId,
        lastExitCode: exitCode ?? null,
        lastSignal: signal ?? null,
      });
      sessions.delete(sessionId);
    });

    if (prompt && !usesPrompt) {
      setTimeout(() => {
        try {
          ptyProcess.write(`${prompt}\n`);
        } catch {
          // Ignore write failures.
        }
      }, 100);
    }

    logger?.info?.({ sessionId, runId, cmd: spawnSpec.cmd, args: spawnSpec.args }, 'Session started');
    return session;
  }

  function pauseSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    if (session.status !== 'running') return session;
    try {
      process.kill(session.pid, 'SIGSTOP');
    } catch (error) {
      logger?.warn?.({ error }, 'Failed to pause session');
    }
    session.status = 'paused';
    emit({ type: 'run.status', runId: session.runId, status: 'paused' });
    emit({ type: 'session.update', sessionId, status: 'paused', runId: session.runId });
    return session;
  }

  function resumeSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    if (session.status !== 'paused') return session;
    try {
      process.kill(session.pid, 'SIGCONT');
    } catch (error) {
      logger?.warn?.({ error }, 'Failed to resume session');
    }
    session.status = 'running';
    emit({ type: 'run.status', runId: session.runId, status: 'running' });
    emit({ type: 'session.update', sessionId, status: 'running', runId: session.runId });
    return session;
  }

  function stopSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    try {
      session.pty.kill();
    } catch (error) {
      logger?.warn?.({ error }, 'Failed to stop session');
    }
    session.status = 'blocked';
    emit({ type: 'run.status', runId: session.runId, status: 'blocked' });
    emit({ type: 'session.update', sessionId, status: 'blocked', runId: session.runId });
    return session;
  }

  function getSessionState(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        status: 'idle',
        runId: null,
        taskCount: 0,
        updatedAt: nowIso(),
      };
    }
    return {
      sessionId,
      status: session.status,
      runId: session.runId,
      taskCount: 0,
      updatedAt: session.lastActiveAt,
    };
  }

  return {
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    getSessionState,
  };
}

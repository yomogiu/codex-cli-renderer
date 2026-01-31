import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const DEFAULT_CMD = process.env.CODEX_APP_SERVER_CMD || process.env.CODEX_CMD || 'codex';
const DEFAULT_ARGS_RAW = process.env.CODEX_APP_SERVER_ARGS || 'app-server';
const AUTO_RESTART = (process.env.CODEX_APP_SERVER_AUTO_RESTART || 'true') !== 'false';
const RESTART_DELAY_MS = Number.parseInt(process.env.CODEX_APP_SERVER_RESTART_MS || '3000', 10);
const DEFAULT_CWD = process.cwd();

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

function nowIso() {
  return new Date().toISOString();
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
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

export function createCodexBridge({ onEvent, logger } = {}) {
  const args = parseArgs(DEFAULT_ARGS_RAW);
  const processes = new Map();

  function emit(event) {
    if (typeof onEvent === 'function') {
      onEvent(event);
    }
  }

  function formatEvent(payload, sessionId, fallback = {}) {
    const resolvedSessionId = pickFirst(
      payload?.sessionId,
      payload?.repoId,
      payload?.params?.sessionId,
      payload?.params?.repoId,
      sessionId
    );
    const runId = pickFirst(
      payload?.runId,
      payload?.params?.runId,
      payload?.params?.run_id
    );
    const eventType = pickFirst(payload?.eventType, payload?.method, payload?.type, fallback.eventType, 'event');
    const message = pickFirst(payload?.message, payload?.params?.message, fallback.message);

    return {
      type: 'codex.event',
      sessionId: resolvedSessionId || sessionId,
      runId,
      eventType,
      message: message || '',
      payload,
      timestamp: payload?.timestamp || nowIso(),
    };
  }

  function handleLine(line, source, sessionId) {
    if (!line) return;
    let payload = null;
    try {
      payload = JSON.parse(line);
    } catch {
      payload = { raw: line, source };
    }
    const event = formatEvent(payload, sessionId, {
      eventType: source === 'stderr' ? 'stderr' : 'raw',
      message: typeof line === 'string' ? line : '',
    });
    emit(event);
  }

  function attachStream(stream, source, sessionId) {
    if (!stream) return null;
    const rl = readline.createInterface({ input: stream });
    rl.on('line', (line) => handleLine(line, source, sessionId));
    rl.on('close', () => {
      rl.removeAllListeners();
    });
    return rl;
  }

  function scheduleRestart(sessionId) {
    if (!AUTO_RESTART) return;
    const existing = processes.get(sessionId);
    if (!existing) return;
    clearTimeout(existing.restartTimer);
    existing.restartTimer = setTimeout(() => {
      const current = processes.get(sessionId);
      if (!current || current.child) return;
      startSession({ sessionId, repoPath: current.repoPath });
    }, RESTART_DELAY_MS);
  }

  function startSession({ sessionId, repoPath } = {}) {
    if (!sessionId) {
      throw new Error('sessionId is required to start Codex app-server.');
    }

    const existing = processes.get(sessionId);
    if (existing?.child) {
      return existing;
    }

    const cwd = repoPath || existing?.repoPath || DEFAULT_CWD;
    const entry = existing || { child: null, repoPath: cwd, restartTimer: null };
    entry.repoPath = cwd;
    processes.set(sessionId, entry);

    const spawnSpec = resolveExecutable(DEFAULT_CMD, args);
    try {
      entry.child = spawn(spawnSpec.cmd, spawnSpec.args, {
        env: { ...process.env },
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      logger?.error?.({ error, sessionId }, 'Failed to start Codex app-server');
      entry.child = null;
      scheduleRestart(sessionId);
      return entry;
    }

    const stdoutRl = attachStream(entry.child.stdout, 'stdout', sessionId);
    const stderrRl = attachStream(entry.child.stderr, 'stderr', sessionId);

    entry.child.on('error', (error) => {
      logger?.error?.({ error, sessionId }, 'Codex app-server failed to start');
      stdoutRl?.close();
      stderrRl?.close();
      entry.child = null;
      scheduleRestart(sessionId);
    });

    entry.child.on('exit', (code, signal) => {
      logger?.warn?.({ code, signal, sessionId }, 'Codex app-server exited');
      stdoutRl?.close();
      stderrRl?.close();
      entry.child = null;
      scheduleRestart(sessionId);
    });

    logger?.info?.({ cmd: spawnSpec.cmd, args: spawnSpec.args, sessionId, cwd }, 'Codex app-server bridge started');
    return entry;
  }

  function stopSession(sessionId) {
    const entry = processes.get(sessionId);
    if (!entry) return;
    if (entry.restartTimer) {
      clearTimeout(entry.restartTimer);
      entry.restartTimer = null;
    }
    if (entry.child) {
      entry.child.kill();
      entry.child = null;
    }
  }

  function stopAll() {
    for (const sessionId of processes.keys()) {
      stopSession(sessionId);
    }
    processes.clear();
  }

  function isRunning(sessionId) {
    if (!sessionId) return false;
    return Boolean(processes.get(sessionId)?.child);
  }

  function isAnyRunning() {
    for (const entry of processes.values()) {
      if (entry.child) return true;
    }
    return false;
  }

  return {
    startSession,
    stopSession,
    stopAll,
    isRunning,
    isAnyRunning,
  };
}

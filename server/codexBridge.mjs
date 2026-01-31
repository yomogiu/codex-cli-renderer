import { spawn } from 'child_process';
import readline from 'readline';

const DEFAULT_CMD = process.env.CODEX_APP_SERVER_CMD || process.env.CODEX_CMD || 'codex';
const DEFAULT_ARGS_RAW = process.env.CODEX_APP_SERVER_ARGS || 'app-server';
const AUTO_RESTART = (process.env.CODEX_APP_SERVER_AUTO_RESTART || 'true') !== 'false';
const RESTART_DELAY_MS = Number.parseInt(process.env.CODEX_APP_SERVER_RESTART_MS || '3000', 10);
const DEFAULT_SESSION_ID = process.env.CODEX_SESSION_ID || 'default-session';

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

export function createCodexBridge({ onEvent, logger } = {}) {
  let child = null;
  let restartTimer = null;
  const args = parseArgs(DEFAULT_ARGS_RAW);

  function emit(event) {
    if (typeof onEvent === 'function') {
      onEvent(event);
    }
  }

  function formatEvent(payload, fallback = {}) {
    const sessionId = pickFirst(
      payload?.sessionId,
      payload?.repoId,
      payload?.params?.sessionId,
      payload?.params?.repoId,
      DEFAULT_SESSION_ID
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
      sessionId,
      runId,
      eventType,
      message: message || '',
      payload,
      timestamp: payload?.timestamp || nowIso(),
    };
  }

  function handleLine(line, source = 'stdout') {
    if (!line) return;
    let payload = null;
    try {
      payload = JSON.parse(line);
    } catch {
      payload = { raw: line, source };
    }
    const event = formatEvent(payload, {
      eventType: source === 'stderr' ? 'stderr' : 'raw',
      message: typeof line === 'string' ? line : '',
    });
    emit(event);
  }

  function attachStream(stream, source) {
    if (!stream) return;
    const rl = readline.createInterface({ input: stream });
    rl.on('line', (line) => handleLine(line, source));
    rl.on('close', () => {
      rl.removeAllListeners();
    });
  }

  function start() {
    if (child) return;
    try {
      child = spawn(DEFAULT_CMD, args, {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to start Codex app-server');
      if (AUTO_RESTART) {
        restartTimer = setTimeout(() => {
          child = null;
          start();
        }, RESTART_DELAY_MS);
      }
      return;
    }

    attachStream(child.stdout, 'stdout');
    attachStream(child.stderr, 'stderr');

    child.on('error', (error) => {
      logger?.error?.({ error }, 'Codex app-server failed to start');
      child = null;
      if (AUTO_RESTART) {
        restartTimer = setTimeout(() => start(), RESTART_DELAY_MS);
      }
    });

    child.on('exit', (code, signal) => {
      logger?.warn?.({ code, signal }, 'Codex app-server exited');
      child = null;
      if (AUTO_RESTART) {
        restartTimer = setTimeout(() => start(), RESTART_DELAY_MS);
      }
    });

    logger?.info?.({ cmd: DEFAULT_CMD, args }, 'Codex app-server bridge started');
  }

  function stop() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (child) {
      child.kill();
      child = null;
    }
  }

  return {
    start,
    stop,
    isRunning: () => Boolean(child),
  };
}

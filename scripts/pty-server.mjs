import http from 'http';
import fs from 'fs';
import path from 'path';
import pty from 'node-pty';
import { WebSocketServer } from 'ws';

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.PTY_WS_PORT || '8081', 10);
const TOKEN = process.env.PTY_TOKEN;
const ALLOWED_ORIGINS = (process.env.PTY_ALLOWED_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const IDLE_TIMEOUT_MS = Number.parseInt(process.env.PTY_IDLE_TIMEOUT_MS || '300000', 10);
const FLUSH_INTERVAL_MS = Number.parseInt(process.env.PTY_FLUSH_INTERVAL_MS || '33', 10);
const MAX_BUFFERED_AMOUNT = Number.parseInt(process.env.PTY_MAX_BUFFERED_AMOUNT || '2000000', 10);
const DEFAULT_CWD = process.cwd();
const DEFAULT_SHELL = process.env.PTY_SHELL
  || process.env.SHELL
  || (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh');

if (!TOKEN) {
  console.error('PTY_TOKEN is required.');
  process.exit(1);
}

if (ALLOWED_ORIGINS.length === 0) {
  console.error('PTY_ALLOWED_ORIGIN is required (comma-separated list if multiple).');
  process.exit(1);
}

const sessions = new Map();

function resolveRepoCwd(repoPath) {
  if (!repoPath) {
    return { cwd: DEFAULT_CWD, key: DEFAULT_CWD };
  }

  const resolved = path.resolve(repoPath);
  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return { cwd: resolved, key: resolved };
    }
  } catch {
    // Ignore invalid paths and fall back to app root.
  }

  return { cwd: DEFAULT_CWD, key: DEFAULT_CWD };
}

function parseToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return req.headers['x-pty-token'] || null;
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function scheduleIdleShutdown(session) {
  if (!Number.isFinite(IDLE_TIMEOUT_MS) || IDLE_TIMEOUT_MS <= 0) return;
  clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => {
    if (session.clients.size > 0) return;
    try {
      session.pty.kill();
    } catch {
      // Ignore kill errors; process may already be gone.
    }
    sessions.delete(session.key);
  }, IDLE_TIMEOUT_MS);
}

function createSession(key, cwd, cols, rows) {
  const ptyProcess = pty.spawn(DEFAULT_SHELL, [], {
    name: 'xterm-color',
    cols,
    rows,
    cwd,
    env: { ...process.env },
  });

  const session = {
    key,
    cwd,
    pty: ptyProcess,
    clients: new Set(),
    idleTimer: null,
    lastActiveAt: Date.now(),
  };

  ptyProcess.onData((data) => {
    session.lastActiveAt = Date.now();
    for (const client of session.clients) {
      client.queue += data;
      if (!client.flushTimer) {
        client.flushTimer = setTimeout(() => flushClient(client), FLUSH_INTERVAL_MS);
      }
    }
  });

  ptyProcess.onExit(() => {
    for (const client of session.clients) {
      try {
        client.ws.close(1000, 'PTY exited');
      } catch {
        // Ignore close errors.
      }
    }
    sessions.delete(key);
  });

  sessions.set(key, session);
  return session;
}

function flushClient(client) {
  const { ws } = client;
  if (!ws || ws.readyState !== ws.OPEN) {
    client.queue = '';
    client.flushTimer = null;
    return;
  }

  if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
    client.queue = '';
    client.flushTimer = null;
    return;
  }

  const payload = client.queue;
  client.queue = '';
  client.flushTimer = null;
  if (payload) {
    ws.send(payload);
  }
}

function getOrCreateSession(repoPath, cols, rows) {
  const { cwd, key } = resolveRepoCwd(repoPath);
  if (sessions.has(key)) {
    return sessions.get(key);
  }
  return createSession(key, cwd, cols, rows);
}

const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/pty' });

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const tokenParam = url.searchParams.get('token');
  const token = tokenParam || parseToken(req);
  if (!token || token !== TOKEN) {
    ws.close(1008, 'Invalid token');
    return;
  }

  const repoPath = url.searchParams.get('repoPath') || url.searchParams.get('repo');
  const cols = Number.parseInt(url.searchParams.get('cols') || '120', 10);
  const rows = Number.parseInt(url.searchParams.get('rows') || '30', 10);
  const safeCols = Number.isFinite(cols) && cols > 0 ? cols : 120;
  const safeRows = Number.isFinite(rows) && rows > 0 ? rows : 30;

  const session = getOrCreateSession(repoPath, safeCols, safeRows);
  const client = {
    ws,
    queue: '',
    flushTimer: null,
  };

  session.clients.add(client);
  session.lastActiveAt = Date.now();
  clearTimeout(session.idleTimer);

  ws.on('message', (data) => {
    session.lastActiveAt = Date.now();
    if (data instanceof Buffer) {
      session.pty.write(data.toString());
      return;
    }

    const text = data.toString();
    if (text.startsWith('{')) {
      try {
        const payload = JSON.parse(text);
        if (payload?.type === 'resize') {
          const nextCols = Number.parseInt(payload.cols, 10);
          const nextRows = Number.parseInt(payload.rows, 10);
          if (Number.isFinite(nextCols) && Number.isFinite(nextRows)) {
            session.pty.resize(nextCols, nextRows);
          }
          return;
        }
      } catch {
        // Fall through to treat as input.
      }
    }
    session.pty.write(text);
  });

  ws.on('close', () => {
    session.clients.delete(client);
    if (session.clients.size === 0) {
      scheduleIdleShutdown(session);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`PTY server listening on ws://${HOST}:${PORT}/pty`);
});

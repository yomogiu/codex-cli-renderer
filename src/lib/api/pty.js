const DEFAULT_URL = import.meta.env?.VITE_PTY_WS_URL || '';
const DEFAULT_TOKEN = import.meta.env?.VITE_PTY_TOKEN || '';

function resolveBaseUrl() {
  if (!DEFAULT_URL) {
    throw new Error('VITE_PTY_WS_URL is not set.');
  }
  if (DEFAULT_URL.startsWith('ws://') || DEFAULT_URL.startsWith('wss://')) {
    return DEFAULT_URL;
  }
  return new URL(DEFAULT_URL, window.location.origin).toString();
}

export function createPtySocket({ repoPath, cols, rows } = {}) {
  if (!DEFAULT_TOKEN) {
    throw new Error('VITE_PTY_TOKEN is not set.');
  }

  const url = new URL(resolveBaseUrl());
  url.searchParams.set('token', DEFAULT_TOKEN);
  if (repoPath) url.searchParams.set('repoPath', repoPath);
  if (Number.isFinite(cols)) url.searchParams.set('cols', String(cols));
  if (Number.isFinite(rows)) url.searchParams.set('rows', String(rows));

  const socket = new WebSocket(url.toString());
  socket.binaryType = 'arraybuffer';
  return socket;
}

export function sendResize(socket, cols, rows) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return;
  socket.send(JSON.stringify({ type: 'resize', cols, rows }));
}

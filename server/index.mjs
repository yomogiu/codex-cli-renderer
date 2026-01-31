import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createSessionSupervisor } from './sessionSupervisor.mjs';
import { createCodexBridge } from './codexBridge.mjs';

const PORT = Number.parseInt(process.env.API_PORT || '8787', 10);
const HOST = process.env.API_HOST || '127.0.0.1';
const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const HEARTBEAT_MS = Number.parseInt(process.env.API_SSE_HEARTBEAT_MS || '15000', 10);
const ENABLE_CODEX_BRIDGE = (process.env.CODEX_APP_SERVER_ENABLED || 'true') !== 'false';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  credentials: true,
});

const clients = new Set();

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

const supervisor = createSessionSupervisor({ onEvent: broadcast, logger: app.log });
const codexBridge = createCodexBridge({ onEvent: broadcast, logger: app.log });

app.get('/api/stream', (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  reply.raw.write('\n');

  const client = { res: reply.raw };
  clients.add(client);

  const heartbeat = setInterval(() => {
    try {
      reply.raw.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(client);
    }
  }, HEARTBEAT_MS);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });

  reply.hijack();
});

app.get('/api/health', async () => ({
  status: 'ok',
  codexBridge: codexBridge.isAnyRunning(),
}));

app.post('/api/sessions/start', async (request, reply) => {
  const { sessionId, repoPath, prompt, templateId, profile } = request.body || {};
  try {
    const session = supervisor.startSession({ sessionId, repoPath, prompt, templateId, profile });
    if (ENABLE_CODEX_BRIDGE) {
      codexBridge.startSession({ sessionId: session.id, repoPath: session.repoPath || repoPath });
    }
    return {
      runId: session.runId,
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt,
    };
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start session');
    reply.code(400);
    return { error: error?.message || 'Failed to start session.' };
  }
});

app.post('/api/sessions/:sessionId/pause', async (request, reply) => {
  const session = supervisor.pauseSession(request.params.sessionId);
  if (!session) {
    reply.code(404);
    return { error: 'Session not found.' };
  }
  return {
    sessionId: session.id,
    status: session.status,
    updatedAt: session.lastActiveAt,
  };
});

app.post('/api/sessions/:sessionId/resume', async (request, reply) => {
  const session = supervisor.resumeSession(request.params.sessionId);
  if (!session) {
    reply.code(404);
    return { error: 'Session not found.' };
  }
  return {
    sessionId: session.id,
    status: session.status,
    updatedAt: session.lastActiveAt,
  };
});

app.post('/api/sessions/:sessionId/stop', async (request, reply) => {
  const session = supervisor.stopSession(request.params.sessionId);
  if (!session) {
    reply.code(404);
    return { error: 'Session not found.' };
  }
  if (ENABLE_CODEX_BRIDGE) {
    codexBridge.stopSession(request.params.sessionId);
  }
  return {
    sessionId: session.id,
    status: session.status,
    updatedAt: session.lastActiveAt,
  };
});

app.get('/api/sessions/:sessionId', async (request) => {
  return supervisor.getSessionState(request.params.sessionId);
});

try {
  await app.listen({ port: PORT, host: HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

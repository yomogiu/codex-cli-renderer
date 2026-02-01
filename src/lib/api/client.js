const USE_MOCK_API = (import.meta.env?.VITE_USE_MOCK_API ?? 'true') !== 'false';
const API_BASE = import.meta.env?.VITE_API_BASE || '';

function buildUrl(path) {
  if (!API_BASE) return path;
  return new URL(path, API_BASE).toString();
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        message = data.error || data.message || text;
      }
    } catch {
      // Ignore JSON parse errors; keep the raw text.
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockRunId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function submitCommand({ sessionId, prompt, templateId = null, repoPath = '', profile = '' }) {
  if (!USE_MOCK_API) {
    return request('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        repoPath,
        prompt,
        templateId,
        profile,
      }),
    });
  }

  await delay(300);
  return {
    runId: mockRunId(),
    sessionId,
    status: 'queued',
    prompt,
    templateId,
    startedAt: new Date().toISOString(),
  };
}

export async function pauseSession(sessionId) {
  if (!USE_MOCK_API) {
    return request(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
  }

  await delay(200);
  return {
    sessionId,
    status: 'paused',
    updatedAt: new Date().toISOString(),
  };
}

export async function resumeSession(sessionId) {
  if (!USE_MOCK_API) {
    return request(`/api/sessions/${sessionId}/resume`, { method: 'POST' });
  }

  await delay(200);
  return {
    sessionId,
    status: 'running',
    updatedAt: new Date().toISOString(),
  };
}

export async function stopSession(sessionId) {
  if (!USE_MOCK_API) {
    return request(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
  }

  await delay(200);
  return {
    sessionId,
    status: 'blocked',
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchSessionState(sessionId) {
  if (!USE_MOCK_API) {
    return request(`/api/sessions/${sessionId}`);
  }

  await delay(200);
  return {
    sessionId,
    status: 'idle',
    runId: null,
    taskCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

export { USE_MOCK_API };

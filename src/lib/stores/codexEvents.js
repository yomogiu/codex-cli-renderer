import { writable } from 'svelte/store';

const MAX_EVENTS_PER_SESSION = 200;

function nowIso() {
  return new Date().toISOString();
}

function normalizeEvent(event) {
  return {
    id: event.id || `codex-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sessionId: event.sessionId,
    runId: event.runId || null,
    eventType: event.eventType || event.type || 'event',
    message: typeof event.message === 'string' ? event.message : '',
    payload: event.payload ?? null,
    timestamp: event.timestamp || nowIso(),
  };
}

function createCodexEventsStore() {
  const { subscribe, update, set } = writable({});

  return {
    subscribe,

    appendEvent: (event) => {
      if (!event?.sessionId) return;
      const normalized = normalizeEvent(event);
      update((state) => {
        const next = { ...state };
        const existing = Array.isArray(next[normalized.sessionId])
          ? [...next[normalized.sessionId]]
          : [];
        existing.push(normalized);
        if (existing.length > MAX_EVENTS_PER_SESSION) {
          existing.splice(0, existing.length - MAX_EVENTS_PER_SESSION);
        }
        next[normalized.sessionId] = existing;
        return next;
      });
    },

    clearSession: (sessionId) => {
      if (!sessionId) return;
      update((state) => {
        const next = { ...state };
        delete next[sessionId];
        return next;
      });
    },

    setAll: (eventsBySession) => {
      set(eventsBySession && typeof eventsBySession === 'object' ? eventsBySession : {});
    },
  };
}

export const codexEvents = createCodexEventsStore();

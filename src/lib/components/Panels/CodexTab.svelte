<script>
  import { ui } from '../../stores/ui.js';
  import { codexEvents } from '../../stores/codexEvents.js';

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatPayload(payload) {
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  function truncate(text, maxLength = 240) {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  $: selectedSessionId = $ui.selectedSessionId;
  $: events = selectedSessionId ? ($codexEvents[selectedSessionId] || []) : [];
  $: sortedEvents = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
</script>

<div class="codex-tab">
  {#if !selectedSessionId}
    <p class="empty-state">Select a session to view Codex events.</p>
  {:else if sortedEvents.length === 0}
    <p class="empty-state">No Codex events yet.</p>
  {:else}
    <div class="codex-list">
      {#each sortedEvents as event}
        <div class="codex-entry">
          <div class="codex-meta">
            <span class="codex-time">{formatTime(event.timestamp)}</span>
            <span class="codex-type">{event.eventType || 'event'}</span>
            {#if event.runId}
              <span class="codex-run">Run {event.runId.slice(0, 8)}</span>
            {/if}
          </div>
          {#if event.message}
            <div class="codex-message">{truncate(event.message)}</div>
          {:else if event.payload}
            <div class="codex-message">{truncate(formatPayload(event.payload))}</div>
          {:else}
            <div class="codex-message muted">Event received.</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .codex-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .codex-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .codex-entry {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-alt);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  .codex-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .codex-type {
    color: var(--color-accent);
  }

  .codex-run {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .codex-message {
    color: var(--color-text);
    font-family: var(--font-mono);
    word-break: break-word;
  }

  .codex-message.muted {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .empty-state {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>

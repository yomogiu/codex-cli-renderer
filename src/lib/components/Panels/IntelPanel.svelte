<script>
  import Panel from './Panel.svelte';
  import Accordion from '../Common/Accordion.svelte';
  import Badge from '../Common/Badge.svelte';
  import Icon from '../Common/Icon.svelte';
  import TerminalTab from './TerminalTab.svelte';
  import CodexTab from './CodexTab.svelte';
  import { runs } from '../../stores/runs.js';
  import { ui } from '../../stores/ui.js';

  export let collapsed = false;
  export let onToggle = null;

  const tabs = [
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'logs', label: 'Logs', icon: 'file-text' },
    { id: 'codex', label: 'Codex', icon: 'code' },
    { id: 'artifacts', label: 'Artifacts', icon: 'folder' },
    { id: 'context', label: 'Context', icon: 'layers' }
  ];

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  $: selectedSessionId = $ui.selectedSessionId;
  $: sessionRuns = $runs.filter((run) => run.sessionId === selectedSessionId);
  $: outputEntries = sessionRuns.flatMap((run) =>
    run.outputs.map((entry) => ({ ...entry, runId: run.id }))
  );
  $: logEntries = outputEntries.filter((entry) => entry.type === 'log' || entry.type === 'error');
  $: artifactEntries = outputEntries.filter((entry) => entry.type === 'artifact');
  $: sortedLogs = logEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  $: sortedArtifacts = artifactEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
</script>

<div class="intel-panel">
  <Panel title="Intel" icon="eye" collapsible={true} {collapsed} {onToggle}>
    <div class="tabs">
      {#each tabs as tab}
        <button
          class="tab"
          class:active={$ui.intelTab === tab.id}
          on:click={() => ui.setIntelTab(tab.id)}
        >
          <Icon name={tab.icon} size={14} />
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="tab-content" class:terminal={$ui.intelTab === 'terminal'}>
      {#if $ui.intelTab === 'terminal'}
        <TerminalTab />
      {:else if $ui.intelTab === 'logs'}
        <div class="logs-list">
          {#if !selectedSessionId}
            <p class="empty-state">Select a session to view logs.</p>
          {:else if sortedLogs.length === 0}
            <p class="empty-state">No logs yet.</p>
          {:else}
            {#each sortedLogs as log}
              <div class="log-entry log-{log.level || 'info'}">
                <span class="log-time">{formatTime(log.timestamp)}</span>
                <span class="log-message">{log.message || log.text || 'Log entry'}</span>
              </div>
            {/each}
          {/if}
        </div>
      {:else if $ui.intelTab === 'codex'}
        <CodexTab />
      {:else if $ui.intelTab === 'artifacts'}
        <div class="artifacts-list">
          {#if !selectedSessionId}
            <p class="empty-state">Select a session to view artifacts.</p>
          {:else if sortedArtifacts.length === 0}
            <p class="empty-state">No artifacts yet.</p>
          {:else}
            {#each sortedArtifacts as artifact}
              <div class="artifact-item">
                <Icon name={artifact.kind === 'memo' ? 'scroll' : 'book'} size={16} />
                <div class="artifact-info">
                  <span class="artifact-name">{artifact.name || 'Artifact'}</span>
                  <span class="artifact-date">{formatTime(artifact.timestamp)}</span>
                </div>
                <Badge variant="default" size="sm">{artifact.kind || 'artifact'}</Badge>
              </div>
            {/each}
          {/if}
        </div>
      {:else if $ui.intelTab === 'context'}
        <div class="context-section">
          <Accordion title="Active Context Packs" open>
            {#if !selectedSessionId}
              <p class="empty-state">Select a session to view context packs.</p>
            {:else}
              <p class="empty-state">No context packs loaded.</p>
            {/if}
          </Accordion>
          <Accordion title="Knowledge Base">
            <p class="empty-state">No KB cards loaded</p>
          </Accordion>
        </div>
      {/if}
    </div>
  </Panel>
</div>

<style>
  .intel-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .intel-panel :global(.panel) {
    height: 100%;
    border: none;
    border-radius: 0;
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-3);
  }

  .tab {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .tab:hover {
    background: var(--color-surface-alt);
    color: var(--color-text);
  }

  .tab.active {
    background: var(--color-accent);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
  }

  .tab-content.terminal {
    overflow: hidden;
  }

  /* Logs */
  .logs-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .log-entry {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-surface-alt);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .log-time {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .log-message {
    color: var(--color-text);
    word-break: break-word;
  }

  .log-info .log-message {
    color: var(--color-info);
  }

  .log-success .log-message {
    color: var(--color-success);
  }

  .log-warning .log-message {
    color: var(--color-warning);
  }

  .log-error .log-message {
    color: var(--color-danger);
  }

  /* Artifacts */
  .artifacts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .artifact-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-surface-alt);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .artifact-item:hover {
    background: var(--color-surface-elevated);
    transform: translateX(4px);
  }

  .artifact-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .artifact-name {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artifact-date {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Context */
  .context-section {
    display: flex;
    flex-direction: column;
  }

  .context-pack {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .empty-state {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>

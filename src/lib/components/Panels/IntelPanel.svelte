<script>
  import Panel from './Panel.svelte';
  import Accordion from '../Common/Accordion.svelte';
  import Badge from '../Common/Badge.svelte';
  import Icon from '../Common/Icon.svelte';

  export let collapsed = false;
  export let onToggle = null;

  let activeTab = 'logs';
  const tabs = [
    { id: 'logs', label: 'Logs', icon: 'terminal' },
    { id: 'artifacts', label: 'Artifacts', icon: 'folder' },
    { id: 'context', label: 'Context', icon: 'layers' }
  ];

  // Demo data
  const recentLogs = [
    { time: '11:45:23', level: 'info', message: 'Session started for repo-beta' },
    { time: '11:45:24', level: 'info', message: 'Loading context packs...' },
    { time: '11:45:26', level: 'success', message: 'Context loaded successfully' },
    { time: '11:46:01', level: 'info', message: 'Processing task: analyze codebase' },
    { time: '11:47:15', level: 'warning', message: 'Large file detected, skipping binary' },
  ];

  const artifacts = [
    { name: 'market-analysis.md', type: 'memo', date: '2 min ago' },
    { name: 'tech-review.md', type: 'memo', date: '15 min ago' },
    { name: 'context-q1.json', type: 'context-pack', date: '1 hour ago' },
  ];
</script>

<div class="intel-panel">
  <Panel title="Intel" icon="eye" collapsible={true} {collapsed} {onToggle}>
    <div class="tabs">
      {#each tabs as tab}
        <button
          class="tab"
          class:active={activeTab === tab.id}
          on:click={() => activeTab = tab.id}
        >
          <Icon name={tab.icon} size={14} />
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="tab-content">
      {#if activeTab === 'logs'}
        <div class="logs-list">
          {#each recentLogs as log}
            <div class="log-entry log-{log.level}">
              <span class="log-time">{log.time}</span>
              <span class="log-message">{log.message}</span>
            </div>
          {/each}
        </div>
      {:else if activeTab === 'artifacts'}
        <div class="artifacts-list">
          {#each artifacts as artifact}
            <div class="artifact-item">
              <Icon name={artifact.type === 'memo' ? 'scroll' : 'book'} size={16} />
              <div class="artifact-info">
                <span class="artifact-name">{artifact.name}</span>
                <span class="artifact-date">{artifact.date}</span>
              </div>
              <Badge variant="default" size="sm">{artifact.type}</Badge>
            </div>
          {/each}
        </div>
      {:else if activeTab === 'context'}
        <div class="context-section">
          <Accordion title="Active Context Packs" open>
            <div class="context-pack">
              <Icon name="book" size={14} />
              <span>market-research-2024</span>
            </div>
            <div class="context-pack">
              <Icon name="book" size={14} />
              <span>codebase-overview</span>
            </div>
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

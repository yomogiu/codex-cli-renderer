<script>
  import Panel from './Panel.svelte';
  import Accordion from '../Common/Accordion.svelte';
  import Button from '../Common/Button.svelte';
  import Badge from '../Common/Badge.svelte';
  import Icon from '../Common/Icon.svelte';

  export let collapsed = false;
  export let onToggle = null;

  let selectedRepo = 'repo-beta';
  let promptText = '';

  const repos = [
    { id: 'repo-alpha', name: 'repo-alpha', status: 'idle' },
    { id: 'repo-beta', name: 'repo-beta', status: 'working' },
    { id: 'repo-gamma', name: 'repo-gamma', status: 'blocked' },
  ];

  const templates = [
    { id: 'analyze', name: 'Analyze Codebase', prompt: 'Analyze the codebase structure and provide an overview...' },
    { id: 'review', name: 'Code Review', prompt: 'Review recent changes and identify potential issues...' },
    { id: 'research', name: 'Research Topic', prompt: 'Research and summarize information about...' },
  ];

  const taskQueue = [
    { id: 1, title: 'Analyze market trends', status: 'in_progress' },
    { id: 2, title: 'Generate summary report', status: 'pending' },
  ];

  function selectTemplate(template) {
    promptText = template.prompt;
  }

  function handleSubmit() {
    if (promptText.trim()) {
      console.log('Submitting:', promptText);
      // Will connect to backend later
    }
  }
</script>

<div class="command-panel">
  <Panel title="Command" icon="terminal" collapsible={true} {collapsed} {onToggle}>
    <!-- Session Selector -->
    <div class="section">
      <label class="section-label">Active Session</label>
      <select class="session-select" bind:value={selectedRepo}>
        {#each repos as repo}
          <option value={repo.id}>
            {repo.name} ({repo.status})
          </option>
        {/each}
      </select>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <label class="section-label">Quick Actions</label>
      <div class="action-grid">
        <Button variant="accent" size="sm">
          <Icon name="play" size={14} />
          Start
        </Button>
        <Button variant="default" size="sm">
          <Icon name="pause" size={14} />
          Pause
        </Button>
        <Button variant="danger" size="sm">
          <Icon name="stop" size={14} />
          Stop
        </Button>
        <Button variant="ghost" size="sm">
          <Icon name="refresh" size={14} />
          Restart
        </Button>
      </div>
    </div>

    <!-- Prompt Input -->
    <div class="section">
      <label class="section-label">Command Prompt</label>
      <div class="prompt-container">
        <textarea
          class="prompt-input"
          bind:value={promptText}
          placeholder="Enter command or select a template..."
          rows="4"
        />
        <Button variant="accent" on:click={handleSubmit} disabled={!promptText.trim()}>
          <Icon name="chevron-right" size={16} />
          Execute
        </Button>
      </div>
    </div>

    <!-- Templates -->
    <Accordion title="Prompt Templates" open>
      <div class="templates-list">
        {#each templates as template}
          <button
            class="template-item"
            on:click={() => selectTemplate(template)}
          >
            <Icon name="file-text" size={14} />
            {template.name}
          </button>
        {/each}
      </div>
    </Accordion>

    <!-- Task Queue -->
    <Accordion title="Task Queue">
      <div class="task-queue">
        {#each taskQueue as task}
          <div class="task-item">
            <div class="task-info">
              <span class="task-title">{task.title}</span>
              <Badge
                variant={task.status === 'in_progress' ? 'working' : 'idle'}
                size="sm"
                dot
                pulse={task.status === 'in_progress'}
              >
                {task.status === 'in_progress' ? 'Running' : 'Pending'}
              </Badge>
            </div>
            <button class="task-action" title="Remove task">
              <Icon name="x" size={14} />
            </button>
          </div>
        {/each}
        {#if taskQueue.length === 0}
          <p class="empty-state">No tasks in queue</p>
        {/if}
      </div>
    </Accordion>
  </Panel>
</div>

<style>
  .command-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .command-panel :global(.panel) {
    height: 100%;
    border: none;
    border-radius: 0;
  }

  .section {
    margin-bottom: var(--space-4);
  }

  .section-label {
    display: block;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .session-select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-smooth);
  }

  .session-select:hover {
    border-color: var(--color-border-strong);
  }

  .session-select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .prompt-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .prompt-input {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-text);
    resize: vertical;
    min-height: 80px;
    transition: border-color var(--duration-fast) var(--ease-smooth);
  }

  .prompt-input:hover {
    border-color: var(--color-border-strong);
  }

  .prompt-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .prompt-input::placeholder {
    color: var(--color-text-muted);
  }

  .templates-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .template-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .template-item:hover {
    background: var(--color-surface-alt);
    color: var(--color-accent);
  }

  .task-queue {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  .task-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .task-title {
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .task-action:hover {
    background: var(--color-danger);
    color: white;
  }

  .empty-state {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-4);
  }
</style>

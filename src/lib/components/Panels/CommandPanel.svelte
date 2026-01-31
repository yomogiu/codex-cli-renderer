<script>
  import Panel from './Panel.svelte';
  import Accordion from '../Common/Accordion.svelte';
  import Button from '../Common/Button.svelte';
  import Badge from '../Common/Badge.svelte';
  import Icon from '../Common/Icon.svelte';
  import { sessionsWithRepos } from '../../stores/repos.js';
  import { runs } from '../../stores/runs.js';
  import { ui } from '../../stores/ui.js';
  import { submitCommand, pauseSession, resumeSession, stopSession } from '../../api/client.js';
  import { toasts } from '../../stores/toasts.js';

  export let collapsed = false;
  export let onToggle = null;

  let promptText = '';
  let repoOptions = [];
  let hasRepo = false;
  let isSubmitting = false;
  let selectedTemplateId = null;

  const templates = [
    { id: 'analyze', name: 'Analyze Codebase', prompt: 'Analyze the codebase structure and provide an overview...' },
    { id: 'review', name: 'Code Review', prompt: 'Review recent changes and identify potential issues...' },
    { id: 'research', name: 'Research Topic', prompt: 'Research and summarize information about...' },
  ];

  const STATUS_LABELS = {
    queued: 'Queued',
    running: 'Running',
    paused: 'Paused',
    blocked: 'Blocked',
    error: 'Error',
    done: 'Done',
  };

  const STATUS_VARIANTS = {
    queued: 'working',
    running: 'working',
    paused: 'idle',
    blocked: 'blocked',
    error: 'error',
    done: 'idle',
  };

  $: repoOptions = $sessionsWithRepos.map((session) => ({
    id: session.id,
    name: session.repo?.label || session.repoId,
    status: session.status,
  }));

  $: if (repoOptions.length > 0) {
    const selected = repoOptions.find((repo) => repo.id === $ui.selectedSessionId);
    if (!selected) {
      ui.setSelectedSessionId(repoOptions[0].id);
    }
  }

  $: hasRepo = repoOptions.length > 0;
  $: selectedSession = $sessionsWithRepos.find((session) => session.id === $ui.selectedSessionId);
  $: sessionRuns = $runs.filter((run) => run.sessionId === $ui.selectedSessionId);
  $: taskQueue = sessionRuns.filter((run) => ['queued', 'running', 'paused'].includes(run.status));
  $: activeRun = selectedSession?.latestRun || null;
  $: canPause = activeRun && activeRun.status !== 'paused' && activeRun.status !== 'done';
  $: canResume = activeRun && activeRun.status === 'paused';
  $: canStop = activeRun && activeRun.status !== 'done';
  $: pauseLabel = canResume ? 'Resume' : 'Pause';
  $: pauseIcon = canResume ? 'play' : 'pause';

  function selectTemplate(template) {
    promptText = template.prompt;
    selectedTemplateId = template.id;
  }

  function handleSessionChange(event) {
    ui.setSelectedSessionId(event.target.value);
  }

  async function startRun({ prompt, templateId } = {}) {
    if (!hasRepo || !prompt?.trim()) return;
    isSubmitting = true;
    try {
      const response = await submitCommand({
        sessionId: $ui.selectedSessionId,
        prompt: prompt.trim(),
        templateId,
        repoPath: selectedSession?.repo?.path || '',
        profile: selectedSession?.repo?.profile || '',
      });

      const run = runs.startRun($ui.selectedSessionId, prompt.trim(), templateId, {
        id: response.runId,
        status: response.status || 'queued',
      });

      runs.appendOutput(run.id, {
        type: 'log',
        level: 'info',
        message: `Command queued: ${prompt.trim()}`,
      });

      setTimeout(() => {
        runs.updateRun(run.id, { status: 'running' });
        runs.appendOutput(run.id, {
          type: 'log',
          level: 'info',
          message: 'Session is running.',
        });
      }, 500);

      promptText = '';
      selectedTemplateId = null;
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to submit command.' });
    } finally {
      isSubmitting = false;
    }
  }

  async function handleSubmit() {
    if (!hasRepo || !promptText.trim()) return;
    await startRun({ prompt: promptText, templateId: selectedTemplateId });
  }

  async function handleStart() {
    const prompt = promptText.trim() || 'Start session';
    await startRun({ prompt });
  }

  async function handlePause() {
    if (!activeRun) return;
    try {
      await pauseSession($ui.selectedSessionId);
      runs.updateRun(activeRun.id, { status: 'paused' });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to pause session.' });
    }
  }

  async function handleResume() {
    if (!activeRun) return;
    try {
      await resumeSession($ui.selectedSessionId);
      runs.updateRun(activeRun.id, { status: 'running' });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to resume session.' });
    }
  }

  async function handleStop() {
    if (!activeRun) return;
    try {
      await stopSession($ui.selectedSessionId);
      runs.updateRun(activeRun.id, { status: 'blocked' });
      runs.appendOutput(activeRun.id, {
        type: 'log',
        level: 'warning',
        message: 'Session stopped.',
      });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to stop session.' });
    }
  }

  async function handleRestart() {
    if (!activeRun) return handleStart();
    await handleStop();
    await handleStart();
  }

  function handleRemoveTask(runId) {
    if (!runId) return;
    runs.updateRun(runId, { status: 'done' });
  }
</script>

<div class="command-panel">
  <Panel title="Command" icon="terminal" collapsible={true} {collapsed} {onToggle}>
    <!-- Session Selector -->
    <div class="section">
      <label class="section-label">Active Session</label>
      <select
        class="session-select"
        value={$ui.selectedSessionId}
        on:change={handleSessionChange}
        disabled={!hasRepo}
      >
        {#if !hasRepo}
          <option value="" disabled>No repositories configured</option>
        {:else}
          {#each repoOptions as repo}
            <option value={repo.id}>
              {repo.name} ({repo.status})
            </option>
          {/each}
        {/if}
      </select>
      {#if !hasRepo}
        <p class="empty-note">Add repositories in settings to enable sessions.</p>
      {/if}
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <label class="section-label">Quick Actions</label>
      <div class="action-grid">
        <Button variant="accent" size="sm" disabled={!hasRepo} on:click={handleStart}>
          <Icon name="play" size={14} />
          Start
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!hasRepo || (!canPause && !canResume)}
          on:click={canResume ? handleResume : handlePause}
        >
          <Icon name={pauseIcon} size={14} />
          {pauseLabel}
        </Button>
        <Button variant="danger" size="sm" disabled={!hasRepo || !canStop} on:click={handleStop}>
          <Icon name="stop" size={14} />
          Stop
        </Button>
        <Button variant="ghost" size="sm" disabled={!hasRepo} on:click={handleRestart}>
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
          disabled={!hasRepo || isSubmitting}
          on:input={() => selectedTemplateId = null}
        />
        <Button
          variant="accent"
          on:click={handleSubmit}
          disabled={!hasRepo || !promptText.trim() || isSubmitting}
          loading={isSubmitting}
        >
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
              <span class="task-title">{task.prompt || 'Queued task'}</span>
              <Badge
                variant={STATUS_VARIANTS[task.status] || 'default'}
                size="sm"
                dot
                pulse={task.status === 'running' || task.status === 'queued'}
              >
                {STATUS_LABELS[task.status] || task.status}
              </Badge>
            </div>
            <button class="task-action" title="Remove task" on:click={() => handleRemoveTask(task.id)}>
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

  .session-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .empty-note {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
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

  .prompt-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

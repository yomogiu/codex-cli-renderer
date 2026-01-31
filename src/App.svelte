<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { theme } from './lib/stores/theme.js';
  import { ui } from './lib/stores/ui.js';
  import { sessions, repos } from './lib/stores/repos.js';
  import { runs, mapRunStatusToSessionStatus } from './lib/stores/runs.js';
  import { codexEvents } from './lib/stores/codexEvents.js';
  import { connectionStatus } from './lib/stores/connection.js';
  import { connect, disconnect, onMessage } from './lib/api/stream.js';
  import { pauseSession, resumeSession, stopSession } from './lib/api/client.js';
  import { toasts } from './lib/stores/toasts.js';
  import ThemeToggle from './lib/components/Config/ThemeToggle.svelte';
  import RepoConfigModal from './lib/components/Config/RepoConfigModal.svelte';
  import Icon from './lib/components/Common/Icon.svelte';
  import Toast from './lib/components/Common/Toast.svelte';
  import SessionContextMenu from './lib/components/Map/SessionContextMenu.svelte';
  import MapCanvas from './lib/components/Map/MapCanvas.svelte';
  import IntelPanel from './lib/components/Panels/IntelPanel.svelte';
  import CommandPanel from './lib/components/Panels/CommandPanel.svelte';

  let configOpen = false;

  // Panel width state (for drag-to-resize)
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 400;
  const DEFAULT_WIDTH = 320;

  // Resize state
  let isResizing = null; // 'left' | 'right' | null
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  // Tablet breakpoint detection
  let isTablet = false;
  let mediaQuery;
  let mapRef;

  function clampWidth(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed));
  }

  $: leftPanelWidth = clampWidth($ui.leftPanelWidth);
  $: rightPanelWidth = clampWidth($ui.rightPanelWidth);

  onMount(() => {
    mediaQuery = window.matchMedia('(max-width: 1200px)');
    isTablet = mediaQuery.matches;

    // Auto-collapse panels on tablet
    if (isTablet) {
      ui.setPanelCollapsed('left', true, { persist: false });
      ui.setPanelCollapsed('right', true, { persist: false });
    } else {
      const { leftPanelCollapsed, rightPanelCollapsed } = get(ui);
      if (leftPanelCollapsed || rightPanelCollapsed) {
        ui.setPanelCollapsed('left', false, { persist: false });
        ui.setPanelCollapsed('right', false, { persist: false });
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);

    connect();
    const unsubscribe = onMessage(handleStreamMessage);

    return () => {
      unsubscribe();
    };
  });

  onDestroy(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleMediaChange);
    }
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
    disconnect();
  });

  function handleMediaChange(e) {
    isTablet = e.matches;
    if (isTablet) {
      ui.setPanelCollapsed('left', true, { persist: false });
      ui.setPanelCollapsed('right', true, { persist: false });
    } else {
      ui.setPanelCollapsed('left', false, { persist: false });
      ui.setPanelCollapsed('right', false, { persist: false });
    }
  }

  function toggleLeftPanel() {
    ui.togglePanel('left');
  }

  function toggleRightPanel() {
    ui.togglePanel('right');
  }

  function openConfig() {
    configOpen = true;
  }

  function closeConfig() {
    configOpen = false;
  }

  // Resize handlers
  function startResizeLeft(e) {
    if ($ui.leftPanelCollapsed) return;
    isResizing = 'left';
    resizeStartX = e.clientX;
    resizeStartWidth = $ui.leftPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function startResizeRight(e) {
    if ($ui.rightPanelCollapsed) return;
    isResizing = 'right';
    resizeStartX = e.clientX;
    resizeStartWidth = $ui.rightPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResizeMove(e) {
    if (!isResizing) return;

    const delta = e.clientX - resizeStartX;

    if (isResizing === 'left') {
      // Left panel: dragging right edge, so positive delta = wider
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth + delta));
      ui.setPanelWidth('left', newWidth, { persist: false });
    } else if (isResizing === 'right') {
      // Right panel: dragging left edge, so positive delta = narrower
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth - delta));
      ui.setPanelWidth('right', newWidth, { persist: false });
    }
  }

  function handleResizeEnd() {
    if (isResizing) {
      // Persist widths
      ui.setPanelWidth('left', clampWidth($ui.leftPanelWidth), { persist: true });
      ui.setPanelWidth('right', clampWidth($ui.rightPanelWidth), { persist: true });

      isResizing = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }

  // Map canvas event handlers
  function handleInspect(e) {
    ui.setSelectedSessionId(e.detail.sessionId);
    ui.setIntelTab('terminal');
  }

  function handleContextMenu(e) {
    // Context menu state is managed in the ui store.
  }

  function handleFocus(e) {
    ui.setSelectedSessionId(e.detail.sessionId);
    mapRef?.focusSession?.(e.detail.sessionId);
  }

  function handleOpenLogs(e) {
    ui.setSelectedSessionId(e.detail.sessionId);
    ui.setIntelTab('logs');
  }

  function getLatestRunId(sessionId) {
    const runsList = get(runs);
    const sessionRuns = runsList.filter((run) => run.sessionId === sessionId);
    if (sessionRuns.length === 0) return null;
    return sessionRuns.reduce((latest, run) => {
      const latestTime = latest?.lastUpdateAt || latest?.startedAt || '';
      const runTime = run.lastUpdateAt || run.startedAt || '';
      return runTime > latestTime ? run : latest;
    }, sessionRuns[0]).id;
  }

  async function handlePause(e) {
    try {
      await pauseSession(e.detail.sessionId);
      const runId = getLatestRunId(e.detail.sessionId);
      if (runId) runs.updateRun(runId, { status: 'paused' });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to pause session.' });
    }
  }

  async function handleResume(e) {
    try {
      await resumeSession(e.detail.sessionId);
      const runId = getLatestRunId(e.detail.sessionId);
      if (runId) runs.updateRun(runId, { status: 'running' });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to resume session.' });
    }
  }

  async function handleStop(e) {
    try {
      await stopSession(e.detail.sessionId);
      const runId = getLatestRunId(e.detail.sessionId);
      if (runId) runs.updateRun(runId, { status: 'blocked' });
    } catch (error) {
      toasts.add({ variant: 'error', message: error?.message || 'Failed to stop session.' });
    }
  }

  function handleStreamMessage(message) {
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
      case 'session.update': {
        if (message.sessionId) {
          const patch = {};
          if (message.status) {
            const runStatuses = ['queued', 'running', 'paused', 'blocked', 'error', 'done'];
            patch.status = runStatuses.includes(message.status)
              ? mapRunStatusToSessionStatus(message.status)
              : message.status;
          }
          if (message.runId) patch.runId = message.runId;
          if (Number.isFinite(message.taskCount)) patch.taskCount = message.taskCount;
          if (Object.keys(patch).length > 0) {
            sessions.updateSession(message.sessionId, patch);
          }
        }
        break;
      }
      case 'run.output': {
        if (message.runId && message.entry) {
          runs.appendOutput(message.runId, message.entry);
        }
        break;
      }
      case 'run.status': {
        if (message.runId) {
          runs.updateRun(message.runId, { status: message.status });
        }
        break;
      }
      case 'repo.update': {
        if (message.repoId) {
          repos.updateRepo(message.repoId, message.patch || {});
        }
        break;
      }
      case 'codex.event': {
        if (message.sessionId) {
          codexEvents.appendEvent({
            sessionId: message.sessionId,
            runId: message.runId || null,
            eventType: message.eventType || message.kind || 'event',
            message: message.message || '',
            payload: message.payload ?? null,
            timestamp: message.timestamp,
          });
        }
        break;
      }
    }
  }
</script>

<div class="app" class:dark={$theme === 'dark'}>
  <header class="topbar">
    <h1 class="title">Codex CLI Renderer</h1>
    <div class="topbar-actions">
      <div class="connection-status status-{$connectionStatus}">
        <span class="status-dot" aria-hidden="true"></span>
        <span class="status-label">{$connectionStatus}</span>
      </div>
      <button
        class="panel-toggle"
        on:click={toggleLeftPanel}
        title={$ui.leftPanelCollapsed ? 'Show Intel panel' : 'Hide Intel panel'}
        aria-label={$ui.leftPanelCollapsed ? 'Show Intel panel' : 'Hide Intel panel'}
      >
        <Icon name={$ui.leftPanelCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
      </button>
      <button
        class="panel-toggle"
        on:click={toggleRightPanel}
        title={$ui.rightPanelCollapsed ? 'Show Command panel' : 'Hide Command panel'}
        aria-label={$ui.rightPanelCollapsed ? 'Show Command panel' : 'Hide Command panel'}
      >
        <Icon name={$ui.rightPanelCollapsed ? 'chevron-left' : 'chevron-right'} size={16} />
      </button>
      <button class="config-btn" on:click={openConfig} title="Configure repositories">
        <Icon name="settings" size={18} />
      </button>
      <ThemeToggle />
    </div>
  </header>

  {#if $connectionStatus !== 'online'}
    <div class="offline-banner">
      {$connectionStatus === 'reconnecting' ? 'Reconnecting to live updates…' : 'Offline: live updates are unavailable.'}
    </div>
  {/if}

  <main class="workspace">
    <aside
      class="panel-left"
      class:collapsed={$ui.leftPanelCollapsed}
      style:width={$ui.leftPanelCollapsed ? 'var(--panel-collapsed-width)' : `${leftPanelWidth}px`}
    >
      <IntelPanel collapsed={$ui.leftPanelCollapsed} onToggle={toggleLeftPanel} />
      {#if !$ui.leftPanelCollapsed}
        <div
          class="resize-handle resize-handle-right"
          on:mousedown={startResizeLeft}
          role="separator"
          aria-orientation="vertical"
        ></div>
      {/if}
    </aside>

    <section class="map-container">
      <MapCanvas bind:this={mapRef} on:inspect={handleInspect} on:contextmenu={handleContextMenu} />
    </section>

    <aside
      class="panel-right"
      class:collapsed={$ui.rightPanelCollapsed}
      style:width={$ui.rightPanelCollapsed ? 'var(--panel-collapsed-width)' : `${rightPanelWidth}px`}
    >
      {#if !$ui.rightPanelCollapsed}
        <div
          class="resize-handle resize-handle-left"
          on:mousedown={startResizeRight}
          role="separator"
          aria-orientation="vertical"
        ></div>
      {/if}
      <CommandPanel collapsed={$ui.rightPanelCollapsed} onToggle={toggleRightPanel} />
    </aside>
  </main>
</div>

<RepoConfigModal open={configOpen} onClose={closeConfig} />
<SessionContextMenu
  on:inspect={handleInspect}
  on:focus={handleFocus}
  on:pause={handlePause}
  on:resume={handleResume}
  on:stop={handleStop}
  on:openLogs={handleOpenLogs}
/>
<Toast />

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
    transition: background var(--duration-normal) var(--ease-smooth),
                color var(--duration-normal) var(--ease-smooth);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-6);
    background: var(--color-surface);
    border-bottom: 2px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .title {
    font-family: var(--font-heading);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent);
    margin: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-border);
    box-shadow: 0 0 0 2px var(--color-surface);
  }

  .status-label {
    min-width: 90px;
  }

  .connection-status.status-online .status-dot {
    background: var(--color-success);
    box-shadow: 0 0 8px rgba(63, 185, 80, 0.6);
  }

  .connection-status.status-reconnecting .status-dot {
    background: var(--color-warning);
    animation: glow-pulse 1.2s var(--ease-smooth) infinite;
  }

  .connection-status.status-offline .status-dot {
    background: var(--color-danger);
  }

  .panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-smooth),
                color var(--duration-fast) var(--ease-smooth),
                background-color var(--duration-fast) var(--ease-smooth);
  }

  .panel-toggle:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: var(--color-surface-alt);
  }

  .offline-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-surface-alt);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .config-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-smooth),
                color var(--duration-fast) var(--ease-smooth),
                background-color var(--duration-fast) var(--ease-smooth);
  }

  .config-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: var(--color-surface-alt);
  }

  .config-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel-left,
  .panel-right {
    position: relative;
    flex-shrink: 0;
    background: var(--color-surface);
    border-color: var(--color-border);
    overflow-y: auto;
    transition: width var(--duration-normal) var(--ease-smooth);
  }

  .panel-left.collapsed,
  .panel-right.collapsed {
    overflow: hidden;
  }

  .panel-left {
    border-right: 1px solid var(--color-border);
  }

  .panel-right {
    border-left: 1px solid var(--color-border);
  }

  .map-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-width: 0; /* Allow flex item to shrink below content size */
  }

  /* Resize handles */
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    background: transparent;
    cursor: ew-resize;
    z-index: var(--z-sticky);
    transition: background var(--duration-fast) var(--ease-smooth);
  }

  .resize-handle:hover,
  .resize-handle:active {
    background: var(--color-accent);
  }

  .resize-handle-right {
    right: 0;
  }

  .resize-handle-left {
    left: 0;
  }
</style>

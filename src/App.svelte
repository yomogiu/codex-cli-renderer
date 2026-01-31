<script>
  import { onMount, onDestroy } from 'svelte';
  import { theme } from './lib/stores/theme.js';
  import ThemeToggle from './lib/components/Config/ThemeToggle.svelte';
  import MapCanvas from './lib/components/Map/MapCanvas.svelte';
  import IntelPanel from './lib/components/Panels/IntelPanel.svelte';
  import CommandPanel from './lib/components/Panels/CommandPanel.svelte';

  // Panel collapse state
  let leftPanelCollapsed = false;
  let rightPanelCollapsed = false;

  // Panel width state (for drag-to-resize)
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 400;
  const DEFAULT_WIDTH = 320;

  let leftPanelWidth = DEFAULT_WIDTH;
  let rightPanelWidth = DEFAULT_WIDTH;

  // Resize state
  let isResizing = null; // 'left' | 'right' | null
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  // Tablet breakpoint detection
  let isTablet = false;
  let mediaQuery;

  onMount(() => {
    // Load persisted widths
    const savedLeft = localStorage.getItem('leftPanelWidth');
    const savedRight = localStorage.getItem('rightPanelWidth');
    if (savedLeft) leftPanelWidth = parseInt(savedLeft, 10);
    if (savedRight) rightPanelWidth = parseInt(savedRight, 10);

    mediaQuery = window.matchMedia('(max-width: 1200px)');
    isTablet = mediaQuery.matches;

    // Auto-collapse panels on tablet
    if (isTablet) {
      leftPanelCollapsed = true;
      rightPanelCollapsed = true;
    }

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  });

  onDestroy(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleMediaChange);
    }
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  });

  function handleMediaChange(e) {
    isTablet = e.matches;
    if (isTablet) {
      leftPanelCollapsed = true;
      rightPanelCollapsed = true;
    }
  }

  function toggleLeftPanel() {
    leftPanelCollapsed = !leftPanelCollapsed;
  }

  function toggleRightPanel() {
    rightPanelCollapsed = !rightPanelCollapsed;
  }

  // Resize handlers
  function startResizeLeft(e) {
    if (leftPanelCollapsed) return;
    isResizing = 'left';
    resizeStartX = e.clientX;
    resizeStartWidth = leftPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function startResizeRight(e) {
    if (rightPanelCollapsed) return;
    isResizing = 'right';
    resizeStartX = e.clientX;
    resizeStartWidth = rightPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResizeMove(e) {
    if (!isResizing) return;

    const delta = e.clientX - resizeStartX;

    if (isResizing === 'left') {
      // Left panel: dragging right edge, so positive delta = wider
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth + delta));
      leftPanelWidth = newWidth;
    } else if (isResizing === 'right') {
      // Right panel: dragging left edge, so positive delta = narrower
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth - delta));
      rightPanelWidth = newWidth;
    }
  }

  function handleResizeEnd() {
    if (isResizing) {
      // Persist widths
      localStorage.setItem('leftPanelWidth', leftPanelWidth.toString());
      localStorage.setItem('rightPanelWidth', rightPanelWidth.toString());

      isResizing = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }

  // Map canvas event handlers
  function handleInspect(e) {
    console.log('Inspect session:', e.detail.sessionId);
  }

  function handleContextMenu(e) {
    console.log('Context menu for session:', e.detail.sessionId, 'at', e.detail.x, e.detail.y);
  }
</script>

<div class="app" class:dark={$theme === 'dark'}>
  <header class="topbar">
    <h1 class="title">Codex CLI Renderer</h1>
    <div class="topbar-actions">
      <ThemeToggle />
    </div>
  </header>

  <main class="workspace">
    <aside
      class="panel-left"
      class:collapsed={leftPanelCollapsed}
      style:width={leftPanelCollapsed ? 'var(--panel-collapsed-width)' : `${leftPanelWidth}px`}
    >
      <IntelPanel collapsed={leftPanelCollapsed} onToggle={toggleLeftPanel} />
      {#if !leftPanelCollapsed}
        <div
          class="resize-handle resize-handle-right"
          on:mousedown={startResizeLeft}
          role="separator"
          aria-orientation="vertical"
        ></div>
      {/if}
    </aside>

    <section class="map-container">
      <MapCanvas on:inspect={handleInspect} on:contextmenu={handleContextMenu} />
    </section>

    <aside
      class="panel-right"
      class:collapsed={rightPanelCollapsed}
      style:width={rightPanelCollapsed ? 'var(--panel-collapsed-width)' : `${rightPanelWidth}px`}
    >
      {#if !rightPanelCollapsed}
        <div
          class="resize-handle resize-handle-left"
          on:mousedown={startResizeRight}
          role="separator"
          aria-orientation="vertical"
        ></div>
      {/if}
      <CommandPanel collapsed={rightPanelCollapsed} onToggle={toggleRightPanel} />
    </aside>
  </main>
</div>

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

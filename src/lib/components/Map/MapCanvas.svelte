<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
  import { theme } from '../../stores/theme.js';
  import { repos, sessions, sessionsWithRepos, STATUS_COLORS, REPO_COLORS } from '../../stores/repos.js';
  import { ui } from '../../stores/ui.js';
  import Icon from '../Common/Icon.svelte';

  const dispatch = createEventDispatcher();

  let containerEl;
  let app = null;
  let worldContainer = null;
  let gridGraphics = null;
  let regionsGraphics = null;
  let unitsContainer = null;

  // Pan/zoom state
  let isPanning = false;
  let lastPanPos = { x: 0, y: 0 };
  let scale = 1;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 2;
  const GRID_SIZE = 40;
  const UNIT_WIDTH = 100;
  const UNIT_HEIGHT = 120;
  const ENABLE_REPO_DRAG = false;

  // Selection and drag state
  let selectedSessionId = null;
  let isDraggingUnit = false;
  let draggedSessionId = null;
  let dragOffset = { x: 0, y: 0 };
  let lastDragPosition = null;
  let lastClickTime = 0;
  const DOUBLE_CLICK_THRESHOLD = 300;

  $: selectedSessionId = $ui.selectedSessionId;

  // Colors for light/dark themes
  const colors = {
    light: {
      bg: 0xebe0cc,
      grid: 0xc4b49a,
      surface: 0xf4e9d9,
      text: 0x1c1c1e,
      textMuted: 0x5c5c5e,
      border: 0xc4b49a,
    },
    dark: {
      bg: 0x0d1117,
      grid: 0x30363d,
      surface: 0x161b22,
      text: 0xe6edf3,
      textMuted: 0x8b949e,
      border: 0x30363d,
    }
  };

  // Gold accent color for selection
  const GOLD_COLOR = 0xc9a227;

  $: currentColors = $theme === 'dark' ? colors.dark : colors.light;
  $: statusColors = $theme === 'dark' ? STATUS_COLORS.dark : STATUS_COLORS.light;
  $: currentSessions = $sessionsWithRepos;
  $: currentRepos = $repos;

  $: if (app && gridGraphics) {
    redrawGrid();
  }

  $: if (regionsGraphics && currentRepos) {
    redrawRegions();
  }

  $: if (unitsContainer && currentSessions) {
    selectedSessionId;
    redrawUnits();
  }

  onMount(async () => {
    // Create Pixi Application
    app = new Application();
    await app.init({
      background: currentColors.bg,
      resizeTo: containerEl,
      antialias: false, // Crisp pixels
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerEl.appendChild(app.canvas);

    // World container for pan/zoom
    worldContainer = new Container();
    app.stage.addChild(worldContainer);

    // Grid layer
    gridGraphics = new Graphics();
    worldContainer.addChild(gridGraphics);

    // Regions layer (between grid and units)
    regionsGraphics = new Graphics();
    worldContainer.addChild(regionsGraphics);

    // Units container
    unitsContainer = new Container();
    worldContainer.addChild(unitsContainer);

    // Initial draw
    redrawGrid();
    redrawRegions();
    redrawUnits();

    // Center the world
    worldContainer.x = app.screen.width / 2 - 300;
    worldContainer.y = app.screen.height / 2 - 250;

    // Event listeners for pan/zoom
    app.canvas.addEventListener('wheel', handleWheel, { passive: false });
    app.canvas.addEventListener('mousedown', handleMouseDown);
    app.canvas.addEventListener('mousemove', handleMouseMove);
    app.canvas.addEventListener('mouseup', handleMouseUp);
    app.canvas.addEventListener('mouseleave', handleMouseUp);
    app.canvas.addEventListener('contextmenu', handleContextMenu);

    // Stage-level events for unit dragging
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', handleStageDrag);
    app.stage.on('pointerup', handleStageDragEnd);
    app.stage.on('pointerupoutside', handleStageDragEnd);

    // Handle resize
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (app) {
      app.canvas?.removeEventListener('wheel', handleWheel);
      app.canvas?.removeEventListener('mousedown', handleMouseDown);
      app.canvas?.removeEventListener('mousemove', handleMouseMove);
      app.canvas?.removeEventListener('mouseup', handleMouseUp);
      app.canvas?.removeEventListener('mouseleave', handleMouseUp);
      app.canvas?.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true });
    }
  });

  function handleContextMenu(e) {
    e.preventDefault();
  }

  function redrawGrid() {
    if (!gridGraphics || !app) return;

    gridGraphics.clear();
    app.renderer.background.color = currentColors.bg;

    const gridExtent = 2000;

    // Draw grid lines
    gridGraphics.setStrokeStyle({ width: 1, color: currentColors.grid, alpha: 0.3 });

    for (let x = -gridExtent; x <= gridExtent; x += GRID_SIZE) {
      gridGraphics.moveTo(x, -gridExtent);
      gridGraphics.lineTo(x, gridExtent);
    }
    for (let y = -gridExtent; y <= gridExtent; y += GRID_SIZE) {
      gridGraphics.moveTo(-gridExtent, y);
      gridGraphics.lineTo(gridExtent, y);
    }
    gridGraphics.stroke();
  }

  function redrawRegions() {
    if (!regionsGraphics) return;

    regionsGraphics.clear();

    currentRepos.forEach(repo => {
      if (!repo.region) return;

      const { x, y, width, height } = repo.region;
      const repoColor = REPO_COLORS[repo.color] || REPO_COLORS.steel;

      // Fill with low alpha
      regionsGraphics.rect(x, y, width, height);
      regionsGraphics.fill({ color: repoColor.pixi, alpha: 0.08 });

      // Crisp border
      regionsGraphics.rect(x, y, width, height);
      regionsGraphics.setStrokeStyle({ width: 1, color: repoColor.pixi, alpha: 0.3 });
      regionsGraphics.stroke();
    });
  }

  // Draw a shield path (heraldic shape)
  function drawShieldPath(g, x, y, width, height) {
    const midX = x + width / 2;
    const cornerRadius = 4;
    const pointDepth = height * 0.2; // How far the point extends

    g.moveTo(x + cornerRadius, y);
    g.lineTo(x + width - cornerRadius, y);
    g.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    g.lineTo(x + width, y + height - pointDepth);
    g.lineTo(midX, y + height);
    g.lineTo(x, y + height - pointDepth);
    g.lineTo(x, y + cornerRadius);
    g.quadraticCurveTo(x, y, x + cornerRadius, y);
  }

  // Draw icons using Pixi Graphics (no emoji for cross-platform consistency)
  function drawIcon(g, iconName, x, y, size, color) {
    const half = size / 2;
    const cx = x + half;
    const cy = y + half;

    g.setStrokeStyle({ width: 2, color: color });

    switch (iconName) {
      case 'terminal':
        // Terminal: rectangle with > prompt
        g.rect(x + 2, y + 2, size - 4, size - 4);
        g.stroke();
        g.moveTo(x + 6, cy - 2);
        g.lineTo(x + 10, cy + 2);
        g.lineTo(x + 6, cy + 6);
        g.stroke();
        break;

      case 'code':
        // Code: angle brackets < >
        g.moveTo(x + 6, y + 4);
        g.lineTo(x + 2, cy);
        g.lineTo(x + 6, y + size - 4);
        g.stroke();
        g.moveTo(x + size - 6, y + 4);
        g.lineTo(x + size - 2, cy);
        g.lineTo(x + size - 6, y + size - 4);
        g.stroke();
        break;

      case 'gear':
        // Gear: circle with teeth
        g.circle(cx, cy, half - 4);
        g.stroke();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          g.moveTo(cx + Math.cos(angle) * (half - 5), cy + Math.sin(angle) * (half - 5));
          g.lineTo(cx + Math.cos(angle) * (half - 1), cy + Math.sin(angle) * (half - 1));
        }
        g.stroke();
        break;

      case 'scroll':
      case 'file-text':
        // Document with lines
        g.rect(x + 3, y + 1, size - 6, size - 2);
        g.stroke();
        g.moveTo(x + 6, y + 5);
        g.lineTo(x + size - 6, y + 5);
        g.moveTo(x + 6, y + 9);
        g.lineTo(x + size - 6, y + 9);
        g.moveTo(x + 6, y + 13);
        g.lineTo(x + size - 9, y + 13);
        g.stroke();
        break;

      case 'shield':
      case 'shield-check':
        // Mini shield
        drawShieldPath(g, x + 3, y + 2, size - 6, size - 4);
        g.stroke();
        if (iconName === 'shield-check') {
          g.moveTo(cx - 3, cy);
          g.lineTo(cx - 1, cy + 3);
          g.lineTo(cx + 4, cy - 2);
          g.stroke();
        }
        break;

      case 'crown':
        // Crown shape
        g.moveTo(x + 2, cy + 4);
        g.lineTo(x + 2, cy - 2);
        g.lineTo(x + half - 2, cy + 1);
        g.lineTo(cx, cy - 4);
        g.lineTo(x + half + 2, cy + 1);
        g.lineTo(x + size - 2, cy - 2);
        g.lineTo(x + size - 2, cy + 4);
        g.closePath();
        g.stroke();
        break;

      case 'folder':
        // Folder shape
        g.moveTo(x + 2, y + 5);
        g.lineTo(x + 2, y + size - 3);
        g.lineTo(x + size - 2, y + size - 3);
        g.lineTo(x + size - 2, y + 7);
        g.lineTo(cx + 2, y + 7);
        g.lineTo(cx, y + 5);
        g.closePath();
        g.stroke();
        break;

      case 'layers':
        // Stacked layers
        g.moveTo(cx, y + 2);
        g.lineTo(x + size - 2, cy - 2);
        g.lineTo(cx, cy + 1);
        g.lineTo(x + 2, cy - 2);
        g.closePath();
        g.stroke();
        g.moveTo(x + 2, cy + 1);
        g.lineTo(cx, cy + 4);
        g.lineTo(x + size - 2, cy + 1);
        g.stroke();
        g.moveTo(x + 2, cy + 4);
        g.lineTo(cx, cy + 7);
        g.lineTo(x + size - 2, cy + 4);
        g.stroke();
        break;

      default:
        // Default: diamond
        g.moveTo(cx, y + 2);
        g.lineTo(x + size - 2, cy);
        g.lineTo(cx, y + size - 2);
        g.lineTo(x + 2, cy);
        g.closePath();
        g.stroke();
    }
  }

  function redrawUnits() {
    if (!unitsContainer) return;

    // Clear existing units
    const oldUnits = unitsContainer.removeChildren();
    oldUnits.forEach((child) => {
      if (child?.destroy) {
        child.destroy({ children: true, texture: true, baseTexture: true });
      }
    });

    const unitWidth = UNIT_WIDTH;
    const unitHeight = UNIT_HEIGHT;

    currentSessions.forEach(session => {
      const unitContainer = new Container();
      unitContainer.x = session.position.x;
      unitContainer.y = session.position.y;

      // Make unit interactive
      unitContainer.eventMode = 'static';
      unitContainer.cursor = 'pointer';

      // Store session id for event handlers
      unitContainer.sessionId = session.id;

      // Per spec: "Border color indicates status"
      const statusColor = statusColors[session.status]?.pixi || 0x5c6b7a;
      const repoColor = session.repoColor?.pixi || 0x5c6b7a;
      const isSelected = selectedSessionId === session.id;

      // Selection highlight (gold border when selected)
      if (isSelected) {
        const selectionGlow = new Graphics();
        drawShieldPath(selectionGlow, -4, -4, unitWidth + 8, unitHeight + 8);
        selectionGlow.setStrokeStyle({ width: 3, color: GOLD_COLOR });
        selectionGlow.stroke();
        unitContainer.addChild(selectionGlow);
      }

      // Shield background - border color indicates status (per spec)
      const shield = new Graphics();
      drawShieldPath(shield, 0, 0, unitWidth, unitHeight);
      shield.fill({ color: currentColors.surface });
      drawShieldPath(shield, 0, 0, unitWidth, unitHeight);
      shield.setStrokeStyle({ width: 2, color: statusColor });
      shield.stroke();
      unitContainer.addChild(shield);

      // Status icon at top (Pixi Graphics, not emoji)
      const statusIconG = new Graphics();
      const statusIconSize = 16;
      const statusIconX = unitWidth / 2 - statusIconSize / 2;
      const statusIconY = 8;

      statusIconG.setStrokeStyle({ width: 2, color: statusColor });

      switch (session.status) {
        case 'working':
          // Gear icon
          drawIcon(statusIconG, 'gear', statusIconX, statusIconY, statusIconSize, statusColor);
          break;
        case 'idle':
          // Pause bars
          statusIconG.rect(statusIconX + 3, statusIconY + 2, 4, statusIconSize - 4);
          statusIconG.rect(statusIconX + statusIconSize - 7, statusIconY + 2, 4, statusIconSize - 4);
          statusIconG.fill({ color: statusColor });
          break;
        case 'blocked':
          // Warning triangle
          statusIconG.moveTo(statusIconX + statusIconSize / 2, statusIconY + 1);
          statusIconG.lineTo(statusIconX + statusIconSize - 2, statusIconY + statusIconSize - 2);
          statusIconG.lineTo(statusIconX + 2, statusIconY + statusIconSize - 2);
          statusIconG.closePath();
          statusIconG.stroke();
          // Exclamation
          statusIconG.circle(statusIconX + statusIconSize / 2, statusIconY + statusIconSize - 5, 1.5);
          statusIconG.fill({ color: statusColor });
          statusIconG.rect(statusIconX + statusIconSize / 2 - 1.5, statusIconY + 5, 3, 5);
          statusIconG.fill({ color: statusColor });
          break;
        case 'error':
          // X mark
          statusIconG.moveTo(statusIconX + 3, statusIconY + 3);
          statusIconG.lineTo(statusIconX + statusIconSize - 3, statusIconY + statusIconSize - 3);
          statusIconG.moveTo(statusIconX + statusIconSize - 3, statusIconY + 3);
          statusIconG.lineTo(statusIconX + 3, statusIconY + statusIconSize - 3);
          statusIconG.stroke();
          break;
      }
      unitContainer.addChild(statusIconG);

      // Inner box for icon + repo name
      const innerBox = new Graphics();
      const innerX = 12;
      const innerY = 30;
      const innerW = unitWidth - 24;
      const innerH = 50;
      innerBox.rect(innerX, innerY, innerW, innerH);
      innerBox.setStrokeStyle({ width: 1, color: currentColors.border });
      innerBox.stroke();
      unitContainer.addChild(innerBox);

      // Repo icon (Pixi Graphics)
      const repoIconG = new Graphics();
      const repoIconSize = 20;
      const repoIconX = unitWidth / 2 - repoIconSize / 2;
      const repoIconY = innerY + 6;
      drawIcon(repoIconG, session.repoIcon || 'shield', repoIconX, repoIconY, repoIconSize, repoColor);
      unitContainer.addChild(repoIconG);

      // Repo name (per spec: "REPO" - truncated)
      const labelStyle = new TextStyle({
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        fill: currentColors.text,
        fontWeight: '500',
      });
      const repoLabel = session.repo?.label || session.repoId;
      const truncatedLabel = repoLabel.length > 10 ? repoLabel.slice(0, 9) + '…' : repoLabel;
      const label = new Text({ text: truncatedLabel, style: labelStyle });
      label.x = unitWidth / 2 - label.width / 2;
      label.y = innerY + innerH - 16;
      unitContainer.addChild(label);

      // Task queue dots (per spec: "● ● ○ ○ ○")
      const dotsY = unitHeight - 30;
      const dotSpacing = 10;
      const totalDots = 5;
      const filledDots = Math.min(session.taskCount || 0, totalDots);
      const startX = unitWidth / 2 - ((totalDots - 1) * dotSpacing) / 2;

      for (let i = 0; i < totalDots; i++) {
        const dot = new Graphics();
        dot.circle(startX + i * dotSpacing, dotsY, 3);
        dot.fill({ color: i < filledDots ? statusColor : currentColors.border });
        unitContainer.addChild(dot);
      }

      // Pulse effect for working status (per spec: "Pulse/glow allowed, keep subtle")
      if (session.status === 'working') {
        const glow = new Graphics();
        drawShieldPath(glow, -2, -2, unitWidth + 4, unitHeight + 4);
        glow.setStrokeStyle({ width: 1, color: statusColor, alpha: 0.4 });
        glow.stroke();
        unitContainer.addChildAt(glow, isSelected ? 1 : 0);
      }

      // Event handlers for unit interaction
      unitContainer.on('pointerdown', (e) => handleUnitPointerDown(e, session.id, unitContainer));
      unitContainer.on('rightclick', (e) => handleUnitRightClick(e, session.id));

      unitsContainer.addChild(unitContainer);
    });
  }

  function handleUnitPointerDown(e, sessionId, unitContainer) {
    e.stopPropagation();

    const now = Date.now();
    const isDoubleClick = (now - lastClickTime) < DOUBLE_CLICK_THRESHOLD && selectedSessionId === sessionId;
    lastClickTime = now;

    if (isDoubleClick) {
      ui.setSelectedSessionId(sessionId);
      // Double-click: dispatch inspect event
      dispatch('inspect', { sessionId });
      return;
    }

    // Single click: select and start potential drag
    ui.setSelectedSessionId(sessionId);
    ui.setIntelTab('terminal');
    ui.closeContextMenu();

    if (!ENABLE_REPO_DRAG) {
      redrawUnits();
      return;
    }

    isDraggingUnit = true;
    draggedSessionId = sessionId;
    lastDragPosition = null;

    // Calculate offset from unit origin to mouse position
    const localPos = e.getLocalPosition(unitContainer.parent);
    dragOffset.x = localPos.x - unitContainer.x;
    dragOffset.y = localPos.y - unitContainer.y;

    containerEl.style.cursor = 'grabbing';
    redrawUnits();
  }

  function handleUnitRightClick(e, sessionId) {
    e.stopPropagation();

    // Select the unit
    ui.setSelectedSessionId(sessionId);

    // Get screen position for context menu
    const rect = containerEl.getBoundingClientRect();
    const globalPos = e.global;
    const domEvent = e.originalEvent ?? e;
    const clientX = typeof domEvent.clientX === 'number'
      ? domEvent.clientX
      : rect.left + globalPos.x;
    const clientY = typeof domEvent.clientY === 'number'
      ? domEvent.clientY
      : rect.top + globalPos.y;

    ui.openContextMenu(sessionId, { x: clientX, y: clientY });

    dispatch('contextmenu', {
      sessionId,
      x: clientX,
      y: clientY
    });

    redrawUnits();
  }

  function handleStageDrag(e) {
    if (!ENABLE_REPO_DRAG) return;
    if (!isDraggingUnit || !draggedSessionId) return;

    const localPos = e.getLocalPosition(worldContainer);
    const newX = localPos.x - dragOffset.x;
    const newY = localPos.y - dragOffset.y;
    lastDragPosition = { x: newX, y: newY };

    // Update session position in store
    sessions.updatePosition(draggedSessionId, { x: newX, y: newY }, { persist: false });
  }

  function handleStageDragEnd() {
    if (!ENABLE_REPO_DRAG) return;
    if (isDraggingUnit) {
      if (draggedSessionId && lastDragPosition) {
        sessions.updatePosition(draggedSessionId, lastDragPosition, { persist: true });
      }
      isDraggingUnit = false;
      draggedSessionId = null;
      lastDragPosition = null;
      containerEl.style.cursor = 'grab';
    }
  }

  function clearSelection() {
    if (!isDraggingUnit) {
      ui.setSelectedSessionId(null);
      ui.closeContextMenu();
      redrawUnits();
    }
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

    if (newScale !== scale) {
      // Zoom toward mouse position
      const rect = containerEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - worldContainer.x) / scale;
      const worldY = (mouseY - worldContainer.y) / scale;

      scale = newScale;
      worldContainer.scale.set(scale);

      worldContainer.x = mouseX - worldX * scale;
      worldContainer.y = mouseY - worldY * scale;
    }
  }

  function handleMouseDown(e) {
    // Don't start panning if dragging a unit
    if (isDraggingUnit) return;

    if (e.button === 0) {
      // Clear selection when clicking on empty space
      clearSelection();

      isPanning = true;
      lastPanPos = { x: e.clientX, y: e.clientY };
      containerEl.style.cursor = 'grabbing';
    }
  }

  function handleMouseMove(e) {
    // Don't pan while dragging a unit
    if (isPanning && !isDraggingUnit) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      worldContainer.x += dx;
      worldContainer.y += dy;
      lastPanPos = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseUp() {
    isPanning = false;
    // Only reset cursor if not dragging a unit
    if (!isDraggingUnit) {
      containerEl.style.cursor = 'grab';
    }
  }

  function handleResize() {
    if (app) {
      app.resize();
      app.stage.hitArea = app.screen;
      redrawGrid();
    }
  }

  function zoomIn() {
    const newScale = Math.min(MAX_SCALE, scale * 1.2);
    scale = newScale;
    worldContainer.scale.set(scale);
  }

  function zoomOut() {
    const newScale = Math.max(MIN_SCALE, scale * 0.8);
    scale = newScale;
    worldContainer.scale.set(scale);
  }

  function resetView() {
    scale = 1;
    worldContainer.scale.set(1);
    worldContainer.x = app.screen.width / 2 - 300;
    worldContainer.y = app.screen.height / 2 - 250;
  }

  export function focusSession(sessionId) {
    if (!app || !worldContainer || !sessionId) return;
    const session = currentSessions.find((item) => item.id === sessionId);
    if (!session) return;

    const targetX = session.position.x + UNIT_WIDTH / 2;
    const targetY = session.position.y + UNIT_HEIGHT / 2;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    worldContainer.x = centerX - targetX * scale;
    worldContainer.y = centerY - targetY * scale;
  }
</script>

<div class="map-canvas" bind:this={containerEl}>
  <!-- Pixi canvas is appended here -->

  {#if $repos.length === 0}
    <div class="map-empty">
      No repositories configured. Add one in settings to populate the map.
    </div>
  {/if}

  <div class="map-controls">
    <button class="control-btn" on:click={zoomIn} title="Zoom In">
      <Icon name="plus" size={18} />
    </button>
    <button class="control-btn" on:click={zoomOut} title="Zoom Out">
      <Icon name="minus" size={18} />
    </button>
    <button class="control-btn" on:click={resetView} title="Reset View">
      <Icon name="maximize" size={18} />
    </button>
  </div>
</div>

<style>
  .map-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
  }

  /* Subtle noise overlay using CSS gradients (no image textures) */
  .map-canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
    z-index: 1;
  }

  .map-canvas :global(canvas) {
    display: block;
  }

  /* Map Controls - TUI style */
  .map-controls {
    position: absolute;
    bottom: var(--space-4);
    right: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    z-index: var(--z-dropdown);
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 0;
    color: var(--color-text);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .control-btn:hover {
    background: var(--color-surface-alt);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .control-btn:active {
    background: var(--color-accent);
    color: var(--color-primary);
  }

  .map-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-6);
    color: var(--color-text-muted);
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    border: 1px dashed var(--color-border);
    margin: var(--space-6);
    z-index: var(--z-overlay);
    pointer-events: none;
    font-size: var(--text-sm);
  }
</style>

<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { Terminal } from 'xterm';
  import { FitAddon } from 'xterm-addon-fit';
  import { ui } from '../../stores/ui.js';
  import { sessionsWithRepos } from '../../stores/repos.js';
  import { theme } from '../../stores/theme.js';
  import { createPtySocket, sendResize } from '../../api/pty.js';
  import 'xterm/css/xterm.css';

  let containerEl;
  let terminal;
  let fitAddon;
  let socket;
  let dataDisposable;
  let resizeObserver;
  let outputBuffer = '';
  let flushTimer = null;
  let connectionState = 'idle';
  let errorMessage = '';
  let currentSignature = null;
  const decoder = new TextDecoder();

  $: selectedSessionId = $ui.selectedSessionId;
  $: selectedSession = $sessionsWithRepos.find((session) => session.id === selectedSessionId);
  $: sessionLabel = selectedSession?.repo?.label || selectedSession?.repoId || 'Session';
  $: repoPath = selectedSession?.repo?.path || '';
  $: signature = selectedSession ? `${selectedSession.id}:${repoPath}` : null;

  function getCssVar(name, fallback) {
    const styles = containerEl ? getComputedStyle(containerEl) : getComputedStyle(document.documentElement);
    return styles.getPropertyValue(name).trim() || fallback;
  }

  function buildTheme() {
    return {
      background: getCssVar('--color-surface-alt', '#1c2128'),
      foreground: getCssVar('--color-text', '#e6edf3'),
      cursor: getCssVar('--color-accent', '#c9a227'),
      selectionBackground: getCssVar('--color-border', '#30363d'),
    };
  }

  async function initTerminal() {
    if (terminal || !containerEl) return;
    await tick();

    terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      scrollback: 2000,
      fontFamily: getCssVar('--font-mono', 'JetBrains Mono, Fira Code, monospace'),
      fontSize: 12,
      theme: buildTheme(),
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerEl);
    fitAddon.fit();

    resizeObserver = new ResizeObserver(() => {
      if (!terminal || !fitAddon) return;
      fitAddon.fit();
      sendResize(socket, terminal.cols, terminal.rows);
    });
    resizeObserver.observe(containerEl);
  }

  function queueOutput(payload) {
    if (!terminal) return;
    const text = payload instanceof ArrayBuffer ? decoder.decode(payload) : payload?.toString?.() || '';
    outputBuffer += text;
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        const next = outputBuffer;
        outputBuffer = '';
        flushTimer = null;
        if (next) {
          terminal.write(next);
        }
      }, 16);
    }
  }

  function cleanupSocket() {
    if (dataDisposable) {
      dataDisposable.dispose();
      dataDisposable = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
    connectionState = 'idle';
    errorMessage = '';
    currentSignature = null;
  }

  function attachToSession() {
    if (!terminal) return;
    if (!signature) {
      cleanupSocket();
      return;
    }
    if (signature === currentSignature && socket) return;

    cleanupSocket();
    currentSignature = signature;
    connectionState = 'connecting';
    errorMessage = '';
    terminal.clear();

    try {
      socket = createPtySocket({ repoPath, cols: terminal.cols, rows: terminal.rows });
    } catch (error) {
      errorMessage = error?.message || 'Failed to create PTY connection.';
      connectionState = 'error';
      return;
    }

    socket.addEventListener('open', () => {
      connectionState = 'online';
      sendResize(socket, terminal.cols, terminal.rows);
    });

    socket.addEventListener('message', (event) => {
      queueOutput(event.data);
    });

    socket.addEventListener('close', () => {
      connectionState = 'offline';
    });

    socket.addEventListener('error', () => {
      connectionState = 'offline';
    });

    dataDisposable = terminal.onData((data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
  }

  $: if (terminal) {
    $theme;
    terminal.options.theme = buildTheme();
    if (terminal.rows > 0) {
      terminal.refresh(0, terminal.rows - 1);
    }
  }

  $: if (containerEl && !terminal) {
    initTerminal();
  }

  $: if (terminal) {
    if (signature) {
      attachToSession();
    } else {
      cleanupSocket();
    }
  }

  onMount(async () => {
    await initTerminal();
    attachToSession();
  });

  onDestroy(() => {
    cleanupSocket();
    resizeObserver?.disconnect();
    if (terminal) {
      terminal.dispose();
      terminal = null;
    }
  });
</script>

<div class="terminal-shell">
  <div class="terminal-header">
    <div class="terminal-title">Terminal</div>
    <div class="terminal-meta">
      <span class="terminal-label">{sessionLabel}</span>
      <span class="terminal-status status-{connectionState}">
        <span class="terminal-dot"></span>
        {connectionState}
      </span>
    </div>
  </div>

  <div class="terminal-body" bind:this={containerEl}>
    {#if !selectedSessionId}
      <div class="terminal-overlay">
        <p class="empty-state">Select a session to attach the terminal.</p>
      </div>
    {:else if errorMessage}
      <div class="terminal-overlay">
        <p class="empty-state">{errorMessage}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .terminal-shell {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    height: 100%;
    min-height: 0;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .terminal-title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .terminal-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .terminal-label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .terminal-status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .terminal-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-border);
  }

  .terminal-status.status-online .terminal-dot {
    background: var(--color-success);
    box-shadow: 0 0 6px rgba(63, 185, 80, 0.6);
  }

  .terminal-status.status-connecting .terminal-dot {
    background: var(--color-warning);
  }

  .terminal-status.status-offline .terminal-dot,
  .terminal-status.status-error .terminal-dot {
    background: var(--color-danger);
  }

  .terminal-body {
    flex: 1;
    min-height: 220px;
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
  }

  .terminal-body :global(.xterm) {
    height: 100%;
    padding: var(--space-2);
  }

  .terminal-body :global(.xterm-viewport) {
    background: transparent;
  }

  .terminal-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12));
    border-radius: var(--radius-md);
    text-align: center;
    padding: var(--space-3);
    pointer-events: none;
    z-index: 1;
  }

  .empty-state {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>

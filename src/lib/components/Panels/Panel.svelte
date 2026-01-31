<script>
  import Icon from '../Common/Icon.svelte';

  export let title = '';
  export let icon = 'layers';
  export let collapsible = true;
  export let collapsed = false;
  export let pinned = false;
  export let onToggle = null;

  function toggle() {
    if (collapsible && onToggle) {
      onToggle();
    } else if (collapsible) {
      collapsed = !collapsed;
    }
  }

  function togglePin() {
    pinned = !pinned;
  }
</script>

<div class="panel" class:collapsed class:pinned>
  {#if collapsed}
    <!-- Collapsed: icon-only vertical bar -->
    <div class="collapsed-bar">
      <button class="expand-btn" on:click={toggle} title="Expand {title}">
        <Icon name={icon} size={20} />
      </button>
      <span class="collapsed-title">{title}</span>
    </div>
  {:else}
    <header class="panel-header" on:dblclick={toggle}>
      <div class="header-left">
        <span class="flourish">&#10087;</span>
        <h2 class="panel-title">{title}</h2>
      </div>
      <div class="header-actions">
        {#if collapsible}
          <button
            class="header-btn pin-btn"
            class:active={pinned}
            on:click|stopPropagation={togglePin}
            title={pinned ? 'Unpin panel' : 'Pin panel'}
          >
            <Icon name="pin" size={14} />
          </button>
          <button
            class="header-btn collapse-btn"
            on:click|stopPropagation={toggle}
            title="Collapse panel"
          >
            <Icon name="chevron-left" size={16} />
          </button>
        {/if}
      </div>
    </header>

    <div class="panel-content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 0;
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--ease-smooth);
    height: 100%;
  }

  .panel.pinned {
    border-color: var(--color-accent);
    box-shadow: 2px 2px 0 var(--color-accent);
  }

  .panel.collapsed {
    border: none;
  }

  /* Collapsed vertical bar */
  .collapsed-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3) var(--space-2);
    height: 100%;
    gap: var(--space-3);
  }

  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--color-surface-alt);
    border: 2px solid var(--color-border);
    border-radius: 0;
    color: var(--color-accent);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .expand-btn:hover {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-primary);
  }

  .collapsed-title {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Expanded header */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-alt);
    border-bottom: 3px double var(--color-border);
    cursor: pointer;
    user-select: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .flourish {
    color: var(--color-accent);
    font-size: var(--text-lg);
    line-height: 1;
  }

  .panel-title {
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .header-btn:hover {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text);
  }

  .header-btn.active {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .panel-content {
    flex: 1;
    padding: var(--space-4);
    overflow-y: auto;
    animation: slide-down var(--duration-fast) var(--ease-smooth);
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

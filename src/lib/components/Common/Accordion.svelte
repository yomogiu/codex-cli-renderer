<script>
  import Icon from './Icon.svelte';

  export let title = '';
  export let open = false;
  export let disabled = false;

  function toggle() {
    if (!disabled) {
      open = !open;
    }
  }
</script>

<div class="accordion" class:open class:disabled>
  <button
    class="accordion-header"
    on:click={toggle}
    aria-expanded={open}
    {disabled}
  >
    <span class="chevron">
      <Icon name="chevron-right" size={16} />
    </span>
    <span class="accordion-title">{title}</span>
    <slot name="header-extra" />
  </button>

  {#if open}
    <div class="accordion-content">
      <div class="content-inner">
        <slot />
      </div>
    </div>
  {/if}
</div>

<style>
  .accordion {
    border-bottom: 1px solid var(--color-border);
  }

  .accordion:last-child {
    border-bottom: none;
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3) var(--space-2);
    background: transparent;
    border: none;
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-smooth);
  }

  .accordion-header:hover:not(:disabled) {
    background: var(--color-surface-alt);
  }

  .accordion-header:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .accordion.disabled .accordion-header {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition: transform var(--duration-fast) var(--ease-smooth);
  }

  .accordion.open .chevron {
    transform: rotate(90deg);
  }

  .accordion-title {
    flex: 1;
  }

  .accordion-content {
    overflow: hidden;
    animation: accordion-open var(--duration-fast) var(--ease-smooth);
  }

  .content-inner {
    padding: var(--space-2) var(--space-2) var(--space-4) var(--space-6);
    border-left: 2px solid var(--color-border);
    margin-left: var(--space-2);
  }

  @keyframes accordion-open {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

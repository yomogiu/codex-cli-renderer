<script>
  export let variant = 'default'; // 'default' | 'primary' | 'accent' | 'ghost' | 'danger'
  export let size = 'md'; // 'sm' | 'md' | 'lg'
  export let disabled = false;
  export let loading = false;
  export let type = 'button';

  $: classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    disabled && 'btn-disabled'
  ].filter(Boolean).join(' ');
</script>

<button
  class={classes}
  {type}
  disabled={disabled || loading}
  on:click
  on:mouseenter
  on:mouseleave
  {...$$restProps}
>
  {#if loading}
    <span class="spinner" />
  {/if}
  <span class="content" class:hidden={loading}>
    <slot />
  </span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-body);
    font-weight: var(--font-weight-medium);
    border: 2px solid transparent;
    border-radius: 0; /* TUI: crisp corners */
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
    position: relative;
    white-space: nowrap;
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* Sizes */
  .btn-sm {
    height: 28px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
  }

  .btn-md {
    height: 36px;
    padding: 0 var(--space-4);
    font-size: var(--text-base);
  }

  .btn-lg {
    height: 44px;
    padding: 0 var(--space-6);
    font-size: var(--text-lg);
  }

  /* Variants */
  .btn-default {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text);
  }

  .btn-default:hover:not(:disabled) {
    background: var(--color-surface-alt);
    border-color: var(--color-border-strong);
    /* TUI: hard-edge shadow on hover */
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .btn-default:active:not(:disabled) {
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  .btn-primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    box-shadow: 2px 2px 0 var(--color-border-strong);
  }

  .btn-primary:active:not(:disabled) {
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  .btn-accent {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-primary);
  }

  .btn-accent:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
    /* TUI: hard-edge gold shadow */
    box-shadow: 2px 2px 0 var(--color-primary);
  }

  .btn-accent:active:not(:disabled) {
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  .btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--color-text);
  }

  .btn-ghost:hover:not(:disabled) {
    background: var(--color-surface-alt);
    border-color: var(--color-border);
  }

  .btn-ghost:active:not(:disabled) {
    background: var(--color-surface);
  }

  .btn-danger {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--color-status-error);
    border-color: var(--color-status-error);
    box-shadow: 2px 2px 0 var(--color-border-strong);
  }

  .btn-danger:active:not(:disabled) {
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  /* States */
  .btn:disabled,
  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-loading {
    cursor: wait;
  }

  .content.hidden {
    visibility: hidden;
  }

  /* Spinner - square for TUI aesthetic */
  .spinner {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 0;
    animation: spin 0.8s steps(8) infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

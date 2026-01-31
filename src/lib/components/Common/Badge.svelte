<script>
  export let variant = 'default'; // 'default' | 'idle' | 'working' | 'blocked' | 'error' | 'success' | 'warning' | 'info'
  export let size = 'md'; // 'sm' | 'md' | 'lg'
  export let pulse = false;
  export let dot = false;

  $: classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    pulse && 'badge-pulse',
    dot && 'badge-dot'
  ].filter(Boolean).join(' ');
</script>

<span class={classes} {...$$restProps}>
  {#if dot}
    <span class="dot" />
  {/if}
  <slot />
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-family: var(--font-body);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-full);
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Sizes */
  .badge-sm {
    height: 20px;
    padding: 0 var(--space-2);
    font-size: 10px;
  }

  .badge-md {
    height: 24px;
    padding: 0 var(--space-3);
    font-size: var(--text-xs);
  }

  .badge-lg {
    height: 28px;
    padding: 0 var(--space-4);
    font-size: var(--text-sm);
  }

  /* Variants */
  .badge-default {
    background: var(--color-surface-alt);
    color: var(--color-text);
  }

  .badge-idle {
    background: color-mix(in srgb, var(--color-status-idle) 20%, transparent);
    color: var(--color-status-idle);
  }

  .badge-working {
    background: color-mix(in srgb, var(--color-status-working) 20%, transparent);
    color: var(--color-status-working);
  }

  .badge-blocked {
    background: color-mix(in srgb, var(--color-status-blocked) 20%, transparent);
    color: var(--color-status-blocked);
  }

  .badge-error {
    background: color-mix(in srgb, var(--color-status-error) 20%, transparent);
    color: var(--color-status-error);
  }

  .badge-success {
    background: color-mix(in srgb, var(--color-success) 20%, transparent);
    color: var(--color-success);
  }

  .badge-warning {
    background: color-mix(in srgb, var(--color-warning) 20%, transparent);
    color: var(--color-warning);
  }

  .badge-info {
    background: color-mix(in srgb, var(--color-info) 20%, transparent);
    color: var(--color-info);
  }

  /* Dot indicator */
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .badge-dot {
    padding-left: var(--space-2);
  }

  /* Pulse animation for working state */
  .badge-pulse .dot {
    animation: badge-pulse 2s var(--ease-smooth) infinite;
  }

  @keyframes badge-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }
</style>

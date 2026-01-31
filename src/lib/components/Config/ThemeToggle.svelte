<script>
  import { theme } from '../../stores/theme.js';

  $: isDark = $theme === 'dark';
</script>

<button
  class="theme-toggle"
  on:click={theme.toggle}
  aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
  title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
>
  <span class="icon sun" class:active={!isDark}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  </span>
  <span class="icon moon" class:active={isDark}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </span>
</button>

<style>
  .theme-toggle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--ease-smooth),
                background-color var(--duration-fast) var(--ease-smooth);
  }

  .theme-toggle:hover {
    border-color: var(--color-accent);
    background: var(--color-surface-alt);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: var(--color-text-muted);
    transition: transform var(--duration-normal) var(--ease-bounce),
                opacity var(--duration-fast) var(--ease-smooth),
                color var(--duration-fast) var(--ease-smooth);
  }

  .icon svg {
    width: 100%;
    height: 100%;
  }

  .icon.sun {
    transform: translateY(-30px) rotate(-90deg);
    opacity: 0;
  }

  .icon.sun.active {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
    color: var(--color-accent);
  }

  .icon.moon {
    transform: translateY(30px) rotate(90deg);
    opacity: 0;
  }

  .icon.moon.active {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
    color: var(--color-accent);
  }
</style>

import { writable } from 'svelte/store';

const STORAGE_KEY = 'codex-cli-renderer-theme';
const DARK = 'dark';
const LIGHT = 'light';

/**
 * Get initial theme from localStorage or system preference
 */
function getInitialTheme() {
  if (typeof window === 'undefined') return LIGHT;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) {
    return stored;
  }

  // Check system preference
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return DARK;
  }

  return LIGHT;
}

/**
 * Create the theme store with persistence
 */
function createThemeStore() {
  const { subscribe, set, update } = writable(getInitialTheme());

  return {
    subscribe,

    /**
     * Toggle between light and dark themes
     */
    toggle: () => {
      update(current => {
        const next = current === DARK ? LIGHT : DARK;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, next);
        }
        return next;
      });
    },

    /**
     * Set theme explicitly
     * @param {'light' | 'dark'} value
     */
    set: (value) => {
      if (value !== DARK && value !== LIGHT) return;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
      set(value);
    },

    /**
     * Check if current theme is dark
     */
    isDark: () => {
      let current;
      subscribe(v => current = v)();
      return current === DARK;
    }
  };
}

export const theme = createThemeStore();

// Listen for system preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't explicitly set a preference
    if (!localStorage.getItem(STORAGE_KEY)) {
      theme.set(e.matches ? DARK : LIGHT);
    }
  });
}

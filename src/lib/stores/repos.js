import { writable, derived } from 'svelte/store';

/**
 * Repo color presets matching tokens.css
 * These hex values are used in Pixi.js (0x format)
 */
export const REPO_COLORS = {
  gold: { css: '#c9a227', pixi: 0xc9a227 },
  forest: { css: '#2d7d46', pixi: 0x2d7d46 },
  crimson: { css: '#8b2942', pixi: 0x8b2942 },
  slate: { css: '#4a6fa5', pixi: 0x4a6fa5 },
  purple: { css: '#6b4c9a', pixi: 0x6b4c9a },
  navy: { css: '#2d4a7c', pixi: 0x2d4a7c },
  amber: { css: '#b8860b', pixi: 0xb8860b },
  green: { css: '#3d7a4a', pixi: 0x3d7a4a },
  steel: { css: '#5c6b7a', pixi: 0x5c6b7a },
  bronze: { css: '#8b4513', pixi: 0x8b4513 },
  teal: { css: '#2f4f4f', pixi: 0x2f4f4f },
  charcoal: { css: '#4a4a4a', pixi: 0x4a4a4a },
};

/**
 * Status colors for sessions
 */
export const STATUS_COLORS = {
  light: {
    idle: { css: '#5c6b7a', pixi: 0x5c6b7a },
    working: { css: '#2d7d46', pixi: 0x2d7d46 },
    blocked: { css: '#b8860b', pixi: 0xb8860b },
    error: { css: '#8b2942', pixi: 0x8b2942 },
  },
  dark: {
    idle: { css: '#6e7681', pixi: 0x6e7681 },
    working: { css: '#3fb950', pixi: 0x3fb950 },
    blocked: { css: '#d29922', pixi: 0xd29922 },
    error: { css: '#f85149', pixi: 0xf85149 },
  }
};

/**
 * Available icons for repos (subset of Icon.svelte)
 */
export const REPO_ICONS = [
  'shield', 'shield-check', 'crown', 'sword', 'flag',
  'terminal', 'code', 'gear', 'layers', 'folder',
  'book', 'scroll', 'file-text', 'clipboard', 'list',
  'compass', 'pin', 'home', 'eye', 'search',
];

/**
 * Mock repository data
 * Each repo has a region defining its territory on the map
 */
const initialRepos = [
  {
    id: 'repo-alpha',
    label: 'repo-alpha',
    path: '/Users/dev/projects/alpha',
    color: 'slate',
    icon: 'terminal',
    profile: 'tech',
    region: { x: 120, y: 80, width: 200, height: 180 },
  },
  {
    id: 'repo-beta',
    label: 'repo-beta',
    path: '/Users/dev/projects/beta',
    color: 'forest',
    icon: 'code',
    profile: 'tech',
    region: { x: 320, y: 180, width: 200, height: 180 },
  },
  {
    id: 'repo-gamma',
    label: 'repo-gamma',
    path: '/Users/dev/projects/gamma',
    color: 'amber',
    icon: 'scroll',
    profile: 'equities',
    region: { x: 220, y: 320, width: 200, height: 180 },
  },
];

/**
 * Mock session data (one session per repo)
 */
const initialSessions = [
  {
    id: 'session-1',
    repoId: 'repo-alpha',
    status: 'idle',
    runId: null,
    taskCount: 0,
    position: { x: 200, y: 150 },
  },
  {
    id: 'session-2',
    repoId: 'repo-beta',
    status: 'working',
    runId: 'run-abc123',
    taskCount: 2,
    position: { x: 400, y: 250 },
  },
  {
    id: 'session-3',
    repoId: 'repo-gamma',
    status: 'blocked',
    runId: 'run-def456',
    taskCount: 1,
    position: { x: 300, y: 400 },
  },
];

/**
 * Repos store
 */
function createReposStore() {
  const { subscribe, set, update } = writable(initialRepos);

  return {
    subscribe,

    updateRepo: (id, updates) => {
      update(repos => repos.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ));
    },

    setColor: (id, color) => {
      update(repos => repos.map(r =>
        r.id === id ? { ...r, color } : r
      ));
    },

    setIcon: (id, icon) => {
      update(repos => repos.map(r =>
        r.id === id ? { ...r, icon } : r
      ));
    },
  };
}

/**
 * Sessions store
 */
function createSessionsStore() {
  const { subscribe, set, update } = writable(initialSessions);

  return {
    subscribe,

    updatePosition: (id, position) => {
      update(sessions => sessions.map(s =>
        s.id === id ? { ...s, position } : s
      ));
    },

    setStatus: (id, status) => {
      update(sessions => sessions.map(s =>
        s.id === id ? { ...s, status } : s
      ));
    },
  };
}

export const repos = createReposStore();
export const sessions = createSessionsStore();

/**
 * Derived store: sessions with their repo data merged
 */
export const sessionsWithRepos = derived(
  [sessions, repos],
  ([$sessions, $repos]) => {
    return $sessions.map(session => {
      const repo = $repos.find(r => r.id === session.repoId);
      return {
        ...session,
        repo,
        repoColor: repo ? REPO_COLORS[repo.color] : REPO_COLORS.steel,
        repoIcon: repo?.icon || 'shield',
      };
    });
  }
);

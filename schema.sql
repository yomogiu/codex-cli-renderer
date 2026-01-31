PRAGMA foreign_keys = ON;

-- Timestamps are ISO 8601 UTC strings (e.g., 2026-01-29T14:23:45Z).

CREATE TABLE repositories (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  repo_path TEXT NOT NULL UNIQUE,
  default_profile TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  repo_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('idle', 'starting', 'running', 'blocked', 'error', 'stopped')),
  run_id TEXT,
  pid INTEGER,
  cwd TEXT,
  shell TEXT,
  started_at TEXT,
  last_active_at TEXT,
  last_exit_code INTEGER,
  last_error TEXT,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  repo_id INTEGER NOT NULL,
  run_id TEXT,
  title TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  repo_id INTEGER NOT NULL,
  run_id TEXT,
  type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE TABLE artifacts (
  id INTEGER PRIMARY KEY,
  repo_id INTEGER NOT NULL,
  run_id TEXT,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_status ON sessions (status);
CREATE INDEX idx_tasks_repo_status ON tasks (repo_id, status);
CREATE INDEX idx_events_repo_created_at ON events (repo_id, created_at);
CREATE INDEX idx_artifacts_repo_created_at ON artifacts (repo_id, created_at);

# cli-renderer

Date: 2026-01-27

## Vision
A local, real-time control room that lets you run and monitor multiple Codex CLI sessions like RTS units on a map. The UI should make it fast to spawn sessions, assign tasks, watch progress, and review artifacts without losing the big picture.

## Principles
- Simple first: local-only, minimal dependencies, fast feedback loop.
- Observable: every session emits structured events and artifact links.
- RTS metaphor: sessions are units, tasks are orders, artifacts are supply depots.
- Repo-centric: most work happens per repo; context is a first-class filter.
- One-to-one: each repo maps to exactly one Codex session, one PTY per repo.
- Lightweight automation: simple rules and templates, no heavy scheduler.

## Requirements
- Each repo has exactly one Codex session; that session manages only that repo.
- UI can manage multiple repos, and therefore multiple concurrent Codex sessions.
- Adding a repo exposes it in the UI and creates an idle session record; a user action starts the session.
- All tasks, events, and artifacts are keyed by repo and the active run_id.
- Sessions cannot switch repos; repo membership is immutable per session.
- Local-only operation; remote access is out of scope.
- Task automation includes lightweight automation support.

## Core UX
- Map View: each repo is a region; each repo has exactly one session unit with state: idle, working, blocked, error.
- Command Panel: issue orders using prompt templates, file targets, skills, and scripts.
- Intel Panel: live logs, recent artifacts, context packs, and KB cards.
- Timeline: recent events, state transitions, and outputs.

## Visual Design
See `VISUAL-DESIGN.md` for typography, color system, spacing, motion, and map styling tokens.
Clarification: the map renderer uses Pixi.js canvas; visuals must be vector/canvas primitives only (no bitmap textures or image assets). Subtle noise should be achieved via CSS gradients on the container.

## MVP Feature Set
1. Spawn/terminate sessions per repo + profile: tech or equities.
2. Live status + logs per session via PTY capture.
3. RTS map view with draggable session nodes and status badges, one unit per repo.
4. Artifact feed for memos/context packs with file links.
5. Lightweight task queue per session with manual ordering.
6. Lightweight automation rules and task templates.
7. Configuration page to add/remove repos and assign defaults per repo.

## Architecture Overview

```
[UI: Browser] <--WS--> [Local API Server] <---> [Session Supervisor]
       |                                  |             |
       |                                  |             +-- PTY: codex CLI processes
       |                                  +-- SQLite: sessions, tasks, events
       +-- Static assets

[File Watcher] -----> [Event Bus] -----> [UI + DB]
```

### Components

1) UI
- Tech: Svelte + Pixi.js for the map, xterm.js for in-UI terminals.
- Panels: map, session inspector, command palette, artifacts, logs.
- WebSocket client for live updates; REST for CRUD.

2) Local API Server
- Tech: Node with Fastify and @fastify/websocket.
- REST for session/task CRUD; WebSocket for live events.
- Auth: local-only token or localhost restriction.

3) Session Supervisor
- Spawns Codex CLI sessions per repo, one PTY per repo with node-pty.
- Captures stdout/stderr, tags events, updates session state.
- Provides command queue + interrupt/stop.

4) Event Bus
- Normalizes events: state changes, log lines, artifact creation, errors.
- Writes to DB and broadcasts to UI.

5) Storage: SQLite
- Tables: sessions, tasks, events, artifacts.
- WAL enabled for good concurrent read/write behavior.

6) File/Artifact Watcher
- Watches `research/**` and `kb/**` for new/updated files.
- Emits artifact events tagged with repo_id + active run_id, no heuristic linking.

7) Configuration UI
- Manage the list of repos: add/remove/edit paths, label, domain defaults.
- Assign default profile per repo; adding a repo creates an idle session record.

## Data Model

Session
- id, repo_id unique, status, run_id, pid, cwd, shell, started_at, last_active_at, last_exit_code, last_error

Repository
- id, label, repo_path unique, default_profile, created_at, updated_at

Task
- id, repo_id, run_id, title, command, status, created_at, completed_at

Event
- id, repo_id, run_id, type, payload_json, created_at

Artifact
- id, repo_id, run_id, path, kind: memo|context-pack|manifest|card, created_at

## Event Types
Event types include:
- session.created | session.started | session.stopped
- session.status.changed
- log.stdout | log.stderr
- task.created | task.started | task.completed | task.failed
- artifact.created

## Data Flow
1. User adds a repo; the UI creates a repo record and an idle session record.
2. User clicks Start; the server spawns a codex PTY and assigns a new run_id.
3. Supervisor streams logs; events go to DB + WS.
4. File watcher detects new memo/context-pack and links it by repo_id + run_id.
5. UI shows unit state changes and artifact feed in real time.

## Configuration Page
- Repo list: add/remove/edit repo paths; validate path exists and contains `AGENTS.md`.
- Defaults: per-repo default profile: tech/equities; default shell/cwd.
- Session start: pick from repo list; add repo creates an idle session; Start button spawns the PTY.

## Efficiency Notes
- Keep it local: PTYs + sqlite + websockets are enough for real time.
- Avoid heavy orchestration: lightweight automation only, no global scheduler at MVP.
- Start with minimal parsing of log lines and the file watcher, then add structure later.

## Implementation Stack
- Backend: Node + Fastify + @fastify/websocket + node-pty.
- Frontend: Svelte + Pixi.js + xterm.js.
- Storage: SQLite with WAL enabled.
- Access: local-only.

## Risks / Constraints
- Codex CLI output parsing may be noisy; avoid heavy parsing in MVP.
- Process management on macOS/Windows needs careful PTY handling.
- Large log streams need throttling and server-side buffering.

## Suggested MVP Plan
- Sprint 1: backend + PTY + WS + basic UI list of sessions.
- Sprint 2: map view + artifact watcher + session inspector.
- Sprint 3: task queue + lightweight automation + command templates + basic analytics such as status charts.

---

Notes
- This is a first draft; refine as implementation progresses.

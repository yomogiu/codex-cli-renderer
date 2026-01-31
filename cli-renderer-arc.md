# Codex CLI Renderer Architecture Draft

Date: 2026-01-27

Created a first-pass architecture draft for Codex CLI Renderer at `cli-renderer.md`.

Highlights
- Local-only web UI with live session map, logs, and artifact feed.
- Session supervisor spawns one Codex PTY per repo (1:1 repo/session).
- SQLite persistence; file watcher ties artifacts to sessions.
- Stack: Node + Fastify + @fastify/websocket + node-pty, Svelte + Pixi.js + xterm.js.
- Add config page to manage repo list and per-repo defaults; adding a repo exposes it and leaves the session idle until started.
- Lightweight automation support for tasks and templates.
- Map rendering uses Pixi.js canvas with vector primitives only; no bitmap textures or image assets (noise via CSS gradients on the container).
- Visual design tokens are tracked in `VISUAL-DESIGN.md`.

Next
- Implement schema and wire up session lifecycle flows.

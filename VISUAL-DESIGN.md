# Codex CLI Renderer Visual Design

Status: Active
Updated: 2026-01-29

## Design Decisions

- **Theme**: Dark mode toggle, light and dark variants
- **Repo Identity**: User-assignable colors and icons per repo
- **MVP Scope**: Pixel/TUI-inspired UI; Pixi.js map renderer allowed; no bitmap textures or image assets

## Design Philosophy

Emulate the visual language of grand strategy games while keeping a pixel/TUI sensibility. The UI should feel like a command center: crisp edges, strong grids, and readable system-status visuals. Avoid ornate textures or heavy illustrations; prefer CSS-only shapes and deliberate typography.

---

## Color Palette

### Light Theme

**Primary (Command/Authority)**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1a2744` | Main backgrounds, authority |
| `--color-primary-hover` | `#2d4a7c` | Active states, selection |
| `--color-accent` | `#c9a227` | Highlights, important actions |

**Status Colors (Session States)**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-status-idle` | `#5c6b7a` | Dormant, ready |
| `--color-status-working` | `#2d7d46` | Active operations |
| `--color-status-blocked` | `#b8860b` | Awaiting input |
| `--color-status-error` | `#8b2942` | Failure state |

**Surfaces**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface` | `#f4e9d9` | Panel backgrounds |
| `--color-surface-alt` | `#d4c4a8` | Secondary surfaces |
| `--color-text` | `#1c1c1e` | Primary text |

**Semantic**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#3d7a4a` | Success states |
| `--color-warning` | `#a67c00` | Warning states |
| `--color-info` | `#4a6fa5` | Info states |

### Dark Theme

**Surfaces**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0d1117` | Main background |
| `--color-surface` | `#161b22` | Panel backgrounds |
| `--color-surface-elevated` | `#21262d` | Elevated surfaces |
| `--color-border` | `#30363d` | Dividers, borders |

**Text**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text` | `#e6edf3` | Primary text |
| `--color-text-muted` | `#8b949e` | Secondary text |
| `--color-accent` | `#c9a227` | Gold accent (same) |

**Status Colors** (brighter for dark bg)
| Token | Value |
|-------|-------|
| `--color-status-idle` | `#6e7681` |
| `--color-status-working` | `#3fb950` |
| `--color-status-blocked` | `#d29922` |
| `--color-status-error` | `#f85149` |

---

## Typography

### Font Stack

```css
--font-heading: "Cinzel", "Trajan Pro", serif;
--font-body: "Source Sans 3", "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
--font-decorative: "Cormorant Garamond", serif;
```

### Scale

```css
--text-xs: 0.75rem;     /* 12px - timestamps, badges */
--text-sm: 0.875rem;    /* 14px - secondary text */
--text-base: 1rem;      /* 16px - body text */
--text-lg: 1.125rem;    /* 18px - panel headers */
--text-xl: 1.5rem;      /* 24px - section titles */
--text-2xl: 2rem;       /* 32px - main headings */
```

### Weights

```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

---

## Spacing

### Base Unit: 4px

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
```

### Layout Grid

- Map view: 60-70% of viewport
- Side panels: 300-400px fixed width
- Collapsed panels: 48px (icon-only)

---

## Elevation

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
--shadow-glow: 0 0 20px rgba(201, 162, 39, 0.3);
```

---

## Border Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

---

## Motion & Animation

### Timing Functions

```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);
```

### Durations

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
```

### Key Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Panel slide | translateX | 250ms | ease-smooth |
| Accordion expand | height + rotate | 200ms | ease-smooth |
| Session pulse | box-shadow | 2s loop | ease-smooth |
| Status change | border-color + scale | 300ms | ease-bounce |
| Drag ghost | opacity | 100ms | linear |
| Toast enter | translateY + fade | 200ms | ease-bounce |
| Map zoom | scale | 300ms | ease-smooth |
| Error shake | translateX wiggle | 400ms | ease-sharp |

---

## Map Styling

### Background
- Pixel grid lines, low-contrast
- Subtle noise via CSS gradients only (overlay on the canvas/container)
- No image/bitmap textures

### Renderer
- Map rendering uses Pixi.js canvas
- Visuals should use vector/canvas primitives (lines, rects, simple shapes)
- No bitmap textures or photographic assets

### Repo Regions
- Rectilinear regions with crisp borders
- User-assignable colors (12 presets + custom)

### Session Units (Heraldic Shields)
- Shield-inspired iconography, but rendered with pixel/line art
- Border color indicates status
- Pulse/glow allowed, keep subtle
- User-assignable icon (~30 options)

### Visual Effects
- Parallax optional, keep minimal
- Compass glyph ok if rendered as line icon
- No fog overlays or texture layers

### Interactions
- Drag to pan (grab cursor)
- Scroll to zoom (smooth momentum)
- Click to select (gold border)
- Double-click to inspect
- Right-click for context menu

---

## Panel Styling

### Header Treatment
```
╔══════════════════════════════╗
║ ❧ PANEL TITLE              ▼ ║
╠══════════════════════════════╣
```
- Decorative flourish prefix
- Collapse chevron
- Double-line or pixel border using CSS only

### Behaviors
- Drag edge to resize
- Double-click header to collapse
- Pin/unpin toggle
- Stack multiple panels

---

## Component Patterns

### Session Unit Glyph
```
┌─────────────────┐
│    [status]     │  ← Gear, pause, warning, X
│   ┌───────┐     │
│   │ ICON  │     │  ← User-chosen icon
│   │ REPO  │     │  ← Repo name (truncated)
│   └───────┘     │
│   ● ● ○ ○ ○     │  ← Task queue indicator
└─────────────────┘
```

### Accordion
```
▶ Collapsed Section
▼ Expanded Section
  │ Content here
  └────────────────
```

### Context Menu (EU4-style)
- Semi-transparent overlay
- Icons + labels + keyboard shortcuts
- Nested submenus supported

### Toast Notifications
- Slide from top-right
- Status-colored left border
- Auto-dismiss after 5s
- Click to navigate
- Stack with count badge

---

## Repo Customization

### Color Presets (12)
```
#c9a227  Gold        #2d7d46  Forest
#8b2942  Crimson     #4a6fa5  Slate
#6b4c9a  Purple      #2d4a7c  Navy
#b8860b  Amber       #3d7a4a  Green
#5c6b7a  Steel       #8b4513  Bronze
#2f4f4f  Teal        #4a4a4a  Charcoal
```

### Icon Set (~30)
Shields, animals (lion, eagle, wolf), symbols (star, crown, sword), tech icons (gear, terminal, code)

---

## Responsive Behavior

### Breakpoints
- Desktop: > 1200px (full layout)
- Tablet: 768-1200px (collapsible panels)
- Mobile: < 768px (out of scope)

### Density Modes
- Comfortable: Default spacing
- Compact: Reduced spacing (toggle in settings)

---

## Assets Required
### SVG Graphics
1. Decorative corner flourishes (line art)
2. Compass glyph
3. Panel header flourish
4. Icon set (30+ icons)

### Fonts (Google Fonts)
1. Cinzel (headings)
2. Source Sans 3 (body)
3. JetBrains Mono (code)
4. Cormorant Garamond (decorative labels)

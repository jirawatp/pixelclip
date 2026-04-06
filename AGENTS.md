# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `packages/adapters/`: agent adapter implementations (Claude, Codex, Cursor, etc.)
- `packages/adapter-utils/`: shared adapter utilities
- `packages/plugins/`: plugin system packages
- `doc/`: operational and product docs

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

5. Keep plan docs dated and centralized.
New plan documents belong in `doc/plans/` and should use `YYYY-MM-DD-slug.md` filenames.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Pull Request Requirements

When creating a pull request (via `gh pr create` or any other method), you **must** read and fill in every section of [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Do not craft ad-hoc PR bodies — use the template as the structure for your PR description. Required sections:

- **Thinking Path** — trace reasoning from project context to this change (see `CONTRIBUTING.md` for examples)
- **What Changed** — bullet list of concrete changes
- **Verification** — how a reviewer can confirm it works
- **Risks** — what could go wrong
- **Model Used** — the AI model that produced or assisted with the change (provider, exact model ID, context window, capabilities). Write "None — human-authored" if no AI was used.
- **Checklist** — all items checked

## 11. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
5. PR description follows the [PR template](.github/PULL_REQUEST_TEMPLATE.md) with all sections filled in (including Model Used)

## 11. Fork-Specific: HenkDz/paperclip

This is a fork of `paperclipai/paperclip` with QoL patches and an **external-only** Hermes adapter story on branch `feat/externalize-hermes-adapter` ([tree](https://github.com/HenkDz/paperclip/tree/feat/externalize-hermes-adapter)).

### Branch Strategy

- `feat/externalize-hermes-adapter` → core has **no** `hermes-paperclip-adapter` dependency and **no** built-in `hermes_local` registration. Install Hermes via the Adapter Plugin manager (`@henkey/hermes-paperclip-adapter` or a `file:` path).
- Older fork branches may still document built-in Hermes; treat this file as authoritative for the externalize branch.

### Hermes (plugin only)

- Register through **Board → Adapter manager** (same as Droid). Type remains `hermes_local` once the package is loaded.
- UI uses generic **config-schema** + **ui-parser.js** from the package — no Hermes imports in `server/` or `ui/` source.
- Optional: `file:` entry in `~/.paperclip/adapter-plugins.json` for local dev of the adapter repo.

### Local Dev

- Fork runs on port 3101+ (auto-detects if 3100 is taken by upstream instance)
- `npx vite build` hangs on NTFS — use `node node_modules/vite/bin/vite.js build` instead
- Server startup from NTFS takes 30-60s — don't assume failure immediately
- Kill ALL paperclip processes before starting: `pkill -f "paperclip"; pkill -f "tsx.*index.ts"`
- Vite cache survives `rm -rf dist` — delete both: `rm -rf ui/dist ui/node_modules/.vite`

### Fork QoL Patches (not in upstream)

These are local modifications in the fork's UI. If re-copying source, these must be re-applied:

1. **stderr_group** — amber accordion for MCP init noise in `RunTranscriptView.tsx`
2. **tool_group** — accordion for consecutive non-terminal tools (write, read, search, browser)
3. **Dashboard excerpt** — `LatestRunCard` strips markdown, shows first 3 lines/280 chars

### Plugin System

PR #2218 (`feat/external-adapter-phase1`) adds external adapter support. See root `AGENTS.md` for full details.

- Adapters can be loaded as external plugins via `~/.paperclip/adapter-plugins.json`
- The plugin-loader should have ZERO hardcoded adapter imports — pure dynamic loading
- `createServerAdapter()` must include ALL optional fields (especially `detectModel`)
- Built-in UI adapters can shadow external plugin parsers — remove built-in when fully externalizing
- Reference external adapters: Hermes (`@henkey/hermes-paperclip-adapter` or `file:`) and Droid (npm)

## 12. Pixelclip Fork — Pixel-Art Virtual Office

This is a fork of `paperclipai/paperclip` that replaces the standard dashboard UI with a **2D pixel-art virtual office** where AI agents appear as pixel characters at desks.

- **Repo**: `jirawatp/pixelclip`
- **Branch**: `feat/pixel-art-virtual-office`
- **Backend**: Unchanged from upstream Paperclip (all `server/`, `packages/`, `cli/` are identical)
- **Frontend**: The `ui/` directory adds a pixel-art engine layer and component set; the original pages remain accessible

## 13. Pixel-Art Architecture

### Engine (`ui/src/engine/`)

| File | Purpose |
|------|---------|
| `OfficeCanvas.tsx` | Main Canvas 2D renderer. Pan/zoom/click. Wrapped in `React.memo`. Render loop reads from refs to survive re-renders |
| `OfficeLayout.ts` | Converts agent list → office floor plan. Rooms: CEO office, meeting room, managers area, open floor, break room, control room |
| `ProceduralPixelArt.ts` | PICO-8 palette procedural sprite generator. Draws characters, furniture, speech/thought bubbles, status icons. **No external image assets** — everything is runtime-generated and cached |
| `OfficeEventBridge.ts` | Maps WebSocket `LiveEvent` → `OfficeAnimation` queue (20+ animation types: working, thinking, sleeping, error, celebrating, task-assigned, heartbeat, etc.) |
| `types.ts` | Shared types: `OfficeRoom`, `FurnitureItem`, `AgentCharacterState`, `CameraState`, `ClickTarget` |

### Pixel UI Components (`ui/src/components/pixel/`)

| Component | Purpose |
|-----------|---------|
| `AgentDetailPanel.tsx` | Right sidebar: agent info, pixel avatar, budget bar, activity terminal, action buttons |
| `OrgBoardModal.tsx` | Full org chart dashboard. Opens when clicking the org board object in the meeting room |
| `TaskBoardModal.tsx` | Pixel kanban board with sticky-note cards. Opens when clicking the whiteboard |
| `ControlRoomModal.tsx` | Stats dashboard with pixel meters and bar charts. Opens when clicking the big monitor |
| `OfficeToolbar.tsx` | Floating top toolbar: company name, view toggle (Office/List), agent count badge |
| `PixelPanel.tsx` | Reusable retro OS-style window component (title bar, close button, pixel borders) |
| `PixelLoadingScreen.tsx` | Animated loading screen with pixel office building icon and progress bar |

### Hooks (`ui/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useOfficeAnimations` | Subscribes to the global `AnimationQueue`, drains expired animations, returns active animations per agent |
| `useOfficeEventPipe` | Lightweight WebSocket bridge: connects to `/api/companies/{id}/events/ws`, parses events, feeds animation queue |

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/:prefix/dashboard` | `VirtualOffice` | Pixel-art office (default) |
| `/:prefix/dashboard/classic` | `Dashboard` | Original Paperclip dashboard |

## 14. Pixel-Art Development Rules

1. **No external image assets.** All sprites are procedural (`ProceduralPixelArt.ts`). Add new visuals by writing draw functions, not importing images.

2. **PICO-8 palette only.** Use the 16-color palette via the `PICO8` constant. Do not introduce colors outside the palette.

3. **Render loop pattern.** The Canvas render loop runs via `requestAnimationFrame` inside a `useEffect` with no dependency array. Layout and agent state are read from refs (`layoutRef`, `agentStatesRef`) to survive React re-renders and StrictMode double-invocation. **Do NOT use `useState` for data consumed by the render loop.**

4. **Adding interactive objects.** A new clickable office object needs:
   - (a) Draw function in `ProceduralPixelArt.ts`
   - (b) Placement in `OfficeLayout.ts` with `interactive: true` and `interactionType`
   - (c) Click handler in `OfficeCanvas.tsx` (world-coordinate hit test)
   - (d) Modal or panel in `VirtualOffice.tsx`

5. **Adding real-time animations.** New WebSocket events need:
   - (a) Mapping in `OfficeEventBridge.ts` → `mapLiveEventToAnimations`
   - (b) Visual handling in the `OfficeCanvas.tsx` render loop

6. **Pixel theme CSS classes.** Use these from `ui/src/index.css`:
   `.pixel-font`, `.pixel-panel`, `.pixel-panel-title`, `.pixel-btn`, `.pixel-btn-primary`, `.pixel-btn-danger`, `.pixel-btn-success`, `.pixel-input`, `.pixel-progress`, `.pixel-terminal`, `.pixel-badge`, `.pixel-tooltip`, `.pixel-scroll`

## 15. GCP Infrastructure

| Component | Detail |
|-----------|--------|
| GCP Project | `canvas-spark-419908` |
| VM | `paperclip-server` (`e2-highmem-4`, `asia-southeast1-a`) |
| SSH User | `jirawat_pattan_gmail_com` |
| PostgreSQL | `localhost:5432` — user: `paperclip`, db: `paperclip` |
| Ollama | `localhost:11434` (gemma3:27b) |
| Paperclip | `localhost:3100` — systemd `paperclip.service` |
| Cloudflare Tunnel | `paperclip-gcp` → `paperclip.jirawat.dev` |

## 16. Local Dev with GCP Backend

```sh
# 1. SSH tunnel — forward Paperclip API from GCP VM to localhost
gcloud compute ssh paperclip-server \
  --zone=asia-southeast1-a \
  --project=canvas-spark-419908 \
  -- -L 3100:localhost:3100 -N -f

# 2. Start pixel-art frontend (proxies /api to the tunnel)
cd ui && pnpm dev   # → http://localhost:5173
```

The Vite proxy in `ui/vite.config.ts` forwards `/api` requests to `localhost:3100`.

# Pixelclip — Task Tracker

Branch: `feat/pixel-art-virtual-office`
Last updated: 2026-04-06

---

## Completed

- [x] Fork paperclip → `jirawatp/pixelclip`
- [x] Branding updates (package.json name, README, index.html title)
- [x] PICO-8 pixel-art theme CSS (pixel-font, pixel-panel, pixel-btn, pixel-progress, pixel-terminal, animations)
- [x] Procedural pixel art generator — characters (6 poses), desks, chairs, whiteboards, org boards, filing cabinets, water coolers, plants, monitors, doors, floor/wall/window tiles, speech/thought bubbles, status icons (exclamation, ZZZ, gear, heart, checkmark)
- [x] 2D office canvas engine with Canvas 2D API (pan, zoom, click detection)
- [x] Office layout generator — CEO corner office, meeting room, manager area (multi-row grid), open floor, break room, control room
- [x] Agent pixel characters at desks with name labels and color-coded avatars
- [x] WebSocket → animation event bridge (20+ animation types mapped from LiveEvents)
- [x] Agent detail side panel (pixel avatar, status, role, budget bar, current task, activity terminal, Full Profile / Pause buttons)
- [x] Organization board modal (hierarchical org chart, click org board in meeting room)
- [x] Task board modal (pixel kanban with Backlog/In Progress/Done columns, sticky-note cards)
- [x] Control room modal (stat counters, pixel meters, bar chart, click big monitor)
- [x] Office toolbar (company name, Office/List view toggle, agent count badge)
- [x] Pixel loading screen component (pixel office icon, progress bar, "Loading office..." text)
- [x] SSH tunnel to GCP backend for local development
- [x] Verified rendering with real data (12 agents from "Big Capital" company)
- [x] Org board modal tested — shows all 12 agents with roles and status dots

---

## In Progress

(None)

---

## Pending — High Priority

- [x] Fix canvas render loop persistence (Fixed via CSS absolute/visibility pattern decoupling the vanilla Renderer from React conditional rendering)
- [ ] Commit the 3 uncommitted fix files and push to GitHub
- [ ] Deploy Pixelclip to GCP VM alongside existing Paperclip (port 3200, `pixelclip.jirawat.dev`)
- [ ] Create Cloudflare Tunnel route + DNS CNAME + Access policy for `pixelclip.jirawat.dev`

---

## Phase 2: Gather.town Style RPG Rewrite
- [ ] Implement `InputManager` for WASD/Arrow key tracking
- [ ] Add `Player` entity to `OfficeRenderer` state (position, state, orientation)
- [ ] Add `drawPlayerAvatar` to `ProceduralPixelArt.ts` (4 directions, walking animation frames)
- [ ] Update `OfficeRenderer` camera to lock onto the player coordinates
- [ ] Implement collision detection map (walls, desks, edges)
- [ ] Implement Z-sorting (draw floor first, then sort player/agents/furniture by Y-coordinate)
- [ ] Add Proximity system (calculate distance to agents/objects, highlight closest)
- [ ] Bind 'Space' to trigger `onObjectClick` / `onAgentClick` for the closest highlighted interaction target
- [ ] Add a visual interaction prompt (e.g., "[ SPACE ]") floating above highlighted objects

---

## Pending — Features

### Agent Animations (real-time)
- [ ] Speech bubbles showing current task text (wire to `run.started` WebSocket events)
- [ ] Thought bubbles showing reasoning phase (wire to `run` events with thinking status)
- [ ] Working/typing frame animation (alternate between idle and working sprite frames)
- [ ] Heartbeat pulse glow on active agents
- [ ] Task completion celebration animation (bounce + checkmark)
- [ ] Error exclamation animation with shake
- [ ] ZZZ sleeping particles for paused/budget-exceeded agents
- [ ] Task-assigned animation (document flying to desk)

### Interactive Office
- [ ] "Full Profile" button navigates to original Paperclip agent detail page (`/agents/:id`)
- [ ] "Pause/Resume" button in agent panel calls real `agentsApi.pause()`/`agentsApi.resume()`
- [ ] "Hire Agent" button in org board opens new agent wizard
- [ ] Drag-to-reorganize desks (update agent.managerId)
- [ ] Click on agent in sidebar → camera pans to their desk

### Real Data Integration
- [ ] Agent panel: real budget from API (`agent.budgetMonthlyCents` / `agent.spentMonthlyCents`)
- [ ] Agent panel: real activity log from `activityApi.list(companyId, { agentId })`
- [ ] Agent panel: current task from active run data
- [ ] Task board: verify issue status mapping (backlog/in_progress/done categorization)
- [ ] Control room: wire to real `dashboardApi.summary()` data
- [ ] Control room: real goal progress from `goalsApi.list()`

### Visual Enhancements
- [ ] Day/night cycle (office lights change based on local time)
- [ ] Custom pixel character colors per agent (based on agent.icon or hash of name)
- [ ] Mini-map overlay (toggle from toolbar)
- [ ] Hover tooltips on furniture objects ("Click to open Organization Board")
- [ ] Agent status dot colors on the canvas (green=active, yellow=paused, red=error)

### Audio
- [ ] 8-bit background music (mutable, via Howler.js)
- [ ] Click sounds on buttons and objects
- [ ] Notification sounds for WebSocket events
- [ ] Typing sounds when agents are working

### Mobile
- [ ] Touch drag to pan
- [ ] Pinch-to-zoom
- [ ] Tap agent to open panel
- [ ] Responsive toolbar layout

---

## Pending — Polish

- [ ] Remove debug overlay (red square + "rooms:N agents:N" text in top-left)
- [ ] Remove `console.log` statements from render function
- [ ] Clean up unused `globalRenderFns` / `MutableRefObject` imports
- [ ] Remove `placeholderData` type annotation workaround
- [ ] Verify production build renders correctly (`pnpm build && npx vite preview`)
- [ ] Update Notion documentation with Pixelclip deployment info
- [ ] Add Pixelclip entry to Notion subdomains table

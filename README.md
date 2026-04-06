# Pixelclip

**Pixel-Art Virtual Office AI Orchestration Platform**

A fork of [paperclipai/paperclip](https://github.com/paperclipai/paperclip) reimagined as a 2D pixel-art virtual office where your AI agents work as pixel characters at desks.

## What is Pixelclip?

Pixelclip keeps 100% of Paperclip's backend functionality (70+ services, 7 agent adapters, plugin system, real-time WebSocket coordination, budgets, governance) but replaces the standard dashboard UI with an interactive pixel-art virtual office.

### Virtual Office Features

- **Agent Characters** — Each AI agent is a pixel character sitting at a desk with working, thinking, idle, sleeping, and error animations
- **Speech & Thought Bubbles** — Agents show what they're doing (speech bubbles) and what they're thinking (thought bubbles) in real-time
- **Organization Board** — Click the office bulletin board to open a full org chart dashboard for managing agent hierarchy
- **Task Board** — Click the office whiteboard for a pixel-art kanban board with sticky-note task cards
- **Control Room** — Dashboard monitor showing company stats, costs, and activity charts
- **Real-Time Animations** — WebSocket events trigger office animations (typing, celebrating, sleeping, errors)
- **Interactive Office** — Pan and zoom around the office, click agents and objects to interact
- **PICO-8 Palette** — 16-color retro aesthetic with Press Start 2P pixel font

### Backend (unchanged from Paperclip)

- Bring Your Own Agent (Claude, Gemini, Codex, Cursor, OpenClaw, and more)
- Goal-aligned task management with full traceability
- Heartbeat-driven agent orchestration
- Cost control with per-agent budgets
- Multi-company support with data isolation
- Board governance and approval gates
- Plugin system with TypeScript SDK
- Scheduled routines and skill management

## Quick Start

```bash
git clone https://github.com/jirawatp/pixelclip.git
cd pixelclip
pnpm install
pnpm dev
```

Open http://localhost:4888 and you'll see the pixel-art virtual office.

## Tech Stack

- **Backend**: Node.js, Express 5, PostgreSQL (Drizzle ORM), WebSockets
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Canvas 2D API
- **Pixel Art**: Procedurally generated (PICO-8 palette, no external sprites needed)
- **Font**: Press Start 2P

## License

MIT — see [LICENSE](LICENSE)

Based on [Paperclip](https://github.com/paperclipai/paperclip) by PaperclipAI.

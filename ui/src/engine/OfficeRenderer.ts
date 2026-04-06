/**
 * OfficeRenderer
 *
 * A standalone vanilla-JS render engine for the pixel-art virtual office.
 * Completely decoupled from React — React merely calls setter methods to
 * update data, while the render loop runs independently via
 * requestAnimationFrame until `unmount()` is called.
 *
 * This solves the persistent bug where React StrictMode re-renders and
 * useEffect cleanup would kill the animation loop.
 */

import { generateOfficeLayout, findAgentDesk, TILE_SIZE } from "./OfficeLayout";
import type { OfficeLayoutData, CameraState, AgentCharacterState } from "./types";
import {
  drawCharacter,
  drawDesk,
  drawChair,
  drawWhiteboard,
  drawOrgBoard,
  drawFilingCabinet,
  drawWaterCooler,
  drawPlant,
  drawBigMonitor,
  drawDoor,
  drawFloorTile,
  drawWallTile,
  drawWindowTile,
  drawSpeechBubble,
  drawThoughtBubble,
  drawExclamation,
  drawZZZ,
  drawHeartPulse,
  drawCheckmark,
  drawGear,
  PICO8,
  type CharacterPose,
} from "./ProceduralPixelArt";
import { officeAnimationQueue, type OfficeAnimation } from "./OfficeEventBridge";

// Scale factor for rendering (pixels per tile unit)
const SCALE = 2;
const PX_PER_TILE = TILE_SIZE;

export class OfficeRenderer {
  // --- DOM elements ---
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // --- State ---
  private layout: OfficeLayoutData = { rooms: [], totalWidth: 0, totalHeight: 0 };
  private agentStates: AgentCharacterState[] = [];
  private camera: CameraState = { x: 0, y: 0, zoom: 0.7 };
  private cameraInitialized = false;
  private frame = 0;

  // --- Interaction ---
  private drag = { dragging: false, lastX: 0, lastY: 0 };
  private onAgentClick: ((agentId: string) => void) | null = null;
  private onObjectClick: ((objectType: string) => void) | null = null;

  // --- Lifecycle ---
  private running = false;
  private rafId = 0;

  // --- Bound event handlers (for cleanup) ---
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundMouseLeave: ((e: MouseEvent) => void) | null = null;
  private boundWheel: ((e: WheelEvent) => void) | null = null;
  private boundClick: ((e: MouseEvent) => void) | null = null;
  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Mount the renderer onto a container element. Creates the canvas and starts
   * the render loop.
   */
  mount(
    container: HTMLDivElement,
    callbacks: {
      onAgentClick?: (agentId: string) => void;
      onObjectClick?: (objectType: string) => void;
    } = {},
  ): void {
    if (this.running) this.unmount();

    this.container = container;
    this.onAgentClick = callbacks.onAgentClick ?? null;
    this.onObjectClick = callbacks.onObjectClick ?? null;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.cursor = "grab";
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");

    // Bind event listeners
    this.bindEvents();

    // Start render loop
    this.running = true;
    this.frame = 0;
    this.cameraInitialized = false;
    this.loop();
  }

  /** Stop the render loop and remove the canvas from the DOM. */
  unmount(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.unbindEvents();
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.container = null;
  }

  /**
   * Move the existing canvas to a new container element WITHOUT stopping
   * the render loop. This is used when React gives us a new container DOM
   * element (e.g. after a re-render) but we want to keep the same renderer.
   */
  reparent(newContainer: HTMLDivElement): void {
    if (!this.canvas) return;

    // Remove from old container if still attached
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    // Attach to new container
    this.container = newContainer;
    newContainer.appendChild(this.canvas);
  }

  /** Update the agent list. Layout is regenerated automatically. */
  setAgents(agents: any[]): void {
    this.layout = generateOfficeLayout(agents);

    const states: AgentCharacterState[] = [];
    agents.forEach((agent: any, index: number) => {
      const desk = findAgentDesk(this.layout, agent.id);
      if (!desk) return;

      let pose: CharacterPose = "idle";
      const status = agent.status?.toLowerCase() ?? "";
      if (status === "running" || status === "active") pose = "working";
      if (status === "paused") pose = "sleeping";
      if (status === "error") pose = "error";
      if (status === "terminated") pose = "sleeping";

      states.push({
        agentId: agent.id,
        name: agent.name ?? "Agent",
        role: agent.role ?? "",
        status,
        colorSchemeIndex: index,
        deskPosition: {
          x: (desk.roomX + desk.deskX) * PX_PER_TILE,
          y: (desk.roomY + desk.deskY) * PX_PER_TILE,
        },
        pose,
        animationFrame: 0,
      });
    });
    this.agentStates = states;
  }

  /** Smoothly pan the camera to a specific agent's desk. */
  panToAgent(agentId: string): void {
    const agent = this.agentStates.find((a) => a.agentId === agentId);
    if (!agent) return;
    // Target center of agent desk
    this.camera.x = agent.deskPosition.x * SCALE + (PX_PER_TILE * SCALE) / 2;
    this.camera.y = (agent.deskPosition.y + PX_PER_TILE) * SCALE;
    this.camera.zoom = Math.max(0.8, this.camera.zoom);
  }

  /** Check if running. */
  isRunning(): boolean {
    return this.running;
  }

  // =========================================================================
  // Render loop
  // =========================================================================

  private loop = (): void => {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const canvas = this.canvas;
    const container = this.container;
    const ctx = this.ctx;
    if (!canvas || !container || !ctx) return;

    const layout = this.layout;
    const agentStates = this.agentStates;

    // Size canvas to container
    const rect = container.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w === 0 || h === 0) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Auto-center camera on first render with valid layout
    if (!this.cameraInitialized && layout.totalWidth > 0 && w > 0) {
      const centerX = (layout.totalWidth * PX_PER_TILE * SCALE) / 2;
      const centerY = (layout.totalHeight * PX_PER_TILE * SCALE) / 2;
      const fitZoomX = w / (layout.totalWidth * PX_PER_TILE * SCALE);
      const fitZoomY = h / (layout.totalHeight * PX_PER_TILE * SCALE);
      const fitZoom = Math.min(fitZoomX, fitZoomY) * 0.85;
      this.camera = { x: centerX, y: centerY, zoom: Math.max(0.3, Math.min(1.5, fitZoom)) };
      this.cameraInitialized = true;
    }

    ctx.resetTransform();
    ctx.imageSmoothingEnabled = false;

    const cam = this.camera;
    const zoom = cam.zoom;

    // Clear
    ctx.fillStyle = PICO8.darkBlue;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-cam.x * zoom + w / 2, -cam.y * zoom + h / 2);
    ctx.scale(zoom, zoom);

    const frame = this.frame;

    // Draw floor for each room
    for (const room of layout.rooms) {
      for (let ty = 0; ty < room.height; ty++) {
        for (let tx = 0; tx < room.width; tx++) {
          const worldX = (room.x + tx) * PX_PER_TILE * SCALE;
          const worldY = (room.y + ty) * PX_PER_TILE * SCALE;
          const variant = (tx + ty) % 2 === 0 ? "light" : "dark";

          if (ty === 0) {
            const tile = tx === Math.floor(room.width / 2)
              ? drawWindowTile(SCALE)
              : drawWallTile(SCALE);
            ctx.drawImage(tile, worldX, worldY);
          } else {
            ctx.drawImage(drawFloorTile(SCALE, variant as "light" | "dark"), worldX, worldY);
          }
        }
      }

      // Room label
      ctx.fillStyle = PICO8.lightGray;
      ctx.font = `${7 * SCALE}px 'Press Start 2P', monospace`;
      ctx.globalAlpha = 0.4;
      ctx.fillText(
        room.label ?? room.type,
        (room.x + 1) * PX_PER_TILE * SCALE,
        (room.y + room.height - 0.5) * PX_PER_TILE * SCALE,
      );
      ctx.globalAlpha = 1;

      // Draw furniture
      for (const furn of room.furniture) {
        const fx = (room.x + furn.x) * PX_PER_TILE * SCALE;
        const fy = (room.y + furn.y) * PX_PER_TILE * SCALE;

        switch (furn.type) {
          case "desk": {
            const isAgentWorking = furn.agentId
              ? agentStates.find((a) => a.agentId === furn.agentId)?.pose === "working"
              : false;
            ctx.drawImage(drawDesk(SCALE, isAgentWorking), fx, fy);
            break;
          }
          case "chair":
            ctx.drawImage(drawChair(SCALE), fx, fy);
            break;
          case "whiteboard":
            ctx.drawImage(drawWhiteboard(SCALE), fx, fy);
            break;
          case "org-board":
            ctx.drawImage(drawOrgBoard(SCALE), fx, fy);
            break;
          case "filing-cabinet":
            ctx.drawImage(drawFilingCabinet(SCALE), fx, fy);
            break;
          case "water-cooler":
            ctx.drawImage(drawWaterCooler(SCALE), fx, fy);
            break;
          case "plant":
            ctx.drawImage(drawPlant(SCALE), fx, fy);
            break;
          case "big-monitor":
            ctx.drawImage(drawBigMonitor(SCALE), fx, fy);
            break;
          case "door":
            ctx.drawImage(drawDoor(SCALE), fx, fy);
            break;
        }

        // Interactive highlight on hover (visual hint)
        if (furn.interactive && furn.label) {
          ctx.fillStyle = PICO8.yellow;
          ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.05;
          ctx.fillRect(fx - 2, fy - 2, PX_PER_TILE * SCALE + 4, PX_PER_TILE * SCALE + 4);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Draw agent characters
    for (const agentState of agentStates) {
      const ax = agentState.deskPosition.x * SCALE;
      const ay = (agentState.deskPosition.y + PX_PER_TILE) * SCALE;

      // Determine current pose based on animations
      let currentPose = agentState.pose;
      const agentAnims = officeAnimationQueue.forAgent(agentState.agentId);
      for (const anim of agentAnims) {
        if (anim.type === "agent-start-working") currentPose = "working";
        if (anim.type === "agent-stop-working") currentPose = "idle";
        if (anim.type === "agent-thinking") currentPose = "thinking";
        if (anim.type === "agent-paused") currentPose = "sleeping";
        if (anim.type === "agent-error") currentPose = "error";
        if (anim.type === "agent-celebrating") currentPose = "celebrating";
      }

      // Error shake effect
      let shakeX = 0;
      if (currentPose === "error") {
        shakeX = Math.sin(frame * 0.5) * 2 * SCALE;
      }

      // Draw character
      const charCanvas = drawCharacter(SCALE, agentState.colorSchemeIndex, currentPose, frame);
      ctx.drawImage(charCanvas, ax + 4 * SCALE + shakeX, ay);

      // Agent name label
      ctx.fillStyle = PICO8.white;
      ctx.font = `${5 * SCALE}px 'Press Start 2P', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(
        agentState.name.slice(0, 20),
        ax + (PX_PER_TILE * SCALE) / 2,
        ay + 14 * SCALE,
      );
      ctx.textAlign = "left";

      // --- Status dot ---
      const dotRadius = 3 * SCALE;
      const dotX = ax + PX_PER_TILE * SCALE - 2 * SCALE;
      const dotY = ay - 2 * SCALE;
      let dotColor: string = PICO8.darkGray; // unknown
      if (agentState.status === "running" || agentState.status === "active") dotColor = PICO8.green;
      else if (agentState.status === "paused") dotColor = PICO8.yellow;
      else if (agentState.status === "error") dotColor = PICO8.red;
      else if (agentState.status === "idle") dotColor = PICO8.blue;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = PICO8.darkBlue;
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- Status effects ---
      if (currentPose === "error") {
        const excl = drawExclamation(SCALE);
        const bobY = Math.sin(frame * 0.1) * 2 * SCALE;
        ctx.drawImage(excl, ax + 6 * SCALE + shakeX, ay - 10 * SCALE + bobY);
      }

      if (currentPose === "sleeping") {
        const zzz = drawZZZ(SCALE, Math.floor(frame / 15));
        ctx.drawImage(zzz, ax + 10 * SCALE, ay - 8 * SCALE);
      }

      if (currentPose === "thinking") {
        const gear = drawGear(SCALE, Math.floor(frame / 20));
        ctx.drawImage(gear, ax + 10 * SCALE, ay - 8 * SCALE);
      }

      // Heartbeat pulse
      const heartbeatAnim = agentAnims.find((a) => a.type === "heartbeat-pulse");
      if (heartbeatAnim) {
        const heart = drawHeartPulse(Math.max(1, SCALE - 1));
        const alpha = 1 - (Date.now() - heartbeatAnim.timestamp) / heartbeatAnim.duration;
        if (alpha > 0) {
          ctx.globalAlpha = alpha;
          ctx.drawImage(heart, ax + 12 * SCALE, ay - 6 * SCALE);
          ctx.globalAlpha = 1;
        }
      }

      // Task completed checkmark
      const completedAnim = agentAnims.find((a) => a.type === "task-completed");
      if (completedAnim) {
        const check = drawCheckmark(SCALE);
        const progress = (Date.now() - completedAnim.timestamp) / completedAnim.duration;
        if (progress < 1) {
          ctx.globalAlpha = 1 - progress;
          ctx.drawImage(check, ax + 2 * SCALE, ay - 4 * SCALE - progress * 10 * SCALE);
          ctx.globalAlpha = 1;
        }
      }

      // Speech bubble
      const speechAnim = agentAnims.find((a) => a.type === "speech-bubble");
      if (speechAnim?.text) {
        const bubble = drawSpeechBubble(speechAnim.text, 100 * SCALE, Math.max(1, SCALE - 1));
        const alpha = Math.min(
          1,
          1 - (Date.now() - speechAnim.timestamp) / speechAnim.duration + 0.3,
        );
        if (alpha > 0) {
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(bubble, ax - 2 * SCALE, ay - bubble.height - 2 * SCALE);
          ctx.globalAlpha = 1;
        }
      }

      // Thought bubble
      const thoughtAnim = agentAnims.find((a) => a.type === "thought-bubble");
      if (thoughtAnim?.text) {
        const bubble = drawThoughtBubble(thoughtAnim.text, 90 * SCALE, Math.max(1, SCALE - 1));
        ctx.drawImage(bubble, ax - 2 * SCALE, ay - bubble.height - 2 * SCALE);
      }
    }

    ctx.restore();

    // HUD overlay
    ctx.fillStyle = PICO8.white;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.globalAlpha = 0.3;
    ctx.fillText(
      `Agents: ${agentStates.length}  |  Zoom: ${Math.round(zoom * 100)}%  |  Drag to pan, scroll to zoom`,
      10,
      h - 10,
    );
    ctx.globalAlpha = 1;

    this.frame++;
  }

  // =========================================================================
  // Event handling
  // =========================================================================

  private bindEvents(): void {
    if (!this.canvas) return;

    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundMouseMove = (e) => this.handleMouseMove(e);
    this.boundMouseUp = () => this.handleMouseUp();
    this.boundMouseLeave = () => this.handleMouseUp();
    this.boundWheel = (e) => this.handleWheel(e);
    this.boundClick = (e) => this.handleClick(e);
    this.boundTouchStart = (e) => this.handleTouchStart(e);
    this.boundTouchMove = (e) => this.handleTouchMove(e);
    this.boundTouchEnd = (e) => this.handleTouchEnd(e);

    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
    this.canvas.addEventListener("wheel", this.boundWheel, { passive: false });
    this.canvas.addEventListener("click", this.boundClick);
    this.canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundTouchEnd);
  }

  private unbindEvents(): void {
    if (!this.canvas) return;
    if (this.boundMouseDown) this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    if (this.boundMouseMove) this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    if (this.boundMouseUp) this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    if (this.boundMouseLeave) this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    if (this.boundWheel) this.canvas.removeEventListener("wheel", this.boundWheel);
    if (this.boundClick) this.canvas.removeEventListener("click", this.boundClick);
    if (this.boundTouchStart) this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    if (this.boundTouchMove) this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    if (this.boundTouchEnd) this.canvas.removeEventListener("touchend", this.boundTouchEnd);
  }

  private handleMouseDown(e: MouseEvent): void {
    this.drag = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    if (this.canvas) this.canvas.style.cursor = "grabbing";
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.drag.dragging) return;
    const dx = e.clientX - this.drag.lastX;
    const dy = e.clientY - this.drag.lastY;
    this.camera.x -= dx / this.camera.zoom;
    this.camera.y -= dy / this.camera.zoom;
    this.drag.lastX = e.clientX;
    this.drag.lastY = e.clientY;
  }

  private handleMouseUp(): void {
    this.drag.dragging = false;
    if (this.canvas) this.canvas.style.cursor = "grab";
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoom = Math.max(0.3, Math.min(3, this.camera.zoom * delta));
  }

  private handleClick(e: MouseEvent): void {
    const container = this.container;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cam = this.camera;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = (screenX - w / 2) / cam.zoom + cam.x;
    const worldY = (screenY - h / 2) / cam.zoom + cam.y;

    // Check agent clicks
    for (const agentState of this.agentStates) {
      const ax = agentState.deskPosition.x * SCALE;
      const ay = (agentState.deskPosition.y + PX_PER_TILE) * SCALE;
      const charW = 8 * SCALE;
      const charH = 14 * SCALE;

      if (
        worldX >= ax &&
        worldX <= ax + charW + 8 * SCALE &&
        worldY >= ay - 2 * SCALE &&
        worldY <= ay + charH
      ) {
        this.onAgentClick?.(agentState.agentId);
        return;
      }
    }

    // Check interactive furniture clicks
    for (const room of this.layout.rooms) {
      for (const furn of room.furniture) {
        if (!furn.interactive || !furn.interactionType) continue;
        if (furn.interactionType === "agent") continue;

        const fx = (room.x + furn.x) * PX_PER_TILE * SCALE;
        const fy = (room.y + furn.y) * PX_PER_TILE * SCALE;
        const fw = PX_PER_TILE * SCALE * 1.5;
        const fh = PX_PER_TILE * SCALE * 1.5;

        if (worldX >= fx && worldX <= fx + fw && worldY >= fy && worldY <= fy + fh) {
          this.onObjectClick?.(furn.interactionType);
          return;
        }
      }
    }
  }

  // --- Touch support ---

  private lastTouchDist = 0;

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.drag = { dragging: true, lastX: t.clientX, lastY: t.clientY };
    } else if (e.touches.length === 2) {
      this.lastTouchDist = this.getTouchDistance(e.touches[0], e.touches[1]);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.drag.dragging) {
      const t = e.touches[0];
      const dx = t.clientX - this.drag.lastX;
      const dy = t.clientY - this.drag.lastY;
      this.camera.x -= dx / this.camera.zoom;
      this.camera.y -= dy / this.camera.zoom;
      this.drag.lastX = t.clientX;
      this.drag.lastY = t.clientY;
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom
      const dist = this.getTouchDistance(e.touches[0], e.touches[1]);
      if (this.lastTouchDist > 0) {
        const scale = dist / this.lastTouchDist;
        this.camera.zoom = Math.max(0.3, Math.min(3, this.camera.zoom * scale));
      }
      this.lastTouchDist = dist;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      // Treat as click if drag distance was tiny
      if (this.drag.dragging && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        // Simulate click at touch position
        this.handleClick({
          clientX: t.clientX,
          clientY: t.clientY,
          preventDefault: () => {},
        } as MouseEvent);
      }
      this.drag.dragging = false;
      this.lastTouchDist = 0;
    }
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

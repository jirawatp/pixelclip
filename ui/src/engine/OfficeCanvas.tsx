/**
 * OfficeCanvas
 *
 * The main React component that renders the 2D pixel-art virtual office.
 * Uses Canvas 2D API (no PixiJS dependency for simplicity and reliability).
 * Supports pan, zoom, click detection on agents and interactive objects.
 */

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
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
import { useOfficeAnimations, useOfficeEventPipe } from "@/hooks/useOfficeAnimations";

interface OfficeCanvasProps {
  agents: any[];
  onAgentClick: (agentId: string) => void;
  onObjectClick: (objectType: string) => void;
  className?: string;
}

// Scale factor for rendering (pixels per tile unit)
const SCALE = 3;
const PX_PER_TILE = TILE_SIZE;

export function OfficeCanvas({ agents, onAgentClick, onObjectClick, className }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Generate layout from agents
  const layout = useMemo(() => generateOfficeLayout(agents), [agents]);

  // Build agent character states
  const agentStates = useMemo(() => {
    const states: AgentCharacterState[] = [];
    agents.forEach((agent: any, index: number) => {
      const desk = findAgentDesk(layout, agent.id);
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
    return states;
  }, [agents, layout]);

  // Animation integration
  const companyId = agents[0]?.companyId ?? "";
  useOfficeEventPipe(companyId);
  const { animations, forAgent } = useOfficeAnimations();

  // --- Rendering ---

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const cam = cameraRef.current;
    const zoom = cam.zoom;

    // Clear
    ctx.fillStyle = PICO8.darkBlue;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-cam.x * zoom + w / 2, -cam.y * zoom + h / 2);
    ctx.scale(zoom, zoom);

    const frame = frameRef.current;

    // Draw floor for each room
    for (const room of layout.rooms) {
      for (let ty = 0; ty < room.height; ty++) {
        for (let tx = 0; tx < room.width; tx++) {
          const worldX = (room.x + tx) * PX_PER_TILE * SCALE;
          const worldY = (room.y + ty) * PX_PER_TILE * SCALE;
          const variant = (tx + ty) % 2 === 0 ? "light" : "dark";

          // Wall tiles on top row
          if (ty === 0) {
            const tile = (tx === Math.floor(room.width / 2))
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
      const ay = (agentState.deskPosition.y + PX_PER_TILE) * SCALE; // Below desk

      // Determine current pose based on animations
      let currentPose = agentState.pose;
      const agentAnims = forAgent(agentState.agentId);
      for (const anim of agentAnims) {
        if (anim.type === "agent-start-working") currentPose = "working";
        if (anim.type === "agent-stop-working") currentPose = "idle";
        if (anim.type === "agent-thinking") currentPose = "thinking";
        if (anim.type === "agent-paused") currentPose = "sleeping";
        if (anim.type === "agent-error") currentPose = "error";
        if (anim.type === "agent-celebrating") currentPose = "celebrating";
      }

      // Draw character
      const charCanvas = drawCharacter(SCALE, agentState.colorSchemeIndex, currentPose, frame);
      ctx.drawImage(charCanvas, ax + 4 * SCALE, ay);

      // Agent name label
      ctx.fillStyle = PICO8.white;
      ctx.font = `${5 * SCALE}px 'Press Start 2P', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(
        agentState.name.slice(0, 12),
        ax + PX_PER_TILE * SCALE / 2,
        ay + 14 * SCALE,
      );
      ctx.textAlign = "left";

      // Status effects
      if (currentPose === "error") {
        const excl = drawExclamation(SCALE);
        const bobY = Math.sin(frame * 0.1) * 2 * SCALE;
        ctx.drawImage(excl, ax + 6 * SCALE, ay - 10 * SCALE + bobY);
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
        const alpha = Math.min(1, 1 - (Date.now() - speechAnim.timestamp) / speechAnim.duration + 0.3);
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
    ctx.fillText(`Agents: ${agents.length}  |  Zoom: ${Math.round(zoom * 100)}%  |  Drag to pan, scroll to zoom`, 10, h - 10);
    ctx.globalAlpha = 1;

    frameRef.current++;
    rafRef.current = requestAnimationFrame(render);
  }, [layout, agentStates, agents.length, forAgent]);

  // Start render loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  // --- Mouse / Touch Interaction ---

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    cameraRef.current.x -= dx / cameraRef.current.zoom;
    cameraRef.current.y -= dy / cameraRef.current.zoom;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    cameraRef.current.zoom = Math.max(0.3, Math.min(3, cameraRef.current.zoom * delta));
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const cam = cameraRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;

      // Convert screen coords to world coords
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = (screenX - w / 2) / cam.zoom + cam.x;
      const worldY = (screenY - h / 2) / cam.zoom + cam.y;

      // Check agent clicks (character position below desk)
      for (const agentState of agentStates) {
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
          onAgentClick(agentState.agentId);
          return;
        }
      }

      // Check interactive furniture clicks
      for (const room of layout.rooms) {
        for (const furn of room.furniture) {
          if (!furn.interactive || !furn.interactionType) continue;
          if (furn.interactionType === "agent") continue; // handled above

          const fx = (room.x + furn.x) * PX_PER_TILE * SCALE;
          const fy = (room.y + furn.y) * PX_PER_TILE * SCALE;
          const fw = PX_PER_TILE * SCALE * 1.5;
          const fh = PX_PER_TILE * SCALE * 1.5;

          if (worldX >= fx && worldX <= fx + fw && worldY >= fy && worldY <= fy + fh) {
            onObjectClick(furn.interactionType);
            return;
          }
        }
      }
    },
    [agentStates, layout, onAgentClick, onObjectClick],
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden cursor-grab active:cursor-grabbing ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

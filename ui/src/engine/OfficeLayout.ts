/**
 * OfficeLayout
 *
 * Converts agent data into a 2D pixel-art office floor plan.
 * Each agent gets a desk in the appropriate room based on their role.
 */

import type { OfficeLayoutData, OfficeRoom, FurnitureItem } from "./types";

// Tile size in pixels (base)
export const TILE_SIZE = 32;

interface AgentInfo {
  id: string;
  name: string;
  role?: string | null;
  status?: string;
  managerId?: string | null;
}

let furnitureIdCounter = 0;
function fid(): string {
  return `furn_${++furnitureIdCounter}`;
}

/**
 * Generate the full office layout based on the agent list.
 */
export function generateOfficeLayout(agents: AgentInfo[]): OfficeLayoutData {
  furnitureIdCounter = 0;

  const ceo = agents.find(
    (a) => a.role?.toLowerCase() === "ceo" || a.role?.toLowerCase() === "founder",
  );
  const managers = agents.filter(
    (a) =>
      a.id !== ceo?.id &&
      (a.role?.toLowerCase() === "manager" ||
        a.role?.toLowerCase() === "lead" ||
        a.role?.toLowerCase() === "director" ||
        a.role?.toLowerCase() === "vp"),
  );
  const workers = agents.filter(
    (a) => a.id !== ceo?.id && !managers.some((m) => m.id === a.id),
  );

  const rooms: OfficeRoom[] = [];
  let nextX = 0;

  // --- Hallway (top) ---
  const hallwayWidth = Math.max(20, (workers.length + managers.length + 2) * 3 + 8);

  // --- CEO Corner Office (top-left) ---
  const ceoRoom: OfficeRoom = {
    id: "ceo-office",
    type: "corner-office",
    x: nextX,
    y: 0,
    width: 8,
    height: 7,
    label: "CEO Office",
    furniture: [],
  };

  if (ceo) {
    ceoRoom.furniture.push(
      { id: fid(), type: "desk", x: 3, y: 2, agentId: ceo.id, interactive: true, interactionType: "agent" },
      { id: fid(), type: "chair", x: 3, y: 3, agentId: ceo.id },
      { id: fid(), type: "plant", x: 1, y: 1 },
      { id: fid(), type: "bookshelf", x: 6, y: 1 },
    );
  } else {
    ceoRoom.furniture.push(
      { id: fid(), type: "desk", x: 3, y: 2 },
      { id: fid(), type: "chair", x: 3, y: 3 },
    );
  }
  ceoRoom.furniture.push(
    { id: fid(), type: "door", x: 7, y: 5 },
  );
  rooms.push(ceoRoom);
  nextX += ceoRoom.width + 1;

  // --- Meeting Room ---
  const meetingRoom: OfficeRoom = {
    id: "meeting-room",
    type: "meeting-room",
    x: nextX,
    y: 0,
    width: 10,
    height: 7,
    label: "Meeting Room",
    furniture: [
      { id: fid(), type: "meeting-table", x: 3, y: 2 },
      {
        id: fid(),
        type: "org-board",
        x: 4,
        y: 0,
        interactive: true,
        interactionType: "org-board",
        label: "Organization Board",
      },
      {
        id: fid(),
        type: "whiteboard",
        x: 7,
        y: 0,
        interactive: true,
        interactionType: "whiteboard",
        label: "Task Board",
      },
      { id: fid(), type: "door", x: 0, y: 5 },
      { id: fid(), type: "door", x: 9, y: 5 },
    ],
  };
  rooms.push(meetingRoom);
  nextX += meetingRoom.width + 1;

  // --- Control Room ---
  const controlRoom: OfficeRoom = {
    id: "control-room",
    type: "control-room",
    x: nextX,
    y: 0,
    width: 8,
    height: 7,
    label: "Control Room",
    furniture: [
      {
        id: fid(),
        type: "big-monitor",
        x: 2,
        y: 1,
        interactive: true,
        interactionType: "control-room",
        label: "Dashboard",
      },
      { id: fid(), type: "chair", x: 3, y: 4 },
      { id: fid(), type: "door", x: 0, y: 5 },
    ],
  };
  rooms.push(controlRoom);
  nextX = 0;

  // --- Manager Area (below hallway, left side) ---
  const managerRowY = 9;
  if (managers.length > 0) {
    const managerRoom: OfficeRoom = {
      id: "manager-area",
      type: "open-floor",
      x: 0,
      y: managerRowY,
      width: Math.max(8, managers.length * 4 + 2),
      height: 6,
      label: "Managers",
      furniture: [],
    };

    managers.forEach((mgr, i) => {
      const dx = 1 + i * 4;
      managerRoom.furniture.push(
        { id: fid(), type: "desk", x: dx, y: 1, agentId: mgr.id, interactive: true, interactionType: "agent" },
        { id: fid(), type: "chair", x: dx, y: 2, agentId: mgr.id },
        { id: fid(), type: "plant", x: dx + 2, y: 1 },
      );
    });

    rooms.push(managerRoom);
  }

  // --- Open Floor Plan (workers) ---
  const openFloorY = managerRowY + (managers.length > 0 ? 7 : 0);
  const desksPerRow = 4;
  const rows = Math.ceil(workers.length / desksPerRow);
  const openFloorRoom: OfficeRoom = {
    id: "open-floor",
    type: "open-floor",
    x: 0,
    y: openFloorY,
    width: Math.max(20, desksPerRow * 5 + 2),
    height: Math.max(6, rows * 4 + 2),
    label: "Open Floor",
    furniture: [],
  };

  workers.forEach((worker, i) => {
    const row = Math.floor(i / desksPerRow);
    const col = i % desksPerRow;
    const dx = 1 + col * 5;
    const dy = 1 + row * 4;
    openFloorRoom.furniture.push(
      { id: fid(), type: "desk", x: dx, y: dy, agentId: worker.id, interactive: true, interactionType: "agent" },
      { id: fid(), type: "chair", x: dx, y: dy + 1, agentId: worker.id },
    );
  });

  rooms.push(openFloorRoom);

  // --- Break Room (right side) ---
  const breakRoom: OfficeRoom = {
    id: "break-room",
    type: "break-room",
    x: Math.max(22, desksPerRow * 5 + 4),
    y: openFloorY,
    width: 6,
    height: 6,
    label: "Break Room",
    furniture: [
      { id: fid(), type: "water-cooler", x: 2, y: 1 },
      { id: fid(), type: "plant", x: 4, y: 1 },
      { id: fid(), type: "plant", x: 1, y: 4 },
      { id: fid(), type: "door", x: 0, y: 4 },
    ],
  };
  rooms.push(breakRoom);

  // Calculate total bounds
  let maxX = 0;
  let maxY = 0;
  for (const room of rooms) {
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  }

  return {
    rooms,
    totalWidth: maxX + 2,
    totalHeight: maxY + 2,
  };
}

/**
 * Find the desk position for a given agent.
 */
export function findAgentDesk(
  layout: OfficeLayoutData,
  agentId: string,
): { roomX: number; roomY: number; deskX: number; deskY: number } | null {
  for (const room of layout.rooms) {
    for (const furn of room.furniture) {
      if (furn.type === "desk" && furn.agentId === agentId) {
        return {
          roomX: room.x,
          roomY: room.y,
          deskX: furn.x,
          deskY: furn.y,
        };
      }
    }
  }
  return null;
}

/**
 * Get all interactive furniture items across all rooms.
 */
export function getInteractiveFurniture(layout: OfficeLayoutData): (FurnitureItem & { roomX: number; roomY: number })[] {
  const items: (FurnitureItem & { roomX: number; roomY: number })[] = [];
  for (const room of layout.rooms) {
    for (const furn of room.furniture) {
      if (furn.interactive) {
        items.push({ ...furn, roomX: room.x, roomY: room.y });
      }
    }
  }
  return items;
}

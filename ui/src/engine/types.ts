/**
 * Shared types for the office canvas engine.
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Position, Size {}

export type RoomType =
  | "corner-office"
  | "open-floor"
  | "meeting-room"
  | "break-room"
  | "control-room"
  | "server-room"
  | "hallway";

export type FurnitureType =
  | "desk"
  | "monitor"
  | "chair"
  | "whiteboard"
  | "filing-cabinet"
  | "water-cooler"
  | "org-board"
  | "plant"
  | "bookshelf"
  | "meeting-table"
  | "big-monitor"
  | "door";

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  interactive?: boolean;
  interactionType?: string; // maps to OfficeCanvas onObjectClick
  agentId?: string; // for desks assigned to agents
  label?: string;
}

export interface OfficeRoom {
  id: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  furniture: FurnitureItem[];
}

export interface OfficeLayoutData {
  rooms: OfficeRoom[];
  totalWidth: number;
  totalHeight: number;
}

export interface AgentCharacterState {
  agentId: string;
  name: string;
  role: string;
  status: string;
  colorSchemeIndex: number;
  deskPosition: Position;
  pose: "idle" | "working" | "thinking" | "sleeping" | "error" | "celebrating";
  speechText?: string;
  thoughtText?: string;
  animationFrame: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface ClickTarget {
  type: "agent" | "furniture" | "room" | "none";
  id: string;
  interactionType?: string;
}

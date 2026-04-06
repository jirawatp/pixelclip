/**
 * ProceduralPixelArt
 *
 * Generates all pixel-art visuals programmatically using Canvas 2D API.
 * No external sprite images needed — everything is drawn at runtime and
 * cached as ImageBitmap / OffscreenCanvas for performance.
 *
 * Uses the PICO-8 16-color palette throughout.
 */

// ---------------------------------------------------------------------------
// PICO-8 Palette
// ---------------------------------------------------------------------------

export const PICO8 = {
  black:      "#000000",
  darkBlue:   "#1D2B53",
  darkPurple: "#7E2553",
  darkGreen:  "#008751",
  brown:      "#AB5236",
  darkGray:   "#5F574F",
  lightGray:  "#C2C3C7",
  white:      "#FFF1E8",
  red:        "#FF004D",
  orange:     "#FFA300",
  yellow:     "#FFEC27",
  green:      "#00E436",
  blue:       "#29ADFF",
  indigo:     "#83769C",
  pink:       "#FF77A8",
  peach:      "#FFCCAA",
} as const;

export type PicoColor = keyof typeof PICO8;

// Agent color schemes — each agent gets a unique combo
export const AGENT_COLOR_SCHEMES = [
  { hair: PICO8.brown,      shirt: PICO8.blue,       skin: PICO8.peach },
  { hair: PICO8.darkPurple, shirt: PICO8.green,      skin: PICO8.peach },
  { hair: PICO8.orange,     shirt: PICO8.red,        skin: PICO8.peach },
  { hair: PICO8.darkBlue,   shirt: PICO8.indigo,     skin: PICO8.peach },
  { hair: PICO8.darkGray,   shirt: PICO8.darkGreen,  skin: PICO8.peach },
  { hair: PICO8.yellow,     shirt: PICO8.pink,       skin: PICO8.peach },
  { hair: PICO8.red,        shirt: PICO8.darkBlue,   skin: PICO8.peach },
  { hair: PICO8.lightGray,  shirt: PICO8.brown,      skin: PICO8.peach },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Draw a single "pixel" (actually a scale×scale rectangle). */
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, s = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * s, y * s, s, s);
}

/** Draw pixels from a 2D pattern array. 0 = transparent, numbers map to a palette array. */
function drawPattern(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  palette: string[],
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      const colorIdx = pattern[y][x];
      if (colorIdx > 0 && colorIdx <= palette.length) {
        px(ctx, offsetX + x, offsetY + y, palette[colorIdx - 1], scale);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Texture Cache
// ---------------------------------------------------------------------------

const textureCache = new Map<string, HTMLCanvasElement>();

function cached(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = createCanvas(w, h);
  draw(ctx);
  textureCache.set(key, canvas);
  return canvas;
}

export function clearTextureCache(): void {
  textureCache.clear();
}

// ---------------------------------------------------------------------------
// Character Drawing (16×24 px base, scaled)
// ---------------------------------------------------------------------------

export type CharacterPose = "idle" | "working" | "thinking" | "sleeping" | "error" | "celebrating";

// Simple pixel character: 8 wide × 12 tall (then scaled)
// 1=skin, 2=hair, 3=shirt, 4=pants, 5=shoes, 6=eye
const CHARACTER_IDLE: number[][] = [
  [0,0,2,2,2,2,0,0],
  [0,2,2,2,2,2,2,0],
  [0,1,1,1,1,1,1,0],
  [0,1,6,1,1,6,1,0],
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,3,3,3,3,0,0],
  [0,3,3,3,3,3,3,0],
  [0,3,3,3,3,3,3,0],
  [0,0,3,0,0,3,0,0],
  [0,0,4,0,0,4,0,0],
  [0,0,5,0,0,5,0,0],
];

const CHARACTER_WORKING: number[][] = [
  [0,0,2,2,2,2,0,0],
  [0,2,2,2,2,2,2,0],
  [0,1,1,1,1,1,1,0],
  [0,1,6,1,1,6,1,0],
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,3,3,3,3,3,3,0],
  [3,3,3,3,3,3,3,3], // arms out (typing)
  [0,3,3,3,3,3,3,0],
  [0,0,3,0,0,3,0,0],
  [0,0,4,0,0,4,0,0],
  [0,0,5,0,0,5,0,0],
];

const CHARACTER_SLEEPING: number[][] = [
  [0,0,2,2,2,2,0,0],
  [0,2,2,2,2,2,2,0],
  [0,1,1,1,1,1,1,0],
  [0,1,0,1,1,0,1,0], // eyes closed
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,3,3,3,3,0,0],
  [0,3,3,3,3,3,3,0],
  [0,3,3,3,3,3,3,0],
  [0,0,3,0,0,3,0,0],
  [0,0,4,0,0,4,0,0],
  [0,0,5,0,0,5,0,0],
];

const POSE_PATTERNS: Record<CharacterPose, number[][]> = {
  idle: CHARACTER_IDLE,
  working: CHARACTER_WORKING,
  thinking: CHARACTER_IDLE,
  sleeping: CHARACTER_SLEEPING,
  error: CHARACTER_IDLE,
  celebrating: CHARACTER_IDLE, // will add extra effects
};

export function drawCharacter(
  scale: number,
  colorSchemeIndex: number,
  pose: CharacterPose,
  frame = 0,
): HTMLCanvasElement {
  const key = `char_${scale}_${colorSchemeIndex}_${pose}_${frame}`;
  const w = 8 * scale;
  const h = 12 * scale;

  return cached(key, w, h, (ctx) => {
    const scheme = AGENT_COLOR_SCHEMES[colorSchemeIndex % AGENT_COLOR_SCHEMES.length];
    const palette = [
      scheme.skin,       // 1
      scheme.hair,       // 2
      scheme.shirt,      // 3
      PICO8.darkBlue,    // 4 pants
      PICO8.darkGray,    // 5 shoes
      PICO8.black,       // 6 eyes
    ];

    const pattern = POSE_PATTERNS[pose];

    // Apply simple animation offset for working pose
    let offsetY = 0;
    if (pose === "working" && frame % 2 === 1) {
      offsetY = 0; // subtle bob handled at render level
    }

    drawPattern(ctx, pattern, palette, 0, offsetY, scale);
  });
}

// ---------------------------------------------------------------------------
// Desk Drawing (16×12 px base)
// ---------------------------------------------------------------------------

// Simple desk: 16 wide × 12 tall
// 1=desk wood, 2=monitor body, 3=monitor screen, 4=keyboard, 5=desk legs
const DESK_PATTERN: number[][] = [
  [0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,2,3,3,3,3,3,2,0,0,0,0,0,0],
  [0,0,0,2,3,3,3,3,3,2,0,0,0,0,0,0],
  [0,0,0,2,3,3,3,3,3,2,0,0,0,0,0,0],
  [0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,4,4,4,4,4,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
  [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
  [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
];

export function drawDesk(scale: number, monitorGlow = false): HTMLCanvasElement {
  const key = `desk_${scale}_${monitorGlow}`;
  const w = 16 * scale;
  const h = 12 * scale;

  return cached(key, w, h, (ctx) => {
    const palette = [
      PICO8.brown,      // 1 desk wood
      PICO8.darkGray,   // 2 monitor body
      monitorGlow ? PICO8.blue : PICO8.darkBlue, // 3 monitor screen
      PICO8.lightGray,  // 4 keyboard
      PICO8.brown,      // 5 desk legs
    ];
    drawPattern(ctx, DESK_PATTERN, palette, 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Chair (8×8 px)
// ---------------------------------------------------------------------------

const CHAIR_PATTERN: number[][] = [
  [0,1,1,1,1,1,1,0],
  [0,1,2,2,2,2,1,0],
  [0,1,2,2,2,2,1,0],
  [0,0,2,2,2,2,0,0],
  [0,0,2,2,2,2,0,0],
  [0,0,0,1,1,0,0,0],
  [0,1,0,0,0,0,1,0],
  [0,1,0,0,0,0,1,0],
];

export function drawChair(scale: number): HTMLCanvasElement {
  const key = `chair_${scale}`;
  return cached(key, 8 * scale, 8 * scale, (ctx) => {
    drawPattern(ctx, CHAIR_PATTERN, [PICO8.darkGray, PICO8.indigo], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Whiteboard (12×10 px)
// ---------------------------------------------------------------------------

const WHITEBOARD_PATTERN: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,3,3,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,3,3,3,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,3,3,3,3,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,4,4,0,0,0,0,0],
];

export function drawWhiteboard(scale: number): HTMLCanvasElement {
  const key = `whiteboard_${scale}`;
  return cached(key, 12 * scale, 10 * scale, (ctx) => {
    drawPattern(ctx, WHITEBOARD_PATTERN, [
      PICO8.darkGray,  // 1 frame
      PICO8.white,     // 2 board
      PICO8.blue,      // 3 writing
      PICO8.lightGray, // 4 legs
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Organization Board (12×10 px — like a cork board)
// ---------------------------------------------------------------------------

const ORG_BOARD_PATTERN: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,3,3,2,2,2,4,4,2,2,1],
  [1,2,3,3,2,2,2,4,4,2,2,1],
  [1,2,2,2,5,2,2,2,2,2,2,1],
  [1,2,2,5,5,5,2,2,2,2,2,1],
  [1,2,3,3,2,4,4,2,3,3,2,1],
  [1,2,3,3,2,4,4,2,3,3,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
];

export function drawOrgBoard(scale: number): HTMLCanvasElement {
  const key = `orgboard_${scale}`;
  return cached(key, 12 * scale, 10 * scale, (ctx) => {
    drawPattern(ctx, ORG_BOARD_PATTERN, [
      PICO8.brown,      // 1 frame
      PICO8.orange,     // 2 cork
      PICO8.yellow,     // 3 sticky notes
      PICO8.blue,       // 4 blue notes
      PICO8.red,        // 5 pin/connector lines
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Filing Cabinet (8×12 px)
// ---------------------------------------------------------------------------

const FILING_CABINET_PATTERN: number[][] = [
  [1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,3,3,2,2,1],
  [1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,3,3,2,2,1],
  [1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,3,3,2,2,1],
  [1,1,1,1,1,1,1,1],
];

export function drawFilingCabinet(scale: number): HTMLCanvasElement {
  const key = `filingcab_${scale}`;
  return cached(key, 8 * scale, 12 * scale, (ctx) => {
    drawPattern(ctx, FILING_CABINET_PATTERN, [
      PICO8.darkGray,   // 1 metal
      PICO8.lightGray,  // 2 drawer front
      PICO8.indigo,     // 3 handles
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Water Cooler (6×10 px)
// ---------------------------------------------------------------------------

const WATER_COOLER_PATTERN: number[][] = [
  [0,0,1,1,0,0],
  [0,1,2,2,1,0],
  [0,1,2,2,1,0],
  [0,1,2,2,1,0],
  [0,1,1,1,1,0],
  [0,3,3,3,3,0],
  [0,3,3,3,3,0],
  [0,3,3,3,3,0],
  [0,0,4,4,0,0],
  [0,4,0,0,4,0],
];

export function drawWaterCooler(scale: number): HTMLCanvasElement {
  const key = `watercooler_${scale}`;
  return cached(key, 6 * scale, 10 * scale, (ctx) => {
    drawPattern(ctx, WATER_COOLER_PATTERN, [
      PICO8.blue,        // 1 bottle top
      PICO8.blue,        // 2 water
      PICO8.lightGray,   // 3 body
      PICO8.darkGray,    // 4 stand
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Plant (6×8 px)
// ---------------------------------------------------------------------------

const PLANT_PATTERN: number[][] = [
  [0,0,1,1,0,0],
  [0,1,1,1,1,0],
  [1,1,1,1,1,1],
  [0,1,1,1,1,0],
  [0,0,1,1,0,0],
  [0,0,2,2,0,0],
  [0,3,3,3,3,0],
  [0,3,3,3,3,0],
];

export function drawPlant(scale: number): HTMLCanvasElement {
  const key = `plant_${scale}`;
  return cached(key, 6 * scale, 8 * scale, (ctx) => {
    drawPattern(ctx, PLANT_PATTERN, [
      PICO8.green,      // 1 leaves
      PICO8.brown,      // 2 stem
      PICO8.brown,      // 3 pot
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Big Monitor / TV (for control room) (16×10 px)
// ---------------------------------------------------------------------------

const BIG_MONITOR_PATTERN: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
];

export function drawBigMonitor(scale: number): HTMLCanvasElement {
  const key = `bigmonitor_${scale}`;
  return cached(key, 16 * scale, 10 * scale, (ctx) => {
    drawPattern(ctx, BIG_MONITOR_PATTERN, [
      PICO8.darkGray,  // 1 frame
      PICO8.darkBlue,  // 2 screen
    ], 0, 0, scale);
  });
}

// ---------------------------------------------------------------------------
// Floor Tiles
// ---------------------------------------------------------------------------

export function drawFloorTile(scale: number, variant: "light" | "dark" = "light"): HTMLCanvasElement {
  const key = `floor_${scale}_${variant}`;
  const size = 8 * scale;
  return cached(key, size, size, (ctx) => {
    const bg = variant === "light" ? "#3a3a5c" : "#333355";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    // subtle grid lines
    ctx.fillStyle = variant === "light" ? "#444470" : "#3a3a60";
    ctx.fillRect(size - scale, 0, scale, size);
    ctx.fillRect(0, size - scale, size, scale);
  });
}

// ---------------------------------------------------------------------------
// Wall Tiles
// ---------------------------------------------------------------------------

export function drawWallTile(scale: number): HTMLCanvasElement {
  const key = `wall_${scale}`;
  const size = 8 * scale;
  return cached(key, size, size, (ctx) => {
    ctx.fillStyle = PICO8.darkGray;
    ctx.fillRect(0, 0, size, size);
    // brick pattern
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(scale, scale, 3 * scale, 2 * scale);
    ctx.fillRect(5 * scale, scale, 2 * scale, 2 * scale);
    ctx.fillRect(0, 4 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(3 * scale, 4 * scale, 4 * scale, 2 * scale);
  });
}

// ---------------------------------------------------------------------------
// Window Tile (on wall)
// ---------------------------------------------------------------------------

export function drawWindowTile(scale: number): HTMLCanvasElement {
  const key = `window_${scale}`;
  const size = 8 * scale;
  return cached(key, size, size, (ctx) => {
    // wall background
    ctx.fillStyle = PICO8.darkGray;
    ctx.fillRect(0, 0, size, size);
    // window frame
    ctx.fillStyle = PICO8.brown;
    ctx.fillRect(scale, scale, 6 * scale, 6 * scale);
    // glass
    ctx.fillStyle = PICO8.blue;
    ctx.fillRect(2 * scale, 2 * scale, 4 * scale, 4 * scale);
    // cross frame
    ctx.fillStyle = PICO8.brown;
    ctx.fillRect(scale, 4 * scale - Math.floor(scale / 2), 6 * scale, scale);
    ctx.fillRect(4 * scale - Math.floor(scale / 2), scale, scale, 6 * scale);
  });
}

// ---------------------------------------------------------------------------
// Door
// ---------------------------------------------------------------------------

export function drawDoor(scale: number): HTMLCanvasElement {
  const key = `door_${scale}`;
  const w = 8 * scale;
  const h = 12 * scale;
  return cached(key, w, h, (ctx) => {
    // door frame
    ctx.fillStyle = PICO8.brown;
    ctx.fillRect(0, 0, w, h);
    // door body
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(scale, scale, 6 * scale, 10 * scale);
    // handle
    ctx.fillStyle = PICO8.yellow;
    ctx.fillRect(5 * scale, 5 * scale, scale, scale);
  });
}

// ---------------------------------------------------------------------------
// Speech Bubble
// ---------------------------------------------------------------------------

export function drawSpeechBubble(
  text: string,
  maxWidth = 120,
  scale = 1,
): HTMLCanvasElement {
  // Measure text to size the bubble
  const fontSize = 8 * scale;
  const padding = 4 * scale;
  const tailHeight = 4 * scale;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = `${fontSize}px 'Press Start 2P', monospace`;

  // Word wrap
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (measureCtx.measureText(test).width > maxWidth - padding * 2) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 0) lines.push("");

  const lineHeight = fontSize + 2 * scale;
  const textHeight = lines.length * lineHeight;
  const bubbleWidth = Math.min(
    maxWidth,
    Math.max(...lines.map((l) => measureCtx.measureText(l).width)) + padding * 2 + 4 * scale,
  );
  const bubbleHeight = textHeight + padding * 2;
  const totalHeight = bubbleHeight + tailHeight;

  const key = `speech_${text}_${maxWidth}_${scale}`;
  return cached(key, Math.ceil(bubbleWidth), Math.ceil(totalHeight), (ctx) => {
    // Bubble body
    ctx.fillStyle = PICO8.white;
    ctx.fillRect(scale, 0, bubbleWidth - 2 * scale, bubbleHeight);
    ctx.fillRect(0, scale, bubbleWidth, bubbleHeight - 2 * scale);

    // Pixel border
    ctx.fillStyle = PICO8.black;
    ctx.fillRect(scale, 0, bubbleWidth - 2 * scale, scale);
    ctx.fillRect(scale, bubbleHeight - scale, bubbleWidth - 2 * scale, scale);
    ctx.fillRect(0, scale, scale, bubbleHeight - 2 * scale);
    ctx.fillRect(bubbleWidth - scale, scale, scale, bubbleHeight - 2 * scale);

    // Tail (small triangle pointing down-left)
    ctx.fillStyle = PICO8.white;
    ctx.fillRect(4 * scale, bubbleHeight, 2 * scale, scale);
    ctx.fillRect(3 * scale, bubbleHeight + scale, 2 * scale, scale);
    ctx.fillRect(2 * scale, bubbleHeight + 2 * scale, scale, scale);
    // tail border
    ctx.fillStyle = PICO8.black;
    ctx.fillRect(6 * scale, bubbleHeight, scale, scale);
    ctx.fillRect(4 * scale, bubbleHeight + scale, scale, scale);
    ctx.fillRect(2 * scale, bubbleHeight + 2 * scale, scale, scale);
    ctx.fillRect(scale, bubbleHeight + 3 * scale, scale, scale);

    // Text
    ctx.fillStyle = PICO8.black;
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], padding, padding + i * lineHeight);
    }
  });
}

// ---------------------------------------------------------------------------
// Thought Bubble
// ---------------------------------------------------------------------------

export function drawThoughtBubble(
  text: string,
  maxWidth = 120,
  scale = 1,
): HTMLCanvasElement {
  // Similar to speech bubble but with cloud border and small circles as tail
  const fontSize = 8 * scale;
  const padding = 4 * scale;
  const tailHeight = 6 * scale;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = `${fontSize}px 'Press Start 2P', monospace`;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (measureCtx.measureText(test).width > maxWidth - padding * 2) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 0) lines.push("");

  const lineHeight = fontSize + 2 * scale;
  const textHeight = lines.length * lineHeight;
  const bubbleWidth = Math.min(
    maxWidth,
    Math.max(...lines.map((l) => measureCtx.measureText(l).width)) + padding * 2 + 4 * scale,
  );
  const bubbleHeight = textHeight + padding * 2;
  const totalHeight = bubbleHeight + tailHeight;

  const key = `thought_${text}_${maxWidth}_${scale}`;
  return cached(key, Math.ceil(bubbleWidth), Math.ceil(totalHeight), (ctx) => {
    // Cloud-style bubble body (rounded)
    ctx.fillStyle = PICO8.white;
    ctx.fillRect(2 * scale, 0, bubbleWidth - 4 * scale, bubbleHeight);
    ctx.fillRect(scale, scale, bubbleWidth - 2 * scale, bubbleHeight - 2 * scale);
    ctx.fillRect(0, 2 * scale, bubbleWidth, bubbleHeight - 4 * scale);

    // Cloud border - bumpy edges
    ctx.fillStyle = PICO8.indigo;
    // Top edge with bumps
    for (let x = 2; x < bubbleWidth / scale - 2; x++) {
      const bump = (x % 3 === 0) ? -1 : 0;
      ctx.fillRect(x * scale, bump * scale, scale, scale);
    }
    // Bottom edge
    for (let x = 2; x < bubbleWidth / scale - 2; x++) {
      const bump = (x % 3 === 0) ? 1 : 0;
      ctx.fillRect(x * scale, (bubbleHeight / scale + bump - 1) * scale, scale, scale);
    }

    // Thought tail (3 small circles getting smaller)
    ctx.fillStyle = PICO8.white;
    ctx.fillRect(4 * scale, bubbleHeight + scale, 3 * scale, 2 * scale);
    ctx.fillRect(2 * scale, bubbleHeight + 3 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(scale, bubbleHeight + 5 * scale, scale, scale);

    // Text
    ctx.fillStyle = PICO8.indigo;
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], padding, padding + i * lineHeight);
    }
  });
}

// ---------------------------------------------------------------------------
// Status Icons
// ---------------------------------------------------------------------------

export function drawExclamation(scale: number): HTMLCanvasElement {
  const key = `excl_${scale}`;
  return cached(key, 4 * scale, 8 * scale, (ctx) => {
    // !  shape
    px(ctx, 1, 0, PICO8.red, scale);
    px(ctx, 2, 0, PICO8.red, scale);
    px(ctx, 1, 1, PICO8.red, scale);
    px(ctx, 2, 1, PICO8.red, scale);
    px(ctx, 1, 2, PICO8.red, scale);
    px(ctx, 2, 2, PICO8.red, scale);
    px(ctx, 1, 3, PICO8.red, scale);
    px(ctx, 2, 3, PICO8.red, scale);
    px(ctx, 1, 4, PICO8.red, scale);
    px(ctx, 2, 4, PICO8.red, scale);
    // gap
    px(ctx, 1, 6, PICO8.red, scale);
    px(ctx, 2, 6, PICO8.red, scale);
  });
}

export function drawZZZ(scale: number, frame: number): HTMLCanvasElement {
  const key = `zzz_${scale}_${frame % 3}`;
  return cached(key, 8 * scale, 8 * scale, (ctx) => {
    ctx.fillStyle = PICO8.lightGray;
    ctx.font = `${6 * scale}px 'Press Start 2P', monospace`;
    ctx.textBaseline = "top";
    const offset = (frame % 3) * 2 * scale;
    ctx.globalAlpha = 0.6 + (frame % 3) * 0.13;
    ctx.fillText("Z", offset, 0);
    ctx.globalAlpha = 0.4 + (frame % 3) * 0.1;
    ctx.fillText("z", offset + 2 * scale, 3 * scale);
    ctx.globalAlpha = 1;
  });
}

export function drawHeartPulse(scale: number): HTMLCanvasElement {
  const key = `heartpulse_${scale}`;
  return cached(key, 6 * scale, 5 * scale, (ctx) => {
    const p = [
      [0,1,0,0,1,0],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [0,1,1,1,1,0],
      [0,0,1,1,0,0],
    ];
    drawPattern(ctx, p, [PICO8.red], 0, 0, scale);
  });
}

export function drawCheckmark(scale: number): HTMLCanvasElement {
  const key = `check_${scale}`;
  return cached(key, 6 * scale, 6 * scale, (ctx) => {
    const p = [
      [0,0,0,0,0,1],
      [0,0,0,0,1,0],
      [0,0,0,1,0,0],
      [1,0,1,0,0,0],
      [0,1,0,0,0,0],
      [0,0,0,0,0,0],
    ];
    drawPattern(ctx, p, [PICO8.green], 0, 0, scale);
  });
}

export function drawGear(scale: number, frame: number): HTMLCanvasElement {
  const key = `gear_${scale}_${frame % 2}`;
  return cached(key, 6 * scale, 6 * scale, (ctx) => {
    const p = frame % 2 === 0 ? [
      [0,1,1,1,1,0],
      [1,0,1,1,0,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,0,1,1,0,1],
      [0,1,1,1,1,0],
    ] : [
      [0,1,1,1,1,0],
      [1,1,0,0,1,1],
      [1,0,1,1,0,1],
      [1,0,1,1,0,1],
      [1,1,0,0,1,1],
      [0,1,1,1,1,0],
    ];
    drawPattern(ctx, p, [PICO8.lightGray], 0, 0, scale);
  });
}

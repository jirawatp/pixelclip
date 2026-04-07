/**
 * DayNightCycle
 *
 * Time-of-day utility for the virtual office.
 * Determines ambient color tint and window appearance
 * based on the user's local time.
 */

// ---------------------------------------------------------------------------
// Time-of-Day Phases
// ---------------------------------------------------------------------------

export type TimePhase = "dawn" | "morning" | "day" | "afternoon" | "sunset" | "dusk" | "night" | "lateNight";

interface PhaseConfig {
  /** Sky color for window panes (hex number) */
  skyColor: number;
  /** Secondary sky color for window gradient */
  skyColorAlt: number;
  /** Ambient overlay tint */
  ambientTint: number;
  /** Ambient overlay alpha (0 = no tint) */
  ambientAlpha: number;
  /** Sunlight beam color */
  sunlightColor: number;
  /** Sunlight beam alpha */
  sunlightAlpha: number;
  /** Cloud visibility (0–1) */
  cloudAlpha: number;
  /** Stars visible */
  showStars: boolean;
}

const PHASE_CONFIGS: Record<TimePhase, PhaseConfig> = {
  dawn: {
    skyColor: 0xffb088,
    skyColorAlt: 0xffc8a0,
    ambientTint: 0xff9966,
    ambientAlpha: 0.06,
    sunlightColor: 0xffcc88,
    sunlightAlpha: 0.08,
    cloudAlpha: 0.15,
    showStars: false,
  },
  morning: {
    skyColor: 0x88ccff,
    skyColorAlt: 0xaaddff,
    ambientTint: 0xffeecc,
    ambientAlpha: 0.03,
    sunlightColor: 0xffeebb,
    sunlightAlpha: 0.06,
    cloudAlpha: 0.20,
    showStars: false,
  },
  day: {
    skyColor: 0x8abcdd,
    skyColorAlt: 0x9accee,
    ambientTint: 0xffffff,
    ambientAlpha: 0.0,
    sunlightColor: 0xffeebb,
    sunlightAlpha: 0.05,
    cloudAlpha: 0.20,
    showStars: false,
  },
  afternoon: {
    skyColor: 0x7ab0dd,
    skyColorAlt: 0x99bbee,
    ambientTint: 0xffddaa,
    ambientAlpha: 0.03,
    sunlightColor: 0xffdd99,
    sunlightAlpha: 0.07,
    cloudAlpha: 0.18,
    showStars: false,
  },
  sunset: {
    skyColor: 0xff8855,
    skyColorAlt: 0xffaa66,
    ambientTint: 0xff7744,
    ambientAlpha: 0.08,
    sunlightColor: 0xff9955,
    sunlightAlpha: 0.10,
    cloudAlpha: 0.12,
    showStars: false,
  },
  dusk: {
    skyColor: 0x4455aa,
    skyColorAlt: 0x6677bb,
    ambientTint: 0x3344aa,
    ambientAlpha: 0.10,
    sunlightColor: 0xaabbff,
    sunlightAlpha: 0.04,
    cloudAlpha: 0.08,
    showStars: false,
  },
  night: {
    skyColor: 0x1a1a44,
    skyColorAlt: 0x222266,
    ambientTint: 0x111133,
    ambientAlpha: 0.14,
    sunlightColor: 0x6688cc,
    sunlightAlpha: 0.02,
    cloudAlpha: 0.0,
    showStars: true,
  },
  lateNight: {
    skyColor: 0x0a0a22,
    skyColorAlt: 0x151540,
    ambientTint: 0x080820,
    ambientAlpha: 0.18,
    sunlightColor: 0x4466aa,
    sunlightAlpha: 0.01,
    cloudAlpha: 0.0,
    showStars: true,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get the current time-of-day phase based on hour */
export function getTimePhase(hour?: number): TimePhase {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 10) return "morning";
  if (h >= 10 && h < 14) return "day";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 19) return "sunset";
  if (h >= 19 && h < 21) return "dusk";
  if (h >= 21 || h < 2) return "night";
  return "lateNight"; // 2-5 AM
}

/** Get the config for a given time phase */
export function getPhaseConfig(phase?: TimePhase): PhaseConfig {
  const p = phase ?? getTimePhase();
  return PHASE_CONFIGS[p];
}

/** Smooth interpolation between two hex colors */
export function lerpColor(a: number, b: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const blue = Math.round(ab + (bb - ab) * clamped);
  return (r << 16) | (g << 8) | blue;
}

/**
 * Get a blended config that smoothly transitions between adjacent phases.
 * Uses the current minute to interpolate within each phase.
 */
export function getSmoothedPhaseConfig(): PhaseConfig {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentPhase = getTimePhase(hour);
  const nextPhase = getTimePhase((hour + 1) % 24);

  if (currentPhase === nextPhase) {
    return PHASE_CONFIGS[currentPhase];
  }

  // Blend during the transition hour
  const t = minute / 60;
  const a = PHASE_CONFIGS[currentPhase];
  const b = PHASE_CONFIGS[nextPhase];

  return {
    skyColor: lerpColor(a.skyColor, b.skyColor, t),
    skyColorAlt: lerpColor(a.skyColorAlt, b.skyColorAlt, t),
    ambientTint: lerpColor(a.ambientTint, b.ambientTint, t),
    ambientAlpha: a.ambientAlpha + (b.ambientAlpha - a.ambientAlpha) * t,
    sunlightColor: lerpColor(a.sunlightColor, b.sunlightColor, t),
    sunlightAlpha: a.sunlightAlpha + (b.sunlightAlpha - a.sunlightAlpha) * t,
    cloudAlpha: a.cloudAlpha + (b.cloudAlpha - a.cloudAlpha) * t,
    showStars: t > 0.5 ? b.showStars : a.showStars,
  };
}

/**
 * PixelAudio
 *
 * Procedural 8-bit sound system using the Web Audio API.
 * Generates retro-style sound effects at runtime without external files.
 *
 * All sounds are short oscillator bursts shaped with gain envelopes,
 * matching the PICO-8 aesthetic of the virtual office.
 */

// ---------------------------------------------------------------------------
// Singleton Audio Context
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.25;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = _muted ? 0 : _volume;
    _masterGain.connect(_ctx.destination);
  }
  // Resume suspended context (browser autoplay policy)
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

function getMaster(): GainNode {
  getCtx();
  return _masterGain!;
}

// ---------------------------------------------------------------------------
// Public controls
// ---------------------------------------------------------------------------

export function setMuted(muted: boolean): void {
  _muted = muted;
  if (_masterGain) {
    _masterGain.gain.value = muted ? 0 : _volume;
  }
}

export function isMuted(): boolean {
  return _muted;
}

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (_masterGain && !_muted) {
    _masterGain.gain.value = _volume;
  }
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

type WaveType = OscillatorType;

function playTone(
  freq: number,
  duration: number,
  type: WaveType = "square",
  volume = 0.3,
  detune = 0,
): void {
  const ctx = getCtx();
  const master = getMaster();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1): void {
  const ctx = getCtx();
  const master = getMaster();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(master);
  source.start(ctx.currentTime);
}

// ---------------------------------------------------------------------------
// Sound Effects
// ---------------------------------------------------------------------------

/** Click/select — short crisp blip */
export function sfxClick(): void {
  playTone(800, 0.06, "square", 0.15);
  playTone(1200, 0.04, "square", 0.08);
}

/** Open panel / modal open — ascending two-note jingle */
export function sfxOpen(): void {
  playTone(440, 0.08, "square", 0.12);
  setTimeout(() => playTone(660, 0.1, "square", 0.10), 60);
}

/** Close panel / modal close — descending two-note */
export function sfxClose(): void {
  playTone(660, 0.08, "square", 0.10);
  setTimeout(() => playTone(440, 0.06, "square", 0.08), 50);
}

/** Notification — cheerful three-note chime */
export function sfxNotify(): void {
  playTone(523, 0.10, "triangle", 0.15);
  setTimeout(() => playTone(659, 0.10, "triangle", 0.12), 100);
  setTimeout(() => playTone(784, 0.15, "triangle", 0.10), 200);
}

/** Error — low buzz */
export function sfxError(): void {
  playTone(180, 0.15, "sawtooth", 0.12);
  setTimeout(() => playTone(160, 0.20, "sawtooth", 0.10), 100);
}

/** Success / task complete — victory jingle */
export function sfxSuccess(): void {
  playTone(523, 0.08, "square", 0.12);
  setTimeout(() => playTone(659, 0.08, "square", 0.10), 80);
  setTimeout(() => playTone(784, 0.08, "square", 0.10), 160);
  setTimeout(() => playTone(1047, 0.15, "square", 0.12), 240);
}

/** Agent typing — tiny rapid clicks */
export function sfxType(): void {
  const freq = 2000 + Math.random() * 1500;
  playTone(freq, 0.02, "square", 0.04);
  playNoise(0.015, 0.02);
}

/** Hover — subtle blip */
export function sfxHover(): void {
  playTone(1000, 0.03, "sine", 0.06);
}

/** Toggle switch — pick up / put down */
export function sfxToggle(): void {
  playTone(600, 0.05, "square", 0.10);
  setTimeout(() => playTone(900, 0.04, "square", 0.06), 40);
}

/** Navigation / page transition */
export function sfxNav(): void {
  playTone(330, 0.05, "triangle", 0.10);
  setTimeout(() => playTone(440, 0.05, "triangle", 0.08), 50);
  setTimeout(() => playTone(550, 0.08, "triangle", 0.06), 100);
}

/** Pause agent — descending tone */
export function sfxPause(): void {
  playTone(500, 0.10, "triangle", 0.10);
  setTimeout(() => playTone(350, 0.12, "triangle", 0.08), 80);
}

/** Resume agent — ascending tone */
export function sfxResume(): void {
  playTone(350, 0.08, "triangle", 0.10);
  setTimeout(() => playTone(500, 0.12, "triangle", 0.10), 80);
}

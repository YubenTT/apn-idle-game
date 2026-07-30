/**
 * Tiny WebAudio SFX — no asset files.
 * Safe in Node (tests): no-ops without window/AudioContext.
 */

let ctx = null;
let master = null;
let muted = false;
let unlocked = false;
let inAppReduced = false;
let lastHapticAt = 0;

const HAPTICS = Object.freeze({
  hit: [4],
  crit: [10, 18, 12],
  loot: [8, 22, 16],
  rank: [10, 28, 10, 28, 18],
  sheet: [6],
  afford: [8, 16, 8],
  golive: [14, 30, 14, 30, 48],
  zone: [10, 24, 10],
  combo: [8, 18, 8],
  deny: [26],
  toggle: [3],
});

export function hapticPattern(name) {
  return [...(HAPTICS[name] || [])];
}

export function feedbackAllowed({
  muted: isMuted = muted,
  inAppReduced: appReduced = inAppReduced,
  osReduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
} = {}) {
  return !isMuted && !appReduced && !osReduced;
}

function ac() {
  if (typeof window === 'undefined') return null;
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** One modest master bus so layered cues never stack into clipping. */
function out(c) {
  if (!master || master.context !== c) {
    master = c.createGain();
    master.gain.value = 0.8;
    master.connect(c.destination);
  }
  return master;
}

/** Call once on first user gesture */
export function unlockAudio() {
  unlocked = true;
  const c = ac();
  if (!c) return;
  // silent tick to unlock iOS
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.01);
}

export function setMuted(m) {
  muted = !!m;
}

export function setReducedMotion(value) {
  inAppReduced = !!value;
}

function tone(freq, dur, type = 'square', vol = 0.08, slide = 0, at = 0) {
  const c = ac();
  if (!c || !unlocked) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out(c));
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Slower-attack pad voice for fanfares/chords (still < 1.2s total). */
function pad(freq, dur, type = 'sine', vol = 0.05, at = 0) {
  const c = ac();
  if (!c || !unlocked) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.12, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out(c));
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.08, vol = 0.05, hp = 800) {
  const c = ac();
  if (!c || !unlocked) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  src.connect(f);
  f.connect(g);
  g.connect(out(c));
  src.start();
}

/** Sub thump under kills — sine dropped to the floor. */
function subThump(vol = 0.07) {
  tone(72, 0.14, 'sine', vol, -18);
}

const SFX = {
  hit() {
    // short noise + sine thock
    noiseBurst(0.03, 0.04, 1200);
    tone(190 + Math.random() * 30, 0.05, 'sine', 0.065, -70);
  },
  crit() {
    // brighter hit + metallic ping
    tone(520, 0.06, 'square', 0.06, 240);
    tone(2350, 0.09, 'triangle', 0.034, -600);
    noiseBurst(0.025, 0.03, 2400);
  },
  coin() {
    tone(880, 0.07, 'sine', 0.06, 400);
    tone(1320, 0.1, 'sine', 0.04);
  },
  notes() {
    tone(523, 0.08, 'triangle', 0.07);
    tone(784, 0.12, 'triangle', 0.05, 100);
  },
  rank() {
    // rising 3-note arpeggio + sparkle top
    tone(392, 0.1, 'triangle', 0.07);
    tone(523, 0.1, 'triangle', 0.07, 0, 0.07);
    tone(659, 0.16, 'triangle', 0.075, 0, 0.14);
    tone(1319, 0.14, 'sine', 0.03, 0, 0.14);
  },
  upgrade() {
    tone(330, 0.06, 'square', 0.06, 120);
    tone(520, 0.1, 'square', 0.05, 200);
  },
  buy() {
    tone(600, 0.05, 'sine', 0.06);
    tone(900, 0.08, 'sine', 0.05);
  },
  kill() {
    // pop + sub thump
    noiseBurst(0.05, 0.05, 900);
    tone(170, 0.07, 'square', 0.045, -70);
    subThump();
  },
  zone() {
    // short zone-clear fanfare (4 notes, ~0.55s)
    tone(392, 0.09, 'triangle', 0.06);
    tone(523, 0.09, 'triangle', 0.06, 0, 0.08);
    tone(659, 0.1, 'triangle', 0.06, 0, 0.16);
    tone(784, 0.22, 'triangle', 0.065, 0, 0.24);
    pad(196, 0.4, 'sine', 0.03, 0.16);
  },
  golive() {
    // longer resolve chord (~1.05s): root → fifth → octave stack
    pad(130.8, 0.9, 'sine', 0.05);
    pad(261.6, 0.85, 'triangle', 0.05, 0.05);
    pad(329.6, 0.85, 'triangle', 0.045, 0.1);
    pad(392, 0.9, 'sine', 0.05, 0.15);
    pad(523.3, 0.8, 'sine', 0.045, 0.2);
    tone(1046.5, 0.34, 'sine', 0.03, 0, 0.28);
    subThump(0.05);
  },
  combo() {
    // milestone blip — quick rising two-step
    tone(660, 0.05, 'square', 0.05, 220);
    tone(990, 0.09, 'triangle', 0.045, 120, 0.05);
  },
  ship() {
    tone(260, 0.08, 'square', 0.06);
    tone(390, 0.1, 'square', 0.05);
    tone(520, 0.14, 'triangle', 0.06);
  },
  click() {
    // soft UI tap
    tone(700, 0.03, 'square', 0.028);
  },
  toggle() {
    // dry tick for switch flips
    tone(1250, 0.02, 'square', 0.024);
  },
  deny() {
    // dull buzz for refused actions
    tone(118, 0.16, 'sawtooth', 0.055, -42);
    tone(88, 0.13, 'square', 0.032, -18, 0.02);
  },
  error() {
    tone(140, 0.1, 'sawtooth', 0.05, -40);
  },
  loot() {
    // coin-ish chirp arpeggio
    tone(523, 0.06, 'triangle', 0.05, 160);
    tone(784, 0.07, 'sine', 0.045, 180, 0.05);
    tone(1175, 0.1, 'sine', 0.04, 120, 0.1);
  },
  sheet() {
    tone(360, 0.045, 'triangle', 0.03, 80);
  },
  afford() {
    tone(480, 0.05, 'square', 0.04, 120);
    tone(720, 0.08, 'triangle', 0.035, 120);
  },
};

export function sfx(name) {
  if (!feedbackAllowed()) return;
  const fn = SFX[name];
  if (fn) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  const hapticName = ({ coin: 'loot', notes: 'loot', upgrade: 'afford', buy: 'afford', error: 'deny' })[name] || name;
  const pattern = HAPTICS[hapticName];
  const now = Date.now();
  const throttled = hapticName === 'hit' && now - lastHapticAt < 80;
  if (pattern && !throttled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
      lastHapticAt = now;
    } catch {
      /* unsupported haptics are a silent no-op */
    }
  }
}

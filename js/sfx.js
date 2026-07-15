/**
 * Tiny WebAudio SFX — no asset files.
 * Safe in Node (tests): no-ops without window/AudioContext.
 */

let ctx = null;
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

function tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  const c = ac();
  if (!c || !unlocked) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.08, vol = 0.05) {
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
  f.frequency.value = 800;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
}

const SFX = {
  hit() {
    tone(220 + Math.random() * 40, 0.05, 'square', 0.05);
    noiseBurst(0.03, 0.03);
  },
  crit() {
    tone(440, 0.06, 'square', 0.07, 200);
    tone(660, 0.08, 'triangle', 0.05, 100);
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
    tone(392, 0.1, 'triangle', 0.07);
    setTimeout(() => tone(523, 0.1, 'triangle', 0.07), 70);
    setTimeout(() => tone(659, 0.14, 'triangle', 0.08), 140);
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
    noiseBurst(0.06, 0.04);
    tone(180, 0.08, 'sawtooth', 0.04, -80);
  },
  zone() {
    tone(300, 0.08, 'triangle', 0.06);
    tone(450, 0.12, 'triangle', 0.05);
  },
  ship() {
    tone(260, 0.08, 'square', 0.06);
    tone(390, 0.1, 'square', 0.05);
    tone(520, 0.14, 'triangle', 0.06);
  },
  click() {
    tone(700, 0.03, 'square', 0.03);
  },
  error() {
    tone(140, 0.1, 'sawtooth', 0.05, -40);
  },
  loot() {
    tone(523, 0.07, 'triangle', 0.055, 160);
    tone(880, 0.11, 'sine', 0.045, 220);
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
  const hapticName = ({ coin: 'loot', notes: 'loot', upgrade: 'afford', buy: 'afford' })[name] || name;
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

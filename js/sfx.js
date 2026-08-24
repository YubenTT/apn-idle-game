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
  osReduced = false,
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

/* ——— Pack audio motifs ————————————————————————————————————————————————
 * Every Pack owns a tiny audible identity: a 2–4 note motif when the Route
 * enters the Pack, and a 2-note accent when its Gate boss spawns. Zero asset
 * files, zero balance impact, and no `Math.random` anywhere — a plan is a pure
 * function of (packId, genre), so a Pack always sounds like itself.
 *
 * The catalog is deliberately NOT imported here: callers pass the Pack id and
 * its genre string, which keeps this module free of generated data.
 */

/** Genre → authored family. Unknown genres fall back to MOTIF_FALLBACK_FAMILY. */
const MOTIF_FAMILY_BY_GENRE = Object.freeze({
  'tactical-shooter': 'tactical',
  'extraction-shooter': 'tactical',
  moba: 'arena',
  'hero-shooter': 'arena',
  'battle-royale': 'drop',
  mmorpg: 'quest',
  'sports-football': 'sport',
  'sports-basketball': 'sport',
  'sports-driving': 'sport',
  'sandbox-survival': 'craft',
  'open-world-action': 'outlaw',
  'asymmetric-horror': 'dread',
  'action-rpg': 'grim',
});

const MOTIF_FALLBACK_FAMILY = 'quest';

/**
 * Authored families. `steps`/`gate` are semitone offsets from `root`; `step` is
 * the gap between note starts (tempo), `hold` the final note's length, `bed` a
 * 0–1 multiplier for a sub-octave pad under the phrase. Entry motifs run
 * 0.50–0.76 s, Gate accents ~0.28 s, and every volume sits at or below the
 * quietest existing cue — this is a waiting-room game.
 */
const MOTIF_FAMILIES = Object.freeze({
  // Terse, clipped, unresolved — the tritone never settles.
  tactical: Object.freeze({
    root: 294, steps: [0, 7, 6], wave: 'square', step: 0.11, hold: 0.28,
    vol: 0.036, bed: 0, gate: [7, 6], gateWave: 'square',
  }),
  // Bright major arpeggio — the announcer walking on stage.
  arena: Object.freeze({
    root: 330, steps: [0, 4, 7, 12], wave: 'triangle', step: 0.1, hold: 0.26,
    vol: 0.04, bed: 0.35, gate: [12, 7], gateWave: 'triangle',
  }),
  // Falling gesture — the drop-in.
  drop: Object.freeze({
    root: 392, steps: [12, 7, 3], wave: 'triangle', step: 0.12, hold: 0.3,
    vol: 0.038, bed: 0.3, gate: [12, 5], gateWave: 'square',
  }),
  // Stately open fourths — the long journey.
  quest: Object.freeze({
    root: 262, steps: [0, 5, 7, 12], wave: 'sine', step: 0.14, hold: 0.34,
    vol: 0.042, bed: 0.5, gate: [0, 7], gateWave: 'triangle',
  }),
  // Chant: same note twice, then the fifth — a crowd, not a melody.
  sport: Object.freeze({
    root: 349, steps: [0, 0, 7], wave: 'square', step: 0.12, hold: 0.28,
    vol: 0.038, bed: 0.2, gate: [7, 12], gateWave: 'square',
  }),
  // Gentle major sixth — nothing is chasing you.
  craft: Object.freeze({
    root: 262, steps: [0, 4, 9], wave: 'sine', step: 0.15, hold: 0.34,
    vol: 0.04, bed: 0.45, gate: [9, 4], gateWave: 'sine',
  }),
  // Low minor seventh — the getaway car idling.
  outlaw: Object.freeze({
    root: 220, steps: [0, 3, 10], wave: 'square', step: 0.13, hold: 0.32,
    vol: 0.034, bed: 0.4, gate: [10, 3], gateWave: 'square',
  }),
  // Slow semitone slide downward — the room getting colder.
  dread: Object.freeze({
    root: 196, steps: [0, -1, -5], wave: 'sine', step: 0.17, hold: 0.36,
    vol: 0.038, bed: 0.55, gate: [-1, -6], gateWave: 'sine',
  }),
  // Minor rise that falls back — heroic, then not.
  grim: Object.freeze({
    root: 208, steps: [0, 3, 7, 3], wave: 'triangle', step: 0.13, hold: 0.32,
    vol: 0.038, bed: 0.5, gate: [7, 3], gateWave: 'triangle',
  }),
});

/**
 * Per-Pack pitch offsets in semitones, so two Packs in one family still differ.
 * The index is taken from bits 5–7 of the id hash: that slice is the one that
 * gives every shipped Pack id a distinct offset inside its own genre family
 * (checked against all 20). A future id collision only costs a shared motif,
 * never a fault.
 */
const MOTIF_PITCH_OFFSETS = Object.freeze([0, 2, -3, 5, 7, -5, 3, 10]);

/** FNV-1a with a murmur3 finalizer — deterministic, no Math.random. */
function motifHash(packId) {
  const id = String(packId || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function motifFreq(root, semitones) {
  const raw = root * 2 ** (semitones / 12);
  const clamped = Math.min(2200, Math.max(70, raw));
  return Math.round(clamped * 100) / 100;
}

/**
 * Deterministic note plan for a Pack. Pure and Node-safe: it touches no audio
 * context, so it can be inspected without a browser.
 */
export function packMotifPlan(packId, genre) {
  const familyId = MOTIF_FAMILY_BY_GENRE[genre] || MOTIF_FALLBACK_FAMILY;
  const family = MOTIF_FAMILIES[familyId];
  const offset = MOTIF_PITCH_OFFSETS[
    (motifHash(packId) >>> 5) % MOTIF_PITCH_OFFSETS.length
  ];
  const entry = family.steps.map((semitone, index) => {
    const last = index === family.steps.length - 1;
    return Object.freeze({
      freq: motifFreq(family.root, semitone + offset),
      dur: last ? family.hold : Math.round(family.step * 1.25 * 1000) / 1000,
      vol: family.vol,
      at: Math.round(index * family.step * 1000) / 1000,
    });
  });
  const gate = family.gate.map((semitone, index) => Object.freeze({
    freq: motifFreq(family.root, semitone + offset),
    dur: index === 0 ? 0.09 : 0.2,
    vol: family.vol,
    at: index * 0.075,
  }));
  const duration =
    Math.round(((family.steps.length - 1) * family.step + family.hold) * 1000) / 1000;
  return Object.freeze({
    packId: String(packId || ''),
    family: familyId,
    wave: family.wave,
    gateWave: family.gateWave,
    tempo: family.step,
    offset,
    duration,
    entry: Object.freeze(entry),
    gate: Object.freeze(gate),
    bed: family.bed
      ? Object.freeze({
          freq: motifFreq(family.root, family.steps[0] + offset - 12),
          dur: duration,
          vol: Math.round(family.vol * family.bed * 1000) / 1000,
        })
      : null,
  });
}

/** Pack entry: the 2–4 note identity phrase. */
export function packEntryMotif(packId, genre) {
  if (!feedbackAllowed()) return;
  try {
    const plan = packMotifPlan(packId, genre);
    if (plan.bed) pad(plan.bed.freq, plan.bed.dur, 'sine', plan.bed.vol);
    for (const note of plan.entry) {
      tone(note.freq, note.dur, plan.wave, note.vol, 0, note.at);
    }
  } catch {
    /* ignore */
  }
}

/** Gate (boss) spawn: two notes from the same Pack's motif, shorter. */
export function gateSpawnAccent(packId, genre) {
  if (!feedbackAllowed()) return;
  try {
    const plan = packMotifPlan(packId, genre);
    for (const note of plan.gate) {
      tone(note.freq, note.dur, plan.gateWave, note.vol, 0, note.at);
    }
  } catch {
    /* ignore */
  }
}

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

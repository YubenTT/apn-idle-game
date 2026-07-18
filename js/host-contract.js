/**
 * Canonical Host presentation + animation vocabulary.
 *
 * PR-5 intentionally maps semantic clips to the ten shipped placeholder frames.
 * PR-8 may add frames inside each clip, but must not create a second vocabulary.
 */

export const HOST_SOURCE = 'assets/apn-mascot-glb-host.glb';

export const HOST_RENDER_LOCK = Object.freeze({
  cameraY: 18,
  cameraX: 9,
  projection: 'orthographic',
  pivot: 'foot-center',
});

export const HOST_PRESENTATION = Object.freeze({
  min: 118,
  target: 130,
  max: 142,
});

export const HOST_PLACEHOLDER_FRAMES = Object.freeze([
  'idle',
  'run',
  'scan',
  'crit',
  'loot',
  'sprint',
  'overdrive',
  'damage',
  'level',
  'defeat',
]);

const clip = (placeholderFrame, fps, loop = false) => Object.freeze({
  placeholderFrame,
  frames: Object.freeze([placeholderFrame]),
  fps,
  loop,
  placeholder: true,
});

export const HOST_CLIPS = Object.freeze({
  idle: clip('idle', 8, true),
  run: clip('run', 12, true),
  scan_start: clip('scan', 16),
  scan_fire: clip('crit', 20),
  scan_recover: clip('scan', 16),
  hotfix: clip('crit', 18),
  priority_tag: clip('scan', 16),
  tracker_loop: clip('run', 10, true),
  overclock_loop: clip('overdrive', 10, true),
  sprint: clip('sprint', 14, true),
  gear_pull: clip('loot', 14),
  drop_ship: clip('level', 12),
});

export const HOST_CLIP_NAMES = Object.freeze(Object.keys(HOST_CLIPS));

/** Resolve current runtime state to the shipped placeholder atlas. */
export function resolveHostClip({
  hitRecoil = 0,
  attack = 0,
  overdrive = false,
  sprinting = false,
  tracker = false,
} = {}) {
  if (hitRecoil > 0.45) return 'damage';
  if (attack > 0.78) return 'crit';
  if (attack > 0.18) return 'scan';
  if (overdrive) return HOST_CLIPS.overclock_loop.placeholderFrame;
  if (sprinting) return HOST_CLIPS.sprint.placeholderFrame;
  if (tracker) return HOST_CLIPS.tracker_loop.placeholderFrame;
  return HOST_CLIPS.run.placeholderFrame;
}

/* ============================================================================
 * glb-sprite-engine · engine.js — ENGINE CONTRACT v1
 *
 * Loads a clip spec (?spec=<path-to-spec.json>), builds the scene (GLB source
 * or scene-module source), then DETERMINISTICALLY steps the animation:
 * fixed dt = 1/fps per frame, manual loop, no wall-clock rAF. All frames are
 * rendered side-by-side into one horizontal strip canvas (transparent
 * background, alpha:true, preserveDrawingBuffer) and document.title is set to
 * 'render-ready' when done ('render-error: ...' on failure).
 *
 * Track system: keys are [frameNumber, value], linear interpolation, optional
 * "ease":"sine" (smooth in-out on the segment factor). Prop paths:
 * rotation.x/y/z, position.x/y/z, scale.x/y/z (uniform "scale" allowed).
 * At load the engine captures each named node's base transform; track values
 * are ABSOLUTE offsets ADDED to the base.
 * ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';

const APN_CRIMSON = 0xfc1243; // brand token --apn-primary (brand/tokens.css)

function fail(msg) {
  document.title = 'render-error: ' + msg;
  console.error('[glb-sprite-engine]', msg);
}

function evalTrack(track, f) {
  const keys = track.keys;
  if (!keys || keys.length === 0) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const f0 = keys[i][0], v0 = keys[i][1];
    const f1 = keys[i + 1][0], v1 = keys[i + 1][1];
    if (f >= f0 && f <= f1) {
      let t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      if (track.ease === 'sine') t = 0.5 - 0.5 * Math.cos(Math.PI * t);
      return v0 + (v1 - v0) * t;
    }
  }
  return keys[keys.length - 1][1];
}

async function buildSource(spec) {
  const src = spec.source;
  if (src.type === 'glb') {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(src.path); // relative to render.html
    return gltf.scene;
  }
  if (src.type === 'scene') {
    const mod = await import(src.module); // ES module exporting build(THREE)
    const group = mod.build(THREE);
    if (!group || !group.isObject3D) throw new Error('scene module build(THREE) must return a THREE.Group');
    return group;
  }
  throw new Error('unknown source.type: ' + src.type);
}

function setupLights(scene) {
  // Soft fill so the vinyl reads without crushing the dark visor.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x16060a, 0.55));

  // Soft key, upper-left front.
  const key = new THREE.DirectionalLight(0xfff3ea, 1.35);
  key.position.set(-3.2, 4.2, 4.5);
  scene.add(key);

  // Crimson rim from back-right (brand crimson, hero-only role).
  const rim = new THREE.DirectionalLight(APN_CRIMSON, 2.4);
  rim.position.set(3.4, 1.6, -3.8);
  scene.add(rim);

  // Ground underglow: crimson point light low under the figure.
  const glow = new THREE.PointLight(APN_CRIMSON, 14, 7.5, 1.6);
  glow.position.set(0, -1.9, 0.7);
  scene.add(glow);
}

async function main() {
  const params = new URLSearchParams(location.search);
  const specUrl = params.get('spec');
  if (!specUrl) { fail('missing ?spec='); return; }

  const spec = await (await fetch(specUrl)).json();
  const fps = spec.clip.fps;
  const frameCount = spec.clip.frames;
  const S = (spec.output && spec.output.frame) || 256;
  const dt = 1 / fps; // fixed step; stepping is deterministic, dt documented per contract

  // --- renderer: transparent background strip canvas -----------------------
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(frameCount * S, S);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // --- scene ---------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = null;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const root = await buildSource(spec);
  scene.add(root);
  setupLights(scene);

  // --- camera ----------------------------------------------------------------
  const cam = spec.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov || 35, 1, 0.1, 100);
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  const look = cam.lookAt || [0, 0, 0];
  camera.lookAt(look[0], look[1], look[2]);

  // --- base transforms (tracks are offsets ADDED to these) -------------------
  const base = new Map(); // name -> { node, pos, quat, scale }
  root.traverse((n) => {
    if (n.name && !base.has(n.name)) {
      base.set(n.name, { node: n, pos: n.position.clone(), quat: n.quaternion.clone(), scale: n.scale.clone() });
    }
  });

  const tracks = spec.tracks || [];
  const missing = tracks.filter((t) => !base.has(t.node)).map((t) => t.node);
  if (missing.length) { fail('missing nodes: ' + [...new Set(missing)].join(', ')); return; }

  const tmpEuler = new THREE.Euler();
  const tmpQuat = new THREE.Quaternion();

  function applyFrame(f) {
    // reset to base
    for (const rec of base.values()) {
      rec.node.position.copy(rec.pos);
      rec.node.quaternion.copy(rec.quat);
      rec.node.scale.copy(rec.scale);
    }
    // gather rotation offsets per node (applied as one local-space euler)
    const rotOffsets = new Map();
    for (const tr of tracks) {
      const rec = base.get(tr.node);
      const v = evalTrack(tr, f);
      const dot = tr.prop.indexOf('.');
      const kind = dot === -1 ? tr.prop : tr.prop.slice(0, dot);
      const axis = dot === -1 ? null : tr.prop.slice(dot + 1);
      if (kind === 'position' && axis) {
        rec.node.position[axis] = rec.pos[axis] + v;
      } else if (kind === 'scale') {
        if (axis) rec.node.scale[axis] = rec.scale[axis] + v;
        else rec.node.scale.set(rec.scale.x + v, rec.scale.y + v, rec.scale.z + v);
      } else if (kind === 'rotation' && axis) {
        if (!rotOffsets.has(tr.node)) rotOffsets.set(tr.node, { x: 0, y: 0, z: 0 });
        rotOffsets.get(tr.node)[axis] += v;
      } else {
        throw new Error('unsupported prop path: ' + tr.prop);
      }
    }
    for (const [name, off] of rotOffsets) {
      const rec = base.get(name);
      tmpEuler.set(off.x, off.y, off.z, 'XYZ');
      tmpQuat.setFromEuler(tmpEuler);
      rec.node.quaternion.copy(rec.quat).multiply(tmpQuat); // offset in local space
    }
  }

  // --- deterministic strip render: fixed step, manual loop -------------------
  renderer.setScissorTest(true);
  for (let f = 0; f < frameCount; f++) {
    void (f * dt); // animation time t = f * dt; tracks key on frame numbers
    applyFrame(f);
    renderer.setViewport(f * S, 0, S, S);
    renderer.setScissor(f * S, 0, S, S);
    renderer.render(scene, camera);
  }

  document.title = 'render-ready';
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));

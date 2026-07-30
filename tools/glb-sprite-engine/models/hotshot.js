/**
 * Hotshot — creature model for the APN glb-sprite-engine.
 *
 * ENGINE CONTRACT v1: ES module exporting `build(THREE)` that returns a
 * THREE.Group whose animatable children have stable `name` fields.
 *
 * Named parts: torso, head, collar, jacket, arm_l, arm_r, palm_r, orb, base
 * (plus leg_l, leg_r so clips can step a real swagger).
 *
 * Design (CREATURE DESIGN BRIEF): ember orange / charcoal vinyl-toy homage.
 * Big-head chibi proportions, glossy clearcoat materials, popped-collar
 * jacket shell as the unmistakable silhouette, and a fire orb floating above
 * the open right palm — the hover gap under the orb is INTENTIONAL (it
 * floats); every other part is grounded on the base.
 *
 * Conventions (match curator.js): model faces +Z, right side = +X (orb side),
 * plinth bottom sits on y=0, total height ~1.28 (vinyl-family scale).
 * All clip-spec track values are OFFSETS added to the base transforms set
 * here; offsets are in this file's local units (root scale = 0.55, so a
 * +0.10 position offset moves ~0.055 in world space).
 */

const PALETTE = {
  ember: 0xff7a1a, // signature orange vinyl
  emberDeep: 0xe14e00, // shaded orange (shoes, hem, collar lining edge)
  charcoal: 0x26262c, // tee, sleeves, hair
  charcoalDeep: 0x1b1c22, // base disc
  inkGloss: 0x101014, // eyes / brows / smirk
  orbCore: 0xe83e00,
  orbEmissive: 0xff6a00,
  halo: 0xffa040,
};

const FAMILY_SCALE = 0.55; // local units -> world (curator-family height ~1.28)

function vinyl(THREE, color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.roughness ?? 0.32,
    metalness: 0.0,
    clearcoat: opts.clearcoat ?? 1.0,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.16,
    ...(opts.extra || {}),
  });
}

/** Orient a capsule limb segment between two local points (Y-axis aligned geo). */
function limb(THREE, a, b, radius, material) {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = Math.max(dir.length() - radius * 0.6, 0.02);
  const geo = new THREE.CapsuleGeometry(radius, len, 6, 14);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  return mesh;
}

export function build(THREE) {
  const root = new THREE.Group();
  root.name = "hotshot";
  // plinth bottom (local y=-0.12) lands on world y=0 at family scale
  root.scale.setScalar(FAMILY_SCALE);
  root.position.y = 0.12 * FAMILY_SCALE;

  const matEmber = vinyl(THREE, PALETTE.ember);
  const matEmberDeep = vinyl(THREE, PALETTE.emberDeep, { roughness: 0.38 });
  const matCharcoal = vinyl(THREE, PALETTE.charcoal, { roughness: 0.4 });
  const matInk = vinyl(THREE, PALETTE.inkGloss, {
    roughness: 0.22,
    clearcoatRoughness: 0.08,
  });

  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  /* ------------------------------------------------------------------ base */
  const base = new THREE.Group();
  base.name = "base";
  const matBase = vinyl(THREE, PALETTE.charcoalDeep, { roughness: 0.5 });
  add(base, new THREE.CylinderGeometry(0.74, 0.8, 0.12, 40), matBase, 0, -0.06, 0);
  const glow = add(
    base,
    new THREE.TorusGeometry(0.66, 0.032, 10, 48),
    new THREE.MeshStandardMaterial({
      color: PALETTE.orbCore,
      emissive: PALETTE.ember,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    }),
    0,
    -0.015,
    0
  );
  glow.rotation.x = Math.PI / 2;
  root.add(base);

  /* ------------------------------------------------------------------ legs */
  // Stubby charcoal legs, ember sneakers. Pivot at hip so clips can step.
  for (const side of ["l", "r"]) {
    const s = side === "l" ? -1 : 1;
    const leg = new THREE.Group();
    leg.name = `leg_${side}`;
    leg.position.set(s * 0.155, 0.575, 0);
    add(leg, new THREE.CapsuleGeometry(0.088, 0.26, 6, 14), matCharcoal, 0, -0.2, 0);
    const shoe = add(
      leg,
      new THREE.SphereGeometry(0.105, 20, 16),
      matEmberDeep,
      0,
      -0.518,
      0.055
    );
    shoe.scale.set(1.05, 0.62, 1.5); // foot bottom sits on the plinth top
    root.add(leg);
  }

  /* ----------------------------------------------------------------- torso */
  // Hip pivot; lean-back is baked into the base transform (confident pose).
  const torso = new THREE.Group();
  torso.name = "torso";
  torso.position.set(0, 0.58, 0);
  torso.rotation.x = -0.13; // confident lean-back
  add(torso, new THREE.CapsuleGeometry(0.29, 0.44, 8, 20), matCharcoal, 0, 0.27, 0);
  root.add(torso);

  /* ---------------------------------------------------------------- jacket */
  // Open-front popped jacket shell, ember outside / charcoal lining inside.
  const jacket = new THREE.Group();
  jacket.name = "jacket";
  jacket.position.set(0, 0.58, 0);
  jacket.rotation.x = -0.13;
  const GAP = 1.05; // open front wedge (radians) centred on +Z
  const shell = add(
    jacket,
    new THREE.CylinderGeometry(0.335, 0.43, 0.56, 28, 1, true, GAP / 2, Math.PI * 2 - GAP),
    matEmber,
    0, 0.26, 0
  );
  shell.material.side = THREE.DoubleSide;
  const lining = add(
    jacket,
    new THREE.CylinderGeometry(0.315, 0.405, 0.545, 28, 1, true, GAP / 2, Math.PI * 2 - GAP),
    matCharcoal,
    0, 0.26, 0
  );
  lining.material.side = THREE.DoubleSide;
  // flared hem
  const hem = add(
    jacket,
    new THREE.CylinderGeometry(0.43, 0.465, 0.13, 28, 1, true, GAP / 2, Math.PI * 2 - GAP),
    matEmberDeep,
    0, -0.01, 0
  );
  hem.material.side = THREE.DoubleSide;
  root.add(jacket);

  /* ---------------------------------------------------------------- collar */
  // THE popped collar — tall flared ring that hugs the jaw, tipped back.
  // Its top radius EXCEEDS the head radius so the ring reads around the face.
  const collar = new THREE.Group();
  collar.name = "collar";
  collar.position.set(0, 1.02, -0.065);
  collar.rotation.x = -0.13;
  const CGAP = 1.35; // wider opening than the jacket so the chest reads through
  // cylinder theta 0 sits at +Z, so thetaStart = CGAP/2 centres the gap at the front
  const collarShell = add(
    collar,
    new THREE.CylinderGeometry(0.55, 0.36, 0.32, 28, 1, true, CGAP / 2, Math.PI * 2 - CGAP),
    matEmber,
    0, 0.06, 0
  );
  collarShell.material.side = THREE.DoubleSide;
  collarShell.rotation.x = -0.24; // flare: back edge stands proud of the jaw
  const collarLining = add(
    collar,
    new THREE.CylinderGeometry(0.525, 0.345, 0.305, 28, 1, true, CGAP / 2, Math.PI * 2 - CGAP),
    matCharcoal,
    0, 0.06, 0
  );
  collarLining.material.side = THREE.DoubleSide;
  collarLining.rotation.x = -0.24;
  // popped front wings — the two points that scream "collar up"
  for (const side of [-1, 1]) {
    const wing = add(
      collar,
      new THREE.BoxGeometry(0.095, 0.32, 0.034),
      matEmber,
      side * 0.27,
      0.13,
      0.17
    );
    wing.rotation.set(-0.3, side * 0.5, side * -0.28);
  }
  root.add(collar);

  /* ------------------------------------------------------------------ head */
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 1.433, -0.092); // sits on the leaning torso
  head.rotation.x = 0.02; // chin up against the lean — pure confidence
  head.scale.setScalar(1.15); // vinyl-family chibi: head ~43% of figure height
  add(head, new THREE.SphereGeometry(0.4, 36, 28), matEmber);

  // charcoal swept hair shell (top + back) with ember-tipped spikes
  const hair = add(
    head,
    new THREE.SphereGeometry(0.425, 36, 24, 0, Math.PI * 2, 0, 1.5),
    matCharcoal
  );
  hair.rotation.x = -0.72; // swept hard back — ember face stays open
  const spikeData = [
    { p: [0, 0.46, -0.28], r: [-1.15, 0, 0], s: 1.15 },
    { p: [-0.2, 0.4, -0.3], r: [-1.05, 0, 0.35], s: 0.95 },
    { p: [0.2, 0.4, -0.3], r: [-1.05, 0, -0.35], s: 0.95 },
    { p: [0, 0.5, -0.02], r: [-0.55, 0, 0], s: 0.9 },
  ];
  for (const sp of spikeData) {
    const spike = add(
      head,
      new THREE.ConeGeometry(0.085 * sp.s, 0.3 * sp.s, 12),
      matCharcoal,
      ...sp.p
    );
    spike.rotation.set(...sp.r);
    const tip = add(
      head,
      new THREE.ConeGeometry(0.036 * sp.s, 0.11 * sp.s, 10),
      matEmberDeep,
      sp.p[0],
      sp.p[1] + 0.15 * sp.s,
      sp.p[2] - 0.1 * sp.s
    );
    tip.rotation.set(...sp.r);
  }

  // cocky face: angled brows, almond eyes with glints, asymmetric smirk
  for (const side of [-1, 1]) {
    const brow = add(head, new THREE.BoxGeometry(0.16, 0.03, 0.032), matInk, side * 0.15, 0.205, 0.345);
    brow.rotation.set(0.1, side * -0.12, side * -0.2);
    const eye = add(head, new THREE.SphereGeometry(0.075, 18, 14), matInk, side * 0.145, 0.05, 0.36);
    eye.scale.set(1, 1.35, 0.45);
    eye.rotation.set(0, side * -0.22, side * -0.14);
    add(head, new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), side * 0.125, 0.095, 0.4);
  }
  const smirk = add(head, new THREE.TorusGeometry(0.095, 0.013, 8, 24, 1.15), matInk, 0.01, -0.155, 0.365);
  smirk.rotation.set(-0.12, 0, -Math.PI / 2 - 0.575 + 0.22);
  root.add(head);

  /* ------------------------------------------------------------------ arms */
  // Left arm: relaxed hang, slight elbow bend, hand near hip.
  const armL = new THREE.Group();
  armL.name = "arm_l";
  armL.position.set(-0.35, 1.0, -0.034);
  armL.add(limb(THREE, [0, 0, 0], [-0.075, -0.26, 0.035], 0.078, matCharcoal));
  armL.add(limb(THREE, [-0.075, -0.26, 0.035], [-0.105, -0.44, 0.12], 0.07, matCharcoal));
  add(armL, new THREE.SphereGeometry(0.095, 18, 14), matEmber, -0.11, -0.49, 0.14);
  root.add(armL);

  // Right arm: raised, elbow bent, forearm up so the open palm faces the sky.
  const armR = new THREE.Group();
  armR.name = "arm_r";
  armR.position.set(0.35, 1.0, -0.034);
  armR.add(limb(THREE, [0, 0, 0], [0.18, -0.17, 0.14], 0.078, matCharcoal));
  armR.add(limb(THREE, [0.18, -0.17, 0.14], [0.235, -0.085, 0.345], 0.07, matCharcoal));
  root.add(armR);

  /* ---------------------------------------------------------------- palm_r */
  // Open palm, face up — the orb's launch pad.
  const palmR = new THREE.Group();
  palmR.name = "palm_r";
  palmR.position.set(0.585, 0.905, 0.315);
  const palm = add(palmR, new THREE.SphereGeometry(0.095, 18, 14), matEmber);
  palm.scale.set(1.15, 0.55, 1.25);
  add(palmR, new THREE.SphereGeometry(0.045, 12, 10), matEmber, -0.075, 0.01, 0.075); // thumb
  root.add(palmR);

  /* ------------------------------------------------------------------- orb */
  // Fire orb — floats above the palm on purpose (hover gap is intentional).
  const orb = new THREE.Group();
  orb.name = "orb";
  orb.position.set(0.585, 1.155, 0.315); // ~0.20 hover gap above the palm
  const core = add(
    orb,
    new THREE.IcosahedronGeometry(0.15, 2),
    new THREE.MeshStandardMaterial({
      color: PALETTE.orbCore,
      emissive: PALETTE.orbEmissive,
      emissiveIntensity: 1.15,
      roughness: 0.35,
    })
  );
  core.name = "orb_core";
  const halo = add(
    orb,
    new THREE.SphereGeometry(0.18, 20, 16),
    new THREE.MeshBasicMaterial({
      color: PALETTE.halo,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.name = "orb_halo";
  const light = new THREE.PointLight(0xff8a2a, 5.5, 3.2, 2);
  light.name = "orb_light";
  orb.add(light);
  root.add(orb);

  return root;
}

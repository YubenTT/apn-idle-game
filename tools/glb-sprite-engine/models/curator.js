// The Curator — boss-tier vinyl-toy sentinel (Chamber-homage energy, original design).
// ENGINE CONTRACT v1: ES module exporting `build(THREE)` -> THREE.Group.
// Animatable named nodes (all DIRECT children of the root group):
//   base    — navy plinth + gold trim ring (static stand)
//   torso   — shoes, navy suit core, white jacket back, gold tie/buckle, collar
//   head    — skull, ears, navy slick side-part hair, smirk
//   shades  — gold-rimmed dark wrap visor (same pivot as head)
//   arm_l   — left shoulder pad / sleeve / cuff / glove
//   arm_r   — right arm, hand meets cane grip
//   cane    — long gold sniper-cane (scope on top), pivot at hand grip
//   coat_l  — left white lapel/coat panel (+ gold hem)
//   coat_r  — right white lapel/coat panel (+ gold hem)
//
// All clip-spec track values are OFFSETS added to the base transforms set here.
// Model faces +Z. Right side = +X (cane side). Plinth bottom sits on y=0.
// Total height ~1.28; head diameter 0.60 (~47% — chibi).

export function build(THREE) {
  const root = new THREE.Group();
  root.name = 'curator';

  // ---- materials: glossy vinyl --------------------------------------------
  const suitWhite = new THREE.MeshPhysicalMaterial({
    color: 0xf4f1e8, roughness: 0.34, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.22,
  });
  const navy = new THREE.MeshPhysicalMaterial({
    color: 0x1c2444, roughness: 0.38, metalness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.25,
  });
  const navyDeep = new THREE.MeshPhysicalMaterial({
    color: 0x141a33, roughness: 0.32, metalness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.18,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd9b45c, metalness: 0.95, roughness: 0.26,
  });
  const goldDark = new THREE.MeshStandardMaterial({
    color: 0xa9833a, metalness: 0.95, roughness: 0.34,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x090b12, roughness: 0.06, metalness: 0.35,
    clearcoat: 1.0, clearcoatRoughness: 0.04, side: THREE.DoubleSide,
  });
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xf0dcc8, roughness: 0.42, metalness: 0.0,
    clearcoat: 0.9, clearcoatRoughness: 0.30,
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: 0x1f2138, roughness: 0.30, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.15,
  });
  const coatWhite = suitWhite.clone();
  coatWhite.side = THREE.DoubleSide;
  const goldSide = gold.clone();
  goldSide.side = THREE.DoubleSide;

  function mesh(geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  }

  // ---- base: plinth --------------------------------------------------------
  const base = new THREE.Group();
  base.name = 'base';
  base.add(mesh(new THREE.CylinderGeometry(0.50, 0.55, 0.09, 48), navyDeep, 0, 0.045, 0));
  const trim = mesh(new THREE.TorusGeometry(0.505, 0.014, 12, 64), gold, 0, 0.088, 0);
  trim.rotation.x = Math.PI / 2;
  base.add(trim);
  base.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.014, 48), suitWhite, 0, 0.095, 0));
  root.add(base);

  // ---- torso ---------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.10, 0);

  // shoes (wide smug stance) + gold soles
  for (const sx of [-1, 1]) {
    const shoe = mesh(new THREE.SphereGeometry(0.095, 24, 16), navyDeep, sx * 0.15, 0.062, 0.055);
    shoe.scale.set(1.0, 0.60, 1.40);
    torso.add(shoe);
    const sole = mesh(new THREE.CylinderGeometry(0.10, 0.105, 0.016, 24), gold, sx * 0.15, 0.014, 0.055);
    sole.scale.set(1.0, 1.0, 1.35);
    torso.add(sole);
  }

  // navy suit core (lathe)
  const bodyPts = [
    [0.001, 0.020], [0.140, 0.025], [0.185, 0.060], [0.200, 0.120],
    [0.185, 0.240], [0.190, 0.320], [0.215, 0.420], [0.200, 0.500],
    [0.160, 0.555], [0.100, 0.585], [0.078, 0.615], [0.060, 0.635],
    [0.001, 0.645],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  torso.add(mesh(new THREE.LatheGeometry(bodyPts, 48), navy));

  // white jacket: lathe segment covering sides + back, front wedge open
  const jacketPts = [
    [0.205, 0.160], [0.196, 0.240], [0.201, 0.320], [0.226, 0.420],
    [0.211, 0.500], [0.171, 0.555], [0.111, 0.585], [0.088, 0.600],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const jacket = mesh(
    new THREE.LatheGeometry(jacketPts, 40, 0.62, Math.PI * 2 - 1.24),
    suitWhite,
  );
  torso.add(jacket);

  // collar
  const collar = mesh(new THREE.TorusGeometry(0.095, 0.028, 12, 32), suitWhite, 0, 0.612, 0);
  collar.rotation.x = Math.PI / 2;
  torso.add(collar);

  // gold tie + knot + belt buckle (visible through the open front wedge)
  const tieShape = new THREE.Shape();
  tieShape.moveTo(0, 0.075);
  tieShape.lineTo(0.028, 0.010);
  tieShape.lineTo(0, -0.080);
  tieShape.lineTo(-0.028, 0.010);
  tieShape.closePath();
  const tie = mesh(
    new THREE.ExtrudeGeometry(tieShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }),
    gold, 0, 0.395, 0.198,
  );
  tie.rotation.x = -0.10;
  torso.add(tie);
  const knot = mesh(new THREE.BoxGeometry(0.046, 0.040, 0.022), gold, 0, 0.478, 0.192);
  knot.rotation.x = -0.12;
  torso.add(knot);
  torso.add(mesh(new THREE.BoxGeometry(0.072, 0.046, 0.020), gold, 0, 0.255, 0.180));

  root.add(torso);

  // ---- head ----------------------------------------------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.72, 0);
  head.rotation.x = -0.04; // smug chin-up (base pose)

  head.add(mesh(new THREE.SphereGeometry(0.30, 48, 32), skin, 0, 0.26, 0.01));
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.05, 16, 12), skin, sx * 0.295, 0.24, 0.01);
    ear.scale.set(0.55, 1.0, 0.8);
    head.add(ear);
  }
  // slick side-part hair cap, tilted back (negative x tips the cap rearward)
  const cap = mesh(
    new THREE.SphereGeometry(0.315, 48, 24, 0, Math.PI * 2, 0, 1.45),
    hairMat, 0, 0.27, -0.02,
  );
  cap.rotation.x = -0.12;
  head.add(cap);
  // side-part swoop
  const swoop = mesh(new THREE.SphereGeometry(0.13, 24, 16), hairMat, 0.105, 0.485, 0.140);
  swoop.scale.set(1.15, 0.42, 0.75);
  swoop.rotation.set(-0.15, -0.30, -0.25);
  head.add(swoop);
  // smug smirk
  const smirk = mesh(new THREE.TorusGeometry(0.032, 0.007, 8, 20, 1.9), navyDeep, 0.055, 0.135, 0.272);
  smirk.rotation.set(-0.22, 0.10, 2.19);
  head.add(smirk);

  root.add(head);

  // ---- shades: gold-rimmed dark wrap visor ---------------------------------
  const shades = new THREE.Group();
  shades.name = 'shades';
  shades.position.set(0, 0.72, 0); // same pivot as head — keep rot keys in sync
  shades.rotation.x = -0.04;

  const frame = mesh(
    new THREE.CylinderGeometry(0.312, 0.312, 0.150, 48, 1, true, -0.85, 1.70),
    goldSide, 0, 0.265, 0.01,
  );
  shades.add(frame);
  const band = mesh(
    new THREE.CylinderGeometry(0.317, 0.317, 0.118, 48, 1, true, -0.78, 1.56),
    lens, 0, 0.265, 0.01,
  );
  shades.add(band);
  for (const sx of [-1, 1]) {
    shades.add(mesh(new THREE.SphereGeometry(0.020, 12, 10), gold, sx * 0.2347, 0.265, 0.2155));
  }
  root.add(shades);

  // ---- arms ----------------------------------------------------------------
  function buildArm() {
    const arm = new THREE.Group();
    const pad = mesh(new THREE.SphereGeometry(0.090, 24, 16), suitWhite, 0, -0.01, 0);
    pad.scale.set(1, 0.9, 1);
    arm.add(pad);
    arm.add(mesh(new THREE.CapsuleGeometry(0.066, 0.15, 8, 16), suitWhite, 0, -0.135, 0));
    const cuff = mesh(new THREE.TorusGeometry(0.066, 0.014, 10, 24), gold, 0, -0.245, 0);
    cuff.rotation.x = Math.PI / 2;
    arm.add(cuff);
    const glove = mesh(new THREE.SphereGeometry(0.075, 20, 14), navyDeep, 0, -0.30, 0);
    glove.scale.set(0.95, 1.05, 0.95);
    arm.add(glove);
    return arm;
  }

  const arm_l = buildArm();
  arm_l.name = 'arm_l';
  arm_l.position.set(-0.25, 0.655, 0);
  arm_l.rotation.set(-0.06, 0, -0.18);
  root.add(arm_l);

  const arm_r = buildArm();
  arm_r.name = 'arm_r';
  arm_r.position.set(0.25, 0.655, 0);
  arm_r.rotation.set(-0.15, 0, 0.35); // glove lands on cane grip
  root.add(arm_r);

  // ---- cane: long gold sniper-cane, pivot at hand grip ----------------------
  const cane = new THREE.Group();
  cane.name = 'cane';
  cane.position.set(0.353, 0.376, 0.042);

  cane.add(mesh(new THREE.CylinderGeometry(0.017, 0.012, 0.60, 16), gold, 0, 0.026, 0));
  const tip = mesh(new THREE.SphereGeometry(0.020, 12, 10), goldDark, 0, -0.264, 0);
  tip.scale.set(1, 0.7, 1);
  cane.add(tip);
  cane.add(mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.08, 16), navyDeep, 0, -0.01, 0));
  // scope assembly (sniper silhouette)
  cane.add(mesh(new THREE.BoxGeometry(0.024, 0.05, 0.03), gold, 0, 0.285, 0.015));
  const scope = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.16, 20), gold, 0, 0.315, 0.05);
  scope.rotation.x = Math.PI / 2;
  cane.add(scope);
  for (const rz of [0.005, 0.095]) {
    const ring = mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.016, 20), goldDark, 0, 0.315, rz);
    ring.rotation.x = Math.PI / 2;
    cane.add(ring);
  }
  const glassFront = mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.006, 20), lens, 0, 0.315, 0.132);
  glassFront.rotation.x = Math.PI / 2;
  cane.add(glassFront);
  const eyepiece = mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 16), navyDeep, 0, 0.315, -0.038);
  eyepiece.rotation.x = Math.PI / 2;
  cane.add(eyepiece);
  root.add(cane);

  // ---- coat panels (lapels) --------------------------------------------------
  function buildCoat(sign) {
    const coat = new THREE.Group();
    const thetaStart = sign > 0 ? 0.35 : -(0.35 + 1.15);
    const panel = mesh(
      new THREE.CylinderGeometry(0.238, 0.272, 0.36, 24, 1, true, thetaStart, 1.15),
      coatWhite, 0, -0.18, 0,
    );
    coat.add(panel);
    const hem = mesh(
      new THREE.CylinderGeometry(0.273, 0.279, 0.022, 24, 1, true, thetaStart, 1.15),
      goldSide, 0, -0.349, 0,
    );
    coat.add(hem);
    return coat;
  }

  const coat_l = buildCoat(-1);
  coat_l.name = 'coat_l';
  coat_l.position.set(0, 0.66, 0);
  root.add(coat_l);

  const coat_r = buildCoat(1);
  coat_r.name = 'coat_r';
  coat_r.position.set(0, 0.66, 0);
  root.add(coat_r);

  return root;
}

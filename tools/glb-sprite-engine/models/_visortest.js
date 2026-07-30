// The Recon — arctic-blue vinyl-toy creature (ENGINE CONTRACT v1 scene module).
// Chibi hooded hunter: hood-cape silhouette, bow with glowing cyan energy arrow,
// tiny hovering drone sidekick. All animatable parts are stable named nodes:
//   torso, head, hood, cape, arm_l, arm_r, bow, arrow, drone, base
// Exports build(THREE) -> THREE.Group. Feet/base rest on y=0, facing +z.

const PALETTE = {
  body: 0x4aa9e0,       // arctic blue vinyl
  bodyDark: 0x2f7fb8,   // shaded blue (arms)
  face: 0x0e2033,       // shadowed face under hood
  hood: 0x1d3d63,       // deep navy hood
  cape: 0x18334f,       // deep navy cape (slightly darker than hood)
  bow: 0x24466b,        // navy stave
  bowTip: 0x9fd9f2,     // pale ice limb tips
  cyan: 0x3fe8ff,       // glowing energy cyan
  base: 0x14293d,       // display puck
  drone: 0x2c5a86,      // drone shell
};

export function build(THREE) {
  const vinyl = (color, opts = {}) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.24,
      metalness: 0.0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.22,
      ...opts,
    });
  const glow = (color, intensity = 1.6) =>
    new THREE.MeshStandardMaterial({
      color: 0x0d3038,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.4,
    });
  const aim = (group, from, to) => {
    // orient the group's local -y (limb direction) from->to
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  };

  const root = new THREE.Group();
  root.name = 'recon';

  // ---- base: display puck with cyan underglow ring -------------------------
  const base = new THREE.Group();
  base.name = 'base';
  const puck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.68, 0.1, 40),
    vinyl(PALETTE.base, { roughness: 0.35 })
  );
  puck.position.y = 0.05;
  base.add(puck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.022, 12, 48), glow(PALETTE.cyan, 1.5));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.101;
  base.add(ring);
  root.add(base);

  // ---- torso: rounded capsule roly-poly body --------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.52, 0); // pivot mid-body for breathing/rocking
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.22, 8, 24), vinyl(PALETTE.body));
  torso.add(belly);
  // chest gem — small cyan energy core
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glow(PALETTE.cyan, 2.2));
  gem.position.set(0, 0.16, 0.27);
  gem.scale.set(1, 1.3, 0.55);
  torso.add(gem);
  // belt band — sits proud of the belly so it never z-fights
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.295, 0.032, 10, 32),
    vinyl(PALETTE.hood, { roughness: 0.4 })
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.13;
  torso.add(belt);
  root.add(torso);

  // ---- head: big shiny sphere, shadowed face, glowing eyes -----------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.14, 0); // pivot at neck
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), vinyl(PALETTE.body));
  head.add(skull);
  // face: smaller dark sphere pushed forward so only the front cap shows
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 28, 20),
    vinyl(PALETTE.face, { roughness: 0.32 })
  );
  face.position.set(0, -0.02, 0.14);
  face.scale.set(0.95, 0.92, 0.9);
  head.add(face);
  // glowing cyan visor-slit — reads at sprite size like the host's visor
  const slit = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.24, 6, 14), glow(PALETTE.cyan, 2.1));
  slit.rotation.z = Math.PI / 2; // horizontal band across the face
  slit.position.set(0, 0.04, 0.475);
  slit.scale.set(1, 1, 0.45);
  head.add(slit);
  // two bright eye cores inside the slit for extra pop
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), glow(PALETTE.cyan, 2.6));
    eye.position.set(sx * 0.1, 0.04, 0.485);
    eye.scale.set(1, 1.15, 0.45);
    head.add(eye);
  }
  root.add(head);

  // ---- hood: shell wrapping top+back+sides, ring framing the face ----------
  const hood = new THREE.Group();
  hood.name = 'hood';
  hood.position.set(0, 1.14, 0); // shares head pivot so it can droop
  // shell: sphere sector centered on the back (-z), wrapping toward the sides
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.475, 32, 20, Math.PI * 0.82, Math.PI * 1.36, 0, 2.1),
    vinyl(PALETTE.hood, { side: THREE.DoubleSide, roughness: 0.3 })
  );
  hood.add(shell);
  // face ring: hood opening hugging the shadowed face — reads instantly as a hood
  const faceRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.06, 14, 36),
    vinyl(PALETTE.hood, { roughness: 0.3 })
  );
  faceRing.position.set(0, 0.02, 0.28);
  faceRing.rotation.x = 0.05;
  faceRing.scale.set(1, 1.1, 1);
  hood.add(faceRing);
  // pointed hood tip flopping backward, glowing pom
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 18), vinyl(PALETTE.hood));
  tip.position.set(0, 0.5, -0.22);
  tip.rotation.x = -0.85;
  hood.add(tip);
  const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glow(PALETTE.cyan, 1.3));
  tipBall.position.set(0, 0.585, -0.365);
  hood.add(tipBall);
  root.add(hood);

  // ---- cape: open cylinder segment draped down the back --------------------
  const cape = new THREE.Group();
  cape.name = 'cape';
  cape.position.set(0, 0.98, 0); // pivot at shoulders
  const spread = 2.5; // radians around the back
  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.54, 0.78, 28, 1, true, Math.PI - spread / 2, spread),
    vinyl(PALETTE.cape, { side: THREE.DoubleSide, roughness: 0.34 })
  );
  cloth.position.y = -0.39; // hem ~0.20, shoulders ~0.98
  cape.add(cloth);
  // clasped collar joining cape at the front
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.045, 10, 28),
    vinyl(PALETTE.cape, { roughness: 0.34 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.02;
  cape.add(collar);
  root.add(cape);

  // ---- bow: C-stave + string, grip at local origin, held across the body ---
  // local space: stave arc in XY plane, grip (stave midpoint) at origin,
  // string behind at -x, arrow points +x.
  const R = 0.4;
  const ARC = 1.28; // half-arc in radians
  const bow = new THREE.Group();
  bow.name = 'bow';
  const gripPos = new THREE.Vector3(0.1, 0.58, 0.45);
  bow.position.copy(gripPos);
  bow.rotation.set(0, 0.35, 0.3); // C faces the 3/4 camera; arrow sweeps screen-right
  const stave = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.032, 12, 40, ARC * 2),
    vinyl(PALETTE.bow, { roughness: 0.3 })
  );
  stave.rotation.z = -ARC; // center the arc on local +x
  stave.position.x = -R; // grip (arc midpoint) lands on the group origin
  bow.add(stave);
  const stringX = R * Math.cos(ARC) - R; // string x in grip space
  const tipA = new THREE.Vector3(stringX, R * Math.sin(ARC), 0);
  const tipB = new THREE.Vector3(stringX, -R * Math.sin(ARC), 0);
  for (const tip of [tipA, tipB]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), vinyl(PALETTE.bowTip));
    cap.position.copy(tip);
    bow.add(cap);
  }
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, tipA.distanceTo(tipB), 6),
    new THREE.MeshStandardMaterial({ color: 0xbfe9ff, roughness: 0.6 })
  );
  string.position.set(stringX, 0, 0);
  bow.add(string);
  root.add(bow);

  // ---- arrow: glowing cyan energy bolt, nocked on the string ---------------
  // child of bow so it follows the draw; own tracks nod/release it.
  const arrow = new THREE.Group();
  arrow.name = 'arrow';
  arrow.position.set(stringX - 0.04, 0, 0); // tail resting on the string
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), glow(PALETTE.cyan, 1.6));
  shaft.rotation.z = Math.PI / 2; // lie along +x
  shaft.position.x = 0.24;
  arrow.add(shaft);
  const headCone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.11, 12), glow(PALETTE.cyan, 2.4));
  headCone.rotation.z = -Math.PI / 2; // point +x
  headCone.position.x = 0.52;
  arrow.add(headCone);
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.006), vinyl(PALETTE.bowTip));
    fin.position.set(0.03, 0, 0);
    fin.rotation.x = a;
    arrow.add(fin);
  }
  bow.add(arrow);

  // ---- arms: stubby capsules, pivot at shoulder, mitts land on the bow -----
  const makeArm = (name, shoulder, target) => {
    const arm = new THREE.Group();
    arm.name = name;
    arm.position.copy(shoulder);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.2, 6, 16), vinyl(PALETTE.bodyDark));
    limb.position.y = -0.16; // hang down from pivot
    arm.add(limb);
    const mitt = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), vinyl(PALETTE.body));
    mitt.position.y = -0.3;
    arm.add(mitt);
    aim(arm, shoulder, target);
    root.add(arm);
    return arm;
  };
  // left mitt on the grip; right mitt on the string (drawing hand)
  // world position of the drawing point on the string
  bow.updateMatrixWorld(true);
  const drawPoint = bow.localToWorld(new THREE.Vector3(stringX, 0.02, 0));
  makeArm('arm_l', new THREE.Vector3(0.3, 0.8, 0.06), gripPos);
  makeArm('arm_r', new THREE.Vector3(-0.3, 0.8, 0.06), drawPoint);

  // ---- drone: tiny hovering sidekick ---------------------------------------
  const drone = new THREE.Group();
  drone.name = 'drone';
  drone.position.set(-0.58, 1.12, 0.12);
  const shellD = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 14), vinyl(PALETTE.drone));
  shellD.scale.set(1, 0.82, 1);
  drone.add(shellD);
  const rotor = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.018, 8, 28),
    vinyl(PALETTE.hood, { roughness: 0.35 })
  );
  rotor.rotation.x = Math.PI / 2;
  rotor.position.y = 0.02;
  drone.add(rotor);
  const droneEye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), glow(PALETTE.cyan, 2.4));
  droneEye.position.set(0, 0, 0.085);
  droneEye.scale.z = 0.5;
  drone.add(droneEye);
  root.add(drone);

  return root;
}

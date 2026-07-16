const canvas = document.querySelector('#stage');
window.addEventListener('error', (event) => { window.__MASCOT_ERROR__ = event.message; });
window.addEventListener('unhandledrejection', (event) => { window.__MASCOT_ERROR__ = String(event.reason?.stack || event.reason); });
const requestedSize = Math.max(128, Math.min(1024, Number(new URLSearchParams(location.search).get('size')) || 512));
canvas.width = requestedSize;
canvas.height = requestedSize;
const gl = canvas.getContext('webgl2', {
  alpha: true,
  antialias: true,
  premultipliedAlpha: false,
  preserveDrawingBuffer: true,
});

const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const multiply = (a, b) => {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
};
const radians = (degrees) => (degrees * Math.PI) / 180;
const rotateX = (degrees) => {
  const c = Math.cos(radians(degrees));
  const s = Math.sin(radians(degrees));
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};
const rotateY = (degrees) => {
  const c = Math.cos(radians(degrees));
  const s = Math.sin(radians(degrees));
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
const rotateZ = (degrees) => {
  const c = Math.cos(radians(degrees));
  const s = Math.sin(radians(degrees));
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};
const translate = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const scale = (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);

const vertexSource = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uGlobal;
uniform float uOutline;
out vec3 vNormal;
void main() {
  vec3 displaced = aPosition + aNormal * uOutline;
  gl_Position = uGlobal * uModel * vec4(displaced, 1.0);
  vNormal = mat3(uGlobal * uModel) * aNormal;
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec3 vNormal;
uniform vec4 uColor;
uniform bool uInk;
out vec4 outColor;
void main() {
  if (uInk) { outColor = vec4(0.025, 0.035, 0.055, uColor.a); return; }
  vec3 lightDir = normalize(vec3(-0.45, 0.72, 0.54));
  float light = dot(normalize(vNormal), lightDir);
  float band = light > 0.62 ? 1.08 : (light > 0.05 ? 0.88 : 0.66);
  outColor = vec4(uColor.rgb * band, uColor.a);
}`;

function shader(type, source) {
  const value = gl.createShader(type);
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value));
  return value;
}

const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));

const locations = {
  position: gl.getAttribLocation(program, 'aPosition'),
  normal: gl.getAttribLocation(program, 'aNormal'),
  model: gl.getUniformLocation(program, 'uModel'),
  global: gl.getUniformLocation(program, 'uGlobal'),
  outline: gl.getUniformLocation(program, 'uOutline'),
  color: gl.getUniformLocation(program, 'uColor'),
  ink: gl.getUniformLocation(program, 'uInk'),
};

const component = {
  5123: { ctor: Uint16Array, glType: gl.UNSIGNED_SHORT },
  5125: { ctor: Uint32Array, glType: gl.UNSIGNED_INT },
  5126: { ctor: Float32Array, glType: gl.FLOAT },
};

async function loadGlb(url) {
  const bytes = await (await fetch(url)).arrayBuffer();
  const view = new DataView(bytes);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)).replace(/\0+$/, ''));
  const binaryHeader = 20 + jsonLength;
  const binaryLength = view.getUint32(binaryHeader, true);
  const binaryOffset = binaryHeader + 8;
  const binary = bytes.slice(binaryOffset, binaryOffset + binaryLength);
  return { json, binary };
}

function accessorData(model, accessorIndex) {
  const accessor = model.json.accessors[accessorIndex];
  const bufferView = model.json.bufferViews[accessor.bufferView];
  const def = component[accessor.componentType];
  const width = accessor.type === 'VEC3' ? 3 : accessor.type === 'VEC2' ? 2 : 1;
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  return { accessor, array: new def.ctor(model.binary, offset, accessor.count * width), glType: def.glType };
}

const colorByMesh = [
  [1, 0.035, 0.19, 1],
  [0.018, 0.025, 0.04, 1],
  [0.78, 0.018, 0.11, 1],
  [0.86, 0.02, 0.14, 1],
  [0.86, 0.02, 0.14, 1],
  [0.68, 0.015, 0.08, 1],
  [1, 0.04, 0.22, 0.16],
];

let model;
let draws = [];
let activePose = 'idle';

function poseLocal(nodeIndex, source) {
  let local = source;
  if (activePose === 'run') {
    if (nodeIndex === 5) local = multiply(local, rotateZ(30));
    if (nodeIndex === 6) local = multiply(local, rotateZ(-30));
  }
  if (activePose === 'scan' || activePose === 'crit') {
    if (nodeIndex === 6) local = multiply(local, rotateZ(-72));
  }
  if (activePose === 'loot') {
    if (nodeIndex === 6) local = multiply(local, rotateZ(-76));
  }
  if (activePose === 'level') {
    if (nodeIndex === 5) local = multiply(local, rotateZ(-110));
    if (nodeIndex === 6) local = multiply(local, rotateZ(110));
  }
  if (activePose === 'defeat') local = multiply(translate(0, -0.52, 0), multiply(rotateZ(-72), local));
  return local;
}

function buildDraws() {
  draws = [];
  const children = new Set(model.json.nodes.flatMap((node) => node.children || []));
  const roots = model.json.nodes.map((_, index) => index).filter((index) => !children.has(index));
  const visit = (index, parent) => {
    const node = model.json.nodes[index];
    const source = node.matrix ? new Float32Array(node.matrix) : identity();
    const world = multiply(parent, poseLocal(index, source));
    if (node.mesh != null) {
      for (const primitive of model.json.meshes[node.mesh].primitives) {
        const position = accessorData(model, primitive.attributes.POSITION);
        const normal = accessorData(model, primitive.attributes.NORMAL);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, position.array, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(locations.position);
        gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normal.array, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(locations.normal);
        gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 0, 0);
        let indexInfo = null;
        if (primitive.indices != null) {
          const indices = accessorData(model, primitive.indices);
          const indexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.array, gl.STATIC_DRAW);
          indexInfo = { count: indices.accessor.count, type: indices.glType };
        }
        if (node.mesh !== 6) draws.push({ vao, model: world, mesh: node.mesh, count: position.accessor.count, indexInfo });
      }
    }
    for (const child of node.children || []) visit(child, world);
  };
  for (const root of roots) visit(root, identity());
}

function globalMatrix() {
  const lean = activePose === 'sprint' ? -12 : activePose === 'damage' ? 8 : 0;
  const bob = activePose === 'run' ? -0.03 : activePose === 'level' ? 0.09 : 0;
  return multiply(
    translate(0, -0.22 + bob, 0),
    multiply(scale(0.56, 0.56, 0.56), multiply(rotateZ(lean), multiply(rotateX(9), rotateY(18))))
  );
}

function drawPass(ink) {
  gl.uniform1i(locations.ink, ink ? 1 : 0);
  gl.uniform1f(locations.outline, ink ? 0.035 : 0);
  for (const item of draws) {
    gl.bindVertexArray(item.vao);
    gl.uniformMatrix4fv(locations.model, false, item.model);
    gl.uniform4fv(locations.color, colorByMesh[item.mesh]);
    if (item.indexInfo) gl.drawElements(gl.TRIANGLES, item.indexInfo.count, item.indexInfo.type, 0);
    else gl.drawArrays(gl.TRIANGLES, 0, item.count);
  }
}

window.renderPose = (pose = 'idle') => {
  activePose = pose;
  buildDraws();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniformMatrix4fv(locations.global, false, globalMatrix());
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  drawPass(false);
  return canvas.toDataURL('image/png');
};

model = await loadGlb('../../assets/apn-mascot-glb-host.glb');
window.renderPose(new URLSearchParams(location.search).get('pose') || 'idle');
window.__MASCOT_READY__ = true;
canvas.dataset.ready = 'true';
document.querySelector('p').textContent = 'Canonical GLB ready · orthographic 18°Y / 9°X · foot-center pivot';
if (new URLSearchParams(location.search).get('export') === 'all') {
  const poses = ['idle', 'run', 'scan', 'crit', 'loot', 'sprint', 'overdrive', 'damage', 'level', 'defeat'];
  const output = Object.fromEntries(poses.map((pose) => [pose, window.renderPose(pose)]));
  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  output.__stats = { draws: draws.length, error: gl.getError(), alphaMax: Math.max(...pixels.filter((_, index) => index % 4 === 3)) };
  const pre = document.createElement('pre');
  pre.id = 'export-data';
  pre.textContent = JSON.stringify(output);
  document.body.replaceChildren(pre);
}

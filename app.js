import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MODEL_URL, GROUPS, MUSCLES, EXERCISES, IDLE } from './data.js';
import { loadVercelAnalytics, startPresence } from './analytics.js';

const $ = id => document.getElementById(id);
const MAXC = 48;
const VIEW_SHIFT = 64; // px: lift the framing so the bottom dock never covers the athlete
const D2R = Math.PI / 180;

/* ================= renderer / scene ================= */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth <= 980 ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c10);
scene.fog = new THREE.FogExp2(0x0a0c10, 0.075);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
camera.position.set(2.4, 1.65, 3.75);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.target.set(0, 1.0, 0);
controls.minDistance = 1.4; controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.52;
controls.autoRotate = true; controls.autoRotateSpeed = 0.5;

const key = new THREE.DirectionalLight(0xfff3e6, 2.6);
key.position.set(3.5, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1; key.shadow.camera.far = 18;
key.shadow.camera.left = key.shadow.camera.bottom = -3.2;
key.shadow.camera.right = key.shadow.camera.top = 3.2;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb7ff, 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
const lime = new THREE.PointLight(0xc8ff2e, 2.5, 7, 2); lime.position.set(-2.2, 0.9, 1.6); scene.add(lime);
scene.add(new THREE.HemisphereLight(0x3a4250, 0x0a0c10, 0.6));

// floor: rubber platform + accent ring
const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), new THREE.MeshStandardMaterial({ color: 0x0f1217, roughness: 0.92, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; floor.receiveShadow = true; scene.add(floor);
const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.04, 96), new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 0.75, metalness: 0.1 }));
platform.position.y = 0.0; platform.receiveShadow = true; scene.add(platform);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.585, 128), new THREE.MeshBasicMaterial({ color: 0xc8ff2e, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.021; scene.add(ring);
const grid = new THREE.GridHelper(16, 32, 0x1b2029, 0x141821); grid.position.y = 0.001; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

/* ================= heat shader ================= */
const heat = {
  uCapA: { value: Array.from({ length: MAXC }, () => new THREE.Vector3()) },
  uCapB: { value: Array.from({ length: MAXC }, () => new THREE.Vector3()) },
  uCapR: { value: new Float32Array(MAXC) },
  uCapW: { value: new Float32Array(MAXC) },
  uCapM: { value: new Float32Array(MAXC) },
  uCapN: { value: 0 },
  uTime: { value: 0 },
  uHeat1: { value: new THREE.Color(0xffb020) },
  uHeat2: { value: new THREE.Color(0xff3d2e) },
  uHover: { value: new THREE.Color(0xc8ff2e) },
  uFiber: { value: 1.0 },
};
function heatify(mat) {
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, heat);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
#define MAXC ${MAXC}
varying vec3 vWp;
uniform vec3 uCapA[MAXC]; uniform vec3 uCapB[MAXC]; uniform float uCapR[MAXC]; uniform float uCapW[MAXC]; uniform float uCapM[MAXC];
uniform int uCapN; uniform float uTime; uniform vec3 uHeat1; uniform vec3 uHeat2; uniform vec3 uHover; uniform float uFiber;
float segDist(vec3 p, vec3 a, vec3 b){ vec3 ab = b - a; float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0); return length(p - (a + ab * t)); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float heatV = 0.0; float heatW = 0.0; float hov = 0.0; vec3 pert = vec3(0.0);
for (int i = 0; i < MAXC; i++) {
  if (i >= uCapN) break;
  vec3 ax = uCapB[i] - uCapA[i]; float L2 = max(dot(ax, ax), 1e-6);
  float tt = clamp(dot(vWp - uCapA[i], ax) / L2, 0.0, 1.0);
  vec3 rad = vWp - (uCapA[i] + ax * tt);
  float d = length(rad);
  float f = 1.0 - smoothstep(uCapR[i] * 0.3, uCapR[i], d);
  if (f <= 0.0) continue;
  float mode = uCapM[i];
  if (mode > 1.5) { /* definition only */ }
  else if (mode > 0.5) { hov = max(hov, f); }
  else { float v = f * uCapW[i]; if (v > heatV) { heatV = v; heatW = uCapW[i]; } }
  // muscle fibres: grooves running along the capsule axis
  vec3 axn = ax * inversesqrt(L2);
  vec3 tg = normalize(cross(axn, rad + vec3(1e-4, 2e-4, 3e-4)));
  float u = dot(vWp, tg);
  float fib = sin(u * 230.0 + tt * 6.0) * 0.7 + sin(u * 610.0 - tt * 3.0) * 0.3;
  float amp = uFiber * (mode > 1.5 ? 0.06 : 0.06 + 0.22 * f * uCapW[i]) * f;
  pert += (viewMatrix * vec4(tg, 0.0)).xyz * fib * amp;
}
normal = normalize(normal + pert);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float pulse = 0.82 + 0.18 * sin(uTime * 2.6);
vec3 hc = mix(uHeat1, uHeat2, smoothstep(0.4, 1.0, heatW));
diffuseColor.rgb = mix(diffuseColor.rgb, hc, clamp(heatV * 0.95, 0.0, 1.0));
totalEmissiveRadiance += hc * heatV * 0.7 * pulse;
diffuseColor.rgb = mix(diffuseColor.rgb, uHover, hov * 0.55);
totalEmissiveRadiance += uHover * hov * 0.35;`);
  };
  mat.customProgramCacheKey = () => 'heat';
  return mat;
}

/* ================= model ================= */
const B = {};                 // short bone name -> Bone
const bind = {};              // name -> { q: local bind quat, w: world bind quat, wi: inverse }
let surface = null, hips = null, armScale = 0.01, hipsBindPos = new THREE.Vector3();
const muscleCaps = {};        // muscleId -> [{bone, a(local), b(local), r}]
const capWorld = {};          // muscleId -> [{a: Vector3, b: Vector3}] (world, updated per frame)

const skinMat = heatify(new THREE.MeshPhysicalMaterial({ color: 0x3a3f47, roughness: 0.46, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 1.1 }));
heat.uFiber.value = 0.6;
const loader = new GLTFLoader();
loader.load(MODEL_URL, onModel, ev => { if (ev.total) $('loader-bar').style.width = `${Math.round(ev.loaded / ev.total * 100)}%`; }, err => { $('loader-text').textContent = 'Could not load the model'; console.error(err); });

function onModel(gltf) {
  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (o.isBone) {
      const n = o.name.replace('mixamorig', '');
      B[n] = o;
      const w = new THREE.Quaternion(); o.getWorldQuaternion(w);
      bind[n] = { q: o.quaternion.clone(), w, wi: w.clone().invert() };
    }
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (o.name === 'Beta_Surface') surface = o;
      o.material = skinMat;
    }
  });
  hips = B.Hips;
  armScale = hips.parent.getWorldScale(new THREE.Vector3()).x;
  hipsBindPos.copy(hips.position);

  // muscle capsules -> bone-local space (both sides)
  for (const [id, m] of Object.entries(MUSCLES)) {
    muscleCaps[id] = []; capWorld[id] = [];
    for (const [bone, ax, ay, az, bx, by, bz, r] of m.caps) {
      for (const side of [1, -1]) {
        const bn = side === 1 ? bone : bone.replace('Left', 'Right');
        const bo = B[bn];
        const a = bo.worldToLocal(new THREE.Vector3(ax * side, ay, az));
        const b = bo.worldToLocal(new THREE.Vector3(bx * side, by, bz));
        muscleCaps[id].push({ bone: bo, a, b, r });
        capWorld[id].push({ a: new THREE.Vector3(), b: new THREE.Vector3() });
        if (bone.indexOf('Left') < 0 && Math.abs(ax) < 1e-6 && Math.abs(bx) < 1e-6) break; // centered capsule, no mirror
      }
    }
  }
  // hand frames for equipment
  for (const s of ['Left', 'Right']) {
    const h = B[`${s}Hand`];
    const wi = bind[`${s}Hand`].wi;
    // grip centre = middle of the knuckle row, pushed toward the palm (fingers curl toward -Y in the T-pose)
    handFrame[s] = { bone: h, k1: B[`${s}HandIndex1`], k2: B[`${s}HandPinky1`], axis: new THREE.Vector3(0, 0, 1).applyQuaternion(wi), palm: new THREE.Vector3(0, -1, 0).applyQuaternion(wi) };
  }
  buildGear();
  $('loader').classList.add('done');
  ready = true;
}

/* ================= posing ================= */
const POSE_BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
const FINGERS = [];
for (const s of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const i of [1, 2, 3]) FINGERS.push(`${s}Hand${f}${i}`);
const _e = new THREE.Euler(), _qd = new THREE.Quaternion(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

function setBone(name, rot) {
  const bo = B[name]; if (!bo) return;
  const bd = bind[name];
  if (!rot) { bo.quaternion.copy(bd.q); return; }
  _e.set(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R, 'XYZ');
  _qd.setFromEuler(_e);
  // local = bindLocal * (bindWorld^-1 * delta * bindWorld)
  _q.copy(bd.wi).multiply(_qd).multiply(bd.w);
  bo.quaternion.copy(bd.q).multiply(_q);
}
const smooth = t => t * t * (3 - 2 * t);
function lerp3(a, b, s, out) { out[0] = a[0] + (b[0] - a[0]) * s; out[1] = a[1] + (b[1] - a[1]) * s; out[2] = a[2] + (b[2] - a[2]) * s; return out; }
const Z3 = [0, 0, 0];
const poseOut = {}, rootOut = [0, 0, 0], rootRotOut = [0, 0, 0];

function samplePose(ex, t) {
  const keys = ex.keys;
  let k0 = keys[0], k1 = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
  const s = k1.t > k0.t ? smooth((t - k0.t) / (k1.t - k0.t)) : 0;
  for (const n of POSE_BONES) {
    const a = k0.pose[n], b = k1.pose[n];
    if (!a && !b) { poseOut[n] = null; continue; }
    poseOut[n] = lerp3(a || Z3, b || Z3, s, poseOut[n] && poseOut[n] !== null ? poseOut[n] : [0, 0, 0]);
  }
  lerp3(k0.root, k1.root, s, rootOut);
  lerp3(k0.rootRot, k1.rootRot, s, rootRotOut);
}
function applyPose(pose, root, rootRot, grip) {
  for (const n of POSE_BONES) { if (n === 'Hips') continue; setBone(n, pose[n]); }
  setBone('Hips', rootRot);
  hips.position.set(hipsBindPos.x + root[0] / armScale, hipsBindPos.y + root[1] / armScale, hipsBindPos.z + root[2] / armScale);
  const curl = grip ? 62 : 8;
  for (const f of FINGERS) setBone(f, [0, 0, f.startsWith('Left') ? -curl : curl]);
}

/* ================= equipment ================= */
const handFrame = {};
const gear = { group: new THREE.Group(), barbell: null, dumbbells: [], bench: null, mat: null, bar: null, cable: null, handle: null };
scene.add(gear.group);
const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.9 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1f25, roughness: 0.7, metalness: 0.1 });
const pad = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.8, metalness: 0.05 });
function cyl(r, h, mat, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.castShadow = true; return m; }
function buildGear() {
  // barbell along local X
  const bb = new THREE.Group();
  const bar = cyl(0.014, 2.1, steel); bar.rotation.z = Math.PI / 2; bb.add(bar);
  for (const s of [-1, 1]) {
    const p1 = cyl(0.2, 0.035, rubber, 40); p1.rotation.z = Math.PI / 2; p1.position.x = s * 0.74; bb.add(p1);
    const p2 = cyl(0.17, 0.03, rubber, 40); p2.rotation.z = Math.PI / 2; p2.position.x = s * 0.78; bb.add(p2);
    const c = cyl(0.022, 0.06, steel); c.rotation.z = Math.PI / 2; c.position.x = s * 0.7; bb.add(c);
  }
  bb.visible = false; gear.group.add(bb); gear.barbell = bb;
  for (let i = 0; i < 2; i++) {
    const db = new THREE.Group();
    const h = cyl(0.014, 0.3, steel); h.rotation.z = Math.PI / 2; db.add(h);
    for (const s of [-1, 1]) { const p = cyl(0.065, 0.06, rubber, 32); p.rotation.z = Math.PI / 2; p.position.x = s * 0.12; db.add(p); }
    db.visible = false; gear.group.add(db); gear.dumbbells.push(db);
  }
  const bench = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pad); top.castShadow = top.receiveShadow = true; bench.add(top);
  const legs = new THREE.Group(); bench.add(legs);
  bench.userData = { top, legs }; bench.visible = false; gear.group.add(bench); gear.bench = bench;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 2.0), new THREE.MeshStandardMaterial({ color: 0x1e2229, roughness: 0.95 }));
  mat.position.y = 0.01; mat.receiveShadow = true; mat.visible = false; gear.group.add(mat); gear.mat = mat;
  const pb = new THREE.Group();
  const rail = cyl(0.017, 1.7, steel); rail.rotation.z = Math.PI / 2; pb.add(rail);
  for (const s of [-1, 1]) { const post = cyl(0.03, 2.3, rubber); post.position.set(s * 0.85, -1.15, 0); pb.add(post); }
  pb.visible = false; gear.group.add(pb); gear.bar = pb;
  const cable = cyl(0.005, 1, steel, 8); cable.castShadow = false; cable.visible = false; gear.group.add(cable); gear.cable = cable;
  const handle = cyl(0.013, 0.5, steel); handle.rotation.z = Math.PI / 2; handle.visible = false; gear.group.add(handle); gear.handle = handle;
}
function handPoint(side, out) { const f = handFrame[side]; f.k1.getWorldPosition(out); f.k2.getWorldPosition(_v2); out.add(_v2).multiplyScalar(0.5); _v2.copy(f.palm).applyQuaternion(f.bone.getWorldQuaternion(_q)); return out.addScaledVector(_v2, 0.024); }
const hl = new THREE.Vector3(), hr = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
function updateGear(ex) {
  const types = new Set((ex?.gear || []).map(g => g.type));
  gear.barbell.visible = types.has('barbell') || types.has('barbell_hips');
  gear.dumbbells.forEach(d => d.visible = types.has('dumbbells'));
  gear.bench.visible = types.has('bench'); gear.mat.visible = types.has('mat'); gear.bar.visible = types.has('pullup_bar');
  gear.cable.visible = types.has('cable'); gear.handle.visible = types.has('handle');
  if (!ex) return;
  handPoint('Left', hl); handPoint('Right', hr);
  mid.addVectors(hl, hr).multiplyScalar(0.5);
  if (types.has('barbell_hips')) {
    hips.getWorldPosition(gear.barbell.position);
    _v.set(0, 0, 1).applyQuaternion(hips.getWorldQuaternion(_q));
    gear.barbell.position.addScaledVector(_v, 0.16);
    gear.barbell.quaternion.identity(); gear.barbell.scale.setScalar(1);
  } else if (gear.barbell.visible) {
    const g = ex.gear.find(g => g.type === 'barbell');
    dir.subVectors(hl, hr).normalize();
    gear.barbell.position.copy(mid);
    gear.barbell.quaternion.setFromUnitVectors(X, dir);
    gear.barbell.scale.setScalar(g.short ? 0.6 : 1);
  }
  if (gear.dumbbells[0].visible) {
    [['Left', hl], ['Right', hr]].forEach(([s, p], i) => {
      const f = handFrame[s]; const d = gear.dumbbells[i];
      d.position.copy(p);
      _v.copy(f.axis).applyQuaternion(f.bone.getWorldQuaternion(_q));
      d.quaternion.setFromUnitVectors(X, _v);
    });
  }
  if (gear.bench.visible) {
    const g = ex.gear.find(g => g.type === 'bench');
    const { top, legs } = gear.bench.userData;
    gear.bench.position.set(...g.pos);
    top.scale.set(...g.size);
    if (legs.userData.key !== g.pos.join()) {
      legs.userData.key = g.pos.join(); legs.clear();
      const h = g.pos[1] - g.size[1] / 2;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cyl(0.025, h, rubber); l.position.set(sx * (g.size[0] / 2 - 0.05), -g.size[1] / 2 - h / 2, sz * (g.size[2] / 2 - 0.08)); legs.add(l); }
    }
  }
  if (gear.bar.visible) { const g = ex.gear.find(g => g.type === 'pullup_bar'); gear.bar.position.set(0, g.y, hl.z * 0.5 + hr.z * 0.5); }
  if (gear.cable.visible) {
    const g = ex.gear.find(g => g.type === 'cable');
    _v.set(...g.from); dir.subVectors(mid, _v); const len = dir.length();
    gear.cable.position.copy(_v).addScaledVector(dir, 0.5);
    gear.cable.scale.set(1, len, 1);
    gear.cable.quaternion.setFromUnitVectors(Y, dir.normalize());
  }
  if (gear.handle.visible) { gear.handle.position.copy(mid); dir.subVectors(hl, hr); if (dir.length() < 0.25) dir.copy(X); gear.handle.quaternion.setFromUnitVectors(X, dir.normalize()); }
}

/* ================= state ================= */
let ready = false, current = null, selectedMuscle = null, hoverMuscle = null, playing = true, phase = 0, reps = 0, tempo = 3, camMode = 'auto';
const camAnim = { active: false, t: 0, fromP: new THREE.Vector3(), fromT: new THREE.Vector3(), toP: new THREE.Vector3(), toT: new THREE.Vector3() };

function camFrom(preset) {
  const az = preset.az * D2R, el = preset.el * D2R;
  camAnim.toT.set(...preset.target);
  camAnim.toP.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(preset.dist).add(camAnim.toT);
  camAnim.fromP.copy(camera.position); camAnim.fromT.copy(controls.target);
  camAnim.active = true; camAnim.t = 0; camAnim.start = performance.now();
}
const VIEW = { front: { az: 8, el: 10, dist: 4.3, target: [0, 0.98, 0] }, side: { az: 90, el: 10, dist: 4.3, target: [0, 0.98, 0] }, back: { az: 180, el: 10, dist: 4.3, target: [0, 0.98, 0] } };
controls.addEventListener('start', () => { camAnim.active = false; controls.autoRotate = false; });

/* ================= UI: body map ================= */
function buildBodyMap() {
  $('muscle-count').textContent = `${Object.keys(MUSCLES).length} groups`;
  $('groups').innerHTML = GROUPS.map(g => `<div class="grp"><div class="gh">${g.name}</div>${g.muscles.map(id => {
    const n = EXERCISES.filter(e => (e.muscles[id] || 0) >= 80).length;
    return `<button class="mus" data-m="${id}"><i></i>${MUSCLES[id].name}<span class="n">${n || ''}</span></button>`;
  }).join('')}</div>`).join('');
  $('groups').querySelectorAll('.mus').forEach(b => {
    b.onclick = () => selectMuscle(b.dataset.m);
    b.onpointerenter = () => { uiHover = b.dataset.m; };
    b.onpointerleave = () => { uiHover = null; };
  });
}
let uiHover = null;
function paintBodyMap() {
  const m = current?.muscles || {};
  $('groups').querySelectorAll('.mus').forEach(b => {
    const v = m[b.dataset.m] || 0;
    b.classList.toggle('hot', v >= 80); b.classList.toggle('warm', v > 0 && v < 80); b.classList.toggle('sel', b.dataset.m === selectedMuscle);
  });
}
function exercisesFor(id) { return EXERCISES.filter(e => e.muscles[id]).sort((a, b) => (b.muscles[id] || 0) - (a.muscles[id] || 0)); }
function selectMuscle(id) {
  selectedMuscle = id;
  const list = exercisesFor(id);
  renderChips(list, id);
  if (!current || !current.muscles[id] || (current.muscles[id] < 80 && list[0].muscles[id] >= 80)) selectExercise(list[0].id, false);
  paintBodyMap();
}
function renderChips(list, id) {
  $('chips').innerHTML = list.map(e => `<button class="chip ${current?.id === e.id ? 'on' : ''}" data-e="${e.id}">${e.name}${id ? `<small>${e.muscles[id]}%</small>` : ''}</button>`).join('');
  $('chips').querySelectorAll('.chip').forEach(c => c.onclick = () => selectExercise(c.dataset.e, false));
}

/* ================= UI: exercise ================= */
function selectExercise(id, fromSearch) {
  const ex = EXERCISES.find(e => e.id === id); if (!ex) return;
  const changed = current?.id !== id;
  current = ex; reps = 0; phase = 0; playing = true; $('play-icon').setAttribute('d', 'M3 3h3.5v10H3zM9.5 3H13v10H9.5z');
  tempo = ex.tempo; $('tempo').value = Math.round(tempo * 10); $('tempo-val').textContent = `${tempo.toFixed(1)} s / rep`;
  $('rep-count').textContent = '0';
  $('ex-kicker').textContent = ex.equipment === 'Bodyweight' ? 'Bodyweight' : `${ex.equipment} exercise`;
  $('ex-name').textContent = ex.name; $('ex-equip').textContent = ex.equipment;
  const entries = Object.entries(ex.muscles).sort((a, b) => b[1] - a[1]);
  $('impact-bars').innerHTML = entries.map(([m, v]) => `<div class="bar-row ${v >= 80 ? '' : 'sec'}"><button data-m="${m}">${MUSCLES[m].name}</button><div class="track"><div class="fill" style="transform:scaleX(0)"></div></div><span class="pct">${v}%</span></div>`).join('');
  requestAnimationFrame(() => $('impact-bars').querySelectorAll('.fill').forEach((f, i) => f.style.transform = `scaleX(${entries[i][1] / 100})`));
  $('impact-bars').querySelectorAll('button').forEach(b => { b.onclick = () => selectMuscle(b.dataset.m); b.onpointerenter = () => uiHover = b.dataset.m; b.onpointerleave = () => uiHover = null; });
  $('cues').innerHTML = ex.cues.map(c => `<li>${c}</li>`).join('');
  $('mistakes').innerHTML = ex.mistakes.map(c => `<li>${c}</li>`).join('');
  $('exercise-panel').classList.add('open'); $('exercise-panel').classList.remove('collapsed'); applyViewOffset();
  if (fromSearch || !selectedMuscle || !ex.muscles[selectedMuscle]) { selectedMuscle = entries[0][0]; renderChips(exercisesFor(selectedMuscle), selectedMuscle); }
  else renderChips(exercisesFor(selectedMuscle), selectedMuscle);
  paintBodyMap(); buildLabels();
  controls.autoRotate = false;
  if (changed && camMode === 'auto') camFrom(ex.camera);
}
$('play').onclick = () => { playing = !playing; $('play-icon').setAttribute('d', playing ? 'M3 3h3.5v10H3zM9.5 3H13v10H9.5z' : 'M4 3l9 5-9 5z'); };
$('tempo').oninput = e => { tempo = e.target.value / 10; $('tempo-val').textContent = `${tempo.toFixed(1)} s / rep`; };
document.querySelectorAll('#views button').forEach(b => b.onclick = () => {
  camMode = b.dataset.cam;
  document.querySelectorAll('#views button').forEach(x => x.classList.toggle('on', x === b));
  if (camMode === 'auto') { if (current) camFrom(current.camera); }
  else { const base = current ? current.camera : VIEW.front; camFrom({ az: VIEW[camMode].az, el: VIEW[camMode].el, dist: base.dist, target: base.target }); }
});

// search
const search = $('search'), results = $('results');
search.oninput = () => {
  const q = search.value.trim().toLowerCase();
  if (!q) { results.classList.remove('open'); return; }
  const hits = EXERCISES.filter(e => e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q) || Object.keys(e.muscles).some(m => MUSCLES[m].name.toLowerCase().includes(q) && e.muscles[m] >= 80)).slice(0, 8);
  results.innerHTML = hits.map(e => { const top = Object.entries(e.muscles).sort((a, b) => b[1] - a[1])[0][0]; return `<button data-e="${e.id}">${e.name}<span>${MUSCLES[top].name} · ${e.equipment}</span></button>`; }).join('') || '<button disabled><span>No match</span></button>';
  results.classList.toggle('open', true);
  results.querySelectorAll('button[data-e]').forEach(b => b.onclick = () => { selectExercise(b.dataset.e, true); results.classList.remove('open'); search.value = ''; });
};
search.onblur = () => setTimeout(() => results.classList.remove('open'), 150);
search.onfocus = () => { if (search.value) results.classList.add('open'); };

/* ================= labels ================= */
const labelEls = [];
function buildLabels() {
  const layer = $('labels'); layer.innerHTML = ''; labelEls.length = 0;
  if (!current) return;
  Object.entries(current.muscles).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([m, v]) => {
    const el = document.createElement('div');
    el.className = `lbl ${v >= 80 ? '' : 'sec'}`;
    el.innerHTML = `<i></i><span>${MUSCLES[m].name}<small>${v}%</small></span>`;
    layer.appendChild(el); labelEls.push({ el, m });
  });
}
const hoverEl = document.createElement('div'); hoverEl.className = 'lbl hover'; hoverEl.innerHTML = '<i style="background:#c8ff2e;box-shadow:0 0 12px rgba(200,255,46,.8)"></i><span></span>';
document.body.appendChild(hoverEl);

/* ================= picking ================= */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(2, 2);
let pointerDirty = false, downAt = 0, downX = 0, downY = 0;
canvas.addEventListener('pointermove', e => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerDirty = true; });
canvas.addEventListener('pointerdown', e => { downAt = performance.now(); downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointerup', e => {
  if (performance.now() - downAt > 350 || Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
  // pick at the tap position itself so touch (no hover) works too
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const id = pickMuscle();
  if (id) selectMuscle(id);
});
canvas.addEventListener('pointerleave', () => { hoverMuscle = null; ndc.set(2, 2); });
function pickMuscle() {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(surface, false)[0];
  if (!hit) return null;
  let best = null, bestD = 0.06;
  for (const [id, caps] of Object.entries(capWorld)) caps.forEach((c, i) => {
    const d = segDist(hit.point, c.a, c.b) - muscleCaps[id][i].r;
    if (d < bestD) { bestD = d; best = id; }
  });
  return best;
}
function segDist(p, a, b) { _v.subVectors(b, a); const t = THREE.MathUtils.clamp(_v2.subVectors(p, a).dot(_v) / Math.max(_v.lengthSq(), 1e-6), 0, 1); return _v2.copy(a).addScaledVector(_v, t).distanceTo(p); }

/* ================= frame ================= */
let last = performance.now(), fpsAcc = 0, fpsN = 0, frameI = 0;
const showFps = new URLSearchParams(location.search).has('fps'); $('fps').hidden = !showFps;
function updateCapsUniforms(timeS) {
  // world positions for every muscle (needed for picking + labels)
  for (const id in muscleCaps) muscleCaps[id].forEach((c, i) => { capWorld[id][i].a.copy(c.a); c.bone.localToWorld(capWorld[id][i].a); capWorld[id][i].b.copy(c.b); c.bone.localToWorld(capWorld[id][i].b); });
  let n = 0;
  const push = (id, w, mode) => { for (let i = 0; i < muscleCaps[id].length && n < MAXC; i++, n++) { heat.uCapA.value[n].copy(capWorld[id][i].a); heat.uCapB.value[n].copy(capWorld[id][i].b); heat.uCapR.value[n] = muscleCaps[id][i].r; heat.uCapW.value[n] = w; heat.uCapM.value[n] = mode; } };
  if (current) for (const [m, v] of Object.entries(current.muscles)) push(m, v / 100, 0);
  const hv = uiHover || hoverMuscle;
  if (hv) push(hv, 1, 1);
  for (const id in muscleCaps) if (!(current && current.muscles[id]) && id !== hv) push(id, 0, 2);
  heat.uCapN.value = n; heat.uTime.value = timeS;
}
function projectLabel(el, m, extra) {
  const c = capWorld[m][0]; _v.addVectors(c.a, c.b).multiplyScalar(0.5).project(camera);
  if (_v.z > 1) { el.classList.remove('show'); return; }
  el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth + (extra || 0)}px`; el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`; el.classList.add('show');
}
function deoverlap() {
  const shown = labelEls.filter(l => l.el.classList.contains('show')).map(l => ({ el: l.el, y: parseFloat(l.el.style.top) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < shown.length; i++) if (shown[i].y - shown[i - 1].y < 30) { shown[i].y = shown[i - 1].y + 30; shown[i].el.style.top = `${shown[i].y}px`; }
}
// Keep the athlete centred in the area the panels leave free.
function applyViewOffset() {
  const w = innerWidth, h = innerHeight, mobile = w <= 980, land = w > h, open = !!current && !$('exercise-panel').classList.contains('collapsed');
  let x = 0, y = 0;
  if (!mobile) y = VIEW_SHIFT;
  else if (land) { x = current ? Math.round(w * 0.2) : 0; y = Math.round(h * 0.06); }
  else y = current ? Math.round(h * (open ? 0.16 : 0.1)) : Math.round(h * 0.05);
  camera.setViewOffset(w, h, x, y, w, h); camera.updateProjectionMatrix();
}
$('ex-head').onclick = () => { if (innerWidth <= 980) { $('exercise-panel').classList.toggle('collapsed'); applyViewOffset(); } };
function resize() {
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; applyViewOffset(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now; frameI++;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { if (showFps) $('fps').textContent = `${Math.round(fpsN / fpsAcc)} fps`; fpsAcc = 0; fpsN = 0; }
  if (!ready) return;
  resize();

  // animation
  if (current) {
    if (playing) { phase += dt / tempo; if (phase >= 1) { phase -= 1; reps++; $('rep-count').textContent = reps; } }
    samplePose(current, phase);
    applyPose(poseOut, rootOut, rootRotOut, current.equipment !== 'Bodyweight');
    if (current.anchor) {
      hips.parent.updateMatrixWorld(true);
      if (current.anchor.grip) handPoint(current.anchor.grip, _v); else B[current.anchor.bone].getWorldPosition(_v);
      hips.position.y += (current.anchor.y - _v.y) / armScale;
    }
  } else {
    const breathe = Math.sin(now / 1000 * 1.4) * 1.2;
    applyPose({ ...IDLE, Spine: [breathe * 0.4, 0, 0], Spine1: [-breathe * 0.4, 0, 0], Head: [breathe * 0.5, 0, 0] }, Z3, Z3, false);
  }
  hips.parent.updateMatrixWorld(true);
  updateGear(current);

  // camera
  if (camAnim.active) {
    camAnim.t = Math.min(1, (now - camAnim.start) / 900); const s = smooth(camAnim.t);
    camera.position.lerpVectors(camAnim.fromP, camAnim.toP, s); controls.target.lerpVectors(camAnim.fromT, camAnim.toT, s);
    if (camAnim.t >= 1) camAnim.active = false;
  }
  controls.update();

  // picking (every other frame)
  updateCapsUniforms(now / 1000);
  if (pointerDirty && frameI % 2 === 0) { pointerDirty = false; hoverMuscle = pickMuscle(); canvas.style.cursor = hoverMuscle ? 'pointer' : 'grab'; }
  for (const { el, m } of labelEls) projectLabel(el, m, 0);
  deoverlap();
  const hv = hoverMuscle && (!current || !current.muscles[hoverMuscle]) ? hoverMuscle : (uiHover && (!current || !current.muscles[uiHover]) ? uiHover : null);
  if (hv) { hoverEl.querySelector('span').textContent = MUSCLES[hv].name; projectLabel(hoverEl, hv, 0); } else hoverEl.classList.remove('show');

  renderer.render(scene, camera);
}
buildBodyMap();
/* ================= tracking ================= */
loadVercelAnalytics();
startPresence(stats => {
  const el = $('live');
  if (!stats) { el.hidden = true; return; }
  $('live-n').textContent = Math.max(1, stats.live).toLocaleString();
  $('uniq-n').textContent = stats.unique.toLocaleString();
  el.hidden = false;
});
requestAnimationFrame(frame);
// debug / automation hook
window.__mm = { project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; }, current: () => current?.id, selected: () => selectedMuscle, camInfo: () => ({ pos: camera.position.toArray().map(n => +n.toFixed(2)), target: controls.target.toArray().map(n => +n.toFixed(2)), anim: camAnim.active, mode: camMode }), selectExercise: id => selectExercise(id, true), selectMuscle, setPhase: p => { phase = p; playing = false; }, play: () => { playing = true; }, isReady: () => ready, cam: (az, el, dist, target) => { camFrom({ az, el, dist, target }); camAnim.t = 1; camera.position.copy(camAnim.toP); controls.target.copy(camAnim.toT); camAnim.active = false; }, gear: () => ({ barbell: gear.barbell.visible ? gear.barbell.position.toArray() : null, bench: gear.bench.visible ? { pos: gear.bench.position.toArray(), size: gear.bench.userData.top.scale.toArray() } : null, hands: [handPoint('Left', new THREE.Vector3()).toArray(), handPoint('Right', new THREE.Vector3()).toArray()], dumbbells: gear.dumbbells[0].visible ? gear.dumbbells.map(d => d.position.toArray()) : null }), bones: () => Object.fromEntries(Object.entries(B).map(([k, b]) => [k, b.getWorldPosition(new THREE.Vector3()).toArray().map(n => +n.toFixed(2))])) };

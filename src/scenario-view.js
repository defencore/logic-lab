import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  JUNCTION,
  RAILWAY,
  junctionCarPose,
  railwayPoint,
  railwayPose,
  railwayOffsetPoint,
  roadCarPose,
} from './transport-geometry.js';

const finite = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
const active = (value) => value === true || value === 1;
export const SCENARIO_VIEW_TYPES = [
  'traffic_light',
  'traffic_junction',
  'railway',
  'animal_feeder',
  'water_tank',
];

/** Build the same scene graph used by the WebGL view without allocating a renderer. */
export function createScenarioModel(type, context) {
  if (!SCENARIO_VIEW_TYPES.includes(type)) throw new Error(`Unsupported 3D scenario type: ${type}`);
  const constructors = {
    traffic_light: createTrafficLight,
    traffic_junction: createTrafficJunction,
    railway: createRailway,
    animal_feeder: createAnimalFeeder,
    water_tank: createWaterTank,
  };
  const construct = constructors[type];
  if (typeof construct !== 'function') throw new Error(`Unsupported 3D scenario type: ${type}`);
  return construct(context);
}

/** All motion comes from simulator snapshots; this module only draws them. */
export function createScenarioView(
  container,
  { type = 'traffic_light', nodeId, language = 'en', onStatus } = {},
) {
  if (!SCENARIO_VIEW_TYPES.includes(type)) throw new Error(`Unsupported 3D scenario type: ${type}`);
  if (!container?.appendChild)
    throw new TypeError('A container element is required for the scenario view.');
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const canvas = document.createElement('canvas');
  canvas.className = 'scenario-canvas';
  canvas.setAttribute(
    'aria-label',
    language === 'ua' ? 'Інтерактивна 3D-модель сценарію' : 'Interactive 3D scenario model',
  );
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'none',
  });
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    const notice = document.createElement('p');
    notice.textContent =
      language === 'ua'
        ? 'Для 3D-вигляду потрібна підтримка WebGL 2 та апаратне прискорення.'
        : 'This 3D view requires WebGL 2 and hardware acceleration.';
    notice.className = 'scenario-unavailable';
    container.appendChild(notice);
    onStatus?.(notice.textContent);
    return {
      update() {},
      resize() {},
      setView() {},
      resetCamera() {},
      dispose() {
        notice.remove();
      },
    };
  }
  container.appendChild(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf0e8);
  scene.fog = new THREE.Fog(0xeaf0e8, 27, 65);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 45;
  controls.maxPolarAngle = Math.PI * 0.49;
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x83977c, 2.7));
  const sun = new THREE.DirectionalLight(0xfff7e7, 3.6);
  sun.position.set(-7, 16, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -13,
    right: 13,
    top: 13,
    bottom: -13,
    near: 1,
    far: 40,
  });
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xe4efff, 1.5);
  fill.position.set(9, 7, -12);
  scene.add(fill);
  const materials = new Map();
  const geometries = new Map();
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return materials.get(key);
  };
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, keep(factory()));
    return geometries.get(key);
  };
  const box = (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cylinder = (top, bottom, h, segments = 28) =>
    geometry(
      `cylinder:${top}:${bottom}:${h}:${segments}`,
      () => new THREE.CylinderGeometry(top, bottom, h, segments),
    );
  const sphere = (r) => geometry(`sphere:${r}`, () => new THREE.SphereGeometry(r, 24, 16));
  const mesh = (parent, shape, paint, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(shape, paint);
    object.position.set(x, y, z);
    object.castShadow = !paint.transparent;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  mesh(scene, box(150, 0.1, 150), material(0xe1e9dc), 0, -0.2);
  mesh(root, box(13.8, 0.25, type === 'railway' ? 18.6 : 13.8), material(0xd3ddc9), 0, -0.04);
  const context = { root, keep, material, geometry, box, cylinder, sphere, mesh, language };
  const model = createScenarioModel(type, context);
  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const w = Math.max(1, bounds.width || 640),
      h = Math.max(1, bounds.height || 420);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function setView(view = 'perspective') {
    if (disposed) return;
    const framing = {
      traffic_light: {
        target: [0.4, 2.6, 0],
        perspective: [8, 7.2, 10],
        front: [0.4, 4.5, 13],
        top: [0.4, 17, 0.001],
      },
      traffic_junction: {
        target: [0, 0.6, 0],
        perspective: [-11, 12, -12],
        front: [0, 8, -19],
        top: [0, 22, 0.001],
      },
      railway: {
        target: [0, 0.6, 0.5],
        perspective: [12, 11, 15],
        front: [0, 12, 25],
        top: [0, 29, 0.501],
      },
      animal_feeder: {
        target: [0, 2.0, 0],
        perspective: [11, 8, 12],
        front: [0, 4.5, 17],
        top: [0, 23, 0.001],
      },
      water_tank: {
        target: [0, 2.8, 0],
        perspective: [10, 8.5, 12],
        front: [0, 4.5, 17],
        top: [0, 23, 0.001],
      },
    }[type];
    controls.target.set(...framing.target);
    camera.position.set(...framing[view === 'front' || view === 'top' ? view : 'perspective']);
    camera.lookAt(controls.target);
    controls.update();
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  if (!observer) window.addEventListener('resize', resize);
  const recovery = document.createElement('div');
  recovery.className = 'scenario-unavailable';
  recovery.setAttribute('role', 'status');
  Object.assign(recovery.style, {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    right: '12px',
    background: '#fff',
    color: '#803b26',
    padding: '12px',
    border: '1px solid #d5b3a5',
    borderRadius: '6px',
    fontSize: '12px',
  });
  const lost = (event) => {
    event.preventDefault();
    if (disposed) return;
    contextLost = true;
    recovery.textContent =
      language === 'ua'
        ? '3D-контекст перервано. Симуляція триває; вигляд відновиться разом із графікою браузера.'
        : 'The 3D graphics context was interrupted. Simulation continues; the view resumes when the browser restores graphics.';
    container.appendChild(recovery);
    onStatus?.(recovery.textContent);
  };
  const restored = () => {
    if (!disposed) {
      contextLost = false;
      recovery.remove();
      resize();
      onStatus?.('');
    }
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  function animate() {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (contextLost || document.hidden || !container.isConnected) return;
    controls.update();
    renderer.render(scene, camera);
  }
  resize();
  setView();
  frame = requestAnimationFrame(animate);
  onStatus?.('');
  return {
    update(snapshot = {}) {
      if (!disposed) model.update({ ...snapshot, nodeId });
    },
    resize,
    setView,
    resetCamera() {
      setView();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      controls.dispose();
      for (const resource of resources) resource.dispose();
      resources.clear();
      sun.shadow.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      recovery.remove();
    },
  };
}

function createTrafficLight({ root, mesh, box, cylinder, sphere, material, keep }) {
  mesh(root, box(4.5, 0.08, 13.4), material(0x46505a), -1.5, 0.14);
  for (let z = -5; z <= 5; z += 1.7)
    mesh(root, box(0.1, 0.012, 0.85), material(0xf1ead8), -1.5, 0.19, z);
  mesh(root, box(2.4, 0.22, 13.4), material(0xb6bdbb), 2, 0.2);
  mesh(root, cylinder(0.12, 0.15, 4.5), material(0x8c999b, 0.75, 0.3), 2, 2.5, 0);
  mesh(root, box(0.85, 2.6, 0.65), material(0x26312e), 2, 4.1, 0);
  const lamps = [0xdf3930, 0xf4b52c, 0x38b76b].map((color, index) => {
    const paint = keep(
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.03,
        roughness: 0.3,
      }),
    );
    const lens = mesh(root, sphere(0.28), paint, 2, 4.9 - index * 0.8, 0.36);
    lens.scale.z = 0.5;
    const hood = mesh(
      root,
      cylinder(0.33, 0.33, 0.4),
      material(0x17221e),
      2,
      4.9 - index * 0.8,
      0.35,
    );
    hood.rotation.x = Math.PI / 2;
    lens.position.z = 0.59;
    return paint;
  });
  return {
    update({ state = {} }) {
      [state.lamps?.red, state.lamps?.yellow, state.lamps?.green].forEach((value, index) => {
        lamps[index].emissiveIntensity = active(value) ? 2.8 : 0.03;
        lamps[index].color.setHex(
          active(value)
            ? [0xff5550, 0xffca42, 0x4dda83][index]
            : [0x5b2624, 0x66501f, 0x234c33][index],
        );
      });
    },
  };
}

function buildSignal(context, parent, x, z, rotation = 0, scale = 1) {
  const { mesh, box, cylinder, sphere, material, keep } = context;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  parent.add(group);
  mesh(group, cylinder(0.07, 0.09, 2.3), material(0x9aa5a6, 0.75, 0.3), 0, 1.2);
  mesh(group, box(0.48, 1.38, 0.37), material(0x202a29), 0, 2.45);
  const lamps = [0xc92e2b, 0xe2a723, 0x26a966].map((color, i) => {
    const paint = keep(
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.01,
        roughness: 0.28,
      }),
    );
    const lens = mesh(group, sphere(0.16), paint, 0, 2.86 - i * 0.41, 0.24);
    lens.scale.z = 0.6;
    const visor = mesh(
      group,
      cylinder(0.19, 0.19, 0.23),
      material(0x18211f),
      0,
      2.86 - i * 0.41,
      0.18,
    );
    visor.rotation.x = Math.PI / 2;
    lens.position.z = 0.33;
    return paint;
  });
  return {
    group,
    set(red, yellow, green) {
      [red, yellow, green].forEach((value, index) => {
        lamps[index].emissiveIntensity = active(value) ? 2.5 : 0.01;
        lamps[index].color.setHex(
          active(value)
            ? [0xff4e45, 0xffc83a, 0x3ed477][index]
            : [0x542b29, 0x5b4928, 0x244e35][index],
        );
      });
    },
  };
}

function buildCar(context, color = 0x547ca3) {
  const { mesh, box, cylinder, sphere, material, geometry } = context;
  const group = new THREE.Group();
  group.scale.x = 0.96;
  const wheels = [];
  const body = mesh(
    group,
    geometry('car-body', () => new THREE.CapsuleGeometry(0.19, 0.43, 5, 16).rotateX(Math.PI / 2)),
    material(color, 0.25, 0.3),
    0,
    0.25,
  );
  body.scale.set(1.3, 0.65, 1);
  mesh(group, box(0.36, 0.22, 0.38), material(color, 0.25, 0.3), 0, 0.43, -0.02);
  const windshield = mesh(
    group,
    box(0.31, 0.15, 0.028),
    material(0x385367, 0.45, 0.2),
    0,
    0.45,
    0.19,
  );
  windshield.rotation.x = -0.25;
  mesh(group, box(0.032, 0.14, 0.3), material(0x385367, 0.45, 0.2), -0.185, 0.45, -0.02);
  mesh(group, box(0.032, 0.14, 0.3), material(0x385367, 0.45, 0.2), 0.185, 0.45, -0.02);
  for (const x of [-0.22, 0.22])
    for (const z of [-0.27, 0.27]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.13, z);
      group.add(wheel);
      const tire = mesh(wheel, cylinder(0.115, 0.115, 0.075, 18), material(0x202624));
      tire.rotation.z = Math.PI / 2;
      const hub = mesh(wheel, cylinder(0.055, 0.055, 0.079, 12), material(0xadb5b9, 0.8, 0.25));
      hub.rotation.z = Math.PI / 2;
      wheels.push(wheel);
    }
  for (const x of [-0.16, 0.16]) {
    const light = mesh(group, sphere(0.05), material(0xffe8b3), x, 0.27, 0.39);
    light.scale.z = 0.4;
    const tail = mesh(group, sphere(0.039), material(0xc54438), x, 0.27, -0.4);
    tail.scale.z = 0.4;
  }
  const damage = mesh(group, box(0.32, 0.008, 0.28), material(0x3b3c35), 0, 0.545, -0.02);
  damage.visible = false;
  return { group, wheels, damage };
}

function buildAftermath(context, parent) {
  const { mesh, box, sphere, material, keep } = context;
  const group = new THREE.Group();
  parent.add(group);
  group.visible = false;
  const smoke = keep(
    new THREE.MeshStandardMaterial({
      color: 0x58605c,
      transparent: true,
      opacity: 0.7,
      roughness: 1,
      depthWrite: false,
    }),
  );
  for (let i = 0; i < 5; i++) {
    const puff = mesh(
      group,
      sphere(0.18 + i * 0.07),
      smoke,
      Math.sin(i * 2.4) * 0.16,
      0.55 + i * 0.37,
      Math.cos(i) * 0.15,
    );
    puff.scale.y = 1.25;
  }
  for (let i = 0; i < 7; i++) {
    const debris = mesh(
      group,
      box(0.07, 0.05, 0.15),
      material(i % 2 ? 0x222a28 : 0xbd6e42),
      Math.cos(i * 2.4) * (0.3 + i * 0.07),
      0.17,
      Math.sin(i * 2.4) * (0.3 + i * 0.07),
    );
    debris.rotation.y = i * 1.3;
  }
  return group;
}

function createTrafficJunction(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const asphalt = material(0x49525c),
    paint = material(0xf6f0d9);
  mesh(root, box(2.7, 0.09, 13.4), asphalt, 0, 0.15);
  mesh(root, box(13.4, 0.09, 2.7), asphalt, 0, 0.151);
  for (const side of [-1, 1])
    for (let p = 2.1; p < 6.4; p += 1.0) {
      mesh(root, box(0.06, 0.013, 0.45), paint, 0, 0.205, p * side);
      mesh(root, box(0.45, 0.013, 0.06), paint, p * side, 0.205, 0);
    }
  const zebraCenter = -JUNCTION.zebraNear - JUNCTION.zebraWidth / 2;
  for (const side of [-1, 1])
    for (let i = -3; i <= 3; i++) {
      mesh(root, box(0.23, 0.015, JUNCTION.zebraWidth), paint, i * 0.32, 0.207, zebraCenter * side);
      mesh(root, box(JUNCTION.zebraWidth, 0.015, 0.23), paint, zebraCenter * side, 0.207, i * 0.32);
    }
  const nsStop = mesh(root, box(1.2, 0.015, 0.06), paint, -0.65, 0.208, JUNCTION.stopLine);
  const ewStop = mesh(root, box(0.06, 0.015, 1.2), paint, JUNCTION.stopLine, 0.208, 0.65);
  nsStop.userData.role = ewStop.userData.role = 'junction-stop-line';
  const ns = buildSignal(context, root, 1.7, -2.0, Math.PI);
  const ew = buildSignal(context, root, -2.0, -1.7, -Math.PI / 2);
  for (const x of [-4.2, 4.2])
    for (const z of [-4.2, 4.2]) {
      mesh(root, cylinder(0.12, 0.15, 1.25), material(0x6d5940), x, 0.75, z);
      const crown = mesh(root, sphere(0.8), material(0x64865a), x, 1.8, z);
      crown.scale.y = 1.2;
    }
  const cars = new Map();
  const aftermath = buildAftermath(context, root);
  aftermath.userData.role = 'collision-aftermath';
  const colors = [0x517fa6, 0xc27847, 0xe2e0cf, 0x82976b, 0x9b6a8f];
  return {
    update({ state = {} }) {
      const lights = state.lights || {};
      ns.set(
        !active(lights.ns_green) && !active(lights.ns_yellow),
        lights.ns_yellow,
        lights.ns_green,
      );
      ew.set(
        !active(lights.ew_green) && !active(lights.ew_yellow),
        lights.ew_yellow,
        lights.ew_green,
      );
      const live = new Set();
      (state.cars || []).forEach((data, index) => {
        live.add(data.id);
        let car = cars.get(data.id);
        if (!car) {
          car = buildCar(context, colors[index % colors.length]);
          car.group.name = `junction-car:${data.id}`;
          car.group.userData.transportId = data.id;
          car.group.userData.transportKind = 'junction_car';
          cars.set(data.id, car);
          root.add(car.group);
        }
        const pose = junctionCarPose(data);
        car.group.position.set(pose.x, 0.18, pose.z);
        car.group.rotation.set(0, pose.heading, 0);
        car.damage.visible = !!data.crashed;
        for (const wheel of car.wheels)
          wheel.rotation.x = (finite(data.position) * JUNCTION.scale) / 0.115;
      });
      for (const [id, car] of cars)
        if (!live.has(id)) {
          car.group.removeFromParent();
          cars.delete(id);
        }
      aftermath.visible = !!state.crash && !!state.collisionPoint;
      if (state.collisionPoint)
        aftermath.position.set(state.collisionPoint.x, 0, state.collisionPoint.z);
    },
  };
}

function buildTrain(context, color) {
  const { mesh, box, cylinder, sphere, material, geometry } = context;
  const group = new THREE.Group(),
    wheels = [];
  const paint = material(color, 0.35, 0.35),
    dark = material(0x293432),
    metal = material(0xb9c4c3, 0.8, 0.3);
  mesh(group, box(0.64, 0.13, 1.3), dark, 0, 0.25, -0.12);
  const boiler = mesh(group, cylinder(0.24, 0.24, 0.85), paint, 0, 0.6, 0.04);
  boiler.rotation.x = Math.PI / 2;
  const nose = mesh(group, cylinder(0.23, 0.23, 0.045), dark, 0, 0.6, 0.49);
  nose.rotation.x = Math.PI / 2;
  mesh(group, box(0.59, 0.6, 0.4), paint, 0, 0.68, -0.5);
  mesh(group, box(0.68, 0.07, 0.52), dark, 0, 1.02, -0.5);
  mesh(group, box(0.035, 0.21, 0.27), material(0x8eb0c1, 0.35, 0.25), -0.3, 0.79, -0.5);
  mesh(group, box(0.035, 0.21, 0.27), material(0x8eb0c1, 0.35, 0.25), 0.3, 0.79, -0.5);
  mesh(group, cylinder(0.08, 0.11, 0.31), dark, 0, 0.96, 0.26);
  mesh(group, cylinder(0.13, 0.13, 0.06), metal, 0, 1.13, 0.26);
  mesh(group, sphere(0.075), material(0xffe9ac), 0, 0.64, 0.54);
  const plow = mesh(
    group,
    geometry('train-plow', () => new THREE.ConeGeometry(0.36, 0.28, 4)),
    material(0xa55c3f),
    0,
    0.22,
    0.66,
  );
  plow.rotation.x = Math.PI / 2;
  mesh(group, box(0.58, 0.38, 0.55), paint, 0, 0.49, -1.14);
  for (let i = 0; i < 9; i++)
    mesh(
      group,
      sphere(0.09),
      dark,
      Math.sin(i * 2.4) * 0.16,
      0.7 + (i % 2) * 0.04,
      -1.15 + Math.cos(i * 2.4) * 0.14,
    );
  for (const z of [-1.3, -0.98, -0.47, -0.06, 0.35])
    for (const x of [-0.32, 0.32]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.17, z);
      group.add(wheel);
      const tire = mesh(wheel, cylinder(0.15, 0.15, 0.07, 18), dark);
      tire.rotation.z = Math.PI / 2;
      const hub = mesh(wheel, cylinder(0.1, 0.1, 0.075, 12), metal);
      hub.rotation.z = Math.PI / 2;
      mesh(wheel, box(0.08, 0.025, 0.21), material(0xaf8b47, 0.6), 0);
      wheels.push(wheel);
    }
  group.scale.setScalar(0.68);
  const damage = new THREE.Group();
  group.add(damage);
  damage.visible = false;
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    const scar = mesh(damage, box(0.3, 0.03, 0.008), material(0x34362e), 0, 0.62, 0.516);
    scar.rotation.z = angle;
  }
  return { group, wheels, damage };
}

function buildSpeedSign(context, parent, initial, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const paint = canvas.getContext('2d');
  const texture = context.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Group();
  sign.position.set(x, y, z);
  sign.userData.role = 'speed-sign';
  parent.add(sign);
  const backing = context.mesh(
    sign,
    context.cylinder(0.36, 0.36, 0.05, 40),
    context.material(0x8d9b9b, 0.7),
  );
  backing.rotation.x = Math.PI / 2;
  const faceMaterial = context.keep(
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  const faceGeometry = context.geometry(
    'speed-sign-face',
    () => new THREE.CircleGeometry(0.36, 48),
  );
  for (const direction of [-1, 1]) {
    const face = context.mesh(sign, faceGeometry, faceMaterial, 0, 0, direction * 0.031);
    face.rotation.y = direction < 0 ? Math.PI : 0;
    face.userData.role = 'speed-sign-face';
    face.castShadow = false;
  }
  let previous;
  const set = (value, warning = false) => {
    const content = `${value}:${warning}`;
    if (content === previous || !paint) return;
    previous = content;
    paint.clearRect(0, 0, 512, 512);
    paint.fillStyle = '#fff9ed';
    paint.fillRect(0, 0, 512, 512);
    paint.beginPath();
    paint.arc(256, 256, 220, 0, Math.PI * 2);
    paint.lineWidth = 35;
    paint.strokeStyle = warning ? '#e53d26' : '#b4342e';
    paint.stroke();
    paint.fillStyle = '#23362e';
    paint.font = '750 230px system-ui,sans-serif';
    paint.textAlign = 'center';
    paint.textBaseline = 'middle';
    paint.fillText(String(value), 256, 270, 360);
    texture.needsUpdate = true;
  };
  set(initial);
  return { group: sign, set };
}

function createRailway(context) {
  const { root, mesh, box, cylinder, material, geometry, keep } = context;
  const steel = material(0xaeb7b7, 0.85, 0.25),
    timber = material(0x7c634a),
    ballast = material(0x9e9d90);
  const trackCurve = (pointAt, height) => {
    const curve = new THREE.Curve();
    curve.getPoint = (t, target = new THREE.Vector3()) => {
      const point = pointAt(t);
      return target.set(point.x, height, point.z);
    };
    return curve;
  };
  const makeTrack = (name, pointAt, offsetAt) => {
    const curve = trackCurve(pointAt, 0);
    mesh(root, keep(new THREE.TubeGeometry(curve, 160, 0.27, 8, false)), ballast, 0, 0.22).scale.y =
      0.45;
    for (const offset of [-0.19, 0.19]) {
      const rail = mesh(
        root,
        keep(
          new THREE.TubeGeometry(
            trackCurve((t) => offsetAt(t, offset), 0.29),
            160,
            0.025,
            6,
            false,
          ),
        ),
        steel,
      );
      rail.userData = { role: 'rail', track: name, offset };
    }
    const length = curve.getLength();
    for (let d = 0; d <= length; d += 0.34) {
      const p = curve.getPointAt(d / length),
        tangent = curve.getTangentAt(d / length);
      const tie = mesh(root, box(0.73, 0.075, 0.11), timber, p.x, 0.21, p.z);
      tie.rotation.y = Math.atan2(tangent.x, tangent.z);
    }
  };
  makeTrack(
    'shared',
    (t) => ({ x: 0, z: -7.8 + t * 16.3 }),
    (t, offset) => ({ x: offset, z: -7.8 + t * 16.3 }),
  );
  for (const track of ['a', 'b'])
    makeTrack(
      track,
      (t) => railwayPoint(track, -125 + t * 125),
      (t, offset) => railwayOffsetPoint(track, -125 + t * 125, offset),
    );
  mesh(root, box(12.8, 0.08, 1.6), material(0x4b555c), 0, 0.15, RAILWAY.roadZ);
  for (const x of [-5, -3, 3, 5])
    mesh(root, box(1.1, 0.015, 0.06), material(0xf3ead3), x, 0.2, RAILWAY.roadZ);
  const bladeA = mesh(root, box(0.035, 0.055, 0.9), steel, -0.08, 0.32, -0.2);
  const bladeB = mesh(root, box(0.035, 0.055, 0.9), steel, 0.08, 0.32, 2.12);
  mesh(root, box(0.5, 0.18, 0.34), material(0x5e7767), 0.7, 0.25, -0.4);
  const signalA = buildSignal(context, root, -1.05, -1.0, Math.PI, 0.72);
  const signalB = buildSignal(context, root, 1.05, 3.0, 0, 0.72);
  const arms = [-1, 1].map((side) => {
    const gate = new THREE.Group();
    root.add(gate);
    gate.position.set(side * RAILWAY.gateX, 0.65, side < 0 ? RAILWAY.gateZNear : RAILWAY.gateZFar);
    gate.userData.role = 'rail-gate';
    mesh(gate, box(0.34, 0.85, 0.3), material(0xdec492), side * 0.16, -0.15);
    const arm = new THREE.Group();
    gate.add(arm);
    arm.userData = { role: 'rail-gate-arm', direction: -side };
    mesh(
      arm,
      box(0.1, 0.11, RAILWAY.gateLength),
      material(0xf5f0df),
      0,
      0,
      (-side * RAILWAY.gateLength) / 2,
    );
    for (let i = 0; i < 5; i++)
      mesh(arm, box(0.105, 0.115, 0.15), material(0xb84539), 0, 0, -side * (0.15 + i * 0.33));
    return arm;
  });
  mesh(root, cylinder(0.04, 0.04, 1.5), steel, 1.3, 0.85, -1.9);
  const speedSign = buildSpeedSign(context, root, 60, 1.3, 1.6, -1.9);
  const trains = new Map();
  const roadCars = new Map();
  const aftermath = buildAftermath(context, root);
  aftermath.userData.role = 'collision-aftermath';
  return {
    update({ state = {}, parameters = {} }) {
      signalA.set(!active(state.signals?.a), 0, state.signals?.a);
      signalB.set(!active(state.signals?.b), 0, state.signals?.b);
      for (const arm of arms)
        arm.rotation.x =
          (-arm.userData.direction * (1 - clamp(finite(state.barrier))) * Math.PI) / 2;
      bladeA.rotation.y = state.points ? -0.22 : 0.05;
      bladeB.rotation.y = state.points ? 0.05 : -0.22;
      const live = new Set();
      for (const data of state.trains || []) {
        live.add(data.id);
        let train = trains.get(data.id);
        if (!train) {
          train = buildTrain(context, data.track === 'a' ? 0x3d748c : 0x9c5449);
          train.group.name = `rail-train:${data.id}`;
          train.group.userData.transportId = data.id;
          train.group.userData.transportKind = 'rail_train';
          trains.set(data.id, train);
          root.add(train.group);
        }
        const pose = railwayPose(data);
        train.group.position.set(pose.x, 0.3, pose.z);
        train.group.rotation.set(0, pose.heading, 0);
        train.damage.visible = !!data.crashed || !!data.derailed;
        for (const wheel of train.wheels)
          wheel.rotation.x = (finite(data.position) * RAILWAY.scale) / (0.15 * 0.68);
      }
      for (const [id, train] of trains)
        if (!live.has(id)) {
          train.group.removeFromParent();
          trains.delete(id);
        }
      const liveCars = new Set();
      for (const data of state.roadCars || []) {
        liveCars.add(data.id);
        let car = roadCars.get(data.id);
        if (!car) {
          car = buildCar(context, data.direction === -1 ? 0xb69854 : 0x567fa1);
          car.group.name = `rail-car:${data.id}`;
          car.group.userData.transportId = data.id;
          car.group.userData.transportKind = 'rail_car';
          roadCars.set(data.id, car);
          root.add(car.group);
        }
        const pose = roadCarPose(data);
        car.group.position.set(pose.x, 0.18, pose.z);
        car.group.rotation.set(0, pose.heading, 0);
        car.damage.visible = !!data.crashed;
        for (const wheel of car.wheels)
          wheel.rotation.x = (finite(data.position) * RAILWAY.roadScale) / 0.115;
      }
      for (const [id, car] of roadCars)
        if (!liveCars.has(id)) {
          car.group.removeFromParent();
          roadCars.delete(id);
        }
      const derailed = (state.trains || []).find((train) => train.derailed);
      aftermath.visible = !!state.collisionPoint || !!derailed;
      const point = state.collisionPoint || (derailed ? railwayPose(derailed) : null);
      if (point) aftermath.position.set(point.x, 0, point.z);
      speedSign.set(Math.round(finite(parameters.speedLimit, 60)), !!state.fault);
    },
  };
}

function createAnimalFeeder(context) {
  const { root, mesh, box, cylinder, sphere, material, geometry, keep } = context;
  const steel = material(0xb5c0bd, 0.75, 0.3),
    green = material(0x4e7a68, 0.2),
    feed = material(0xb68b4c);
  mesh(root, box(11.5, 0.08, 9.5), material(0xcbbd9d), 0, 0.13);
  const clear = keep(
    new THREE.MeshStandardMaterial({
      color: 0xe6f0e9,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  for (const x of [-3.2, -2.0])
    for (const z of [-0.65, 0.65]) mesh(root, cylinder(0.07, 0.07, 3.2), steel, x, 1.75, z);
  mesh(root, cylinder(1.05, 1.05, 1.6, 36), clear, -2.6, 4.0);
  mesh(root, cylinder(1.12, 1.12, 0.12, 36), green, -2.6, 4.84);
  mesh(root, cylinder(1.1, 0.16, 1.1, 36), steel, -2.6, 2.65);
  const hopperFill = mesh(root, cylinder(0.98, 0.98, 1), feed, -2.6, 3.4);
  const funnelFeed = mesh(root, cylinder(0.98, 0.13, 0.95, 32), feed, -2.6, 2.75);
  mesh(root, box(0.8, 0.6, 0.75), green, -3.7, 2.1);
  const pipe = mesh(root, cylinder(0.21, 0.21, 3.2, 28), clear, -1.0, 2.1);
  pipe.rotation.z = Math.PI / 2;
  const auger = new THREE.Group();
  auger.position.set(-1, 2.1, 0);
  root.add(auger);
  const shaft = mesh(auger, cylinder(0.045, 0.045, 3.3), steel);
  shaft.rotation.z = Math.PI / 2;
  const helix = new THREE.CatmullRomCurve3(
    Array.from(
      { length: 150 },
      (_, i) =>
        new THREE.Vector3(
          -1.5 + (i / 149) * 3,
          Math.sin((i / 149) * Math.PI * 24) * 0.14,
          Math.cos((i / 149) * Math.PI * 24) * 0.14,
        ),
    ),
  );
  mesh(auger, keep(new THREE.TubeGeometry(helix, 170, 0.035, 6, false)), material(0xc0a066, 0.65));
  const chute = mesh(root, cylinder(0.2, 0.2, 0.65), steel, 0.7, 1.85);
  chute.rotation.z = -0.4;
  const bowl = new THREE.Group();
  bowl.position.set(0.95, 0.18, 0);
  root.add(bowl);
  mesh(
    bowl,
    geometry(
      'bowl',
      () =>
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.62, 0.02),
            new THREE.Vector2(0.9, 0.08),
            new THREE.Vector2(0.86, 0.42),
            new THREE.Vector2(0.74, 0.34),
            new THREE.Vector2(0.66, 0.09),
          ],
          40,
        ),
    ),
    material(0x7f9997, 0.7, 0.3),
  );
  const bowlFood = mesh(bowl, cylinder(0.72, 0.64, 0.2, 32), feed, 0, 0.17);
  const pelletGeometry = sphere(0.045);
  const spilled = keep(new THREE.InstancedMesh(pelletGeometry, feed, 140));
  spilled.castShadow = true;
  root.add(spilled);
  spilled.count = 0;
  const stream = keep(new THREE.InstancedMesh(pelletGeometry, feed, 13));
  stream.castShadow = true;
  root.add(stream);
  const matrix = new THREE.Object3D();
  const animal = new THREE.Group();
  animal.position.set(2.85, 0.2, 0);
  animal.rotation.y = -Math.PI / 2;
  root.add(animal);
  const fur = material(0xb38b60),
    paws = material(0x604c3d),
    black = material(0x25312b);
  mesh(
    animal,
    geometry('animal-torso', () =>
      new THREE.CapsuleGeometry(0.35, 0.75, 5, 20).rotateX(Math.PI / 2),
    ),
    fur,
    0,
    0.84,
    -0.05,
  );
  const legs = [];
  for (const x of [-0.24, 0.24])
    for (const z of [-0.48, 0.43]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.66, z);
      animal.add(leg);
      mesh(leg, cylinder(0.075, 0.06, 0.52, 16), fur, 0, -0.24);
      mesh(leg, sphere(0.105), paws, 0, -0.47, 0.04);
      legs.push(leg);
    }
  const head = new THREE.Group();
  head.position.set(0, 1.05, 0.55);
  animal.add(head);
  mesh(head, sphere(0.32), fur, 0, 0.08, 0.2);
  const muzzle = mesh(head, sphere(0.2), material(0xcab495), 0, -0.02, 0.46);
  muzzle.scale.set(0.85, 0.7, 1.1);
  mesh(head, sphere(0.072), black, 0, 0, 0.65);
  for (const x of [-0.22, 0.22]) {
    const ear = mesh(
      head,
      geometry('animal-ear', () => new THREE.ConeGeometry(0.15, 0.34, 5)),
      paws,
      x,
      0.39,
      0.14,
    );
    ear.rotation.z = x * -0.9;
    mesh(head, sphere(0.042), black, x, 0.16, 0.42);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.92, -0.77);
  animal.add(tail);
  mesh(
    tail,
    keep(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0.35, -0.22),
          new THREE.Vector3(0.18, 0.58, -0.32),
        ]),
        18,
        0.06,
        8,
        false,
      ),
    ),
    fur,
  );
  const warning = keep(
    new THREE.MeshStandardMaterial({ color: 0x35885d, emissive: 0x35885d, emissiveIntensity: 0.2 }),
  );
  mesh(root, sphere(0.1), warning, -3.7, 2.48, 0.26);
  return {
    update({ state = {}, parameters = {} }) {
      const hopperRatio = clamp(
        finite(state.hopper) / Math.max(1, finite(parameters.hopperCapacity, 500)),
      );
      hopperFill.scale.y = Math.max(0.001, hopperRatio * 1.52);
      hopperFill.position.y = 3.22 + hopperRatio * 0.76;
      hopperFill.visible = hopperRatio > 0;
      funnelFeed.visible = hopperRatio > 0;
      const bowlRatio = clamp(
        finite(state.bowl) / Math.max(1, finite(parameters.bowlCapacity, 100)),
      );
      bowlFood.visible = bowlRatio > 0;
      bowlFood.scale.y = Math.max(0.02, bowlRatio);
      bowlFood.position.y = 0.13 + bowlRatio * 0.12;
      if (state.dispensing) auger.rotation.x = finite(state.time) * 8;
      stream.visible = !!state.dispensing;
      for (let i = 0; i < 13; i++) {
        const p = (finite(state.time) * 1.8 + i / 13) % 1;
        matrix.position.set(
          0.78 + Math.sin(i * 2.4) * 0.08,
          1.5 - p * 1.1,
          Math.cos(i * 2.4) * 0.08,
        );
        matrix.rotation.set(i, i * 1.7, 0);
        matrix.updateMatrix();
        stream.setMatrixAt(i, matrix.matrix);
      }
      stream.instanceMatrix.needsUpdate = true;
      spilled.count = Math.min(140, Math.ceil(finite(state.spilled) * 2));
      for (let i = 0; i < spilled.count; i++) {
        const r = 1.0 + Math.sqrt(i / 140) * 1.4;
        matrix.position.set(0.95 + Math.cos(i * 2.399) * r, 0.21, Math.sin(i * 2.399) * r);
        matrix.rotation.set(i, i * 0.7, i * 0.2);
        matrix.updateMatrix();
        spilled.setMatrixAt(i, matrix.matrix);
      }
      spilled.instanceMatrix.needsUpdate = true;
      const phase = finite(state.animal?.phase) * Math.PI * 2;
      head.rotation.x = state.animal?.eating
        ? 0.75 + Math.sin(phase * 2) * 0.09
        : -0.1 + Math.sin(phase) * 0.04;
      tail.rotation.z = Math.sin(phase) * (state.animal?.eating ? 0.2 : 0.4);
      legs.forEach(
        (leg, index) =>
          (leg.rotation.x =
            !state.animal?.eating && state.animal?.hungry
              ? Math.sin(phase + index * Math.PI) * 0.1
              : 0),
      );
      warning.color.setHex(state.alarm ? 0xcb5438 : 0x35885d);
      warning.emissive.copy(warning.color);
    },
  };
}

function createWaterTank(context) {
  const { root, mesh, box, cylinder, sphere, material, geometry, keep } = context;
  const metal = material(0xb7c6c8, 0.75, 0.3),
    pumpPaint = material(0x3f7b79, 0.35),
    dark = material(0x344947);
  mesh(root, box(10.5, 0.11, 9), material(0xc4d1d0), 0, 0.15);
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: 0xd8edf0,
      transparent: true,
      opacity: 0.24,
      roughness: 0.16,
      metalness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const waterPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x3e9fbb,
      transparent: true,
      opacity: 0.67,
      roughness: 0.17,
      metalness: 0.15,
      depthWrite: false,
    }),
  );
  const flowPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x65bfda,
      transparent: true,
      opacity: 0.78,
      roughness: 0.18,
      depthWrite: false,
    }),
  );
  const tank = mesh(
    root,
    geometry('tank-wall', () => new THREE.CylinderGeometry(1.65, 1.65, 4.8, 48, 1, true)),
    glass,
    0,
    3.2,
  );
  tank.renderOrder = 4;
  mesh(root, cylinder(1.69, 1.69, 0.14, 48), metal, 0, 0.79);
  const topRing = mesh(
    root,
    geometry('tank-rim', () => new THREE.TorusGeometry(1.65, 0.07, 10, 48)),
    metal,
    0,
    5.6,
  );
  topRing.rotation.x = Math.PI / 2;
  for (const x of [-1.0, 1.0])
    for (const z of [-1.0, 1.0]) mesh(root, cylinder(0.08, 0.1, 0.55), dark, x, 0.48, z);
  const water = mesh(root, cylinder(1.57, 1.57, 1, 48), waterPaint, 0, 1);
  water.renderOrder = 2;
  const surface = mesh(
    root,
    geometry('water-surface', () => new THREE.CircleGeometry(1.57, 48)),
    flowPaint,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.renderOrder = 3;
  const ripples = [0.35, 0.7, 1.1].map((r) => {
    const ring = mesh(
      root,
      geometry(`ripple:${r}`, () => new THREE.TorusGeometry(r, 0.012, 5, 48)),
      material(0xafe5ed, 0.15, 0.2),
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  });
  const pipe = (points) =>
    mesh(
      root,
      keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
          35,
          0.1,
          10,
          false,
        ),
      ),
      metal,
    );
  pipe([
    [-3.0, 0.6, 0],
    [-3.0, 4.9, 0],
    [-2.7, 6.0, 0],
    [-0.4, 6.0, 0],
    [0, 5.8, 0],
  ]);
  pipe([
    [1.5, 0.94, 0],
    [2.8, 0.94, 0],
    [3.3, 0.65, 0],
    [3.8, 0.65, 0],
  ]);
  mesh(root, box(1.25, 0.24, 1.2), dark, -3.0, 0.32);
  const pump = mesh(root, cylinder(0.48, 0.48, 0.9), pumpPaint, -3.0, 0.84, 0.25);
  pump.rotation.x = Math.PI / 2;
  const propeller = new THREE.Group();
  propeller.position.set(-3.0, 0.84, 0.73);
  root.add(propeller);
  mesh(propeller, cylinder(0.09, 0.09, 0.08), metal).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const blade = mesh(
      propeller,
      box(0.3, 0.075, 0.04),
      metal,
      Math.cos(i * Math.PI * 0.4) * 0.17,
      Math.sin(i * Math.PI * 0.4) * 0.17,
      0.01,
    );
    blade.rotation.z = i * Math.PI * 0.4 + 0.4;
  }
  const stream = mesh(root, cylinder(0.055, 0.055, 1, 14), flowPaint, 0, 3.0);
  const drainStream = mesh(root, cylinder(0.06, 0.06, 0.36, 14), flowPaint, 3.8, 0.45);
  const floodPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x50a9c5,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.25,
      depthWrite: false,
    }),
  );
  const flood = mesh(
    root,
    geometry('flood', () => new THREE.CircleGeometry(1, 60)),
    floodPaint,
    0,
    0.218,
  );
  flood.rotation.x = -Math.PI / 2;
  const overflowStreams = [-1, 1].map((side) =>
    mesh(
      root,
      keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 1.55, 5.57, 0.4),
            new THREE.Vector3(side * 1.95, 5.3, 0.5),
            new THREE.Vector3(side * 2.0, 1.0, 0.5),
            new THREE.Vector3(side * 2.1, 0.25, 0.5),
          ]),
          45,
          0.045,
          8,
          false,
        ),
      ),
      flowPaint,
    ),
  );
  mesh(root, box(0.32, 4.8, 0.08), material(0xe4ece7), 0.9, 3.2, 1.4);
  for (let i = 0; i <= 10; i++)
    mesh(root, box(i % 5 === 0 ? 0.27 : 0.17, 0.025, 0.015), dark, 0.9, 0.84 + i * 0.47, 1.45);
  const beaconPaint = keep(
    new THREE.MeshStandardMaterial({ color: 0x3a9867, emissive: 0x3a9867, emissiveIntensity: 0.4 }),
  );
  mesh(root, sphere(0.11), beaconPaint, -2.5, 1.16, 0.45);
  return {
    update({ state = {}, parameters = {} }) {
      const ratio = clamp(finite(state.level) / 100),
        height = Math.max(0.005, ratio * 4.7),
        top = 0.85 + height;
      water.visible = ratio > 0;
      surface.visible = ratio > 0;
      water.scale.y = height;
      water.position.y = 0.85 + height / 2;
      surface.position.y = top + 0.01;
      for (let i = 0; i < ripples.length; i++) {
        const wave =
          state.pumping || state.draining ? Math.sin(finite(state.time) * 4 - i) * 0.1 : 0;
        ripples[i].visible = ratio > 0;
        ripples[i].position.y = top + 0.025;
        ripples[i].scale.setScalar(1 + wave);
      }
      if (state.pumping) propeller.rotation.z = finite(state.time) * 10;
      stream.visible = !!state.pumping;
      stream.scale.y = Math.max(0.05, 5.8 - top);
      stream.position.y = top + (5.8 - top) / 2;
      drainStream.visible = !!state.draining;
      const spilled = Math.max(0, finite(state.spilled));
      flood.visible = spilled > 0;
      const extent = 2 + Math.sqrt(spilled / Math.max(1, finite(parameters.capacity, 100))) * 2.1;
      flood.scale.set(Math.min(5.0, extent), Math.min(4.2, extent * 0.8), 1);
      overflowStreams.forEach(
        (flow) => (flow.visible = !!state.overflow && state.pumping && ratio > 0.99),
      );
      beaconPaint.color.setHex(state.overflow ? 0xd24b36 : state.pumping ? 0x3a9867 : 0x77847c);
      beaconPaint.emissive.copy(beaconPaint.color);
    },
  };
}

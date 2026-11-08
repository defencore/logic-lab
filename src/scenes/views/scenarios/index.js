import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AUTOMATION_TYPES } from '../../models/automation/index.js';
import { createAutomationModel, AUTOMATION_FRAMING } from '../automation/index.js';
import { boundsForScene, fitCameraToBounds, updateSceneDepth } from '../../common/camera.js';
import { createTrafficLight } from './signals.js';
import { createTrafficJunction } from './junction.js';
import { createRailway } from './railway.js';
import { createAnimalFeeder } from './feeder.js';
import { createWaterTank } from './tank.js';

export const SCENARIO_VIEW_TYPES = [
  ...AUTOMATION_TYPES,
  'traffic_light',
  'traffic_junction',
  'railway',
  'animal_feeder',
  'water_tank',
];

/** Build the same scene graph used by the WebGL view without allocating a renderer. */
export function createScenarioModel(type, context) {
  if (AUTOMATION_TYPES.includes(type)) return createAutomationModel(type, context);
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
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf0e8);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 45;
  controls.maxPolarAngle = Math.PI * 0.49;
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x83977c, 1.7));
  const sun = new THREE.DirectionalLight(0xfff7e7, 2.7);
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
  const fill = new THREE.DirectionalLight(0xe4efff, 0.8);
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
  const context = { root, keep, material, geometry, box, cylinder, sphere, mesh, language };
  const model = createScenarioModel(type, context);
  const frameBounds = model.bounds || boundsForScene(root);
  let activeBounds = frameBounds;
  const stageBounds = new THREE.Box3().setFromObject(root).union(frameBounds);
  const footprint = stageBounds.getSize(new THREE.Vector3());
  const centre = stageBounds.getCenter(new THREE.Vector3());
  const stage = mesh(
    root,
    box(footprint.x + 0.9, 0.25, footprint.z + 0.9),
    material(0xd3ddc9),
    centre.x,
    -0.04,
    centre.z,
  );
  stage.userData.frameIgnore = true;
  let viewDirection;
  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const w = Math.max(1, bounds.width || 640),
      h = Math.max(1, bounds.height || 420);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (viewDirection)
      fitCameraToBounds(
        camera,
        controls,
        activeBounds,
        camera.position.clone().sub(controls.target),
        { scene },
      );
  }
  function setView(view = 'perspective') {
    if (disposed) return;
    const framing = {
      ...AUTOMATION_FRAMING,
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
    viewDirection = new THREE.Vector3(
      ...framing[view === 'front' || view === 'top' ? view : 'perspective'],
    ).sub(new THREE.Vector3(...framing.target));
    activeBounds = view === 'top' ? frameBounds : model.focusBounds || frameBounds;
    fitCameraToBounds(camera, controls, activeBounds, viewDirection, { scene });
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
    updateSceneDepth(scene, camera, controls);
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

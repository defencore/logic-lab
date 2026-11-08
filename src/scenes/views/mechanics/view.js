import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fitCameraToBounds, updateSceneDepth } from '../../common/camera.js';
import { COLORS } from './coordinates.js';
import { MESSAGES } from './messages.js';
import { createMotionModel } from './model.js';

/**
 * Build a mechanical view of simulation outputs. Positions and angles are never
 * integrated here; the caller remains the only owner of motor and sensor state.
 */
export function createMotionView(container, { onStatus, language = 'en' } = {}) {
  if (!container?.appendChild)
    throw new TypeError('A container element is required for the motion view.');
  const text = MESSAGES[language] || MESSAGES.en;
  let disposed = false;
  let contextLost = false;
  let frameId = 0;
  let lastStatus;
  const report = (message) => {
    if (message === lastStatus) return;
    lastStatus = message;
    if (typeof onStatus === 'function') onStatus(message);
  };
  const notice = document.createElement('div');
  notice.className = 'motion-unavailable';
  notice.setAttribute('role', 'status');
  Object.assign(notice.style, {
    padding: '28px',
    color: '#41534a',
    background: '#f4f7f2',
    lineHeight: '1.65',
  });
  const canvas = document.createElement('canvas');
  canvas.className = 'motion-canvas';
  canvas.setAttribute('aria-label', text.canvas);
  canvas.setAttribute('role', 'img');
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    touchAction: 'none',
  });
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    notice.textContent = text.unsupported;
    container.appendChild(notice);
    report(text.unsupported);
    return {
      update() {},
      resize() {},
      setView() {},
      resetCamera() {},
      dispose() {
        if (disposed) return;
        disposed = true;
        notice.remove();
      },
    };
  }
  container.appendChild(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f5ef);
  const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 110);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 48;
  controls.minPolarAngle = 0.001;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 3.25, 0);

  const resources = new Set();
  const geometryCache = new Map();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const release = (resource) => {
    if (resources.delete(resource)) resource.dispose();
  };
  const geometry = (key, factory) => {
    if (!geometryCache.has(key)) geometryCache.set(key, keep(factory()));
    return geometryCache.get(key);
  };
  const box = (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cylinder = (radius, length, segments = 24) =>
    geometry(`cylinder:${radius}:${length}:${segments}`, () =>
      new THREE.CylinderGeometry(radius, radius, length, segments).rotateZ(-Math.PI / 2),
    );
  const steel = keep(
    new THREE.MeshStandardMaterial({ color: 0xbac5c4, metalness: 0.72, roughness: 0.3 }),
  );
  const brightSteel = keep(
    new THREE.MeshStandardMaterial({ color: 0xe0e6e2, metalness: 0.65, roughness: 0.23 }),
  );
  const black = keep(
    new THREE.MeshStandardMaterial({ color: 0x293631, metalness: 0.4, roughness: 0.57 }),
  );
  const dark = keep(
    new THREE.MeshStandardMaterial({ color: 0x53625c, metalness: 0.7, roughness: 0.47 }),
  );
  const ivory = keep(
    new THREE.MeshStandardMaterial({ color: 0xe0e7db, metalness: 0.12, roughness: 0.78 }),
  );
  const brass = keep(
    new THREE.MeshStandardMaterial({ color: 0xc5a25b, metalness: 0.76, roughness: 0.32 }),
  );
  const sensorBody = keep(
    new THREE.MeshStandardMaterial({ color: 0x36574a, metalness: 0.15, roughness: 0.55 }),
  );
  const accents = [COLORS.x, COLORS.y, COLORS.z].map((color) =>
    keep(new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.52 })),
  );
  const wireMaterials = [0xc97661, 0x6a8f71, 0x59748d, 0xd4b461].map((color) =>
    keep(new THREE.MeshStandardMaterial({ color, roughness: 0.7 })),
  );
  const mesh = (parent, shape, material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(shape, material);
    object.position.set(x, y, z);
    object.castShadow = !material.transparent;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const label = (parent, content, x, y, z, width = 2.4) => {
    const image = document.createElement('canvas');
    image.width = 512;
    image.height = 96;
    const context = image.getContext('2d');
    const texture = keep(new THREE.CanvasTexture(image));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = keep(
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        transparent: true,
        toneMapped: false,
      }),
    );
    const sprite = new THREE.Sprite(material);
    sprite.userData.frameIgnore = true;
    sprite.position.set(x, y, z);
    sprite.scale.set(width, (width * 96) / 512, 1);
    sprite.renderOrder = 5;
    parent.add(sprite);
    let previous;
    const set = (value) => {
      const next = String(value).slice(0, 45);
      if (previous === next || !context) return;
      previous = next;
      context.clearRect(0, 0, image.width, image.height);
      context.font = '600 64px system-ui, sans-serif';
      const labelWidth = Math.min(512, context.measureText(next).width + 44);
      context.fillStyle = 'rgba(247,249,244,0.88)';
      context.fillRect((512 - labelWidth) / 2, 4, labelWidth, 88);
      context.fillStyle = '#3a5145';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '600 64px system-ui, sans-serif';
      context.fillText(next, 256, 48, 490);
      texture.needsUpdate = true;
    };
    set(content);
    return {
      sprite,
      set,
      dispose() {
        sprite.removeFromParent();
        release(texture);
        release(material);
      },
    };
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7b927e, 2.5));
  const key = new THREE.DirectionalLight(0xfffaf0, 3.8);
  key.position.set(7, 16, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
    near: 1,
    far: 45,
  });
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2eeff, 1.9);
  rim.position.set(-12, 9, -8);
  scene.add(rim);
  const floor = mesh(
    scene,
    geometry('floor', () => new THREE.PlaneGeometry(150, 150)),
    keep(new THREE.MeshStandardMaterial({ color: 0xe9eee5, roughness: 0.93 })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.userData.frameIgnore = true;
  floor.castShadow = false;
  const grid = new THREE.GridHelper(36, 36, 0xb9c7b9, 0xd7dfd2);
  grid.position.y = 0.004;
  keep(grid.geometry);
  for (const material of Array.isArray(grid.material) ? grid.material : [grid.material])
    keep(material);
  scene.add(grid);
  const model = createMotionModel(
    {
      root: scene,
      mesh,
      box,
      cylinder,
      geometry,
      keep,
      release,
      label,
      steel,
      brightSteel,
      black,
      dark,
      ivory,
      brass,
      sensorBody,
      accents,
      wireMaterials,
    },
    { language },
  );
  function update(snapshot) {
    if (disposed) return;
    const message = model.update(snapshot);
    if (!contextLost) report(message);
  }

  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width || container.clientWidth || 640));
    const height = Math.max(1, Math.round(bounds.height || container.clientHeight || 400));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCameraToBounds(
      camera,
      controls,
      model.bounds,
      camera.position.clone().sub(controls.target),
      { padding: 1.12, scene },
    );
  }
  function setView(name = 'perspective') {
    if (disposed) return;
    const direction =
      name === 'top' ? [0, 1, 0.001] : name === 'front' ? [0, 0.08, 1] : [1, 0.65, 1.25];
    fitCameraToBounds(camera, controls, model.bounds, direction, { padding: 1.12, scene });
  }
  const lost = (event) => {
    event.preventDefault();
    if (disposed) return;
    contextLost = true;
    notice.textContent = text.lost;
    if (!notice.isConnected) container.appendChild(notice);
    report(text.lost);
  };
  const restored = () => {
    if (disposed) return;
    contextLost = false;
    notice.remove();
    resize();
    report(model.status());
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  if (!observer) window.addEventListener('resize', resize);
  function render() {
    if (disposed) return;
    frameId = requestAnimationFrame(render);
    if (contextLost || document.hidden || !container.isConnected) return;
    controls.update();
    updateSceneDepth(scene, camera, controls);
    renderer.render(scene, camera);
  }
  setView();
  resize();
  update();
  frameId = requestAnimationFrame(render);
  return {
    update,
    resize,
    setView,
    resetCamera() {
      setView('perspective');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      controls.dispose();
      model.dispose();
      for (const resource of resources) resource.dispose();
      resources.clear();
      geometryCache.clear();
      key.shadow.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      notice.remove();
    },
  };
}

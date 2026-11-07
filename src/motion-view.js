import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TAU = Math.PI * 2;
const COLORS = {
  x: 0x4c987a,
  y: 0x6d88ad,
  z: 0xb98a52,
  active: 0x2caa72,
  idle: 0x93a29b,
  unknown: 0xd89b3e,
};
const finite = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

/** Convert a physical position to a bounded fraction of the visible rail. */
export function travelRatio(position, minimum = 0, maximum = 200) {
  const lower = finite(minimum);
  const upper = finite(maximum, lower + 200);
  if (upper <= lower) return 0;
  return clamp((finite(position, lower) - lower) / (upper - lower), 0, 1);
}

/** The simulator reports the shaft angle in degrees, including negative turns. */
export function shaftRadians(angle) {
  return ((finite(angle) % 360) * Math.PI) / 180;
}

const MESSAGES = {
  en: {
    unsupported:
      'This browser could not create a WebGL 2 view. Enable hardware acceleration or open the lab in a browser with WebGL 2 support. Circuit simulation remains available.',
    lost: 'The 3D graphics connection was interrupted. The view will resume when the browser restores it; circuit simulation continues.',
    empty:
      'Add a stepper motor to connect a mechanical axis. Drag to orbit, scroll to zoom, and right-drag to pan.',
    limit: 'The mechanical view displays the first three motors as X, Y, and Z axes.',
    sensorLimit: 'The mechanical view displays the first 24 position sensors.',
    axis: 'axis',
    unassigned: 'No motor connected',
    canvas:
      'Interactive 3D printer mechanics: rotating stepper shafts, lead screws, moving carriages, and position sensors.',
  },
  ua: {
    unsupported:
      'Браузер не зміг створити 3D-вигляд WebGL 2. Увімкніть апаратне прискорення або відкрийте лабораторію в браузері з підтримкою WebGL 2. Симуляція схеми залишається доступною.',
    lost: 'З’єднання з 3D-графікою перервано. Вигляд відновиться разом із графічним контекстом браузера; симуляція схеми триває.',
    empty:
      'Додайте кроковий двигун, щоб підключити механічну вісь. Перетягуйте для обертання, прокручуйте для масштабу, правою кнопкою переміщуйте камеру.',
    limit: 'Механічний вигляд показує перші три двигуни як осі X, Y та Z.',
    sensorLimit: 'Механічний вигляд показує перші 24 датчики положення.',
    axis: 'вісь',
    unassigned: 'Двигун не підключено',
    canvas:
      'Інтерактивна 3D-механіка принтера: вали крокових двигунів, ходові гвинти, рухомі каретки й датчики положення.',
  },
};

class ScrewThread extends THREE.Curve {
  constructor(length) {
    super();
    this.length = length;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.length * TAU * 4;
    return target.set((t - 0.5) * this.length, Math.cos(angle) * 0.082, Math.sin(angle) * 0.082);
  }
}

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
  scene.fog = new THREE.Fog(0xf2f5ef, 32, 75);
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
      context.fillStyle = 'rgba(247,249,244,0.93)';
      context.fillRect(0, 4, 512, 88);
      context.fillStyle = '#3a5145';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '600 32px system-ui, sans-serif';
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
  floor.position.y = -0.08;
  floor.castShadow = false;
  const grid = new THREE.GridHelper(36, 36, 0xb9c7b9, 0xd7dfd2);
  grid.position.y = -0.065;
  keep(grid.geometry);
  for (const material of Array.isArray(grid.material) ? grid.material : [grid.material])
    keep(material);
  scene.add(grid);
  const printer = new THREE.Group();
  scene.add(printer);
  mesh(printer, box(11.8, 0.32, 12.2), ivory, 0, 0.2, 0);
  mesh(printer, box(11.2, 0.08, 11.6), dark, 0, 0.4, 0);
  for (const x of [-4.35, 4.35]) {
    mesh(printer, box(0.44, 7.7, 0.6), dark, x, 4.25, 0);
    mesh(printer, box(0.08, 7.35, 0.07), steel, x, 4.25, 0.34);
    mesh(printer, box(1.15, 0.25, 1.8), black, x, 0.65, 0);
  }
  mesh(printer, box(9.15, 0.42, 0.65), dark, 0, 8.0, 0);
  for (const x of [-5.0, 5.0])
    for (const z of [-5.1, 5.1]) mesh(printer, box(0.8, 0.18, 0.8), black, x, 0.05, z);
  label(printer, 'LOGIC LAB  /  MOTION', 0, 0.83, 5.4, 3.7);

  const gantry = new THREE.Group();
  gantry.position.y = 5.1;
  printer.add(gantry);
  mesh(gantry, box(9.0, 0.65, 0.42), dark, 0, 0, -0.36);
  mesh(gantry, box(0.52, 0.42, 1.45), steel, 4.35, 0, 0.38);

  const buildAxis = (
    parent,
    { index, travel, screwLength, origin = [0, 0, 0], rotation = [0, 0, 0] },
  ) => {
    const group = new THREE.Group();
    group.position.set(...origin);
    group.rotation.set(...rotation);
    parent.add(group);
    const accent = accents[index];
    for (const z of [-0.42, 0.42]) {
      mesh(group, cylinder(0.065, screwLength), brightSteel, 0, 0, z);
      for (const x of [-screwLength / 2, screwLength / 2])
        mesh(group, box(0.32, 0.42, 0.38), black, x, -0.03, z);
    }
    const screw = new THREE.Group();
    group.add(screw);
    mesh(screw, cylinder(0.065, screwLength), steel);
    mesh(
      screw,
      geometry(
        `thread:${screwLength}`,
        () =>
          new THREE.TubeGeometry(
            new ScrewThread(screwLength),
            Math.ceil(screwLength * 42),
            0.024,
            6,
            false,
          ),
      ),
      brightSteel,
    );
    const motor = new THREE.Group();
    motor.position.x = -screwLength / 2 - 0.82;
    group.add(motor);
    mesh(motor, box(1.02, 1.06, 1.06), black);
    for (const x of [-0.47, 0.47]) mesh(motor, box(0.14, 1.13, 1.13), steel, x);
    for (let i = 0; i < 7; i++) mesh(motor, box(0.04, 1.08, 1.08), dark, -0.32 + i * 0.105);
    mesh(motor, box(0.04, 0.6, 0.8), accent, -0.555, 0, 0);
    for (const y of [-0.4, 0.4])
      for (const z of [-0.4, 0.4]) {
        mesh(motor, cylinder(0.045, 0.08, 12), black, 0.57, y, z);
        mesh(motor, cylinder(0.02, 0.085, 8), steel, 0.575, y, z);
      }
    const shaft = new THREE.Group();
    motor.add(shaft);
    mesh(shaft, cylinder(0.17, 0.18), brightSteel, 0.62);
    mesh(shaft, cylinder(0.085, 0.55), steel, 0.86);
    mesh(shaft, cylinder(0.19, 0.27), brass, 1.08);
    mesh(shaft, box(0.04, 0.08, 0.31), accent, 1.23, 0.0, 0.1);
    mesh(shaft, box(0.32, 0.035, 0.04), black, 1.08, 0.185, 0);
    const ledMaterial = keep(
      new THREE.MeshStandardMaterial({
        color: COLORS.idle,
        emissive: COLORS.idle,
        emissiveIntensity: 0.15,
        roughness: 0.3,
      }),
    );
    mesh(
      motor,
      geometry('status-light', () => new THREE.SphereGeometry(0.068, 12, 8)),
      ledMaterial,
      -0.22,
      0.56,
      0.27,
    );
    for (let i = 0; i < 4; i++) {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35, -0.25 + i * 0.1, 0.56),
        new THREE.Vector3(-0.72, -0.4 + i * 0.1, 0.7),
        new THREE.Vector3(-0.78, -0.65, 0.9 + i * 0.09),
      ]);
      mesh(motor, keep(new THREE.TubeGeometry(path, 10, 0.022, 5, false)), wireMaterials[i]);
    }
    const carriage = new THREE.Group();
    group.add(carriage);
    mesh(carriage, box(0.72, 0.28, 1.14), black, 0, 0.18);
    mesh(carriage, box(0.88, 0.12, 1.2), accent, 0, 0.38);
    mesh(carriage, cylinder(0.16, 0.42), brass, 0, 0.01);
    for (const z of [-0.43, 0.43])
      for (const x of [-0.25, 0.25]) mesh(carriage, cylinder(0.13, 0.11, 16), dark, x, 0, z);
    const name = label(group, `${'XYZ'[index]} · ${text.unassigned}`, 0, 1.05, 0, 3.1);
    label(group, 'MIN', -travel / 2, -0.42, 0.7, 0.7);
    label(group, 'MAX', travel / 2, -0.42, 0.7, 0.7);
    return { group, carriage, motor, shaft, screw, ledMaterial, name, travel, index, data: null };
  };
  const xAxis = buildAxis(gantry, { index: 0, travel: 6.4, screwLength: 8.0 });
  const yAxis = buildAxis(printer, {
    index: 1,
    travel: 4.2,
    screwLength: 8.0,
    origin: [0, 0.72, 0],
    rotation: [0, -Math.PI / 2, 0],
  });
  const zAxis = buildAxis(printer, {
    index: 2,
    travel: 4.3,
    screwLength: 5.4,
    origin: [4.4, 5.15, 0.85],
    rotation: [0, 0, Math.PI / 2],
  });
  const axes = [xAxis, yAxis, zAxis];
  yAxis.name.sprite.position.set(-4.1, 1.25, 0.4);
  zAxis.name.sprite.position.set(0.1, -1.0, -0.5);
  zAxis.name.sprite.scale.set(2.6, (2.6 * 96) / 512, 1);

  const bed = new THREE.Group();
  yAxis.carriage.add(bed);
  mesh(bed, box(6.2, 0.17, 6.6), steel, 0, 0.55, 0);
  mesh(bed, box(6.0, 0.045, 6.4), black, 0, 0.66, 0);
  const bedGrid = [];
  for (let i = -3; i <= 3; i++) {
    bedGrid.push(i, 0.686, -3.2, i, 0.686, 3.2);
    bedGrid.push(-3.0, 0.686, i, 3.0, 0.686, i);
  }
  const gridShape = keep(new THREE.BufferGeometry());
  gridShape.setAttribute('position', new THREE.Float32BufferAttribute(bedGrid, 3));
  bed.add(
    new THREE.LineSegments(gridShape, keep(new THREE.LineBasicMaterial({ color: 0x6e8276 }))),
  );
  for (const x of [-2.5, 2.5])
    for (const z of [-2.7, 2.7]) {
      const spring = mesh(bed, cylinder(0.1, 0.32, 12), brass, x, 0.34, z);
      spring.rotation.z = Math.PI / 2;
    }
  const head = new THREE.Group();
  xAxis.carriage.add(head);
  mesh(head, box(0.95, 1.0, 0.85), accents[0], 0, -0.6, 0.2);
  mesh(head, box(0.72, 0.72, 0.12), black, 0, -0.57, 0.69);
  const fan = mesh(
    head,
    geometry('fan-ring', () => new THREE.TorusGeometry(0.26, 0.035, 8, 28)),
    steel,
    0,
    -0.57,
    0.78,
  );
  fan.castShadow = false;
  for (let i = 0; i < 5; i++) {
    const blade = mesh(
      head,
      box(0.23, 0.07, 0.025),
      dark,
      Math.cos((i * TAU) / 5) * 0.11,
      -0.57 + Math.sin((i * TAU) / 5) * 0.11,
      0.78,
    );
    blade.rotation.z = (i * TAU) / 5 + 0.4;
  }
  mesh(head, box(0.55, 0.22, 0.55), steel, 0, -1.22, 0.2);
  const nozzle = mesh(
    head,
    geometry('nozzle', () => new THREE.ConeGeometry(0.15, 0.26, 20)),
    brass,
    0,
    -1.46,
    0.2,
  );
  nozzle.rotation.z = Math.PI;

  const sensors = new Map();
  const createSensor = () => {
    const group = new THREE.Group();
    const light = keep(
      new THREE.MeshStandardMaterial({
        color: COLORS.idle,
        emissive: COLORS.idle,
        emissiveIntensity: 0.15,
        roughness: 0.3,
      }),
    );
    const beamMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: COLORS.active,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    );
    mesh(group, box(0.32, 0.3, 0.2), sensorBody, 0, 0, 0.72);
    mesh(group, box(0.46, 0.05, 0.3), steel, 0, -0.18, 0.72);
    const lever = mesh(group, box(0.03, 0.065, 0.42), brightSteel, 0, 0.04, 0.44);
    lever.rotation.x = 0.3;
    const indicator = mesh(
      group,
      geometry('sensor-light', () => new THREE.SphereGeometry(0.055, 12, 8)),
      light,
      0.1,
      0.14,
      0.84,
    );
    indicator.castShadow = false;
    mesh(group, box(0.035, 0.035, 0.6), beamMaterial, 0, 0.06, 0.18);
    const name = label(group, '', 0, 0.58, 0.8, 1.8);
    return {
      group,
      light,
      beamMaterial,
      name,
      dispose() {
        group.removeFromParent();
        name.dispose();
        release(light);
        release(beamMaterial);
      },
    };
  };
  let motorCount = 0;
  let sensorCount = 0;
  const normalStatus = () =>
    [
      motorCount === 0 ? text.empty : motorCount > 3 ? text.limit : '',
      sensorCount > 24 ? text.sensorLimit : '',
    ]
      .filter(Boolean)
      .join(' ');

  function update({ motors = [], sensors: sensorData = [] } = {}) {
    if (disposed) return;
    motorCount = motors.length;
    sensorCount = sensorData.length;
    axes.forEach((axis, index) => {
      const data = motors[index];
      axis.data = data || null;
      axis.motor.visible = !!data;
      axis.name.set(
        `${'XYZ'[index]} · ${data?.label || (data ? `${'XYZ'[index]} ${text.axis}` : text.unassigned)}`,
      );
      const ratio = data ? travelRatio(data.position, data.min, data.max) : 0.5;
      axis.carriage.position.x = (ratio - 0.5) * axis.travel;
      axis.shaft.rotation.x = shaftRadians(data?.angle);
      axis.screw.rotation.x = axis.shaft.rotation.x;
      const color =
        !data || data.enabled === false
          ? COLORS.idle
          : data.moving
            ? COLORS.active
            : [COLORS.x, COLORS.y, COLORS.z][index];
      axis.ledMaterial.color.setHex(color);
      axis.ledMaterial.emissive.setHex(color);
      axis.ledMaterial.emissiveIntensity = data?.moving && data.enabled !== false ? 0.75 : 0.1;
    });
    gantry.position.y = zAxis.data ? zAxis.group.position.y + zAxis.carriage.position.x : 5.1;
    const live = new Set();
    sensorData.slice(0, 24).forEach((data, index) => {
      const id = data.id ?? `sensor-${index}`;
      live.add(id);
      let sensor = sensors.get(id);
      if (!sensor) {
        sensor = createSensor();
        sensors.set(id, sensor);
      }
      const axis = axes.find((candidate) => candidate.data && candidate.data.id === data.motorId);
      if (axis) {
        if (sensor.group.parent !== axis.group) axis.group.add(sensor.group);
        const location = finite(
          data.threshold,
          finite(
            data.position,
            data.mode === 'max' ? finite(axis.data.max, 200) : finite(axis.data.min),
          ),
        );
        sensor.group.position.set(
          (travelRatio(location, axis.data.min, axis.data.max) - 0.5) * axis.travel,
          0.03,
          0,
        );
      } else {
        if (sensor.group.parent !== printer) printer.add(sensor.group);
        sensor.group.position.set(
          -4.0 + (index % 12) * 0.72,
          0.8,
          4.1 + Math.floor(index / 12) * 0.8,
        );
      }
      const triggered = data.triggered === true || data.triggered === 1;
      const color = triggered
        ? COLORS.active
        : data.triggered === 'X' || data.triggered === 'Z'
          ? COLORS.unknown
          : COLORS.idle;
      sensor.light.color.setHex(color);
      sensor.light.emissive.setHex(color);
      sensor.light.emissiveIntensity = triggered ? 1.0 : 0.1;
      sensor.beamMaterial.color.setHex(color);
      sensor.beamMaterial.opacity = triggered ? 0.45 : 0.08;
      sensor.name.set(data.label || String(id));
    });
    for (const [id, sensor] of sensors)
      if (!live.has(id)) {
        sensor.dispose();
        sensors.delete(id);
      }
    if (!contextLost) report(normalStatus());
  }

  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width || container.clientWidth || 640));
    const height = Math.max(1, Math.round(bounds.height || container.clientHeight || 400));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function setView(name = 'perspective') {
    if (disposed) return;
    controls.target.set(0, 3.25, 0);
    if (name === 'top') camera.position.set(0, 29, 0.001);
    else if (name === 'front') camera.position.set(0, 5.2, 24);
    else camera.position.set(13.7, 11.8, 17.5);
    camera.lookAt(controls.target);
    controls.update();
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
    report(normalStatus());
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
      for (const sensor of sensors.values()) sensor.dispose();
      sensors.clear();
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

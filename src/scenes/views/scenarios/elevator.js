import * as THREE from 'three';
import { tagSceneObject } from '../../common/inspection.js';
import { floorAt, FLOOR_MIN, FLOOR_MAX, FLOOR_COUNT } from '../../models/elevator/config.js';

const LEVEL = 3.2,
  BASE = 0.45,
  TOP = BASE + (FLOOR_COUNT - 1) * LEVEL + 2.8;
const out = (port) => ({ port, side: 'out' });
const input = (port) => ({ port, side: 'in' });
const bounded = (value, maximum) => Math.max(0, Math.min(maximum, value));

/** A cutaway shaft draws only the position and door fraction supplied by the physical plant. */
export function createElevator(context) {
  const { root, mesh, box, cylinder, sphere, material, keep } = context;
  const steel = material(0xc1d0d7, 0.2, 0.55),
    dark = material(0x647c8b, 0.12);
  const ivory = material(0xe5e8df),
    cabinPaint = material(0x1799bb, 0.12, 0.45),
    warm = material(0xcbbd9f);
  cabinPaint.emissive.setHex(0x0a3c4e);
  cabinPaint.emissiveIntensity = 0.22;
  const landingPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0xc2d7df,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      metalness: 0.1,
      roughness: 0.55,
    }),
  );
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: 0x8ac5d2,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      roughness: 0.1,
      side: THREE.DoubleSide,
    }),
  );
  const linked = (object, role, ...targets) => {
    object.userData.role = role;
    return tagSceneObject(object, ...targets);
  };
  const indicator = (parent, x, y, z, port) => {
    const paint = keep(
      new THREE.MeshStandardMaterial({
        color: 0x53636b,
        emissive: 0x53636b,
        emissiveIntensity: 0.1,
      }),
    );
    linked(mesh(parent, sphere(0.12), paint, x, y, z), `elevator-${port}`, out(port));
    return paint;
  };
  mesh(root, box(9.1, 0.28, 5.6), warm, -0.2, 0.14, 0.5).userData.frameIgnore = true;
  for (const x of [-2.4, 2.4])
    for (const z of [-1.45, 1.45]) {
      linked(
        mesh(root, box(0.18, TOP - 0.15, 0.18), dark, x, (TOP + 0.25) / 2, z),
        'elevator-shaft-column',
        out('position'),
      );
    }
  for (const x of [-1.43, 1.43])
    linked(
      mesh(root, box(0.1, TOP - 0.75, 0.12), steel, x, TOP / 2 - 0.025, -0.96),
      'elevator-guide',
      out('position'),
    );
  mesh(root, box(5.05, 0.22, 3.25), ivory, 0, TOP + 0.1, 0);
  const floorIndicators = [],
    landingDoors = [];
  const digitMasks = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
  for (let floor = FLOOR_MIN; floor <= FLOOR_MAX; floor++) {
    const y = BASE + (floor - FLOOR_MIN) * LEVEL;
    const landing = linked(
      mesh(root, box(8.5, 0.2, 1.65), ivory, 0.15, y - 0.1, 2.25),
      'elevator-landing',
      out(`floor${floor}`),
    );
    landing.userData.floor = floor;
    for (const x of [-2.0, 2.0]) mesh(root, box(0.88, 2.65, 0.13), dark, x, y + 1.3, 1.58);
    for (const x of [-1.22, 1.22]) mesh(root, box(0.15, 2.6, 0.22), steel, x, y + 1.3, 1.43);
    mesh(root, box(2.6, 0.15, 0.22), steel, 0, y + 2.6, 1.43);
    const doors = [-1, 1].map((side) =>
      linked(
        mesh(root, box(1.06, 2.43, 0.08), landingPaint, side * 0.535, y + 1.3, 1.4),
        'elevator-landing-door',
        out('door_position'),
        input('open'),
        input('close'),
      ),
    );
    landingDoors.push(doors);
    const label = linked(
      mesh(root, box(0.9, 1.25, 0.12), dark, 3.1, y + 1.9, 1.55),
      'elevator-floor-label',
      out(`floor${floor}`),
    );
    label.userData.floor = floor;
    const segments = [
      [0, 0.3, 0.4, 0.065],
      [0.2, 0.15, 0.065, 0.3],
      [0.2, -0.15, 0.065, 0.3],
      [0, -0.3, 0.4, 0.065],
      [-0.2, -0.15, 0.065, 0.3],
      [-0.2, 0.15, 0.065, 0.3],
      [0, 0, 0.4, 0.065],
    ];
    segments.forEach(([x, dy, w, h], bit) => {
      if ((digitMasks[floor] >> bit) & 1)
        linked(
          mesh(
            root,
            box(w * 1.45, h * 1.45, 0.025),
            ivory,
            3.1 + x * 1.45,
            y + 1.9 + dy * 1.45,
            1.63,
          ),
          'elevator-floor-digit',
          out(`floor${floor}`),
        );
    });
    floorIndicators.push(indicator(root, 3.1, y + 1.08, 1.62, `floor${floor}`));
    const sensor = linked(
      mesh(root, box(0.3, 0.14, 0.25), material(0xd49f49), -1.65, y + 0.2, 0.55),
      'elevator-floor-sensor',
      out(`floor${floor}`),
    );
    sensor.userData.floor = floor;
  }
  const cabin = new THREE.Group();
  linked(cabin, 'elevator-cabin', out('position'));
  root.add(cabin);
  linked(
    mesh(cabin, box(2.45, 0.2, 2.55), dark, 0, -0.12, 0.12),
    'elevator-cabin-platform',
    out('position'),
  );
  linked(
    mesh(cabin, box(2.2, 0.02, 2.44), warm, 0, -0.01, 0.19),
    'elevator-cabin-floor',
    out('position'),
  );
  mesh(cabin, box(2.45, 0.13, 2.18), dark, 0, 2.65);
  mesh(cabin, box(2.3, 2.6, 0.1), cabinPaint, 0, 1.3, -1.04);
  for (const x of [-1.18, 1.18]) mesh(cabin, box(0.1, 2.6, 2.1), glass, x, 1.3);
  const cabinDoors = [-1, 1].map((side) =>
    linked(
      mesh(cabin, box(1.05, 2.43, 0.075), cabinPaint, side * 0.53, 1.25, 1.2),
      'elevator-cabin-door',
      out('door_position'),
      input('open'),
      input('close'),
    ),
  );
  for (const x of [-1.34, 1.34])
    for (const y of [0.48, 2.25]) {
      const roller = mesh(cabin, cylinder(0.12, 0.12, 0.13, 20), steel, x, y, -0.96);
      roller.rotation.z = Math.PI / 2;
    }
  const doorClosed = indicator(cabin, -0.75, 2.52, 1.28, 'door_closed');
  const doorOpen = indicator(cabin, 0.75, 2.52, 1.28, 'door_open');
  const fault = indicator(root, 1.85, TOP + 0.33, 0.9, 'fault');
  const motor = linked(
    mesh(root, box(1.2, 0.65, 0.85), keep(cabinPaint.clone()), -0.25, TOP + 0.52, -0.75),
    'elevator-drive',
    out('moving'),
    input('up'),
    input('down'),
  );
  const pulleys = [-1.0, -3.05].map((x) => {
    const pulley = linked(
      mesh(root, cylinder(0.34, 0.34, 0.22, 32), steel, x, TOP, -0.65),
      'elevator-pulley',
      out('moving'),
      input('up'),
      input('down'),
    );
    pulley.rotation.x = Math.PI / 2;
    return pulley;
  });
  mesh(root, box(3.7, 0.16, 0.7), dark, -1.3, TOP - 0.4, -0.65);
  const weight = linked(new THREE.Group(), 'elevator-counterweight', out('position'));
  root.add(weight);
  for (let index = 0; index < 7; index++)
    mesh(weight, box(0.72, 0.19, 0.66), steel, 0, 0.4 + index * 0.2, 0);
  for (const x of [-3.5, -2.6])
    mesh(root, box(0.055, TOP - 0.65, 0.08), dark, x, TOP / 2 + 0.075, -0.65);
  const cablePaint = material(0x4a555b, 0.7);
  const cabinCable = mesh(root, cylinder(0.025, 0.025, 1, 12), cablePaint, -1, 8, -0.65);
  const weightCable = mesh(root, cylinder(0.025, 0.025, 1, 12), cablePaint, -3.05, 8, -0.65);
  const overhead = mesh(
    root,
    cylinder(0.025, 0.025, 2.05, 12),
    cablePaint,
    -2.025,
    TOP + 0.34,
    -0.65,
  );
  overhead.rotation.z = Math.PI / 2;
  let lastPosition = FLOOR_MIN,
    lastDoor = 0;
  function paintIndicator(paint, value) {
    const color = value === 1 ? 0x45bc87 : value === 0 ? 0x53636b : 0xe7af47;
    paint.color.setHex(color);
    paint.emissive.setHex(color);
    paint.emissiveIntensity = value === 1 ? 0.8 : 0.1;
  }
  function rope(object, bottom) {
    const height = Math.max(0.02, TOP - bottom);
    object.scale.y = height;
    object.position.y = bottom + height / 2;
  }
  const bounds = new THREE.Box3(
    new THREE.Vector3(-4.5, 0, -1.7),
    new THREE.Vector3(4.5, TOP + 0.9, 3.2),
  );
  return {
    bounds,
    update({ state = {}, outputs = {} }) {
      if (Number.isFinite(state.position))
        lastPosition = Math.max(FLOOR_MIN, bounded(state.position, FLOOR_MAX));
      if (Number.isFinite(state.door)) lastDoor = bounded(state.door, 1);
      cabin.position.y = BASE + (lastPosition - FLOOR_MIN) * LEVEL;
      weight.position.set(-3.05, BASE + (FLOOR_MAX - lastPosition) * LEVEL, -0.65);
      cabinDoors.forEach((door, index) => {
        door.position.x = (index ? 1 : -1) * (0.53 + lastDoor * 1.06);
      });
      landingDoors.forEach((doors, index) => {
        const floor = index + FLOOR_MIN;
        const openness = floorAt(lastPosition) === floor ? lastDoor : 0;
        doors.forEach((door, index) => {
          door.position.x = (index ? 1 : -1) * (0.535 + openness * 1.06);
        });
        paintIndicator(
          floorIndicators[index],
          outputs[`floor${floor}`] ??
            (state.uncertain ? 'X' : Number(floorAt(lastPosition) === floor)),
        );
      });
      paintIndicator(doorClosed, outputs.door_closed ?? Number(lastDoor <= 1e-9));
      paintIndicator(doorOpen, outputs.door_open ?? Number(lastDoor >= 1 - 1e-9));
      paintIndicator(fault, state.fault ? 1 : state.uncertain ? 'X' : 0);
      if (state.fault) {
        fault.color.setHex(0xd34e3d);
        fault.emissive.setHex(0xd34e3d);
      }
      motor.material.color.setHex(state.uncertain ? 0xc69d4b : state.fault ? 0xa95145 : 0x1799bb);
      pulleys.forEach((pulley, index) => {
        pulley.rotation.z = (index ? -1 : 1) * (lastPosition - FLOOR_MIN) * Math.PI * 3;
      });
      rope(cabinCable, cabin.position.y + 2.72);
      rope(weightCable, weight.position.y + 1.78);
    },
  };
}

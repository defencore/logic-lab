import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';
const on = (value) => value === 1;
import { paint, tube, ring, lamp, spray, plant, thermometer } from './objects.js';

export function greenhouse(context) {
  const { root, mesh, box, cylinder, material } = context;
  const frame = material(0x526e60, 0.35),
    soil = material(0x674a35),
    water = paint(context, 0x60b4cb);
  const floorY = 0.285,
    eaveY = 3.85,
    ridgeY = 4.95,
    halfDepth = 3.8,
    pitch = Math.atan2(ridgeY - eaveY, halfDepth);
  const slab = mesh(root, box(10, 0.2, 8), material(0xa8bb96), 0, 0.185, 0);
  slab.userData = { role: 'greenhouse-slab', frameIgnore: true };
  for (const x of [-4.6, 0, 4.6]) {
    for (const z of [-halfDepth, halfDepth])
      mesh(root, cylinder(0.06, 0.06, eaveY - floorY), frame, x, (eaveY + floorY) / 2, z);
    // One gable rib per bay, with straight rafters seated on the side posts.
    tube(
      context,
      root,
      [
        [x, eaveY, -halfDepth],
        [x, ridgeY, 0],
      ],
      0.055,
      frame,
    );
    tube(
      context,
      root,
      [
        [x, ridgeY, 0],
        [x, eaveY, halfDepth],
      ],
      0.055,
      frame,
    );
  }
  for (const z of [-halfDepth, halfDepth])
    for (const y of [floorY + 0.06, eaveY]) mesh(root, box(9.3, 0.08, 0.08), frame, 0, y, z);
  mesh(root, box(9.3, 0.09, 0.09), frame, 0, ridgeY, 0);
  const glass = paint(context, 0xb9ddd0, {
    transparent: true,
    opacity: 0.065,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const wallHeight = eaveY - floorY;
  for (const x of [-4.6, 4.6]) {
    mesh(root, box(0.035, wallHeight, 7.6), glass, x, floorY + wallHeight / 2, 0);
    const shape = new THREE.Shape();
    shape.moveTo(-halfDepth, 0);
    shape.lineTo(halfDepth, 0);
    shape.lineTo(0, ridgeY - eaveY);
    shape.closePath();
    const end = mesh(
      root,
      context.geometry('greenhouse-gable', () => new THREE.ShapeGeometry(shape)),
      glass,
      x,
      eaveY,
      0,
    );
    end.rotation.y = Math.PI / 2;
  }
  mesh(root, box(9.2, wallHeight, 0.035), glass, 0, floorY + wallHeight / 2, -halfDepth);
  for (const x of [-2.65, 2.65])
    mesh(root, box(3.9, wallHeight, 0.035), glass, x, floorY + wallHeight / 2, halfDepth);
  for (const x of [-0.7, 0.7]) mesh(root, box(0.07, 2.6, 0.08), frame, x, floorY + 1.3, halfDepth);
  mesh(root, box(1.47, 0.07, 0.08), frame, 0, floorY + 2.6, halfDepth);
  mesh(root, box(1.33, 2.53, 0.035), glass, 0, floorY + 1.265, halfDepth);
  mesh(
    root,
    box(1.33, wallHeight - 2.6, 0.035),
    glass,
    0,
    floorY + 2.6 + (wallHeight - 2.6) / 2,
    halfDepth,
  );
  mesh(root, cylinder(0.035, 0.035, 0.22), frame, 0.47, 1.65, halfDepth + 0.06).rotation.x =
    Math.PI / 2;
  const roofPanel = (x1, x2, z1, z2) => {
    const z = (z1 + z2) / 2,
      side = z < 0 ? -1 : 1;
    const panel = mesh(
      root,
      box(x2 - x1, 0.025, (z2 - z1) / Math.cos(pitch)),
      glass,
      (x1 + x2) / 2,
      ridgeY - Math.abs(z) * Math.tan(pitch),
      z,
    );
    panel.rotation.x = side * pitch;
    panel.userData.role = 'greenhouse-roof';
  };
  roofPanel(-4.6, 4.6, 0, halfDepth);
  roofPanel(-4.6, -1.25, -halfDepth, 0);
  roofPanel(1.25, 4.6, -halfDepth, 0);
  roofPanel(-1.25, 1.25, -halfDepth, -2.65);
  roofPanel(-1.25, 1.25, -0.45, 0);
  const vent = new THREE.Group();
  root.add(vent);
  vent.position.set(0, ridgeY - 0.45 * Math.tan(pitch), -0.45);
  vent.userData.role = 'greenhouse-vent';
  const ventLength = 2.2 / Math.cos(pitch);
  mesh(vent, box(2.5, 0.035, ventLength), glass, 0, 0, -ventLength / 2);
  for (const x of [-1.25, 1.25])
    mesh(vent, box(0.045, 0.06, ventLength), frame, x, 0, -ventLength / 2);
  for (const z of [0, -ventLength]) mesh(vent, box(2.5, 0.06, 0.045), frame, 0, 0, z);
  const plants = [],
    wiltColor = new THREE.Color(0x9b7d48),
    healthyLeafColor = new THREE.Color(0x4c9655);
  const sprays = [];
  for (const x of [-2.65, 2.65]) {
    mesh(root, box(2.6, 0.65, 6.4), material(0xac8664), x, floorY + 0.325, 0);
    mesh(root, box(2.42, 0.12, 6.2), soil, x, 0.995, 0).userData.role = 'greenhouse-soil';
    for (let index = 0; index < 5; index++) {
      const item = plant(
        context,
        root,
        x,
        -2.4 + index * 1.2,
        1.2,
        index % 2 ? 0x679b4d : 0x4e945c,
      );
      item.group.position.y = 1.055;
      item.group.userData.role = 'greenhouse-plant';
      plants.push(item);
      mesh(item.group, context.sphere(0.12), material(0xd16c45), 0.17, 0.7, 0.16);
    }
    const pipeMaterial = material(0x394c49);
    tube(
      context,
      root,
      [
        [x, 1.055, -2.95],
        [x, 3.25, -2.95],
        [x, 3.25, 2.95],
      ],
      0.04,
      pipeMaterial,
    );
    for (const z of [-1.6, 1.6]) {
      mesh(root, cylinder(0.08, 0.05, 0.13), pipeMaterial, x, 3.17, z);
      sprays.push(spray(context, root, [x, 3.1, z], water, 12, 1.085, 1.1, 0.08));
    }
  }
  for (const z of [-2, 0, 2])
    mesh(root, box(1.1, 0.045, 0.8), material(0xd9cbb3), 0, floorY + 0.0225, z);
  const fan = new THREE.Group();
  root.add(fan);
  fan.position.set(0, 2.75, -3.69);
  fan.userData.role = 'greenhouse-fan';
  mesh(root, box(1.05, 1.05, 0.1), frame, 0, 2.75, -3.75);
  ring(context, root, 0.47, material(0xc0d0c4), 0, 2.75, -3.68);
  for (let index = 0; index < 4; index++) {
    const blade = mesh(fan, box(0.16, 0.48, 0.045), material(0xa2b7ab));
    blade.position.set(
      Math.sin((index * Math.PI) / 2) * 0.16,
      Math.cos((index * Math.PI) / 2) * 0.16,
      0,
    );
    blade.rotation.z = (-index * Math.PI) / 2;
  }
  const heater = paint(context, 0x7b6956, { emissive: 0xe87d3c, emissiveIntensity: 0 });
  mesh(root, box(0.8, 0.65, 0.65), heater, 0, floorY + 0.325, -3.1);
  const light = lamp(context, root, 0, 4.02, 0, 0xd3c0ff);
  mesh(root, box(4.5, 0.12, 0.35), frame, 0, 4.2, 0);
  for (const x of [-2, 2]) mesh(root, cylinder(0.025, 0.025, 0.645), frame, x, 4.5825, 0);
  const meter = thermometer(context, root, 3.9, 2.4, 3.86);
  const flood = mesh(
    root,
    box(8.7, 0.025, 6.8),
    paint(context, 0x73bbce, { transparent: true, opacity: 0.45, depthWrite: false }),
    0,
    0.35,
    0,
  );
  flood.userData.role = 'greenhouse-flood';
  return {
    bounds: new THREE.Box3(new THREE.Vector3(-5, 0.085, -4), new THREE.Vector3(5, 5.75, 4.05)),
    update({ state = {} }) {
      const c = state.controls || {},
        time = finite(state.time),
        growth = clamp(finite(state.growth, 15) / 100),
        health = clamp(finite(state.health, 100) / 100);
      plants.forEach((item, index) => {
        item.group.scale.set(0.7 + growth * 0.35, 0.45 + growth * 1.1, 0.7 + growth * 0.35);
        item.leaf.color.copy(wiltColor).lerp(healthyLeafColor, health);
        item.leaves.forEach(
          (leaf, leafIndex) =>
            (leaf.rotation.z =
              (leafIndex % 2 ? 1 : -1) * (0.25 + (1 - health) * 1.0) +
              Math.sin(time * 0.8 + index) * 0.025),
        );
      });
      vent.rotation.x = -pitch + (on(c.vent) ? 0.65 : 0);
      fan.rotation.z = on(c.vent) ? time * 7 : 0;
      heater.emissiveIntensity = on(c.heater) ? 1.4 : 0;
      light.set(on(c.grow_light));
      sprays.forEach((item) => item.update(time, on(c.pump)));
      flood.visible = finite(state.moisture) >= 88;
      meter.update(state.temperature);
    },
  };
}

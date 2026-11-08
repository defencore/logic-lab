import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';
const on = (value) => value === 1;
import { paint, tube, ring, lamp, plant, thermometer } from './objects.js';
import { fish, fishPose } from './fish.js';

export function aquarium(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const rim = material(0x344c54, 0.35),
    wood = material(0x96724d),
    sand = material(0xc5b28b);
  mesh(root, box(8.6, 0.3, 4.7), wood, 0, 0.7, 0).userData.role = 'aquarium-table';
  for (const x of [-3.6, 3.6])
    for (const z of [-1.8, 1.8])
      mesh(root, box(0.35, 0.465, 0.35), wood, x, 0.3175, z).userData.role = 'aquarium-leg';
  mesh(root, box(8.1, 0.1, 4.1), material(0x718d8f), 0, 0.9, 0);
  mesh(root, box(7.9, 0.13, 3.9), sand, 0, 1.015, 0).userData.role = 'aquarium-sand';
  const glass = paint(context, 0xc0edf0, {
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    roughness: 0.1,
  });
  const water = paint(context, 0x65cbd5, {
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const waterMesh = mesh(root, box(7.88, 3.27, 3.88), water, 0, 2.715, 0);
  waterMesh.userData.role = 'aquarium-water';
  waterMesh.renderOrder = 2;
  for (const z of [-1.94, 1.94])
    mesh(root, box(7.88, 0.025, 0.025), material(0x65aeb9), 0, 4.35, z);
  for (const x of [-3.94, 3.94])
    mesh(root, box(0.025, 0.025, 3.88), material(0x65aeb9), x, 4.35, 0);
  for (const x of [-4, 4])
    mesh(root, box(0.06, 3.8, 4.05), glass, x, 2.85, 0).userData.role = 'aquarium-glass';
  for (const z of [-2, 2]) {
    const panel = mesh(root, box(8.05, 3.8, 0.06), glass, 0, 2.85, z);
    panel.renderOrder = 3;
    panel.userData.role = 'aquarium-glass';
  }
  for (const y of [0.98, 4.75]) {
    for (const z of [-2, 2]) mesh(root, box(8.15, 0.13, 0.14), rim, 0, y, z);
    for (const x of [-4, 4]) mesh(root, box(0.14, 0.13, 4.1), rim, x, y, 0);
  }
  for (const x of [-4, 4])
    for (const z of [-2, 2]) mesh(root, box(0.08, 3.8, 0.08), rim, x, 2.85, z);
  for (let index = 0; index < 30; index++) {
    const stone = mesh(
      root,
      sphere(0.13 + (index % 3) * 0.035),
      material(index % 2 ? 0xb69f7e : 0xd9c7a2),
      Math.sin(index * 2.4) * 3.6,
      1.1,
      -1.55 + Math.cos(index * 1.8) * 0.12,
    );
    stone.scale.y = 0.55;
  }
  for (const [x, z, height] of [
    [-2.9, -1.65, 1.7],
    [2.9, -1.65, 1.4],
    [-1.3, -1.65, 1.1],
    [1.4, -1.65, 0.9],
  ]) {
    const stem = plant(context, root, x, z, height, 0x3d8a64);
    stem.group.position.y = 1.08;
  }
  mesh(root, box(0.9, 0.6, 0.5), material(0x99785b), 0, 1.38, -1.65);
  const cave = ring(context, root, 0.24, material(0x3e4b47), 0, 1.4, -1.38);
  cave.scale.set(1.3, 1, 1);
  const heaterMaterial = paint(context, 0x746a57, { emissive: 0xf77c37, emissiveIntensity: 0 });
  const heater = mesh(root, cylinder(0.11, 0.11, 2.5), heaterMaterial, -3.55, 2.4, -1.5);
  heater.userData.role = 'aquarium-heater';
  mesh(root, cylinder(0.15, 0.15, 0.35), rim, -3.55, 3.8, -1.5);
  tube(
    context,
    root,
    [
      [-3.55, 3.9, -1.5],
      [-3.55, 5, -1.5],
      [-4.6, 5, -1.5],
      [-4.6, 0.8, -1.5],
    ],
    0.045,
    rim,
  );
  mesh(root, box(0.5, 0.7, 0.5), rim, -4.6, 0.435, -1.5);
  mesh(root, box(0.6, 1.5, 0.65), rim, 3.5, 3.1, -1.5);
  const rotor = mesh(
    root,
    context.geometry('aquarium-filter-rotor', () => new THREE.TorusGeometry(0.2, 0.04, 8, 20)),
    material(0x79c4b4),
    3.5,
    3.2,
    -1.12,
  );
  rotor.userData.role = 'aquarium-filter';
  mesh(rotor, box(0.06, 0.35, 0.035), material(0xabe7d4));
  mesh(rotor, box(0.35, 0.06, 0.035), material(0xabe7d4));
  mesh(root, box(0.9, 1.2, 0.9), rim, 4.8, 0.685, 0.5);
  const chiller = new THREE.Group();
  root.add(chiller);
  chiller.position.set(4.8, 0.8, 0.98);
  chiller.userData.role = 'aquarium-cooler';
  ring(context, chiller, 0.3, material(0x71afc3), 0, 0, 0);
  for (let index = 0; index < 3; index++) {
    const blade = mesh(chiller, box(0.08, 0.34, 0.04), material(0x71afc3));
    blade.position.set(
      Math.sin((index * Math.PI * 2) / 3) * 0.08,
      Math.cos((index * Math.PI * 2) / 3) * 0.08,
      0,
    );
    blade.rotation.z = (-index * Math.PI * 2) / 3;
  }
  const coolerLamp = lamp(context, root, 4.8, 1.15, 0.98, 0x82d6f2);
  tube(
    context,
    root,
    [
      [4.8, 1.3, 0.5],
      [4.8, 4.9, 0.5],
      [3.2, 4.9, 0.5],
      [3.2, 3.8, 0.5],
    ],
    0.055,
    material(0x6694a5),
  );
  tube(
    context,
    root,
    [
      [4.8, 0.1, 1.4],
      [4.8, 5.0, 1.4],
      [3.3, 5.0, 1.4],
      [3.3, 4.5, 1.4],
    ],
    0.06,
    material(0x9bb5b4),
  );
  const freshWater = Array.from({ length: 10 }, () =>
    mesh(root, sphere(0.035), material(0x7bc9de)),
  );
  freshWater.forEach(
    (object) => (object.userData = { role: 'aquarium-water-change', frameIgnore: true }),
  );
  const oxygenStone = mesh(root, box(0.7, 0.12, 0.35), material(0x687a85), -2, 1.14, 0.7);
  oxygenStone.userData.role = 'aquarium-aerator';
  const bubbleMaterial = paint(context, 0xb8f3f6, {
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    metalness: 0.1,
  });
  const bubbles = Array.from({ length: 22 }, (_, index) =>
    mesh(root, sphere(0.035 + (index % 3) * 0.012), bubbleMaterial),
  );
  bubbles.forEach((object) => (object.userData = { role: 'oxygen-bubble', frameIgnore: true }));
  for (const x of [-2.8, 2.8])
    mesh(root, box(0.16, 0.16, 4.1), rim, x, 4.87, 0).userData.role = 'aquarium-bridge';
  const hood = mesh(root, box(6.8, 0.18, 0.55), rim, 0, 5.04, -0.45);
  hood.userData.role = 'aquarium-light';
  const lights = Array.from({ length: 8 }, (_, index) =>
    lamp(context, root, -2.8 + index * 0.8, 4.88, -0.45),
  );
  const feeder = mesh(root, box(0.75, 0.55, 0.7), material(0xd4a36b), 2.6, 5.225, 0.8);
  feeder.userData.role = 'aquarium-feeder';
  mesh(root, cylinder(0.1, 0.1, 0.18), rim, 2.6, 4.88, 0.8);
  const pellets = Array.from({ length: 10 }, () => mesh(root, sphere(0.045), material(0x986242)));
  pellets.forEach((object) => (object.userData = { role: 'food-pellet', frameIgnore: true }));
  const meter = thermometer(context, root, -3.65, 2.85, 2.085);
  const fishes = new Map(),
    dirtyWaterColor = new THREE.Color(0x779154),
    cleanWaterColor = new THREE.Color(0x65cbd5),
    stressedFishColor = new THREE.Color(0xa9ac93);
  return {
    update({ state = {} }) {
      const time = finite(state.time),
        c = state.controls || {};
      water.color
        .copy(dirtyWaterColor)
        .lerp(cleanWaterColor, clamp(finite(state.cleanliness, 80) / 100));
      heaterMaterial.emissiveIntensity = on(c.heater) ? 1.3 : 0;
      lights.forEach((light) => light.set(on(c.light)));
      rotor.rotation.z = on(c.filter) ? time * 5 : 0;
      chiller.rotation.z = on(c.cooler) ? time * 6 : 0;
      coolerLamp.set(on(c.cooler));
      freshWater.forEach((object, index) => {
        object.visible = on(c.water_change);
        const phase = (time * 1.3 + index / 10) % 1;
        object.position.set(3.3, 4.5 - phase * 0.65, 1.4);
      });
      meter.update(state.temperature);
      bubbles.forEach((object, index) => {
        object.visible = on(c.aerator);
        const phase = (time * 0.45 + index / 22) % 1;
        object.position.set(
          -2 + Math.sin(index * 2.7 + phase * 5) * 0.19,
          1.3 + phase * 2.95,
          0.7 + Math.cos(index * 1.8) * 0.12,
        );
      });
      pellets.forEach((object, index) => {
        object.visible = on(c.feed);
        const phase = (time * 0.5 + index / 10) % 1;
        object.position.set(
          2.6 + Math.sin(index * 3.5) * 0.2,
          4.78 - phase * 3.6,
          0.8 + Math.cos(index) * 0.2,
        );
      });
      const list = state.fish || [];
      for (const [index, data] of list.entries()) {
        if (!fishes.has(data.id)) {
          const model = fish(context, index);
          fishes.set(data.id, model);
          root.add(model.group);
        }
        const model = fishes.get(data.id);
        model.group.visible = true;
        if (data.alive !== false) {
          const pose = fishPose(time, index, list.length);
          model.group.position.set(pose.x, pose.y, pose.z);
          // The long axis follows the path tangent, including smooth turns.
          model.group.rotation.set(0, pose.heading, 0);
          model.tail.rotation.y = Math.sin(time * 7 + index) * 0.35;
        } else {
          const origin = fishPose(finite(data.deadAt, time), index, list.length);
          const rise = clamp((time - finite(data.deadAt, time)) * 0.45);
          // Spread on the separate swimming levels before rising to one surface.
          const spread = THREE.MathUtils.smoothstep(rise, 0, 0.5);
          const lift = THREE.MathUtils.smoothstep(rise, 0.5, 1);
          model.group.position.set(
            THREE.MathUtils.lerp(origin.x, -2.65 + Math.floor(index / 2) * 1.75, spread),
            THREE.MathUtils.lerp(origin.y, 4.07, lift),
            THREE.MathUtils.lerp(origin.z, index % 2 ? 0.8 : -0.8, spread),
          );
          model.group.rotation.set(Math.PI, 0, 0);
          model.tail.rotation.y = 0;
        }
        model.group.userData.alive = data.alive !== false;
        model.eyes.forEach((eye) => (eye.visible = data.alive !== false));
        model.crosses.forEach((cross) => (cross.visible = data.alive === false));
        model.bodyMaterial.color
          .copy(stressedFishColor)
          .lerp(model.baseColor, clamp(finite(data.health, 100) / 100, 0.15, 1));
      }
      for (const [id, model] of fishes)
        if (!list.some((data) => data.id === id)) model.group.visible = false;
    },
  };
}

import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';
const on = (value) => value === 1;
import { paint, tube, ring, lamp, spray, thermometer } from './objects.js';

export function home(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const wall = material(0xe8d7bc),
    roof = material(0x6c8b81),
    wood = material(0x947453),
    metal = material(0x4c6766, 0.4);
  const slab = mesh(root, box(12, 0.25, 11), material(0xaabe8c), 0, 0.21, 0);
  slab.userData = { role: 'home-slab', frameIgnore: true };
  mesh(root, box(5.7, 0.16, 4.5), material(0xaaa99c), -1, 0.415, -1.25);
  mesh(root, box(5.5, 2.85, 4.3), wall, -1, 1.92, -1.25).userData.role = 'home-walls';
  const roofPitch = Math.atan2(1.45, 3);
  for (const side of [-1, 1]) {
    const panel = mesh(
      root,
      box(Math.hypot(3, 1.45), 0.12, 4.8),
      roof,
      -1 + side * 1.5,
      4.07,
      -1.25,
    );
    panel.rotation.z = -side * roofPitch;
    panel.userData.role = 'home-roof';
  }
  mesh(root, box(0.16, 0.12, 4.9), roof, -1, 4.805, -1.25);
  const gable = new THREE.Shape();
  gable.moveTo(-2.75, 0);
  gable.lineTo(2.75, 0);
  gable.lineTo(2.75, 0.12);
  gable.lineTo(0, 1.39);
  gable.lineTo(-2.75, 0.12);
  gable.closePath();
  const gableMaterial = paint(context, 0xe8d7bc, { side: THREE.DoubleSide });
  for (const z of [-3.4, 0.9])
    mesh(
      root,
      context.geometry('home-gable', () => new THREE.ShapeGeometry(gable)),
      gableMaterial,
      -1,
      3.345,
      z,
    );
  mesh(root, box(0.65, 1.3, 0.65), material(0x9c7967), -2.8, 4.15, -2.2);
  const windowMaterial = paint(context, 0x607d83, { emissive: 0xffcc7c, emissiveIntensity: 0 });
  for (const x of [-2.7, 0.7]) {
    mesh(root, box(1.15, 1.1, 0.08), windowMaterial, x, 2.1, 0.94);
    for (const dx of [-0.6, 0, 0.6]) mesh(root, box(0.05, 1.2, 0.08), wood, x + dx, 2.1, 1.01);
    for (const y of [1.5, 2.1, 2.7]) mesh(root, box(1.25, 0.06, 0.08), wood, x, y, 1.01);
  }
  mesh(root, box(0.9, 1.9, 0.13), wood, -1, 1.48, 0.98);
  mesh(root, sphere(0.055), material(0xd3b77d, 0.8), -0.7, 1.5, 1.08);
  mesh(root, box(2.1, 0.25, 1.3), material(0xb0ac9c), -1, 0.21, 6.05);
  mesh(root, box(2, 0.08, 5.6), material(0xc5bba4), -1, 0.375, 3.9).userData.role = 'home-path';
  mesh(root, box(1.3, 0.17, 0.6), material(0xb3aa96), -1, 0.42, 1.2);
  const fenceZ = 5.1,
    gateZ = 5.32;
  const fenceMesh = (shape, x, y, z) => {
    const object = mesh(root, shape, wood, x, y, z);
    object.userData.role = 'home-fence';
    return object;
  };
  for (const x of [-5.6, 5.6]) {
    for (let z = -4.8; z <= 4.8; z += 0.6) fenceMesh(box(0.1, 1.1, 0.32), x, 0.885, z);
    for (const y of [0.65, 1.2]) fenceMesh(box(0.1, 0.1, 9.9), x, y, 0);
  }
  for (let x = -5.5; x <= 5.5; x += 0.65) {
    fenceMesh(box(0.32, 1.1, 0.1), x, 0.885, -5.1);
    if (x < -2.65 || x > 0.7) fenceMesh(box(0.32, 1.1, 0.1), x, 0.885, fenceZ);
  }
  for (const y of [0.65, 1.2]) {
    fenceMesh(box(11.2, 0.1, 0.1), 0, y, -5.1);
    fenceMesh(box(2.85, 0.1, 0.1), -4.175, y, fenceZ);
    fenceMesh(box(4.95, 0.1, 0.1), 3.125, y, fenceZ);
  }
  for (const x of [-2.5, 0.55])
    mesh(root, box(0.25, 1.5, 0.3), metal, x, 1.085, fenceZ).userData.role = 'home-gate-post';
  mesh(root, box(5.6, 0.025, 0.16), metal, -2.5, 0.3475, gateZ).userData.role = 'home-gate-track';
  const gate = new THREE.Group();
  root.add(gate);
  gate.position.set(-0.975, 0.96, gateZ);
  gate.userData.role = 'home-gate';
  for (let x = -1.2; x <= 1.21; x += 0.4) mesh(gate, box(0.1, 1, 0.1), metal, x, 0, 0);
  for (const y of [-0.4, 0.4]) mesh(gate, box(2.7, 0.1, 0.1), metal, 0, y, 0);
  for (const x of [-1.1, 1.1]) {
    const wheel = mesh(gate, cylinder(0.075, 0.075, 0.07, 20), material(0x303e3d), x, -0.525, 0);
    wheel.rotation.x = Math.PI / 2;
    wheel.userData.role = 'home-gate-wheel';
  }
  const exterior = [];
  for (const x of [-4.7, 4.7]) {
    mesh(root, cylinder(0.045, 0.045, 2.2), metal, x, 1.435, 3.7);
    exterior.push(lamp(context, root, x, 2.6, 3.7));
  }
  mesh(root, cylinder(0.82, 0.82, 0.15), material(0xa0a99c), 4.3, 0.41, -3.4);
  const tank = mesh(
    root,
    cylinder(0.7, 0.7, 2.2),
    paint(context, 0x7b9e9f, { transparent: true, opacity: 0.22, depthWrite: false }),
    4.3,
    1.585,
    -3.4,
  );
  tank.userData.role = 'home-water-tank';
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rib = mesh(
      root,
      box(0.035, 2.15, 0.035),
      metal,
      4.3 + Math.sin(angle) * 0.715,
      1.61,
      -3.4 + Math.cos(angle) * 0.715,
    );
    rib.userData.role = 'home-tank-rib';
  }
  mesh(root, cylinder(0.73, 0.73, 0.1), metal, 4.3, 2.735, -3.4);
  mesh(root, cylinder(0.75, 0.75, 0.09), metal, 4.3, 0.53, -3.4);
  const water = mesh(root, cylinder(0.65, 0.65, 2.0), paint(context, 0x599eae), 4.3, 1.6, -3.4);
  water.userData.role = 'home-water';
  tube(
    context,
    root,
    [
      [4.3, 0.65, -3.4],
      [4.3, 0.65, 2.1],
      [2.8, 0.65, 2.1],
    ],
    0.06,
    metal,
  );
  const sprinkler = mesh(root, cylinder(0.07, 0.09, 0.6), metal, 2.8, 0.635, 2.1);
  sprinkler.userData.role = 'home-sprinkler';
  const drops = spray(
    context,
    root,
    [2.8, 0.98, 2.1],
    paint(context, 0x77c4d9),
    24,
    0.365,
    1.1,
    0.65,
  );
  const alarm = lamp(context, root, 1.2, 3.2, 1.02, 0xf15448);
  alarm.object.userData.role = 'home-alarm';
  const heater = paint(context, 0x89785e, { emissive: 0xf58b42, emissiveIntensity: 0 });
  mesh(root, box(0.9, 0.6, 0.2), heater, -2.7, 1.0, 1.0);
  const fan = new THREE.Group();
  root.add(fan);
  const fanMount = ring(context, root, 0.43, material(0xa6bbb1), 1.79, 2.3, -1);
  fanMount.rotation.y = Math.PI / 2;
  fan.position.set(1.81, 2.3, -1.0);
  fan.rotation.y = Math.PI / 2;
  fan.userData.role = 'home-fan';
  for (let index = 0; index < 3; index++) {
    const blade = mesh(fan, box(0.15, 0.46, 0.05), metal);
    blade.position.set(
      Math.sin((index * 2 * Math.PI) / 3) * 0.15,
      Math.cos((index * 2 * Math.PI) / 3) * 0.15,
      0,
    );
    blade.rotation.z = (-index * 2 * Math.PI) / 3;
  }
  mesh(fan, cylinder(0.1, 0.1, 0.1), metal).rotation.x = Math.PI / 2;
  const visitor = new THREE.Group();
  root.add(visitor);
  visitor.userData.role = 'home-visitor';
  mesh(visitor, sphere(0.18), material(0xdab08b), 0, 1.15, 0);
  mesh(visitor, box(0.34, 0.5, 0.22), material(0x6488ac), 0, 0.75, 0);
  for (const x of [-0.11, 0.11]) mesh(visitor, box(0.1, 0.45, 0.12), material(0x46565b), x, 0.3, 0);
  const rainMaterial = paint(context, 0x82b6d1, { transparent: true, opacity: 0.55 });
  const rain = Array.from({ length: 40 }, () => {
    const drop = mesh(root, box(0.02, 0.2, 0.02), rainMaterial);
    drop.userData.frameIgnore = true;
    return drop;
  });
  const meter = thermometer(context, root, -4.2, 2.4, 1.0);
  return {
    bounds: new THREE.Box3(new THREE.Vector3(-5.8, 0.085, -5.2), new THREE.Vector3(5.8, 4.9, 6.7)),
    update({ state = {}, parameters = {} }) {
      const c = state.controls || {},
        time = finite(state.time),
        dayLength = finite(parameters.dayLength, 60),
        phase = (time % dayLength) / dayLength;
      const raining = phase > 0.35 && phase < 0.48,
        motion = (phase > 0.12 && phase < 0.22) || (phase > 0.66 && phase < 0.78);
      windowMaterial.emissiveIntensity = on(c.indoor_light) ? 1.5 : 0;
      windowMaterial.color.set(on(c.indoor_light) ? 0xf5d38f : 0x607d83);
      exterior.forEach((item) => item.set(on(c.outdoor_light)));
      gate.position.x = -0.975 - clamp(finite(state.gate)) * 3.05;
      const level = clamp(finite(state.water, 70) / 100);
      water.visible = level > 0;
      water.scale.y = level;
      water.position.y = 0.6 + level;
      drops.update(time, on(c.sprinkler) && finite(state.water) > 0);
      alarm.set(!!state.alarmActive || !!state.alarm);
      heater.emissiveIntensity = on(c.heater) ? 1.3 : 0;
      fan.rotation.z = on(c.fan) ? time * 6 : 0;
      visitor.visible = motion;
      visitor.position.set(-1, 0.34, 5.75 + Math.sin(time) * 0.08);
      rain.forEach((object, index) => {
        object.visible = raining;
        object.position.set(
          Math.sin(index * 2.4) * 5.6,
          0.7 + ((((index / 40 - time * 0.7) % 1) + 1) % 1) * 5.2,
          Math.cos(index * 1.7) * 4.9,
        );
      });
      meter.update(state.temperature);
    },
  };
}

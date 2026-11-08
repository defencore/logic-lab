import * as THREE from 'three';
import { TAU, COLORS } from './coordinates.js';

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

export function buildAxis(
  context,
  text,
  parent,
  { index, travel, screwLength, origin = [0, 0, 0], rotation = [0, 0, 0] },
) {
  const {
    mesh,
    box,
    cylinder,
    geometry,
    keep,
    steel,
    brightSteel,
    black,
    dark,
    brass,
    accents,
    wireMaterials,
    label,
  } = context;
  const group = new THREE.Group();
  group.position.set(...origin);
  group.rotation.set(...rotation);
  parent.add(group);
  group.userData = { role: 'motion-axis', axis: 'XYZ'[index] };
  const accent = accents[index];
  for (const z of [-0.42, 0.42]) {
    mesh(group, cylinder(0.065, screwLength), brightSteel, 0, 0, z);
    for (const x of [-screwLength / 2, screwLength / 2]) {
      const bearing = mesh(group, box(0.32, 0.25, 0.38), black, x, -0.03, z);
      bearing.userData = { role: 'axis-end-bearing', axis: 'XYZ'[index] };
    }
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
  const flange = mesh(group, box(0.16, 1.16, 1.35), steel, -screwLength / 2 - 0.2);
  flange.userData = { role: 'motor-flange', axis: 'XYZ'[index] };
  const endSupport = mesh(group, box(0.12, 0.55, 1.35), steel, screwLength / 2, -0.03);
  endSupport.userData = { role: 'axis-end-support', axis: 'XYZ'[index] };
  const motor = new THREE.Group();
  motor.position.x = -screwLength / 2 - 0.82;
  group.add(motor);
  motor.userData = { role: 'stepper-motor', axis: 'XYZ'[index] };
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
      new THREE.Vector3(-0.78, -0.48, 0.9 + i * 0.09),
    ]);
    mesh(motor, keep(new THREE.TubeGeometry(path, 10, 0.022, 5, false)), wireMaterials[i]);
  }
  const carriage = new THREE.Group();
  group.add(carriage);
  carriage.userData = { role: 'axis-carriage', axis: 'XYZ'[index] };
  const carriageBody = mesh(carriage, box(0.72, 0.28, 1.14), black, 0, 0.18);
  carriageBody.userData.role = 'axis-carriage-body';
  mesh(carriage, box(0.88, 0.12, 1.2), accent, 0, 0.38);
  mesh(carriage, cylinder(0.16, 0.42), brass, 0, 0.01);
  for (const z of [-0.43, 0.43])
    for (const x of [-0.25, 0.25]) mesh(carriage, cylinder(0.13, 0.11, 16), dark, x, 0, z);
  const name = label(group, `${'XYZ'[index]} · ${text.unassigned}`, 0, 1.05, 0, 3.1);
  label(group, 'MIN', -travel / 2, -0.42, 0.7, 0.7);
  label(group, 'MAX', travel / 2, -0.42, 0.7, 0.7);
  return {
    group,
    carriage,
    motor,
    shaft,
    screw,
    ledMaterial,
    name,
    travel,
    index,
    data: null,
    lastRatio: 0.5,
    lastAngle: 0,
  };
}

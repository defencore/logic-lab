import * as THREE from 'three';
import { paint } from './objects.js';

export function fishPose(time, index, count) {
  const layers = Math.ceil(count / 2);
  const spacing = layers === 4 ? 0.76 : layers === 3 ? 1 : 1.1;
  const bottom = layers === 4 ? 1.57 : layers === 3 ? 1.7 : layers === 2 ? 2.05 : 2.6;
  const phase = time * (0.32 + index * 0.025) + index * 1.7;
  return {
    x: Math.sin(phase) * 2.5,
    y: bottom + Math.floor(index / 2) * spacing + Math.sin(phase * 0.7) * 0.025,
    z: (index % 2 ? 0.55 : -0.55) + Math.cos(phase) * 0.17,
    heading: Math.atan2(0.17 * Math.sin(phase), 2.5 * Math.cos(phase)),
  };
}

export function fish(context, index) {
  const group = new THREE.Group();
  group.userData = { role: 'aquarium-fish', fishId: index + 1 };
  group.scale.setScalar(0.82);
  const colors = [0xf0a24e, 0x5a9fb7, 0xe58a7f, 0xb6a8d2, 0x9da75b, 0xdcb94e, 0x7cb4a9, 0xb79b75];
  const bodyMaterial = paint(context, colors[index % colors.length]);
  const body = context.mesh(group, context.sphere(0.46), bodyMaterial);
  body.scale.set(1.35, 0.68, 0.5);
  const belly = context.mesh(
    group,
    context.sphere(0.35),
    context.material(0xf7e6c4),
    0.05,
    -0.1,
    0,
  );
  belly.scale.set(1.4, 0.5, 0.53);
  const finMaterial = paint(context, colors[index % colors.length], { side: THREE.DoubleSide });
  const tailShape = context.geometry('fish-tail', () => new THREE.ConeGeometry(0.34, 0.48, 3));
  const tail = context.mesh(group, tailShape, finMaterial, -0.69, 0, 0);
  tail.rotation.z = Math.PI / 2;
  tail.scale.z = 0.35;
  const dorsal = context.mesh(
    group,
    context.geometry('fish-fin', () => new THREE.ConeGeometry(0.2, 0.38, 3)),
    finMaterial,
    -0.08,
    0.35,
    0,
  );
  dorsal.scale.z = 0.25;
  const eyes = [],
    crosses = [];
  for (const side of [-1, 1]) {
    const eye = context.mesh(
      group,
      context.sphere(0.082),
      context.material(0xfff9e8),
      0.37,
      0.08,
      side * 0.21,
    );
    const pupil = context.mesh(
      group,
      context.sphere(0.04),
      context.material(0x25343a),
      0.39,
      0.08,
      side * 0.275,
    );
    eyes.push(eye, pupil);
    for (const angle of [-0.75, 0.75]) {
      const cross = context.mesh(
        group,
        context.box(0.17, 0.035, 0.02),
        context.material(0x25343a),
        0.38,
        0.08,
        side * 0.285,
      );
      cross.rotation.z = angle;
      cross.visible = false;
      cross.userData.role = 'dead-fish-eye';
      crosses.push(cross);
    }
  }
  return {
    group,
    tail,
    bodyMaterial,
    baseColor: new THREE.Color(colors[index % colors.length]),
    eyes,
    crosses,
  };
}

import * as THREE from 'three';
import { active } from '../../common/numbers.js';

export function createTrafficLight({ root, mesh, box, cylinder, sphere, material, keep }) {
  mesh(root, box(4.5, 0.08, 13.4), material(0x46505a), -1.5, 0.14).userData.frameIgnore = true;
  for (let z = -5; z <= 5; z += 1.7)
    mesh(root, box(0.1, 0.012, 0.85), material(0xf1ead8), -1.5, 0.19, z);
  mesh(root, box(2.4, 0.22, 13.4), material(0xb6bdbb), 2, 0.2).userData.frameIgnore = true;
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

export function buildSignal(context, parent, x, z, rotation = 0, scale = 1) {
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

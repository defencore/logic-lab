import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';

export function paint(context, color, options = {}) {
  return context.keep(new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...options }));
}
export function tube(context, parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return context.mesh(
    parent,
    context.keep(new THREE.TubeGeometry(curve, 24, radius, 8, false)),
    material,
  );
}
export function ring(context, parent, radius, material, x, y, z) {
  return context.mesh(
    parent,
    context.geometry(
      `automation-ring:${radius}`,
      () => new THREE.TorusGeometry(radius, 0.035, 8, 32),
    ),
    material,
    x,
    y,
    z,
  );
}
export function lamp(context, parent, x, y, z, color = 0xffd76b) {
  const material = paint(context, 0x726d50, { emissive: color, emissiveIntensity: 0 });
  const object = context.mesh(parent, context.sphere(0.13), material, x, y, z);
  object.userData.role = 'actuator-lamp';
  return {
    object,
    material,
    set(enabled) {
      material.emissiveIntensity = enabled ? 2.4 : 0;
      material.color.set(enabled ? color : 0x726d50);
    },
  };
}
export function spray(
  context,
  parent,
  origin,
  material,
  count = 15,
  targetY = 0.36,
  spread = 1.1,
  arc = 0.45,
) {
  const drops = Array.from({ length: count }, (_, index) => {
    const object = context.mesh(parent, context.sphere(0.028), material);
    object.userData = { role: 'water-drop', frameIgnore: true };
    return { object, phase: index / count };
  });
  return {
    update(time, active) {
      drops.forEach(({ object, phase }, index) => {
        object.visible = active;
        const progress = (time * 0.65 + phase) % 1,
          angle = index * 2.399;
        object.position.set(
          origin[0] + Math.cos(angle) * progress * spread,
          origin[1] + (targetY - origin[1]) * progress + Math.sin(progress * Math.PI) * arc,
          origin[2] + Math.sin(angle) * progress * spread,
        );
      });
    },
  };
}
export function plant(context, parent, x, z, height = 1, leafColor = 0x408c52) {
  const group = new THREE.Group();
  parent.add(group);
  group.position.set(x, 0, z);
  const stem = context.material(0x477d41),
    leaf = paint(context, leafColor);
  context.mesh(group, context.cylinder(0.035, 0.05, height), stem, 0, height / 2, 0);
  const leaves = [];
  for (let index = 0; index < 5; index++) {
    const object = context.mesh(
      group,
      context.sphere(0.25),
      leaf,
      (index % 2 ? 1 : -1) * 0.2,
      0.2 + (index * height) / 6,
      0,
    );
    object.scale.set(1.5, 0.22, 0.65);
    object.rotation.z = (index % 2 ? 1 : -1) * 0.35;
    leaves.push(object);
  }
  return { group, leaf, leaves };
}
export function thermometer(context, parent, x, y, z) {
  const group = new THREE.Group();
  group.userData.role = 'temperature-sensor';
  parent.add(group);
  const shell = paint(context, 0xece8db),
    mercury = paint(context, 0xd46846);
  context.mesh(group, context.box(0.26, 1.65, 0.12), shell, x, y, z);
  const bar = context.mesh(group, context.box(0.09, 1.2, 0.04), mercury, x, y - 0.12, z + 0.08);
  context.mesh(group, context.sphere(0.12), mercury, x, y - 0.65, z + 0.08);
  for (let index = 0; index < 8; index++)
    context.mesh(
      group,
      context.box(0.07, 0.014, 0.035),
      context.material(0x56615b),
      x + 0.075,
      y - 0.5 + index * 0.15,
      z + 0.075,
    );
  return {
    update(value) {
      const level = clamp((finite(value, 20) + 5) / 50, 0.05, 1);
      bar.scale.y = level;
      bar.position.y = y - 0.72 + 0.6 * level;
    },
  };
}

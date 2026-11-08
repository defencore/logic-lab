import * as THREE from 'three';
import { CAR_PARTS, TRAIN_PARTS, CAR_SCALE, TRAIN_SCALE } from '../../transport/shapes.js';

export function buildTransport(context, kind, color) {
  const { mesh, box, cylinder, material, geometry } = context;
  const group = new THREE.Group();
  group.scale.fromArray(kind === 'car' ? CAR_SCALE : TRAIN_SCALE);
  const paints = {
    body: material(color, 0.25, 0.3),
    glass: material(0x385367, 0.45, 0.2),
    tire: material(0x202624),
    dark: material(0x343c3c, 0.4),
    metal: material(0xadb5b9, 0.8, 0.25),
    lamp: material(0xffe8b3),
    tail: material(0xc54438),
    plow: material(0xa55c3f),
  };
  const wheels = [];
  for (const recipe of kind === 'car' ? CAR_PARTS : TRAIN_PARTS) {
    const shape = geometry(`transport:${recipe.shape}:${recipe.size.join(':')}`, () => {
      if (recipe.shape === 'box') return new THREE.BoxGeometry(...recipe.size);
      if (recipe.shape === 'cylinder') return new THREE.CylinderGeometry(...recipe.size);
      if (recipe.shape === 'sphere') return new THREE.SphereGeometry(...recipe.size);
      if (recipe.shape === 'cone') return new THREE.ConeGeometry(...recipe.size);
      if (recipe.shape === 'capsule') return new THREE.CapsuleGeometry(...recipe.size);
      throw new Error(`Unsupported transport shape: ${recipe.shape}`);
    });
    const object = mesh(group, shape, paints[recipe.paint], ...recipe.position);
    object.rotation.fromArray([...(recipe.rotation ?? [0, 0, 0]), 'XYZ']);
    object.scale.fromArray(recipe.scale ?? [1, 1, 1]);
    object.userData.collisionPart = recipe.id;
    if (recipe.wheel) {
      // The circular tire remains the same collision solid. Only its inset hub
      // and spoke rotate, so polygon tessellation cannot invent a changing gap.
      const hub = new THREE.Group();
      hub.position.fromArray(recipe.position);
      group.add(hub);
      const disc = mesh(
        hub,
        cylinder(
          kind === 'car' ? 0.055 : 0.1,
          kind === 'car' ? 0.055 : 0.1,
          kind === 'car' ? 0.079 : 0.075,
          12,
        ),
        paints.metal,
      );
      disc.rotation.z = Math.PI / 2;
      if (kind === 'train') mesh(hub, box(0.08, 0.025, 0.21), material(0xaf8b47, 0.6));
      wheels.push(hub);
    }
  }
  const damage = new THREE.Group();
  group.add(damage);
  damage.visible = false;
  if (kind === 'car') mesh(damage, box(0.32, 0.008, 0.28), material(0x3b3c35), 0, 0.545, -0.02);
  else
    for (const angle of [-Math.PI / 4, Math.PI / 4]) {
      const scar = mesh(damage, box(0.3, 0.03, 0.008), material(0x34362e), 0, 0.62, 0.516);
      scar.rotation.z = angle;
    }
  return { group, wheels, damage };
}
export function buildCar(context, color = 0x547ca3) {
  return buildTransport(context, 'car', color);
}

export function buildAftermath(context, parent) {
  const { mesh, box, sphere, material, keep } = context;
  const group = new THREE.Group();
  parent.add(group);
  group.visible = false;
  const smoke = keep(
    new THREE.MeshStandardMaterial({
      color: 0x58605c,
      transparent: true,
      opacity: 0.7,
      roughness: 1,
      depthWrite: false,
    }),
  );
  for (let i = 0; i < 5; i++) {
    const puff = mesh(
      group,
      sphere(0.18 + i * 0.07),
      smoke,
      Math.sin(i * 2.4) * 0.16,
      0.55 + i * 0.37,
      Math.cos(i) * 0.15,
    );
    puff.scale.y = 1.25;
  }
  for (let i = 0; i < 7; i++) {
    const debris = mesh(
      group,
      box(0.07, 0.05, 0.15),
      material(i % 2 ? 0x222a28 : 0xbd6e42),
      Math.cos(i * 2.4) * (0.3 + i * 0.07),
      0.17,
      Math.sin(i * 2.4) * (0.3 + i * 0.07),
    );
    debris.rotation.y = i * 1.3;
  }
  return group;
}

export function buildTrain(context, color) {
  return buildTransport(context, 'train', color);
}

export function buildSpeedSign(context, parent, initial, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const paint = canvas.getContext('2d');
  const texture = context.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Group();
  sign.position.set(x, y, z);
  sign.userData.role = 'speed-sign';
  parent.add(sign);
  const backing = context.mesh(
    sign,
    context.cylinder(0.36, 0.36, 0.05, 40),
    context.material(0x8d9b9b, 0.7),
  );
  backing.rotation.x = Math.PI / 2;
  const faceMaterial = context.keep(
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  const faceGeometry = context.geometry(
    'speed-sign-face',
    () => new THREE.CircleGeometry(0.36, 48),
  );
  for (const direction of [-1, 1]) {
    const face = context.mesh(sign, faceGeometry, faceMaterial, 0, 0, direction * 0.031);
    face.rotation.y = direction < 0 ? Math.PI : 0;
    face.userData.role = 'speed-sign-face';
    face.castShadow = false;
  }
  let previous;
  const set = (value, warning = false) => {
    const content = `${value}:${warning}`;
    if (content === previous || !paint) return;
    previous = content;
    paint.clearRect(0, 0, 512, 512);
    paint.fillStyle = '#fff9ed';
    paint.fillRect(0, 0, 512, 512);
    paint.beginPath();
    paint.arc(256, 256, 220, 0, Math.PI * 2);
    paint.lineWidth = 35;
    paint.strokeStyle = warning ? '#e53d26' : '#b4342e';
    paint.stroke();
    paint.fillStyle = '#23362e';
    paint.font = '750 230px system-ui,sans-serif';
    paint.textAlign = 'center';
    paint.textBaseline = 'middle';
    paint.fillText(String(value), 256, 270, 360);
    texture.needsUpdate = true;
  };
  set(initial);
  return { group: sign, set };
}

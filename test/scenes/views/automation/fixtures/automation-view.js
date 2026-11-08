import * as THREE from 'three';
import {
  createAutomationModel,
  AUTOMATION_FRAMING,
} from '../../../../../src/scenes/views/automation/index.js';

export function fixture(type) {
  const resources = new Set(),
    root = new THREE.Group(),
    geometries = new Map(),
    materials = new Map();
  const keep = (object) => {
    resources.add(object);
    return object;
  };
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, keep(factory()));
    return geometries.get(key);
  };
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return materials.get(key);
  };
  const context = {
    root,
    keep,
    geometry,
    material,
    box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
    sphere: (r) => geometry(`sphere:${r}`, () => new THREE.SphereGeometry(r, 24, 16)),
    cylinder: (top, bottom, height, segments = 28) =>
      geometry(
        `cylinder:${top}:${bottom}:${height}:${segments}`,
        () => new THREE.CylinderGeometry(top, bottom, height, segments),
      ),
    mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(shape, paint);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
  };
  return {
    root,
    model: createAutomationModel(type, context),
    dispose() {
      resources.forEach((resource) => resource.dispose?.());
    },
  };
}

export function objects(root, role) {
  const result = [];
  root.traverse((object) => {
    if (object.userData.role === role) result.push(object);
  });
  return result;
}

export function transforms(root) {
  const result = [];
  root.traverse((object) =>
    result.push([
      object.id,
      ...object.position,
      ...object.quaternion,
      ...object.scale,
      object.visible,
    ]),
  );
  return result;
}

export function bounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object, true);
}

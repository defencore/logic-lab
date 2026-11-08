import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScenarioModel } from '../../../../../src/scenes/views/scenarios/index.js';
import {
  collisionPartVertices,
  bodyContactDetail,
} from '../../../../../src/scenes/transport/shapes.js';

export function withScene(type, inspect) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const resources = new Set();
  const root = new THREE.Group();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const geometries = new Map();
  const paints = new Map();
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, keep(factory()));
    return geometries.get(key);
  };
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!paints.has(key))
      paints.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return paints.get(key);
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        const context = new Proxy(
          { measureText: (value) => ({ width: String(value).length * 10 }) },
          {
            get: (target, key) => (key in target ? target[key] : () => {}),
          },
        );
        return { width: 0, height: 0, getContext: () => context };
      },
    },
  });
  try {
    const context = {
      root,
      keep,
      geometry,
      material,
      box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
      cylinder: (a, b, h, segments = 28) =>
        geometry(
          `cylinder:${a}:${b}:${h}:${segments}`,
          () => new THREE.CylinderGeometry(a, b, h, segments),
        ),
      sphere: (radius) =>
        geometry(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 24, 16)),
      mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
        const object = new THREE.Mesh(shape, paint);
        object.position.set(x, y, z);
        parent.add(object);
        return object;
      },
    };
    inspect(root, createScenarioModel(type, context));
  } finally {
    for (const resource of resources) resource.dispose();
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  }
}

export function entities(root, kind) {
  const result = [];
  root.traverse((object) => {
    if (object.userData.transportKind === kind) result.push(object);
  });
  return result;
}

export function assertFits(group, body) {
  const right = { x: Math.cos(body.heading), z: -Math.sin(body.heading) };
  const forward = { x: Math.sin(body.heading), z: Math.cos(body.heading) };
  const point = new THREE.Vector3();
  let vertices = 0;
  group.traverse((object) => {
    if (!object.isMesh) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      const x = point.x - body.x,
        z = point.z - body.z;
      assert.ok(
        Math.abs(x * right.x + z * right.z) <= body.halfWidth + 0.00001,
        `${group.userData.transportId}: rendered width exceeds the collision body`,
      );
      assert.ok(
        Math.abs(x * forward.x + z * forward.z) <= body.halfLength + 0.00001,
        `${group.userData.transportId}: rendered nose or tail exceeds the collision body`,
      );
      vertices++;
    }
  });
  assert.ok(vertices > 100, 'The actual detailed vehicle geometry was inspected.');
}

export function collisionMeshes(group) {
  const result = new Map();
  group.traverse((object) => {
    if (object.isMesh && object.userData.collisionPart)
      result.set(object.userData.collisionPart, object);
  });
  return result;
}

export function assertExactSolids(group, body) {
  const meshes = collisionMeshes(group);
  assert.equal(meshes.size, body.parts.length);
  const directions = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [1, 1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [2, 3, -5],
    [7, -2, 3],
  ];
  for (const part of body.parts) {
    const object = meshes.get(part.id);
    assert.ok(object, `Visible primitive ${part.id} exists.`);
    const attribute = object.geometry.getAttribute('position');
    const vertices = Array.from({ length: attribute.count }, (_, index) =>
      new THREE.Vector3()
        .fromBufferAttribute(attribute, index)
        .applyMatrix4(object.matrixWorld)
        .toArray(),
    );
    const collisionVertices = collisionPartVertices(part);
    for (const direction of directions) {
      const projection = (points) =>
        points.map((point) => point.reduce((sum, value, axis) => sum + value * direction[axis], 0));
      const actual = projection(vertices),
        collision = projection(collisionVertices);
      assert.ok(
        Math.abs(Math.min(...actual) - Math.min(...collision)) < 2e-6,
        `${part.id}: minimum visible support matches physics`,
      );
      assert.ok(
        Math.abs(Math.max(...actual) - Math.max(...collision)) < 2e-6,
        `${part.id}: maximum visible support matches physics`,
      );
    }
  }
}

export function meshSurfaceDistance(object, point) {
  const positions = object.geometry.getAttribute('position'),
    indices = object.geometry.index;
  const target = new THREE.Vector3().fromArray(point),
    closest = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  let minimum = Infinity;
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    for (const [corner, key] of [
      [0, 'a'],
      [1, 'b'],
      [2, 'c'],
    ])
      triangle[key]
        .fromBufferAttribute(positions, indices ? indices.getX(i + corner) : i + corner)
        .applyMatrix4(object.matrixWorld);
    triangle.closestPointToPoint(target, closest);
    minimum = Math.min(minimum, target.distanceTo(closest));
  }
  return minimum;
}

export function byRole(root, role) {
  const found = [];
  root.traverse((object) => {
    if (object.userData.role === role) found.push(object);
  });
  return found;
}

export function worldBounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

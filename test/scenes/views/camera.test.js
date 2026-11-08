import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  boundsForScene,
  fitCameraToBounds,
  updateSceneDepth,
} from '../../../src/scenes/common/camera.js';

function corners(bounds) {
  return [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.y, bounds.max.y].flatMap((y) =>
      [bounds.min.z, bounds.max.z].map((z) => new THREE.Vector3(x, y, z)),
    ),
  );
}

test('all apparatus corners stay inside the camera at wide, square and narrow aspect ratios', () => {
  for (const bounds of [
    new THREE.Box3(new THREE.Vector3(-6.7, 0.08, -7.8), new THREE.Vector3(6.7, 3.5, 9.6)),
    new THREE.Box3(new THREE.Vector3(-4.6, 0.085, -2.2), new THREE.Vector3(4.6, 5.6, 2.2)),
  ]) {
    for (const aspect of [2.4, 1, 0.43, 0.2])
      for (const direction of [
        [12, 11, 15],
        [0, 1, 0],
        [0, 0.1, 1],
      ]) {
        const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
        const controls = { target: new THREE.Vector3(), update() {} };
        fitCameraToBounds(camera, controls, bounds, direction);
        camera.updateMatrixWorld(true);
        for (const corner of corners(bounds)) {
          const projected = corner.project(camera);
          assert.ok(
            Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9,
            `${aspect}/${direction}/${projected.toArray()}`,
          );
          assert.ok(projected.z > -1 && projected.z < 1);
        }
        assert.ok(camera.position.distanceTo(controls.target) > controls.minDistance);
        assert.ok(controls.maxDistance > camera.position.distanceTo(controls.target));
      }
  }
});

test('framing excludes hidden and staging geometry while preserving world transforms and instanced parts', () => {
  const root = new THREE.Group();
  root.position.set(3, 2, -4);
  const apparatus = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2));
  apparatus.position.set(1, 3, 0);
  root.add(apparatus);
  const stage = new THREE.Mesh(new THREE.BoxGeometry(150, 1, 150));
  stage.userData.frameIgnore = true;
  root.add(stage);
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200)));
  root.add(hidden);
  const box = boundsForScene(root);
  assert.deepEqual(box.min.toArray(), [2, 2, -5]);
  assert.deepEqual(box.max.toArray(), [6, 8, -3]);
  const instances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
    1,
  );
  instances.setMatrixAt(0, new THREE.Matrix4().makeTranslation(7, 1, 0));
  root.add(instances);
  assert.equal(boundsForScene(root).max.x, 10.5);
  instances.count = 0;
  assert.equal(boundsForScene(root).max.x, 6);
});

test('top views retain a stable up direction and resizing fits rather than clipping the same scene', () => {
  const box = new THREE.Box3(new THREE.Vector3(-7, 0, -3), new THREE.Vector3(7, 6, 3));
  const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 100);
  const controls = { target: new THREE.Vector3(), update() {} };
  const wide = fitCameraToBounds(camera, controls, box, [0, 1, 0]);
  assert.deepEqual(camera.up.toArray(), [0, 0, -1]);
  camera.aspect = 0.5;
  const narrow = fitCameraToBounds(camera, controls, box, [0, 1, 0]);
  assert.ok(narrow > wide);
  assert.ok([...camera.position, ...controls.target].every(Number.isFinite));
});

test('empty geometry and invalid camera directions fail before introducing NaN transforms', () => {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100),
    controls = { target: new THREE.Vector3(), update() {} };
  assert.throws(() => fitCameraToBounds(camera, controls, new THREE.Box3(), [1, 1, 1]), /empty/);
  const box = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
  assert.throws(() => fitCameraToBounds(camera, controls, box, [0, 0, 0]), /nonzero/);
  assert.throws(() => fitCameraToBounds(camera, controls, box, [NaN, 1, 1]), /finite/);
});

test('the full apparatus remains visible at the furthest allowed zoom and haze follows orbit distance', () => {
  const bounds = new THREE.Box3(new THREE.Vector3(-7.5, 0, -7.8), new THREE.Vector3(7.5, 3.5, 9.6));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf0e8);
  const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 100);
  const controls = { target: new THREE.Vector3(), update() {} };
  fitCameraToBounds(camera, controls, bounds, [12, 11, 15], { scene });
  const direction = camera.position.clone().sub(controls.target).normalize();
  for (const distance of [controls.maxDistance, controls.maxDistance * 0.5]) {
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);
    updateSceneDepth(scene, camera, controls);
    for (const corner of corners(bounds)) assert.ok(corner.clone().project(camera).z < 1);
    assert.ok(scene.fog.near > distance + bounds.getSize(new THREE.Vector3()).length() / 2);
    assert.ok(scene.fog.far < camera.far);
  }
});

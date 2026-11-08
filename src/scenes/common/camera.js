import * as THREE from 'three';

/** Bounds of visible geometry, excluding staging and intentionally off-camera effects. */
export function boundsForScene(root) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  const visit = (object) => {
    if (!object.visible || object.userData.frameIgnore) return;
    if (object.isMesh && (!object.isInstancedMesh || object.count > 0)) {
      if (object.isInstancedMesh) object.computeBoundingBox();
      else if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const local = object.isInstancedMesh ? object.boundingBox : object.geometry.boundingBox;
      if (local && !local.isEmpty()) {
        const world = local.clone().applyMatrix4(object.matrixWorld);
        if ([...world.min, ...world.max].every(Number.isFinite)) bounds.union(world);
      }
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  return bounds;
}

/** Fit all eight geometry-box corners for the actual viewport, including narrow views. */
export function fitCameraToBounds(
  camera,
  controls,
  bounds,
  direction,
  { padding = 1.12, scene } = {},
) {
  if (bounds.isEmpty()) throw new Error('Cannot frame an empty 3D scene.');
  const target = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.1);
  const axis = direction?.isVector3 ? direction.clone() : new THREE.Vector3(...direction);
  if (!Number.isFinite(axis.lengthSq()) || axis.lengthSq() < 1e-10)
    throw new Error('A finite nonzero camera direction is required.');
  axis.normalize();
  camera.up.set(0, Math.abs(axis.y) > 0.999 ? 0 : 1, Math.abs(axis.y) > 0.999 ? -1 : 0);
  const right = new THREE.Vector3().crossVectors(camera.up, axis).normalize();
  const up = new THREE.Vector3().crossVectors(axis, right).normalize();
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  const tanX = tanY * Math.max(camera.aspect, 0.000001);
  let distance = radius * 0.1;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new THREE.Vector3(x, y, z).sub(target);
        distance = Math.max(
          distance,
          corner.dot(axis) + (padding * Math.abs(corner.dot(right))) / tanX,
          corner.dot(axis) + (padding * Math.abs(corner.dot(up))) / tanY,
          corner.dot(axis) + radius * 0.05,
        );
      }
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(axis, distance);
  camera.near = Math.max(0.01, distance / 1000);
  controls.minDistance = radius * 0.3;
  controls.maxDistance = Math.max(distance * 4, radius * 8);
  camera.far = controls.maxDistance + radius * 4 + 10;
  if (scene) {
    scene.fog = new THREE.Fog(scene.background, distance + radius * 1.4, distance + radius * 4);
    scene.userData.frameRadius = radius;
  }
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
  return distance;
}

export function updateSceneDepth(scene, camera, controls) {
  if (!scene.fog || !scene.userData.frameRadius) return;
  const distance = camera.position.distanceTo(controls.target);
  scene.fog.near = distance + scene.userData.frameRadius * 1.4;
  scene.fog.far = distance + scene.userData.frameRadius * 4;
}

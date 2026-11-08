import * as THREE from 'three';
import { inspectionTargets, inspectionVisible, inspectionMatches } from './inspection.js';

export function inspectionHit(intersections, nodeId) {
  let transparent = null;
  for (const { object } of intersections) {
    if (!inspectionVisible(object) || object.userData.frameIgnore) continue;
    const target = inspectionTargets(object, nodeId)[0];
    if (!target) continue;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => material?.transparent)) {
      if (target.port && !transparent) transparent = target;
      continue;
    }
    return target.port ? target : transparent || target;
  }
  return transparent;
}

export function selectedInspectionBounds(root, selected, nodeId, result = new THREE.Box3()) {
  result.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (!object.isMesh || !inspectionVisible(object) || object.userData.frameIgnore) return;
    if (!inspectionTargets(object, nodeId).some((target) => inspectionMatches(target, selected)))
      return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    result.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return result;
}

/** A click inspects; orbiting, multi-touch and cancelled gestures never select a circuit port. */
export function createScenePicking({
  canvas,
  camera,
  root,
  overlay = root.parent || root,
  nodeId,
  onPick,
}) {
  const bounds = new THREE.Box3(),
    raycaster = new THREE.Raycaster();
  const highlight = new THREE.Box3Helper(bounds, 0xe8a52a);
  highlight.userData.frameIgnore = true;
  highlight.userData.inspectionIgnore = true;
  highlight.material.depthTest = false;
  highlight.material.transparent = true;
  highlight.material.opacity = 0.95;
  highlight.renderOrder = 50;
  highlight.visible = false;
  overlay.add(highlight);
  let selected = null,
    pointer = null,
    disposed = false;
  function update() {
    if (disposed) return;
    if (selected) selectedInspectionBounds(root, selected, nodeId, bounds);
    highlight.visible = !!selected && !bounds.isEmpty();
    if (highlight.visible) highlight.updateMatrixWorld(true);
  }
  function select(value) {
    selected = value ? { ...value } : null;
    update();
  }
  function down(event) {
    pointer =
      event.button === 0 && event.isPrimary !== false
        ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        : null;
  }
  function move(event) {
    if (
      pointer?.id === event.pointerId &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5
    )
      pointer.moved = true;
  }
  function up(event) {
    const start = pointer;
    pointer = null;
    if (
      !start ||
      start.id !== event.pointerId ||
      start.moved ||
      event.button !== 0 ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
    )
      return;
    const rect = canvas.getBoundingClientRect();
    if (
      !rect.width ||
      !rect.height ||
      event.clientX < rect.left ||
      event.clientX > rect.left + rect.width ||
      event.clientY < rect.top ||
      event.clientY > rect.top + rect.height
    )
      return;
    root.updateWorldMatrix(true, true);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const target = inspectionHit(raycaster.intersectObject(root, true), nodeId);
    if (target) {
      select(target);
      onPick?.({ ...target });
    }
  }
  const cancel = () => {
    pointer = null;
  };
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel };
  Object.entries(handlers).forEach(([name, handler]) => canvas.addEventListener(name, handler));
  return {
    select,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      Object.entries(handlers).forEach(([name, handler]) =>
        canvas.removeEventListener(name, handler),
      );
      highlight.removeFromParent();
      highlight.geometry.dispose();
      highlight.material.dispose();
    },
  };
}

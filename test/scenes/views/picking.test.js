import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createScenePicking,
  inspectionHit,
  selectedInspectionBounds,
} from '../../../src/scenes/common/picking.js';
import { tagSceneObject } from '../../../src/scenes/common/inspection.js';

function fixture() {
  const scene = new THREE.Scene(),
    root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  const mesh = tagSceneObject(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x376f59 }),
    ),
    { port: 'heater', side: 'in' },
  );
  root.add(mesh);
  const handlers = new Map(),
    picks = [];
  const canvas = {
    addEventListener: (name, callback) => handlers.set(name, callback),
    removeEventListener: (name) => handlers.delete(name),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 200 }),
  };
  const picking = createScenePicking({
    canvas,
    camera,
    root,
    nodeId: 'aquarium',
    onPick: (pick) => picks.push(pick),
  });
  const event = (name, values = {}) =>
    handlers.get(name)?.({
      pointerId: 1,
      button: 0,
      isPrimary: true,
      clientX: 110,
      clientY: 120,
      ...values,
    });
  return {
    scene,
    root,
    mesh,
    picking,
    picks,
    handlers,
    event,
    dispose() {
      picking.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  };
}

test('a true 3D click reports the actual port, while orbit, multi-touch and cancelled gestures do not inspect', () => {
  const f = fixture();
  f.event('pointerdown');
  f.event('pointerup');
  assert.deepEqual(f.picks, [{ nodeId: 'aquarium', port: 'heater', side: 'in' }]);
  f.event('pointerdown');
  f.event('pointermove', { clientX: 160 });
  f.event('pointermove');
  f.event('pointerup');
  f.event('pointerdown');
  f.event('pointerup', { clientX: 130 });
  f.event('pointerdown');
  f.event('pointercancel');
  f.event('pointerup');
  f.event('pointerdown');
  f.event('pointerdown', { pointerId: 2, isPrimary: false });
  f.event('pointerup');
  f.event('pointerdown', { button: 2 });
  f.event('pointerup', { button: 2 });
  assert.equal(f.picks.length, 1);
  f.dispose();
  assert.equal(f.handlers.size, 0);
});

test('selection highlight follows geometry and leaves all source transforms and materials unchanged', () => {
  const f = fixture(),
    color = f.mesh.material.color.getHex(),
    position = f.mesh.position.clone();
  f.picking.select({ nodeId: 'aquarium', port: 'heater', side: 'in' });
  const highlight = f.scene.children.find((object) => object instanceof THREE.Box3Helper);
  assert.equal(highlight.visible, true);
  assert.ok(highlight.box.containsPoint(new THREE.Vector3(0.5, 0.5, 0.5)));
  assert.equal(f.mesh.material.color.getHex(), color);
  assert.deepEqual(f.mesh.position, position);
  f.mesh.position.x = 3;
  f.picking.update();
  assert.ok(highlight.box.containsPoint(new THREE.Vector3(3.5, 0.5, 0.5)));
  f.mesh.visible = false;
  f.picking.update();
  assert.equal(highlight.visible, false);
  f.picking.select(null);
  assert.equal(highlight.visible, false);
  f.dispose();
});

test('transparent covers allow inspection of visible equipment behind them and hidden objects never win a raycast', () => {
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 0.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1 }),
  );
  const heater = tagSceneObject(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()),
    { port: 'heater', side: 'in' },
  );
  assert.deepEqual(inspectionHit([{ object: cover }, { object: heater }], 'tank'), {
    nodeId: 'tank',
    port: 'heater',
    side: 'in',
  });
  heater.visible = false;
  assert.equal(inspectionHit([{ object: cover }, { object: heater }], 'tank'), null);
  cover.geometry.dispose();
  cover.material.dispose();
  heater.geometry.dispose();
  heater.material.dispose();
});

test('port aliases highlight one physical mechanism without changing the primary picked signal', () => {
  const root = new THREE.Group();
  const gate = tagSceneObject(
    new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1), new THREE.MeshBasicMaterial()),
    { port: 'gate', side: 'in' },
    { port: 'gate_open', side: 'out' },
  );
  root.add(gate);
  assert.deepEqual(inspectionHit([{ object: gate }], 'home'), {
    nodeId: 'home',
    port: 'gate',
    side: 'in',
  });
  assert.equal(
    selectedInspectionBounds(
      root,
      { nodeId: 'home', port: 'gate_open', side: 'out' },
      'home',
    ).isEmpty(),
    false,
  );
  assert.equal(
    selectedInspectionBounds(
      root,
      { nodeId: 'other', port: 'gate_open', side: 'out' },
      'home',
    ).isEmpty(),
    true,
  );
  gate.geometry.dispose();
  gate.material.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { travelRatio, shaftRadians, createMotionModel } from '../src/motion-view.js';

test('mechanical travel maps physical min, midpoint and max onto the visible rail', () => {
  assert.equal(travelRatio(-20, -20, 180), 0);
  assert.equal(travelRatio(80, -20, 180), 0.5);
  assert.equal(travelRatio(180, -20, 180), 1);
  assert.equal(travelRatio(-100, -20, 180), 0);
  assert.equal(travelRatio(500, -20, 180), 1);
  assert.equal(travelRatio('X', -20, 180), 0);
  assert.equal(travelRatio(1, 10, 10), 0);
});

test('shaft transforms preserve direction while wrapping complete motor revolutions', () => {
  assert.ok(Math.abs(shaftRadians(90) - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(shaftRadians(-90) + Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(shaftRadians(370) - shaftRadians(10)) < 1e-12);
  assert.equal(shaftRadians(360 * 10000), 0);
  assert.equal(shaftRadians('Z'), 0);
});

function fixture() {
  const root = new THREE.Group(),
    resources = new Set(),
    cache = new Map();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const release = (resource) => {
    resources.delete(resource);
    resource.dispose?.();
  };
  const geometry = (key, factory) => {
    if (!cache.has(key)) cache.set(key, keep(factory()));
    return cache.get(key);
  };
  const material = () => keep(new THREE.MeshStandardMaterial());
  const context = {
    root,
    keep,
    release,
    geometry,
    box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
    cylinder: (radius, length, segments = 24) =>
      geometry(`cylinder:${radius}:${length}:${segments}`, () =>
        new THREE.CylinderGeometry(radius, radius, length, segments).rotateZ(-Math.PI / 2),
      ),
    mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(shape, paint);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    label(parent, content, x, y, z) {
      const sprite = new THREE.Group();
      sprite.position.set(x, y, z);
      parent.add(sprite);
      sprite.userData.frameIgnore = true;
      return {
        sprite,
        set(value) {
          sprite.userData.text = value;
        },
        dispose() {
          sprite.removeFromParent();
        },
      };
    },
    steel: material(),
    brightSteel: material(),
    black: material(),
    dark: material(),
    ivory: material(),
    brass: material(),
    sensorBody: material(),
    accents: [material(), material(), material()],
    wireMaterials: [material(), material(), material(), material()],
  };
  const model = createMotionModel(context);
  return {
    root,
    model,
    dispose() {
      model.dispose();
      resources.forEach((resource) => resource.dispose?.());
    },
  };
}
function roles(root, role) {
  const result = [];
  root.traverse((object) => {
    if (object.userData.role === role) result.push(object);
  });
  return result;
}
function bounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}
const motors = (positions) =>
  positions.map((position, index) => ({
    id: 'XYZ'[index],
    label: 'XYZ'[index],
    position,
    min: -20,
    max: 180,
    angle: index * 90,
    moving: true,
    enabled: true,
  }));

test('printer bed, gantry and nozzle remain mechanically supported and within the build surface over the full travel envelope', () => {
  const { root, model, dispose } = fixture();
  try {
    for (const x of [-20, 80, 180])
      for (const y of [-20, 80, 180])
        for (const z of [-20, 80, 180]) {
          model.update({ motors: motors([x, y, z]) });
          root.updateMatrixWorld(true);
          const nozzle = bounds(roles(root, 'print-nozzle')[0]),
            surface = bounds(roles(root, 'build-surface')[0]);
          assert.ok(
            nozzle.min.x >= surface.min.x - 1e-6 && nozzle.max.x <= surface.max.x + 1e-6,
            'nozzle stays inside bed X edges',
          );
          assert.ok(
            nozzle.min.z >= surface.min.z - 1e-6 && nozzle.max.z <= surface.max.z + 1e-6,
            'nozzle stays inside bed Y edges',
          );
          assert.ok(
            nozzle.min.y >= surface.max.y + 0.04,
            'nozzle never intersects the moving build surface',
          );
          const bedParts = [];
          model.bed.traverse((object) => {
            if (object.isMesh) bedParts.push(bounds(object));
          });
          const motorParts = [];
          model.axes[1].motor.traverse((object) => {
            if (object.isMesh) motorParts.push(object);
          });
          const fixedYParts = [
            ...motorParts,
            ...roles(model.axes[1].group, 'motor-flange'),
            ...roles(model.axes[1].group, 'axis-end-bearing'),
            ...roles(model.axes[1].group, 'axis-end-support'),
          ].map(bounds);
          for (const part of bedParts)
            for (const obstacle of fixedYParts)
              assert.ok(
                !part.intersectsBox(obstacle),
                'moving bed clears fixed Y motor, flange and bearing hardware',
              );
          assert.ok(
            Math.abs(
              model.gantry.position.y -
                (model.axes[2].group.position.y + model.axes[2].carriage.position.x),
            ) < 1e-10,
            'gantry follows its actual Z carriage',
          );
          for (const object of roles(root, 'stepper-motor'))
            assert.ok(bounds(object).min.y >= 0.44 - 1e-6, 'motors clear the base top');
          root.traverse((object) => {
            if (!object.isMesh) return;
            const box = bounds(object);
            assert.ok(
              model.bounds.clone().expandByScalar(1e-6).containsBox(box),
              'all physical parts remain inside stable camera bounds',
            );
          });
        }
  } finally {
    dispose();
  }
});

test('leveling springs join real support bars and the bed instead of floating at the corners', () => {
  const { root, model, dispose } = fixture();
  try {
    model.update({ motors: motors([80, 80, 80]) });
    const supports = roles(root, 'bed-support')[0].children.map(bounds),
      surface = bounds(roles(root, 'build-surface')[0]);
    for (const spring of roles(root, 'bed-leveling-spring')) {
      const box = bounds(spring);
      assert.ok(
        supports.some((support) => support.intersectsBox(box)),
        'every spring seats on a visible support bar',
      );
      assert.ok(box.max.y >= surface.min.y - 0.18, 'every spring reaches the bed plate');
    }
    const hanger = bounds(roles(root, 'head-hanger')[0]);
    assert.ok(
      hanger.intersectsBox(bounds(roles(root, 'extruder-body')[0])),
      'extruder attaches to its hanger',
    );
    assert.ok(
      hanger.intersectsBox(bounds(roles(model.axes[0].carriage, 'axis-carriage-body')[0])),
      'hanger attaches to X carriage',
    );
    const rightMount = bounds(roles(root, 'gantry-right-mount')[0]);
    assert.ok(
      rightMount.intersectsBox(bounds(model.axes[2].carriage)),
      'gantry bracket reaches Z carriage',
    );
  } finally {
    dispose();
  }
});

test('sensor thresholds coincide with carriage positions on every mechanical axis and paused snapshots do not move geometry', () => {
  const { root, model, dispose } = fixture();
  try {
    const data = motors([40, 40, 40]);
    model.update({
      motors: data,
      sensors: data.map((motor, index) => ({
        id: `sensor${index}`,
        motorId: motor.id,
        threshold: 40,
        triggered: true,
        label: 'Target',
      })),
    });
    root.updateMatrixWorld(true);
    const sensors = roles(root, 'position-sensor');
    model.axes.forEach((axis, index) => {
      const sensor = sensors[index],
        carriage = axis.carriage.getWorldPosition(new THREE.Vector3());
      const anchor = sensor.getWorldPosition(new THREE.Vector3());
      const direction = new THREE.Vector3(1, 0, 0).transformDirection(axis.group.matrixWorld);
      assert.ok(
        Math.abs(anchor.clone().sub(carriage).dot(direction)) < 1e-9,
        'sensor uses the exact same physical-to-visible mapping as carriage',
      );
    });
    const before = roles(root, 'axis-carriage').map((object) =>
      object.getWorldPosition(new THREE.Vector3()).toArray(),
    );
    model.update({
      motors: data,
      sensors: data.map((motor, index) => ({
        id: `sensor${index}`,
        motorId: motor.id,
        threshold: 40,
        triggered: true,
        label: 'Target',
      })),
      time: 9999,
    });
    root.updateMatrixWorld(true);
    assert.deepEqual(
      roles(root, 'axis-carriage').map((object) =>
        object.getWorldPosition(new THREE.Vector3()).toArray(),
      ),
      before,
    );
    model.update({ motors: data, sensors: [] });
    assert.equal(roles(root, 'position-sensor').length, 0);
  } finally {
    dispose();
  }
});

test('unknown motor outputs hold the last known pose rather than teleporting to a mechanical endpoint', () => {
  const { root, model, dispose } = fixture();
  try {
    model.update({ motors: motors([40, 80, 120]) });
    root.updateMatrixWorld(true);
    const poses = model.axes.map((axis) => ({
      position: axis.carriage.getWorldPosition(new THREE.Vector3()).toArray(),
      angle: axis.shaft.rotation.x,
    }));
    model.update({
      motors: motors([40, 80, 120]).map((motor) => ({
        ...motor,
        position: 'X',
        angle: 'X',
        moving: false,
      })),
    });
    root.updateMatrixWorld(true);
    model.axes.forEach((axis, index) => {
      assert.deepEqual(
        axis.carriage.getWorldPosition(new THREE.Vector3()).toArray(),
        poses[index].position,
      );
      assert.equal(axis.shaft.rotation.x, poses[index].angle);
      assert.equal(axis.ledMaterial.color.getHex(), 0xd89b3e);
    });
  } finally {
    dispose();
  }
});

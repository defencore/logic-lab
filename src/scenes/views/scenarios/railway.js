import * as THREE from 'three';
import { finite, clamp, active } from '../../common/numbers.js';
import {
  JUNCTION,
  RAILWAY,
  railwayPoint,
  railwayPose,
  railwayOffsetPoint,
  roadCarPose,
} from '../../transport/geometry.js';
import { buildCar, buildTrain, buildAftermath, buildSpeedSign } from './transport-objects.js';
import { buildSignal } from './signals.js';

export function createRailway(context) {
  const { root, mesh, box, cylinder, sphere, material, geometry, keep } = context;
  const steel = material(0xaeb7b7, 0.85, 0.25),
    timber = material(0x7c634a),
    ballast = material(0x9e9d90);
  const trackCurve = (pointAt, height) => {
    const curve = new THREE.Curve();
    curve.getPoint = (t, target = new THREE.Vector3()) => {
      const point = pointAt(t);
      return target.set(point.x, height, point.z);
    };
    return curve;
  };
  const makeTrack = (name, pointAt, offsetAt) => {
    const curve = trackCurve(pointAt, 0);
    const bed = mesh(
      root,
      keep(new THREE.TubeGeometry(curve, 160, 0.42, 8, false)),
      ballast,
      0,
      0.115,
    );
    bed.scale.y = 0.14;
    bed.userData.role = 'rail-ballast';
    for (const offset of [-0.19, 0.19]) {
      const profile = [
        [-0.043, 0.245],
        [0.043, 0.245],
        [0.043, 0.253],
        [0.013, 0.257],
        [0.013, 0.292],
        [0.027, 0.295],
        [0.027, 0.315],
        [-0.027, 0.315],
        [-0.027, 0.295],
        [-0.013, 0.292],
        [-0.013, 0.257],
        [-0.043, 0.253],
      ];
      const positions = [],
        indices = [],
        count = profile.length,
        segments = 160;
      for (let step = 0; step <= segments; step++) {
        for (const [width, y] of profile) {
          const point = offsetAt(step / segments, offset + width);
          positions.push(point.x, y, point.z);
        }
        if (step > 0)
          for (let side = 0; side < count; side++) {
            const a = (step - 1) * count + side,
              b = (step - 1) * count + ((side + 1) % count);
            indices.push(a, b, a + count, b, b + count, a + count);
          }
      }
      const caps = THREE.ShapeUtils.triangulateShape(
        profile.map(([x, y]) => new THREE.Vector2(x, y)),
        [],
      );
      for (const [a, b, c] of caps)
        indices.push(c, b, a, a + segments * count, b + segments * count, c + segments * count);
      const solid = new THREE.BufferGeometry();
      solid.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      solid.setIndex(indices);
      const shape = keep(solid.toNonIndexed());
      solid.dispose();
      shape.computeVertexNormals();
      const rail = mesh(root, shape, steel);
      rail.userData = { role: 'rail', track: name, offset };
    }
    const length = curve.getLength();
    for (let d = 0; d <= length; d += 0.34) {
      const p = curve.getPointAt(d / length),
        tangent = curve.getTangentAt(d / length);
      const tie = mesh(root, box(0.73, 0.075, 0.11), timber, p.x, 0.21, p.z);
      tie.rotation.y = Math.atan2(tangent.x, tangent.z);
      tie.userData.role = 'rail-sleeper';
    }
  };
  makeTrack(
    'shared',
    (t) => ({ x: 0, z: -7.8 + t * 16.3 }),
    (t, offset) => ({ x: offset, z: -7.8 + t * 16.3 }),
  );
  for (const track of ['a', 'b'])
    makeTrack(
      track,
      (t) => railwayPoint(track, -125 + t * 125),
      (t, offset) => railwayOffsetPoint(track, -125 + t * 125, offset),
    );
  const road = new THREE.Group();
  root.add(road);
  road.userData.role = 'rail-crossing-deck';
  for (const side of [-1, 1])
    mesh(
      road,
      box(6.54, 0.23, 1.6),
      material(0x4b555c),
      side * 4.23,
      RAILWAY.roadSurfaceY - 0.115,
      RAILWAY.roadZ,
    );
  mesh(road, box(1.92, 0.17, 1.6), material(0x4b555c), 0, 0.17, RAILWAY.roadZ);
  // Flush panels leave clearance beside each rail head for train wheel flanges.
  for (const x of [-0.61, 0, 0.61]) {
    const deck = mesh(
      road,
      box(x === 0 ? 0.27 : 0.7, 0.06, 1.6),
      material(0x7c725e),
      x,
      RAILWAY.roadSurfaceY - 0.03,
      RAILWAY.roadZ,
    );
    deck.userData.role = 'crossing-panel';
  }
  for (const x of [-5, -3, 3, 5])
    mesh(
      root,
      box(1.1, 0.015, 0.06),
      material(0xf3ead3),
      x,
      RAILWAY.roadSurfaceY + 0.012,
      RAILWAY.roadZ,
    );
  const turnouts = [0, 1].map((end) => {
    const group = new THREE.Group();
    root.add(group);
    group.position.z = end ? 2.12 : -0.2;
    group.userData = { role: 'rail-turnout', end };
    const blades = [-1, 1].map((side) => {
      const blade = mesh(group, box(0.035, 0.055, 0.9), steel, side * 0.16, 0.32);
      blade.userData.role = 'turnout-blade';
      return blade;
    });
    const lever = new THREE.Group();
    root.add(lever);
    lever.position.set(end ? 0.8 : -0.8, 0.3, end ? 2.8 : -0.85);
    lever.userData = { role: 'turnout-lever', end };
    mesh(lever, box(0.45, 0.15, 0.35), material(0x627b6b));
    const handle = mesh(lever, box(0.055, 0.5, 0.055), material(0x254c3d), 0, 0.28);
    mesh(handle, sphere(0.09), material(0xffcf69), 0, 0.25);
    const routes = [0, 1].map((route) => {
      const line =
        route === (end ? 1 : 0)
          ? trackCurve((t) => railwayPoint(end ? 'b' : 'a', -55 + t * 55), 0.268)
          : trackCurve((t) => ({ x: 0, z: end ? 2.1 + (1 - t) * 3.3 : -3.3 + t * 3.3 }), 0.268);
      const rail = mesh(
        root,
        keep(new THREE.TubeGeometry(line, 80, 0.015, 6, false)),
        material(0x2aaf80, 0.25),
      );
      rail.userData = { role: 'selected-rail-route', end, route };
      return rail;
    });
    return { blades, handle, routes };
  });
  const signalA = buildSignal(context, root, -1.05, -1.0, Math.PI, 0.72, {
    red: 'signal_a',
    green: 'signal_a',
  });
  const signalB = buildSignal(context, root, 1.05, 3.0, 0, 0.72, {
    red: 'signal_b',
    green: 'signal_b',
  });
  const arms = [-1, 1].map((side) => {
    const gate = new THREE.Group();
    root.add(gate);
    gate.position.set(side * RAILWAY.gateX, 0.65, side < 0 ? RAILWAY.gateZNear : RAILWAY.gateZFar);
    gate.userData.role = 'rail-gate';
    mesh(gate, box(0.34, 0.85, 0.3), material(0xdec492), side * 0.16, -0.15);
    const arm = new THREE.Group();
    gate.add(arm);
    arm.userData = { role: 'rail-gate-arm', direction: -side };
    mesh(
      arm,
      box(0.1, 0.11, RAILWAY.gateLength),
      material(0xf5f0df),
      0,
      0,
      (-side * RAILWAY.gateLength) / 2,
    );
    for (let i = 0; i < 5; i++)
      mesh(arm, box(0.105, 0.115, 0.15), material(0xb84539), 0, 0, -side * (0.15 + i * 0.33));
    return arm;
  });
  mesh(root, cylinder(0.025, 0.035, 1.5), steel, 1.3, 0.835, -1.9);
  const speedSign = buildSpeedSign(context, root, 60, 1.3, 1.6, -1.9);
  const trains = new Map();
  const roadCars = new Map();
  const aftermath = buildAftermath(context, root);
  aftermath.userData.role = 'collision-aftermath';
  return {
    focusBounds: new THREE.Box3(
      new THREE.Vector3(-3.5, 0.085, -3.6),
      new THREE.Vector3(3.5, 3.0, 5.6),
    ),
    update({ state = {}, parameters = {} }) {
      signalA.set(!active(state.signals?.a), 0, state.signals?.a);
      signalB.set(!active(state.signals?.b), 0, state.signals?.b);
      for (const arm of arms)
        arm.rotation.x =
          (-arm.userData.direction * (1 - clamp(finite(state.barrier))) * Math.PI) / 2;
      for (const [end, turnout] of turnouts.entries()) {
        const selected = end ? (state.exitPoints ?? state.points ?? 0) : (state.points ?? 0);
        for (const blade of turnout.blades) blade.rotation.y = selected ? -0.18 : 0.18;
        turnout.handle.rotation.z = selected ? -0.48 : 0.48;
        turnout.routes.forEach((route, index) => {
          route.visible = selected === index;
        });
      }
      const live = new Set();
      for (const data of state.trains || []) {
        live.add(data.id);
        let train = trains.get(data.id);
        if (!train) {
          train = buildTrain(context, data.track === 'a' ? 0x3d748c : 0x9c5449);
          train.group.name = `rail-train:${data.id}`;
          train.group.userData.transportId = data.id;
          train.group.userData.transportKind = 'rail_train';
          trains.set(data.id, train);
          root.add(train.group);
        }
        const pose = railwayPose(data);
        train.group.position.set(pose.x, RAILWAY.trainY, pose.z);
        train.group.rotation.set(0, pose.heading, 0);
        train.damage.visible = !!data.crashed || !!data.derailed;
        for (const wheel of train.wheels)
          wheel.rotation.x = (finite(data.position) * RAILWAY.scale) / (0.15 * 0.68);
      }
      for (const [id, train] of trains)
        if (!live.has(id)) {
          train.group.removeFromParent();
          trains.delete(id);
        }
      const liveCars = new Set();
      for (const data of state.roadCars || []) {
        liveCars.add(data.id);
        let car = roadCars.get(data.id);
        if (!car) {
          car = buildCar(context, data.direction === -1 ? 0xb69854 : 0x567fa1);
          car.group.name = `rail-car:${data.id}`;
          car.group.userData.transportId = data.id;
          car.group.userData.transportKind = 'rail_car';
          roadCars.set(data.id, car);
          root.add(car.group);
        }
        const pose = roadCarPose(data);
        car.group.position.set(pose.x, RAILWAY.carY, pose.z);
        car.group.visible = Math.abs(pose.x) <= 7.5 - JUNCTION.carLength / 2;
        car.group.rotation.set(0, pose.heading, 0);
        car.damage.visible = !!data.crashed;
        for (const wheel of car.wheels)
          wheel.rotation.x = (finite(data.position) * RAILWAY.roadScale) / 0.115;
      }
      for (const [id, car] of roadCars)
        if (!liveCars.has(id)) {
          car.group.removeFromParent();
          roadCars.delete(id);
        }
      const derailed = (state.trains || []).find((train) => train.derailed);
      aftermath.visible = !!state.collisionPoint || !!derailed;
      const point = state.collisionPoint || (derailed ? railwayPose(derailed) : null);
      if (point) aftermath.position.set(point.x, 0, point.z);
      speedSign.set(Math.round(finite(parameters.speedLimit, 60)), !!state.fault);
    },
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JUNCTION,
  RAILWAY,
  RAIL_RESERVATION,
  TURNOUT_ZONES,
  ROAD_CROSSING,
  junctionCarPose,
  railwayPose,
  railwayPoint,
  roadCarPose,
  railNormal,
  railwayOffsetPoint,
  trainFootprint,
  carFootprint,
  footprint,
  footprintCorners,
  overlaps,
  trainReservesSection,
  trainInTurnout,
  crossingClear,
} from '../../../src/scenes/transport/geometry.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
const extent = (box, axis) => {
  const values = footprintCorners(box).map((point) => point[axis]);
  return [Math.min(...values), Math.max(...values)];
};

test('full car bodies stop behind the zebra and retain a real bumper gap in both junction lanes', () => {
  for (const axis of ['ns', 'ew']) {
    const car = { axis, position: JUNCTION.stopPosition };
    const body = carFootprint(car);
    const [, front] = extent(body, axis === 'ns' ? 'z' : 'x');
    assert.ok(front < JUNCTION.stopLine);
    assert.ok(JUNCTION.stopLine < JUNCTION.zebraNear);
    const behind = carFootprint({ axis, position: car.position - JUNCTION.queueHeadway });
    assert.equal(overlaps(body, behind), false);
    const [, followingNose] = extent(behind, axis === 'ns' ? 'z' : 'x');
    const [leadingTail] = extent(body, axis === 'ns' ? 'z' : 'x');
    near(leadingTail - followingNose, JUNCTION.queueGap);
  }
  assert.equal(
    overlaps(carFootprint({ axis: 'ns', position: 0 }), carFootprint({ axis: 'ns', position: -7 })),
    true,
    'The previous seven-meter headway overlapped the rendered bodies.',
  );
});

test('shared train footprints preserve the actual asymmetric front and rear on both headings', () => {
  const a = trainFootprint({ track: 'a', position: 10 });
  const b = trainFootprint({ track: 'b', position: 10 });
  const [aRear, aFront] = extent(a, 'z');
  const [bFront, bRear] = extent(b, 'z');
  near(aFront, 0.6 + 0.55);
  near(aRear, 0.6 - 1);
  near(bFront, 1.5 - 0.55);
  near(bRear, 1.5 + 1);
  near(extent(a, 'x')[1] - extent(a, 'x')[0], 0.5);
  near(railwayPose({ track: 'a', position: 10 }).heading, 0);
  near(Math.abs(railwayPose({ track: 'b', position: 10 }).heading), Math.PI);
});

test('track normals stay perpendicular and supply the exact offset rail geometry', () => {
  for (const track of ['a', 'b'])
    for (const position of [-100, -40, -10, 0, 20, 95]) {
      const pose = railwayPose({ track, position }),
        normal = railNormal(track, position);
      near(Math.hypot(normal.x, normal.z), 1);
      near(normal.x * Math.sin(pose.heading) + normal.z * Math.cos(pose.heading), 0);
      const rail = railwayOffsetPoint(track, position, 0.19);
      near(Math.hypot(rail.x - pose.x, rail.z - pose.z), 0.19);
      assert.deepEqual(railwayPoint(track, position), { x: pose.x, z: pose.z });
    }
});

test('reservation contains full converging approaches and tails, while physical blades remain separate', () => {
  for (const track of ['a', 'b']) {
    assert.equal(trainReservesSection({ track, position: RAILWAY.stopPosition }), false);
    assert.equal(trainReservesSection({ track, position: -29 }), true);
    assert.equal(
      trainReservesSection({ track, position: 47 }),
      true,
      'A long rendered tail still occupies the route after the former logical boundary.',
    );
    assert.equal(trainReservesSection({ track, position: 82 }), false);
  }
  assert.equal(
    trainInTurnout({ track: 'a', position: -29 }),
    false,
    'Reservation by itself cannot cause a points derailment.',
  );
  assert.equal(trainInTurnout({ track: 'a', position: 5 }), true);
  assert.equal(TURNOUT_ZONES.length, 2);
  assert.ok(RAIL_RESERVATION.halfLength > TURNOUT_ZONES[0].halfLength);
});

test('oriented body collision catches approach and same-path contact without axis-aligned false positives', () => {
  assert.equal(
    overlaps(
      trainFootprint({ track: 'a', position: 0 }),
      trainFootprint({ track: 'a', position: 20 }),
    ),
    true,
  );
  assert.equal(
    overlaps(
      trainFootprint({ track: 'a', position: 0 }),
      trainFootprint({ track: 'a', position: 30 }),
    ),
    false,
  );
  assert.equal(
    overlaps(
      trainFootprint({ track: 'a', position: 38 }),
      trainFootprint({ track: 'b', position: -17.75 }),
    ),
    true,
    'The trains collide on a converging approach outside the former shared-track interval.',
  );
  const one = footprint({ x: 0, z: 0, heading: Math.PI / 4 }, 1, 1, 0.2);
  const two = footprint({ x: 0.5, z: -0.5, heading: Math.PI / 4 }, 1, 1, 0.2);
  assert.equal(
    overlaps(one, two),
    false,
    'Overlapping AABBs must not turn separated parallel oriented bodies into a crash.',
  );
});

test('road lanes, gate stops and committed clearance match full car footprints', () => {
  const east = { direction: 1, position: RAILWAY.roadStopPosition };
  const west = { direction: -1, position: RAILWAY.roadStopPosition };
  assert.ok(roadCarPose(east).z < RAILWAY.roadZ && roadCarPose(west).z > RAILWAY.roadZ);
  assert.equal(overlaps(carFootprint(east, 'railway'), ROAD_CROSSING), false);
  assert.equal(overlaps(carFootprint(west, 'railway'), ROAD_CROSSING), false);
  assert.equal(crossingClear([east, west]), true);
  assert.equal(
    crossingClear([{ direction: 1, position: -18.8 }]),
    false,
    'A committed car past the stop must clear before a gate starts lowering.',
  );
  assert.equal(crossingClear([{ direction: 1, position: 0 }]), false);
  assert.equal(crossingClear([{ direction: 1, position: 20 }]), true);
  for (let progress = -110; progress <= 95; progress += 0.5)
    for (const track of ['a', 'b']) {
      const body = trainFootprint({ track, position: progress });
      for (const x of [-RAILWAY.gateX, RAILWAY.gateX])
        assert.equal(
          overlaps(body, {
            x,
            z: RAILWAY.roadZ,
            heading: 0,
            halfWidth: 0.05,
            halfLength: RAILWAY.gateLength / 2,
          }),
          false,
          'Road gate arms never span a train envelope.',
        );
    }
});

test('junction lane pose preserves the stop-line progress and heading', () => {
  assert.deepEqual(junctionCarPose({ axis: 'ns', position: -26 }), {
    x: -0.43,
    z: -2.6,
    heading: 0,
  });
});

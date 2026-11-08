export const JUNCTION = Object.freeze({
  scale: 0.1,
  carLength: 0.84,
  carWidth: 0.5,
  laneOffset: 0.43,
  zebraNear: -1.975,
  zebraWidth: 0.55,
  stopCenter: -2.6,
  stopLine: -2.08,
  stopPosition: -26,
  queueGap: 0.18,
  queueHeadway: 10.2,
  spawnPosition: -65,
  exitPosition: 65,
});

export const RAILWAY = Object.freeze({
  scale: 0.06,
  approachOffset: 2.7,
  convergeStart: -55,
  sharedLength: 35,
  trainFront: 0.55,
  trainRear: 1,
  trainWidth: 0.5,
  stopPosition: -32,
  roadScale: 0.1,
  roadZ: 1.1,
  roadLaneOffset: 0.36,
  roadSpeed: 8,
  gateX: 1.35,
  gateLength: 1.7,
  gateZNear: 0.25,
  gateZFar: 1.95,
  roadStopPosition: -18.9,
  roadEntryPosition: -70,
  roadExitPosition: 70,
  barrierRate: 1.25,
});

// This reservation includes the shared rail and both converging turnout mouths.
export const RAIL_RESERVATION = Object.freeze({
  x: 0,
  z: 1.05,
  heading: 0,
  halfWidth: 1.05,
  halfLength: 2.85,
});
export const ROAD_CROSSING = Object.freeze({
  x: 0,
  z: RAILWAY.roadZ,
  heading: 0,
  halfWidth: RAILWAY.gateX,
  halfLength: 0.8,
});
export const TURNOUT_ZONES = Object.freeze([
  Object.freeze({ x: 0, z: -0.2, heading: 0, halfWidth: 0.38, halfLength: 0.55 }),
  Object.freeze({ x: 0, z: 2.12, heading: 0, halfWidth: 0.38, halfLength: 0.55 }),
]);
const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const EPSILON = 1e-9;

export function junctionCarPose(car) {
  const progress = finite(car.position) * JUNCTION.scale;
  return car.axis === 'ew'
    ? { x: progress, z: JUNCTION.laneOffset, heading: Math.PI / 2 }
    : { x: -JUNCTION.laneOffset, z: progress, heading: 0 };
}

export function railwayPoint(track, position) {
  const p = finite(position),
    t = clamp((p + 55) / 55, 0, 1);
  const bend = 1 - t * t * (3 - 2 * t);
  return {
    x: (track === 'b' ? 2.7 : -2.7) * bend,
    z: (track === 'b' ? 35 - p : p) * RAILWAY.scale,
  };
}

export function railwayPose(train) {
  const p = finite(train.position),
    t = clamp((p + 55) / 55, 0, 1);
  const dx = ((train.track === 'b' ? -1 : 1) * 2.7 * 6 * t * (1 - t)) / 55;
  const dz = train.track === 'b' ? -RAILWAY.scale : RAILWAY.scale;
  return { ...railwayPoint(train.track, p), heading: Math.atan2(dx, dz) };
}

export function railNormal(track, position) {
  const { heading } = railwayPose({ track, position });
  return { x: Math.cos(heading), z: -Math.sin(heading) };
}

export function railwayOffsetPoint(track, position, offset) {
  const point = railwayPoint(track, position),
    normal = railNormal(track, position);
  return { x: point.x + normal.x * offset, z: point.z + normal.z * offset };
}

export function roadCarPose(car) {
  const direction = car.direction === -1 ? -1 : 1;
  return {
    x: direction * finite(car.position) * RAILWAY.roadScale,
    z: RAILWAY.roadZ - direction * RAILWAY.roadLaneOffset,
    heading: (direction * Math.PI) / 2,
  };
}

export function footprint(pose, front, rear, width) {
  const shift = (front - rear) / 2;
  return {
    x: pose.x + Math.sin(pose.heading) * shift,
    z: pose.z + Math.cos(pose.heading) * shift,
    heading: pose.heading,
    halfWidth: width / 2,
    halfLength: (front + rear) / 2,
  };
}

export function trainFootprint(train) {
  return footprint(railwayPose(train), RAILWAY.trainFront, RAILWAY.trainRear, RAILWAY.trainWidth);
}

export function carFootprint(car, kind = 'junction') {
  return footprint(
    kind === 'railway' ? roadCarPose(car) : junctionCarPose(car),
    JUNCTION.carLength / 2,
    JUNCTION.carLength / 2,
    JUNCTION.carWidth,
  );
}

function axes(box) {
  return [
    { x: Math.cos(box.heading), z: -Math.sin(box.heading) },
    { x: Math.sin(box.heading), z: Math.cos(box.heading) },
  ];
}
const dot = (a, b) => a.x * b.x + a.z * b.z;

export function overlaps(a, b) {
  const aa = axes(a),
    ba = axes(b),
    delta = { x: b.x - a.x, z: b.z - a.z };
  for (const axis of [...aa, ...ba]) {
    const ar = Math.abs(dot(axis, aa[0])) * a.halfWidth + Math.abs(dot(axis, aa[1])) * a.halfLength;
    const br = Math.abs(dot(axis, ba[0])) * b.halfWidth + Math.abs(dot(axis, ba[1])) * b.halfLength;
    if (Math.abs(dot(delta, axis)) > ar + br + EPSILON) return false;
  }
  return true;
}

export function footprintCorners(box) {
  const [right, forward] = axes(box);
  return [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ].map(([x, z]) => ({
    x: box.x + right.x * x * box.halfWidth + forward.x * z * box.halfLength,
    z: box.z + right.z * x * box.halfWidth + forward.z * z * box.halfLength,
  }));
}

function contains(box, point) {
  const [right, forward] = axes(box),
    delta = { x: point.x - box.x, z: point.z - box.z };
  return (
    Math.abs(dot(delta, right)) <= box.halfWidth + EPSILON &&
    Math.abs(dot(delta, forward)) <= box.halfLength + EPSILON
  );
}

export function contactPoint(a, b) {
  if (!overlaps(a, b)) return null;
  const ac = footprintCorners(a),
    bc = footprintCorners(b);
  const points = [
    ...ac.filter((point) => contains(b, point)),
    ...bc.filter((point) => contains(a, point)),
  ];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const p = ac[i],
        q = bc[j],
        r = { x: ac[(i + 1) % 4].x - p.x, z: ac[(i + 1) % 4].z - p.z },
        s = { x: bc[(j + 1) % 4].x - q.x, z: bc[(j + 1) % 4].z - q.z };
      const cross = (u, v) => u.x * v.z - u.z * v.x,
        denominator = cross(r, s);
      if (Math.abs(denominator) < EPSILON) continue;
      const difference = { x: q.x - p.x, z: q.z - p.z };
      const t = cross(difference, s) / denominator,
        u = cross(difference, r) / denominator;
      if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON)
        points.push({ x: p.x + t * r.x, z: p.z + t * r.z });
    }
  return points.length
    ? {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
      }
    : { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

export const trainReservesSection = (train) => overlaps(trainFootprint(train), RAIL_RESERVATION);
export const trainInTurnout = (train) =>
  TURNOUT_ZONES.some((zone) => overlaps(trainFootprint(train), zone));
export const trainAtEntryTurnout = (train) =>
  overlaps(trainFootprint(train), TURNOUT_ZONES[train.track === 'b' ? 1 : 0]);
export const crossingClear = (cars) =>
  !cars.some(
    (car) =>
      overlaps(carFootprint(car, 'railway'), ROAD_CROSSING) ||
      (car.position > RAILWAY.roadStopPosition + EPSILON &&
        car.position <= (RAILWAY.gateX + JUNCTION.carLength / 2) / RAILWAY.roadScale + EPSILON),
  );

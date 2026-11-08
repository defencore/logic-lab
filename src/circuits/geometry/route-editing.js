import {
  LEAD,
  MAX_POINTS,
  LIMIT,
  equal,
  finitePoint,
  bounded,
  axisOf,
  crossAxis,
  compact,
} from './points.js';
import { orthogonalVertices } from './routing.js';
export function nearestWireSegment(vertices, target) {
  if (!finitePoint(target)) return null;
  let nearest = null;
  for (let index = 0; index + 1 < vertices.length; index++) {
    const a = vertices[index],
      b = vertices[index + 1];
    if (equal(a, b)) continue;
    const point = {
      x: Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), target.x)),
      y: Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), target.y)),
    };
    const distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (!nearest || distance < nearest.distance) nearest = { index, point, distance };
  }
  return nearest;
}

function terminalDirection(pin, neighbor) {
  return { x: Math.sign(neighbor.x - pin.x), y: Math.sign(neighbor.y - pin.y) };
}

function editPoints(original, updated) {
  if (updated.some((point) => !finitePoint(point))) return null;
  const canonical = orthogonalVertices(
    original[0],
    original.at(-1),
    compact(updated, true).slice(1, -1),
    null,
    {
      start: terminalDirection(original[0], original[1]),
      end: terminalDirection(original.at(-1), original.at(-2)),
    },
  );
  const points = canonical.slice(1, -1);
  if (
    points.length > MAX_POINTS ||
    points.some((point) => Math.abs(point.x) > LIMIT || Math.abs(point.y) > LIMIT)
  )
    return null;
  if (
    canonical.length === original.length &&
    canonical.every((point, index) => equal(point, original[index]))
  )
    return null;
  return points;
}

// A segment moves perpendicular to itself; attached pins and the other sections stay fixed.
export function moveWireSegment(vertices, index, delta) {
  const a = vertices[index],
    b = vertices[index + 1];
  if (!a || !b || !Number.isFinite(delta) || delta === 0) return null;
  const along = axisOf(a, b),
    across = crossAxis(along);
  const first = index === 0,
    last = index === vertices.length - 2;
  const inset = Math.min(LEAD, Math.abs(b[along] - a[along]) / 3);
  const direction = Math.sign(b[along] - a[along]);
  const innerA = { ...a, [along]: a[along] + (first ? inset * direction : 0) };
  const innerB = { ...b, [along]: b[along] - (last ? inset * direction : 0) };
  const coordinate = bounded({
    x: a.x + (across === 'x' ? delta : 0),
    y: a.y + (across === 'y' ? delta : 0),
  })[across];
  const keepStart = first || vertices[index - 1]?.[across] === a[across];
  const keepEnd = last || vertices[index + 2]?.[across] === b[across];
  return editPoints(vertices, [
    ...vertices.slice(0, index),
    ...(keepStart ? [a, innerA] : []),
    { ...innerA, [across]: coordinate },
    { ...innerB, [across]: coordinate },
    ...(keepEnd ? [innerB, b] : []),
    ...vertices.slice(index + 2),
  ]);
}

function detour(a, b, target) {
  const along = axisOf(a, b),
    across = crossAxis(along);
  const direction = Math.sign(b[along] - a[along]);
  const length = Math.abs(b[along] - a[along]);
  if (!length) return [];
  const offset = (target[along] - a[along]) * direction;
  if (target[across] === a[across]) return offset > 0 && offset < length ? [target] : [];
  const margin = Math.min(LEAD, length / 4);
  const center = a[along] + direction * Math.max(margin, Math.min(length - margin, offset));
  const entry = center - (direction * margin) / 2,
    exit = center + (direction * margin) / 2;
  return [
    { [along]: entry, [across]: a[across] },
    { [along]: entry, [across]: target[across] },
    { [along]: center, [across]: target[across] },
    { [along]: exit, [across]: target[across] },
    { [along]: exit, [across]: b[across] },
  ];
}

export function insertWirePoint(vertices, target) {
  if (!finitePoint(target)) return null;
  const nearest = nearestWireSegment(vertices, target);
  if (!nearest) return null;
  const added = detour(vertices[nearest.index], vertices[nearest.index + 1], bounded(target));
  return added.length
    ? editPoints(vertices, [
        ...vertices.slice(0, nearest.index + 1),
        ...added,
        ...vertices.slice(nearest.index + 1),
      ])
    : null;
}

function shiftedNeighbor(vertices, index, step, along, across) {
  const neighbor = vertices[index + step],
    outer = vertices[index + step * 2];
  const cross = crossAxis(along);
  if (neighbor[cross] === across) return { vertices: [], replace: false };
  if (!outer) {
    const offset = vertices[index][along] - neighbor[along];
    const anchor = neighbor[along] + Math.sign(offset) * Math.min(LEAD, Math.abs(offset) / 3);
    return {
      vertices: [
        { ...neighbor, [along]: anchor },
        { [along]: anchor, [cross]: across },
      ],
      replace: false,
    };
  }
  return {
    vertices: [{ ...neighbor, [cross]: across }],
    replace: outer[along] === neighbor[along],
  };
}

export function moveWireVertex(vertices, index, destination) {
  const point = vertices[index];
  if (
    !Number.isInteger(index) ||
    index < 1 ||
    index >= vertices.length - 1 ||
    !finitePoint(destination) ||
    equal(point, destination)
  )
    return null;
  const target = bounded(destination),
    before = vertices[index - 1],
    after = vertices[index + 1];
  const incoming = axisOf(before, point),
    outgoing = axisOf(point, after);
  if (incoming === outgoing)
    return editPoints(vertices, [
      ...vertices.slice(0, index),
      ...detour(before, after, target),
      ...vertices.slice(index + 1),
    ]);
  const leading = shiftedNeighbor(vertices, index, -1, incoming, target[crossAxis(incoming)]);
  const trailing = shiftedNeighbor(vertices, index, 1, outgoing, target[crossAxis(outgoing)]);
  return editPoints(vertices, [
    ...vertices.slice(0, index - Number(leading.replace)),
    ...leading.vertices,
    target,
    ...trailing.vertices.reverse(),
    ...vertices.slice(index + 1 + Number(trailing.replace)),
  ]);
}

export function removeWireVertex(vertices, index) {
  if (!Number.isInteger(index) || index < 1 || index >= vertices.length - 1) return null;
  const point = vertices[index],
    a = vertices[index - 1],
    b = vertices[index + 1];
  const elbow =
    a.x === b.x || a.y === b.y ? [] : [point.x === a.x ? { x: b.x, y: a.y } : { x: a.x, y: b.y }];
  return editPoints(vertices, [
    ...vertices.slice(0, index),
    ...elbow,
    ...vertices.slice(index + 1),
  ]);
}

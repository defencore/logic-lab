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

export function wireSegmentSpan(vertices, index) {
  const a = vertices[index],
    b = vertices[index + 1];
  if (!a || !b || equal(a, b)) return null;
  const along = axisOf(a, b),
    across = crossAxis(along);
  const direction = Math.sign(b[along] - a[along]);
  let start = index,
    end = index + 1;
  while (
    vertices[start - 1]?.[across] === a[across] &&
    Math.sign(vertices[start][along] - vertices[start - 1][along]) === direction
  )
    start--;
  while (
    vertices[end + 1]?.[across] === a[across] &&
    Math.sign(vertices[end + 1][along] - vertices[end][along]) === direction
  )
    end++;
  return { start, end };
}

function terminalDirection(pin, neighbor) {
  return { x: Math.sign(neighbor.x - pin.x), y: Math.sign(neighbor.y - pin.y) };
}

function editPoints(original, updated, straightMarker = null) {
  if (updated.some((point) => !finitePoint(point))) return null;
  const start = original[0],
    end = original.at(-1);
  const directions = {
    start: terminalDirection(start, original[1]),
    end: terminalDirection(end, original.at(-2)),
  };
  const requested = compact(updated, true).slice(1, -1);
  let canonical = orthogonalVertices(start, end, requested, null, directions);
  if (straightMarker && !requested.length && canonical.length > 2)
    canonical = orthogonalVertices(start, end, [straightMarker], null, directions);
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

function neighboringAnchor(vertices, index, step, across) {
  const neighbor = vertices[index + step];
  if (!neighbor || neighbor[across] === vertices[index][across]) return index;
  const arm = wireSegmentSpan(vertices, Math.min(index, index + step));
  return step < 0 ? arm.start : arm.end;
}

export function moveWireSegment(vertices, index, delta) {
  const a = vertices[index],
    b = vertices[index + 1];
  if (!a || !b || !Number.isFinite(delta)) return null;
  return moveWireSegmentTo(vertices, index, a[crossAxis(axisOf(a, b))] + delta);
}

// Move the whole straight span, adjusting only its adjacent arms and pin leads.
export function moveWireSegmentTo(vertices, index, coordinate) {
  const span = wireSegmentSpan(vertices, index);
  if (!span || !Number.isFinite(coordinate)) return null;
  const { start, end } = span;
  const a = vertices[start],
    b = vertices[end];
  const along = axisOf(a, b),
    across = crossAxis(along);
  coordinate = bounded({ ...a, [across]: coordinate })[across];
  if (coordinate === a[across]) return null;
  const inset = Math.min(LEAD, Math.abs(b[along] - a[along]) / 3);
  const direction = Math.sign(b[along] - a[along]);
  const leading = vertices.slice(0, neighboringAnchor(vertices, start, -1, across) + 1);
  const trailing = vertices.slice(neighboringAnchor(vertices, end, 1, across));
  const innerA = { ...a };
  const innerB = { ...b };
  if (start === 0) {
    innerA[along] += inset * direction;
    leading.push(innerA);
  }
  if (end === vertices.length - 1) {
    innerB[along] -= inset * direction;
    trailing.unshift(innerB);
  }
  const movedA = { ...innerA, [across]: coordinate };
  const movedB = { ...innerB, [across]: coordinate };
  if (equal(movedA, movedB)) return null;
  const joinsStart = equal(leading.at(-1), movedA);
  const joinsEnd = equal(trailing[0], movedB);
  const updated = [
    ...leading,
    ...(joinsStart ? [] : [movedA]),
    ...(joinsEnd ? [] : [movedB]),
    ...trailing,
  ];
  const merged = wireSegmentSpan(updated, leading.length - Number(joinsStart));
  updated.splice(merged.start + 1, merged.end - merged.start - 1);
  // A short straight connection may need one marker to suppress an automatic detour.
  return editPoints(vertices, updated, movedA);
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

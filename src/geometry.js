import { getDefinition } from './catalog.js';
export const GRID = 20;
export const snap = (value) => Math.round(value / GRID) * GRID;

export function pinOffset(pins, index) {
  let groups = 0;
  for (let i = 1; i <= index; i++)
    if (pins[i]?.group !== pins[i - 1]?.group && (pins[i]?.group || pins[i - 1]?.group)) groups++;
  return 58 + index * 25 + groups * 12;
}

export function dimensions(node) {
  const d = getDefinition(node.type);
  if (node.type === 'group')
    return {
      w: Math.max(100, Math.min(3000, Number(node.params.width) || 420)),
      h: Math.max(100, Math.min(3000, Number(node.params.height) || 260)),
    };
  if (node.type === 'note') return { w: 240, h: 130 };
  return {
    w:
      ['scope', 'servo', 'matrix', 'am', 'fm', 'stepper'].includes(node.type) ||
      [...d.inputs, ...d.outputs].some((pin) => pin.group)
        ? 228
        : node.type === 'sevenseg'
          ? 164
          : 160,
    h: Math.max(
      100,
      ...[d.inputs, d.outputs].map((pins) => pinOffset(pins, pins.length - 1) + 21),
      ['scope', 'servo', 'matrix', 'sevenseg', 'am', 'fm', 'stepper'].includes(node.type) ? 190 : 0,
    ),
  };
}
export function portPoint(node, port, side) {
  const d = getDefinition(node.type),
    pins = side === 'out' ? d.outputs : d.inputs;
  const i = pins.findIndex((p) => p.id === port),
    { w } = dimensions(node);
  return { x: node.x + (side === 'out' ? w : 0), y: node.y + pinOffset(pins, i) };
}
const LEAD = 24;
const MAX_POINTS = 100;
const LIMIT = 1_000_000;
const equal = (a, b) => a.x === b.x && a.y === b.y;
const finitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const bounded = (point) => ({
  x: Math.max(-LIMIT, Math.min(LIMIT, point.x)),
  y: Math.max(-LIMIT, Math.min(LIMIT, point.y)),
});
const axisOf = (a, b) => (a.x === b.x ? 'y' : 'x');
const crossAxis = (axis) => (axis === 'x' ? 'y' : 'x');

// Manual markers remain editable; automatic routes also discard redundant straight vertices.
function compact(vertices, keepInline = false) {
  const result = [];
  for (const point of vertices) {
    if (result.length && equal(result.at(-1), point)) continue;
    while (result.length > 1) {
      const before = result.at(-2),
        current = result.at(-1);
      const axis =
        before.x === current.x && current.x === point.x
          ? 'y'
          : before.y === current.y && current.y === point.y
            ? 'x'
            : null;
      if (!axis || keepInline) break;
      result.pop();
    }
    result.push({ x: point.x, y: point.y });
  }
  return result;
}

function connect(vertices, point, horizontalFirst = true) {
  const previous = vertices.at(-1);
  if (previous.x !== point.x && previous.y !== point.y)
    vertices.push(horizontalFirst ? { x: point.x, y: previous.y } : { x: previous.x, y: point.y });
  if (!equal(previous, point)) vertices.push({ ...point });
}

function orthogonalVertices(a, b, points = [], lane = null) {
  if (!points.length) {
    if (equal(a, b)) return [{ ...a }];
    const offset = lane ? (lane.bit - (lane.groupWidth - 1) / 2) * 8 : 0;
    if (b.x >= a.x + LEAD * 2) {
      const middle = Math.max(a.x + LEAD, Math.min(b.x - LEAD, snap((a.x + b.x) / 2) + offset));
      return compact([a, { x: middle, y: a.y }, { x: middle, y: b.y }, b]);
    }
    const lead = LEAD + (lane?.bit || 0) * 8;
    const top = Math.min(a.y, b.y) - 40 - (lane?.bit || 0) * 8;
    return compact([
      a,
      { x: a.x + lead, y: a.y },
      { x: a.x + lead, y: top },
      { x: b.x - lead, y: top },
      { x: b.x - lead, y: b.y },
      b,
    ]);
  }
  const vertices = [{ ...a }];
  const first = points[0],
    last = points.at(-1);
  if (first.y !== a.y || first.x < a.x) {
    const lead = { x: a.x + LEAD, y: a.y };
    vertices.push(lead);
    if (first.y === a.y && first.x < a.x) {
      const lane = Math.min(a.y, b.y) - 40;
      connect(vertices, { x: lead.x, y: lane });
      connect(vertices, { x: first.x, y: lane });
    }
    connect(vertices, first, false);
  } else connect(vertices, first);
  for (const point of points.slice(1)) connect(vertices, point);
  if (last.y !== b.y || last.x > b.x) {
    if (last.y === b.y && last.x > b.x) {
      const lane = Math.min(a.y, b.y) - 40;
      connect(vertices, { x: last.x, y: lane });
      connect(vertices, { x: b.x - LEAD, y: lane });
    }
    connect(vertices, { x: b.x - LEAD, y: b.y });
  }
  connect(vertices, b);
  return compact(vertices, true);
}

function wireEndpoints(wire, project) {
  const a = project.nodes.find((node) => node.id === wire.from.node);
  const b = project.nodes.find((node) => node.id === wire.to.node);
  return a && b ? [portPoint(a, wire.from.port, 'out'), portPoint(b, wire.to.port, 'in')] : null;
}

function wireLane(wire, project) {
  for (const [endpoint, side] of [
    [wire.from, 'outputs'],
    [wire.to, 'inputs'],
  ]) {
    const node = project.nodes.find((candidate) => candidate.id === endpoint.node);
    const pin = getDefinition(node?.type)?.[side].find((port) => port.id === endpoint.port);
    if (pin?.group) return pin;
  }
  return null;
}

export function wireVertices(wire, project) {
  const ends = wireEndpoints(wire, project);
  return ends ? orthogonalVertices(...ends, wire.points || [], wireLane(wire, project)) : [];
}

export function wirePath(wire, project) {
  const ends = wireEndpoints(wire, project);
  return ends ? route(...ends, wire.points, project.wireStyle, wireLane(wire, project)) : '';
}

export function route(a, b, points = [], style = 'orthogonal', lane = null) {
  if (style === 'bezier' && !points.length) {
    const dx = Math.max(55, Math.abs(b.x - a.x) * 0.5);
    return `M${a.x},${a.y}C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  }
  return orthogonalVertices(a, b, points, lane)
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
    .join(' ');
}

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

function editPoints(original, updated) {
  if (updated.some((point) => !finitePoint(point))) return null;
  const canonical = orthogonalVertices(
    original[0],
    original.at(-1),
    compact(updated, true).slice(1, -1),
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

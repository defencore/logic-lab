import { wireSegmentSpan, wireVertices } from '../../circuits/geometry/index.js';

const SNAP_RADIUS = 8;
const SNAP_GAP = 24;

function span(a, b, axis) {
  return { min: Math.min(a[axis], b[axis]), max: Math.max(a[axis], b[axis]) };
}

export function segmentAlignment(project, wire, vertices, segment) {
  const a = vertices[segment.start];
  const b = vertices[segment.end];
  const axis = a.y === b.y ? 'x' : 'y';
  const cross = axis === 'x' ? 'y' : 'x';
  const extent = span(a, b, axis);
  const targets = [];
  for (const other of project.wires) {
    const same = other.id === wire.id;
    if (!same && project.wireStyle === 'bezier' && !other.points?.length) continue;
    const route = same ? vertices : wireVertices(other, project);
    for (let i = 0; i + 1 < route.length; i++) {
      const candidate = wireSegmentSpan(route, i);
      if (!candidate) continue;
      i = candidate.end - 1;
      const start = route[candidate.start];
      const end = route[candidate.end];
      if ((same && candidate.start === segment.start) || start[cross] !== end[cross]) continue;
      const target = span(start, end, axis);
      const gap = Math.max(0, extent.min - target.max, target.min - extent.max);
      targets.push({ ...target, coordinate: start[cross], gap });
    }
  }
  return { axis, cross, extent, targets };
}

export function nearestAlignment({ axis, cross, extent, targets }, coordinate, zoom) {
  let best;
  let distance = SNAP_RADIUS / zoom;
  for (const target of targets) {
    const offset = Math.abs(coordinate - target.coordinate);
    if (target.gap * zoom > SNAP_GAP || offset > distance) continue;
    if (best && offset === distance && target.gap >= best.gap) continue;
    best = target;
    distance = offset;
  }
  if (!best) return null;
  const pad = 12 / zoom;
  return {
    coordinate: best.coordinate,
    from: { [axis]: Math.min(extent.min, best.min) - pad, [cross]: best.coordinate },
    to: { [axis]: Math.max(extent.max, best.max) + pad, [cross]: best.coordinate },
  };
}

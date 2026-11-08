import { getDefinition } from '../../components/catalog/index.js';
import { snap, portPoint, portDirection } from './placement.js';
import {
  LEAD,
  compact,
  connect,
  equal,
  crossAxis,
  DEFAULT_DIRECTIONS,
  offsetPoint,
} from './points.js';
function terminalPath(origin, target, direction, a, b) {
  const vertices = [{ ...origin }];
  const along = direction.x ? 'x' : 'y';
  const across = crossAxis(along);
  const sign = direction[along];
  const forward = (target[along] - origin[along]) * sign;
  if (target[across] === origin[across] && forward > 0) {
    vertices.push({ ...target });
    return vertices;
  }
  const lead = offsetPoint(origin, direction, LEAD);
  vertices.push(lead);
  if (target[across] === origin[across] && forward <= 0) {
    const detour = Math.min(a[across], b[across]) - 40;
    connect(vertices, { ...lead, [across]: detour });
    connect(vertices, { ...target, [across]: detour });
  }
  connect(vertices, target, along === 'y');
  return vertices;
}

export function orthogonalVertices(
  a,
  b,
  points = [],
  lane = null,
  directions = DEFAULT_DIRECTIONS,
) {
  const { start, end } = directions;
  if (!points.length) {
    if (equal(a, b)) return [{ ...a }];
    const offset = lane ? (lane.bit - (lane.groupWidth - 1) / 2) * 8 : 0;
    // Opposing horizontal contacts share a routing corridor; perpendicular
    // contacts reserve an outward lead at each end before joining that corridor.
    if (start.x === 1 && end.x === -1) {
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
    const lead = LEAD + (lane?.bit || 0) * 8;
    const exit = offsetPoint(a, start, lead);
    const entry = offsetPoint(b, end, lead);
    const vertices = [a, exit];
    const firstAxis = start.x ? 'x' : 'y';
    const endAxis = end.x ? 'x' : 'y';
    if (firstAxis !== endAxis) {
      const across = crossAxis(firstAxis);
      if (exit[across] === entry[across] || exit[firstAxis] === entry[firstAxis]) {
        const corridor = Math.min(exit[across], entry[across]) - 40 - (lane?.bit || 0) * 8;
        connect(vertices, { ...exit, [across]: corridor });
        connect(vertices, { ...entry, [across]: corridor });
      }
      connect(vertices, entry, firstAxis === 'y');
    } else {
      const across = crossAxis(firstAxis);
      const corridor = Math.min(exit[across], entry[across]) - 40 - (lane?.bit || 0) * 8;
      connect(vertices, { ...exit, [across]: corridor });
      connect(vertices, { ...entry, [across]: corridor });
      connect(vertices, entry);
    }
    connect(vertices, b);
    return compact(vertices);
  }
  const vertices = terminalPath(a, points[0], start, a, b);
  for (const point of points.slice(1)) connect(vertices, point);
  const trailing = terminalPath(b, points.at(-1), end, a, b).reverse();
  for (const point of trailing.slice(1)) connect(vertices, point);
  return compact(vertices, true);
}

function wireEndpoints(wire, project) {
  const a = project.nodes.find((node) => node.id === wire.from.node);
  const b = project.nodes.find((node) => node.id === wire.to.node);
  return a && b
    ? {
        points: [portPoint(a, wire.from.port, 'out'), portPoint(b, wire.to.port, 'in')],
        directions: {
          start: portDirection(a, wire.from.port, 'out'),
          end: portDirection(b, wire.to.port, 'in'),
        },
      }
    : null;
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
  return ends
    ? orthogonalVertices(
        ...ends.points,
        wire.points || [],
        wireLane(wire, project),
        ends.directions,
      )
    : [];
}

export function wirePath(wire, project) {
  const ends = wireEndpoints(wire, project);
  return ends
    ? route(
        ...ends.points,
        wire.points,
        project.wireStyle,
        wireLane(wire, project),
        ends.directions,
      )
    : '';
}

export function route(
  a,
  b,
  points = [],
  style = 'orthogonal',
  lane = null,
  directions = DEFAULT_DIRECTIONS,
) {
  if (style === 'bezier' && !points.length) {
    const distance = Math.max(55, Math.abs(b.x - a.x) * 0.5);
    const first = offsetPoint(a, directions.start, distance);
    const last = offsetPoint(b, directions.end, distance);
    return `M${a.x},${a.y}C${first.x},${first.y} ${last.x},${last.y} ${b.x},${b.y}`;
  }
  return orthogonalVertices(a, b, points, lane, directions)
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
    .join(' ');
}

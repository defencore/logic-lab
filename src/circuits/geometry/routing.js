import { getDefinition } from '../../components/catalog/index.js';
import { dimensions, snap, portPoint, portDirection } from './placement.js';
import { optimizeWireLayout } from './wire-layout.js';
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

function wireEndpoints(wire, project, nodes) {
  const nodeFor = (id) => (nodes ? nodes.get(id) : project.nodes.find((node) => node.id === id));
  const a = nodeFor(wire.from.node);
  const b = nodeFor(wire.to.node);
  return a && b
    ? {
        nodes: [a, b],
        points: [portPoint(a, wire.from.port, 'out'), portPoint(b, wire.to.port, 'in')],
        directions: {
          start: portDirection(a, wire.from.port, 'out'),
          end: portDirection(b, wire.to.port, 'in'),
        },
      }
    : null;
}

function groupedPin(node, endpoint, side) {
  const pin = getDefinition(node.type)?.[side].find((port) => port.id === endpoint.port);
  return pin?.group ? pin : null;
}

const layouts = new WeakMap();

export function usesAutomaticRouting(project) {
  return project.autoRouting !== false && project.wireStyle !== 'bezier';
}

export function refreshWireRoutes(project) {
  if (!usesAutomaticRouting(project) || !project.wires.some((wire) => !wire.points?.length)) {
    layouts.delete(project);
    return;
  }
  const geometry = JSON.stringify([
    project.nodes.map(({ id, type, x, y }) => [id, type, x, y]),
    project.wires.map(({ id, from, to, points }) => [
      id,
      from.node,
      from.port,
      to.node,
      to.port,
      points,
    ]),
  ]);
  const previous = layouts.get(project);
  if (
    previous?.geometry === geometry &&
    previous.wires.every((wire, index) => wire === project.wires[index])
  )
    return;
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  const bodies = project.nodes
    .filter((node) => node.type !== 'group')
    .map((node) => {
      const { w, h } = dimensions(node);
      return { node: node.id, left: node.x, top: node.y, right: node.x + w, bottom: node.y + h };
    });
  const entries = [];
  for (const wire of project.wires) {
    const ends = wireEndpoints(wire, project, nodes);
    if (!ends) continue;
    const from = groupedPin(ends.nodes[0], wire.from, 'outputs');
    const to = groupedPin(ends.nodes[1], wire.to, 'inputs');
    const bundle =
      from && to && JSON.stringify([wire.from.node, from.group, wire.to.node, to.group]);
    const vertices = orthogonalVertices(...ends.points, wire.points, from || to, ends.directions);
    entries.push({ wire, vertices, bundle, directions: ends.directions });
  }
  layouts.set(project, {
    geometry,
    wires: [...project.wires],
    routes: optimizeWireLayout(entries, bodies),
  });
}

function baseVertices(wire, ends) {
  const lane =
    groupedPin(ends.nodes[0], wire.from, 'outputs') || groupedPin(ends.nodes[1], wire.to, 'inputs');
  return orthogonalVertices(...ends.points, wire.points, lane, ends.directions);
}

function resolvedVertices(wire, project, ends) {
  if (!wire.points?.length && usesAutomaticRouting(project)) {
    const planned = layouts.get(project)?.routes.get(wire);
    // While a component is being dragged, the plan still describes its original position.
    if (planned && equal(planned[0], ends.points[0]) && equal(planned.at(-1), ends.points[1]))
      return planned;
  }
  return baseVertices(wire, ends);
}

export function wireVertices(wire, project) {
  const ends = wireEndpoints(wire, project);
  return ends ? resolvedVertices(wire, project, ends) : [];
}

export function wirePath(wire, project) {
  const ends = wireEndpoints(wire, project);
  if (!ends) return '';
  if (project.wireStyle === 'bezier' && !wire.points?.length)
    return route(...ends.points, [], 'bezier', null, ends.directions);
  return pathFromVertices(resolvedVertices(wire, project, ends));
}

function pathFromVertices(vertices) {
  return vertices.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
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
  return pathFromVertices(orthogonalVertices(a, b, points, lane, directions));
}

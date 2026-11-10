import { chooseWireRoute, wireRouteScore } from './auto-routing.js';
import { busRouteCandidates } from './bus-routing.js';
import { createRoutingIndex } from './routing-index.js';

const CLEARANCE = 12;
const NEIGHBORHOOD = 512;
const SEARCH_BUDGET = 24_000;
const MIN_SEARCH_COST = 40;

function expand(bounds, padding) {
  return {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
  };
}

function boundsOf(vertices) {
  const xs = vertices.map((point) => point.x);
  const ys = vertices.map((point) => point.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

function segmentsOf(wire, vertices) {
  return vertices.slice(1).map((b, index) => ({ wire, a: vertices[index], b }));
}

function compareCosts(a, b) {
  const firstDifference = a.findIndex((cost, index) => cost !== b[index]);
  return firstDifference === -1 ? 0 : a[firstDifference] - b[firstDifference];
}

function bundleCost(entries, routes, bodies, occupied) {
  const segments = routes.flatMap((route, index) => segmentsOf(entries[index].wire, route));
  const score = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < routes.length; i++) {
    const neighbors = segments.filter((segment) => segment.wire !== entries[i].wire);
    const costs = wireRouteScore(routes[i], bodies, [...occupied, ...neighbors]);
    costs.forEach((cost, index) => (score[index] += cost));
  }
  return score;
}

function separateLeads(bundle, routes) {
  const startAxis = bundle[0].directions.start.x ? 'x' : 'y';
  const endAxis = bundle[0].directions.end.x ? 'x' : 'y';
  return (
    routes.every((route) => route.length > 2) &&
    new Set(routes.map((route) => route[1][startAxis])).size === routes.length &&
    new Set(routes.map((route) => route.at(-2)[endAxis])).size === routes.length
  );
}

export function optimizeWireLayout(entries, bodies) {
  const obstacles = createRoutingIndex();
  for (const body of bodies) {
    const padded = expand(body, CLEARANCE);
    obstacles.add({ body, padded }, padded);
  }

  const occupied = createRoutingIndex();
  function indexRoute(wire, vertices) {
    const segments = segmentsOf(wire, vertices);
    for (const segment of segments) occupied.add(segment, boundsOf([segment.a, segment.b]));
    return segments;
  }

  const degree = new Map();
  const indexed = new Map();
  for (const { wire, vertices } of entries) {
    for (const { node } of [wire.from, wire.to]) degree.set(node, (degree.get(node) ?? 0) + 1);
    indexed.set(wire, indexRoute(wire, vertices));
  }
  const connections = ({ wire }) => Math.max(degree.get(wire.from.node), degree.get(wire.to.node));
  const automatic = entries
    .filter(({ wire, vertices }) => !wire.points?.length && vertices.length > 1)
    .sort((a, b) => connections(b) - connections(a));

  const improved = new Map();
  let budget = SEARCH_BUDGET;
  function reserveSearch(amount) {
    const cost = Math.max(MIN_SEARCH_COST, amount);
    if (cost > budget) return false;
    budget -= cost;
    return true;
  }
  function update(wire, route) {
    improved.set(wire, route);
    for (const segment of indexed.get(wire)) occupied.remove(segment);
    indexed.set(wire, indexRoute(wire, route));
  }

  function bodiesFor(area, wire) {
    return obstacles
      .query(area)
      .map(({ body, padded }) =>
        body.node === wire.from.node || body.node === wire.to.node ? body : padded,
      );
  }

  const bundles = new Map();
  for (const entry of automatic) {
    if (!entry.bundle) continue;
    if (!bundles.has(entry.bundle)) bundles.set(entry.bundle, []);
    bundles.get(entry.bundle).push(entry);
  }
  const bodiesByNode = new Map(bodies.map((body) => [body.node, body]));
  const bundled = new Set();
  for (const bundle of bundles.values()) {
    if (budget < MIN_SEARCH_COST) break;
    const candidates = busRouteCandidates(bundle, bodiesByNode);
    if (!candidates.length) continue;
    const baseline = bundle.map(({ vertices }) => vertices);
    const area = boundsOf([baseline, ...candidates].flat(2));
    const nearbyBodies = bodiesFor(area, bundle[0].wire);
    const members = new Set(bundle.map(({ wire }) => wire));
    const other = occupied.query(area).filter((segment) => !members.has(segment.wire));
    if (!reserveSearch(bundle.length * (nearbyBodies.length + other.length))) continue;
    let bestCost = bundleCost(bundle, baseline, nearbyBodies, other);
    let best = !bestCost[0] && separateLeads(bundle, baseline) ? baseline : null;
    for (const candidate of candidates) {
      const cost = bundleCost(bundle, candidate, nearbyBodies, other);
      const order = compareCosts(cost, bestCost);
      if (cost[0] || order > 0 || (order === 0 && best)) continue;
      best = candidate;
      bestCost = cost;
    }
    if (!best) continue;
    for (let i = 0; i < bundle.length; i++) {
      const { wire } = bundle[i];
      update(wire, best[i]);
      bundled.add(wire);
    }
  }

  function improve({ wire, directions }, vertices) {
    if (bundled.has(wire)) return;
    const area = expand(boundsOf(vertices), NEIGHBORHOOD);
    const nearbyBodies = bodiesFor(area, wire);
    const nearbySegments = occupied.query(area).filter((segment) => segment.wire !== wire);
    const route = chooseWireRoute(vertices, directions, nearbyBodies, nearbySegments, () =>
      reserveSearch(nearbyBodies.length + nearbySegments.length),
    );
    if (route !== vertices) update(wire, route);
  }
  for (const entry of automatic) {
    if (budget < MIN_SEARCH_COST) break;
    improve(entry, entry.vertices);
  }
  // Later routes may open a less crowded corridor for earlier detours.
  for (const entry of automatic) {
    if (budget < MIN_SEARCH_COST) break;
    const route = improved.get(entry.wire);
    if (route) improve(entry, route);
  }
  return improved;
}

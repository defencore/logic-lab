import { LEAD, LIMIT, compact, equal, offsetPoint } from './points.js';

const CLEARANCE = 8;
const MAX_AXES = 11;
const LOCAL_MARGIN = 256;

function box(a, b) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

function touches(a, b) {
  return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
}

function intersectionLength(min, max, low, high) {
  return Math.max(0, Math.min(max, high) - Math.max(min, low));
}

function outward(pin, next, direction) {
  return direction.x
    ? pin.y === next.y && (next.x - pin.x) * direction.x > 0
    : pin.x === next.x && (next.y - pin.y) * direction.y > 0;
}

function compare(a, b, count = a.length) {
  for (let i = 0; i < count; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function isEnd(bounds, x, y) {
  return (x === bounds.left && y === bounds.top) || (x === bounds.right && y === bounds.bottom);
}

function segmentScore(bounds, obstacles, occupied, start, end) {
  const horizontal = bounds.top === bounds.bottom;
  const fixed = horizontal ? bounds.top : bounds.left;
  const min = horizontal ? bounds.left : bounds.top;
  const max = horizontal ? bounds.right : bounds.bottom;
  let bodies = 0;
  let blocked = 0;
  let intersections = 0;
  let overlap = 0;

  for (const obstacle of obstacles) {
    const low = horizontal ? obstacle.top : obstacle.left;
    const high = horizontal ? obstacle.bottom : obstacle.right;
    if (fixed <= low || fixed >= high) continue;
    const covered = intersectionLength(
      min,
      max,
      horizontal ? obstacle.left : obstacle.top,
      horizontal ? obstacle.right : obstacle.bottom,
    );
    if (!covered) continue;
    bodies++;
    blocked += covered;
  }
  for (const other of occupied) {
    if (!touches(bounds, other)) continue;
    if (horizontal === (other.top === other.bottom)) {
      const shared = intersectionLength(
        min,
        max,
        horizontal ? other.left : other.top,
        horizontal ? other.right : other.bottom,
      );
      const commonPin = [start, end].some(
        (pin) => isEnd(bounds, pin.x, pin.y) && isEnd(other, pin.x, pin.y),
      );
      const avoidable = commonPin ? Math.max(0, shared - LEAD) : shared;
      if (avoidable) {
        intersections++;
        overlap += avoidable;
      }
    } else {
      const x = horizontal ? other.left : bounds.left;
      const y = horizontal ? bounds.top : other.top;
      if (isEnd(other, x, y) && ((x === start.x && y === start.y) || (x === end.x && y === end.y)))
        continue;
      intersections++;
    }
  }
  return [bodies, blocked, intersections, overlap, max - min];
}

function routeScore(vertices, scoreSegment) {
  const result = [0, 0, 0, 0, vertices.length - 2, 0];
  for (let i = 1; i < vertices.length; i++) {
    const cost = scoreSegment(box(vertices[i - 1], vertices[i]));
    for (let j = 0; j < 4; j++) result[j] += cost[j];
    result[5] += cost[4];
  }
  return result;
}

export function wireRouteScore(vertices, obstacles, occupied) {
  const bounds = occupied.map(({ a, b }) => box(a, b));
  return routeScore(vertices, (segment) =>
    segmentScore(segment, obstacles, bounds, vertices[0], vertices.at(-1)),
  );
}

function axisChoices(axis, exit, entry, baseline, bodies, occupied, region) {
  const low = axis === 'x' ? 'left' : 'top';
  const high = axis === 'x' ? 'right' : 'bottom';
  const midpoint = (exit[axis] + entry[axis]) / 2;
  const choices = new Set();
  const add = (coordinate) => {
    if (Math.abs(coordinate) <= LIMIT && coordinate >= region[low] && coordinate <= region[high])
      choices.add(coordinate);
  };
  add(exit[axis]);
  add(entry[axis]);
  add(midpoint);
  for (const vertex of baseline.slice(1, -1)) {
    if (choices.size >= 5) break;
    add(vertex[axis]);
  }
  // Include both sides of nearby bodies before sampling extra wire lanes.
  for (const body of bodies.slice(0, 3)) {
    add(body[low]);
    add(body[high]);
    if (choices.size >= MAX_AXES - 2) break;
  }
  for (const other of occupied.slice(0, 4)) {
    if (choices.size >= MAX_AXES - 1) break;
    add(other[low] - CLEARANCE);
    add(other[high] + CLEARANCE);
  }
  add(midpoint - CLEARANCE);
  add(midpoint + CLEARANCE);
  return [...choices].slice(0, MAX_AXES);
}

function availableLead(pin, direction, obstacles) {
  const horizontal = direction.x !== 0;
  const sign = horizontal ? direction.x : direction.y;
  const fixed = horizontal ? pin.y : pin.x;
  const along = horizontal ? pin.x : pin.y;
  const nearSide = horizontal ? 'left' : 'top';
  const farSide = horizontal ? 'right' : 'bottom';
  let length = LEAD;
  for (const obstacle of obstacles) {
    const low = horizontal ? obstacle.top : obstacle.left;
    const high = horizontal ? obstacle.bottom : obstacle.right;
    if (fixed <= low || fixed >= high) continue;
    const distance = (obstacle[sign > 0 ? nearSide : farSide] - along) * sign;
    if (distance > 0) length = Math.min(length, distance);
  }
  return length;
}

function usable(vertices, directions) {
  if (vertices.length < 2) return false;
  if (
    !outward(vertices[0], vertices[1], directions.start) ||
    !outward(vertices.at(-1), vertices.at(-2), directions.end)
  )
    return false;
  for (let i = 1; i < vertices.length - 1; i++) {
    const a = vertices[i - 1];
    const b = vertices[i];
    const c = vertices[i + 1];
    if (Math.abs(b.x) > LIMIT || Math.abs(b.y) > LIMIT) return false;
    // Compact paths have no consecutive same-axis segments unless they reverse.
    if ((a.x === b.x) === (b.x === c.x)) return false;
  }
  const spans = vertices.slice(1).map((point, index) => box(vertices[index], point));
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 2; j < spans.length; j++) {
      if (touches(spans[i], spans[j])) return false;
    }
  }
  return true;
}

/** Select a low-conflict orthogonal route from a bounded set of corridors. */
export function chooseWireRoute(baseline, directions, obstacles, occupied, canSearch = () => true) {
  if (baseline.length < 2) return baseline;
  const start = baseline[0];
  const end = baseline.at(-1);
  if (equal(start, end)) return baseline;

  const segmentCosts = new Map();
  let scoreObstacles = obstacles;
  let scoreOccupied = occupied.map(({ a, b }) => box(a, b));
  function score(vertices) {
    return routeScore(vertices, (bounds) => {
      const key = `${bounds.left},${bounds.top},${bounds.right},${bounds.bottom}`;
      let cost = segmentCosts.get(key);
      if (!cost) {
        cost = segmentScore(bounds, scoreObstacles, scoreOccupied, start, end);
        segmentCosts.set(key, cost);
      }
      return cost;
    });
  }

  const cost = score(baseline);
  if ((!cost[0] && !cost[2]) || !canSearch()) return baseline;
  const region = {
    left: Math.min(...baseline.map((point) => point.x)) - LOCAL_MARGIN,
    top: Math.min(...baseline.map((point) => point.y)) - LOCAL_MARGIN,
    right: Math.max(...baseline.map((point) => point.x)) + LOCAL_MARGIN,
    bottom: Math.max(...baseline.map((point) => point.y)) + LOCAL_MARGIN,
  };
  const baselineSpans = baseline.slice(1).map((point, index) => box(baseline[index], point));
  const nearby = obstacles.filter((obstacle) => touches(region, obstacle));
  const relevant = nearby.filter((obstacle) =>
    baselineSpans.some((span) => touches(span, obstacle)),
  );
  const bodies = [...new Set([...relevant, ...nearby])];
  const lanes = scoreOccupied.filter((other) => baselineSpans.some((span) => touches(span, other)));
  const exit = offsetPoint(start, directions.start, availableLead(start, directions.start, nearby));
  const entry = offsetPoint(end, directions.end, availableLead(end, directions.end, nearby));
  const xChoices = axisChoices('x', exit, entry, baseline, bodies, lanes, region);
  const yChoices = axisChoices('y', exit, entry, baseline, bodies, lanes, region);
  const envelope = box(
    {
      x: Math.min(start.x, end.x, exit.x, entry.x, ...xChoices),
      y: Math.min(start.y, end.y, exit.y, entry.y, ...yChoices),
    },
    {
      x: Math.max(start.x, end.x, exit.x, entry.x, ...xChoices),
      y: Math.max(start.y, end.y, exit.y, entry.y, ...yChoices),
    },
  );
  scoreObstacles = obstacles.filter((obstacle) => touches(envelope, obstacle));
  scoreOccupied = scoreOccupied.filter((other) => touches(envelope, other));
  let best = baseline;
  let bestCost = cost;

  function consider(corners) {
    const vertices = compact([start, exit, ...corners, entry, end]);
    if (!usable(vertices, directions)) return;
    const candidate = score(vertices);
    if (compare(candidate, cost, 4) < 0 && compare(candidate, bestCost) < 0) {
      best = vertices;
      bestCost = candidate;
    }
  }

  for (const x of xChoices)
    consider([
      { x, y: exit.y },
      { x, y: entry.y },
    ]);
  for (const y of yChoices)
    consider([
      { x: exit.x, y },
      { x: entry.x, y },
    ]);
  for (const x of xChoices) {
    for (const y of yChoices) {
      consider([
        { x, y: exit.y },
        { x, y },
        { x: entry.x, y },
      ]);
      consider([
        { x: exit.x, y },
        { x, y },
        { x, y: entry.y },
      ]);
    }
  }
  return best;
}

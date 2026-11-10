import { LEAD, LIMIT, MAX_POINTS, compact, crossAxis, equal, finitePoint } from './points.js';
import { wireSegmentSpan } from './route-editing.js';
import { orthogonalVertices } from './routing.js';

const shifted = (point, delta) => ({ x: point.x + delta.x, y: point.y + delta.y });

function between(point, a, b, axis) {
  return point[axis] > Math.min(a[axis], b[axis]) && point[axis] < Math.max(a[axis], b[axis]);
}

function shiftTerminal(vertices, pin, direction) {
  if (equal(vertices[0], pin)) return vertices;
  const along = direction.x ? 'x' : 'y';
  const across = crossAxis(along);
  const lead = wireSegmentSpan(vertices, 0);
  if (!lead || lead.end >= vertices.length - 1) return vertices;
  const corner = vertices[lead.end];
  if (vertices[lead.end + 1][along] !== corner[along]) return vertices;
  const arm = wireSegmentSpan(vertices, lead.end);
  const anchor = vertices[arm.end];
  const sign = direction[along];
  const leadLength = Math.min(LEAD, Math.abs(corner[along] - vertices[0][along]));
  const outward = (corner[along] - pin[along]) * sign > 0;
  const elbow = { ...pin, [along]: outward ? corner[along] : pin[along] + leadLength * sign };
  const armEnd = { ...anchor, [along]: elbow[along] };
  if (
    arm.end === vertices.length - 1 &&
    (!equal(armEnd, anchor) ||
      Math.sign(elbow[across] - anchor[across]) !== Math.sign(corner[across] - anchor[across]))
  )
    return vertices;

  const leadPoints = vertices
    .slice(1, lead.end)
    .filter((point) => between(point, pin, elbow, along))
    .map((point) => ({ ...point, [across]: pin[across] }));
  const armPoints = vertices
    .slice(lead.end + 1, arm.end)
    .filter((point) => between(point, elbow, armEnd, across))
    .map((point) => ({ ...point, [along]: elbow[along] }));
  const rest = vertices.slice(arm.end + 1);
  // A collapsed arm may leave the lead and the next leg on the same straight line.
  if (
    equal(elbow, armEnd) &&
    rest[0]?.[across] === elbow[across] &&
    (rest[0][along] - elbow[along]) * sign > 0
  )
    return [pin, ...leadPoints, ...rest];
  return compact([pin, ...leadPoints, elbow, ...armPoints, armEnd, ...rest], true);
}

function validPoints(points) {
  return (
    points.length <= MAX_POINTS &&
    points.every((point) => Math.abs(point.x) <= LIMIT && Math.abs(point.y) <= LIMIT)
  );
}

function moveStraightRoute(start, end, points, directions) {
  const along = directions.start.x ? 'x' : 'y';
  const across = crossAxis(along);
  if (start[across] === end[across] && (end[along] - start[along]) * directions.start[along] > 0) {
    const markers = points
      .filter((point) => between(point, start, end, along))
      .map((point) => ({ ...point, [across]: start[across] }));
    if (markers.length) return markers;
    const automatic = orthogonalVertices(start, end, [], null, directions);
    return automatic.length <= 2 ? [] : [{ ...start, [along]: (start[along] + end[along]) / 2 }];
  }
  return orthogonalVertices(start, end, [], null, directions).slice(1, -1);
}

/** Adjust saved waypoints while the attached contacts move. */
export function translateWirePoints(vertices, points, startDelta, endDelta, directions) {
  if (!points?.length || vertices.length < 2 || !finitePoint(startDelta) || !finitePoint(endDelta))
    return points;
  if (equal(startDelta, endDelta)) {
    if (!startDelta.x && !startDelta.y) return points;
    const translated = points.map((point) => shifted(point, startDelta));
    return validPoints(translated) ? translated : points;
  }
  const start = shifted(vertices[0], startDelta);
  const end = shifted(vertices.at(-1), endDelta);
  if (wireSegmentSpan(vertices, 0)?.end === vertices.length - 1) {
    const translated = moveStraightRoute(start, end, points, directions);
    return validPoints(translated) ? translated : points;
  }
  const leading = shiftTerminal(vertices, start, directions.start);
  const reversed = leading.slice().reverse();
  const trailing = shiftTerminal(reversed, end, directions.end);
  if (leading === vertices && trailing === reversed) return points;

  const requested = trailing.slice(1, -1).reverse();
  // Keep a straight manual connection if auto routing would add a detour.
  if (!requested.length && orthogonalVertices(start, end, [], null, directions).length > 2) {
    requested.push({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
  }
  return validPoints(requested) ? requested : points;
}

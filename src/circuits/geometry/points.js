export const LEAD = 24;
export const MAX_POINTS = 100;
export const LIMIT = 1_000_000;
export const equal = (a, b) => a.x === b.x && a.y === b.y;
export const finitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
export const bounded = (point) => ({
  x: Math.max(-LIMIT, Math.min(LIMIT, point.x)),
  y: Math.max(-LIMIT, Math.min(LIMIT, point.y)),
});
export const axisOf = (a, b) => (a.x === b.x ? 'y' : 'x');
export const crossAxis = (axis) => (axis === 'x' ? 'y' : 'x');

// Manual markers remain editable; automatic routes also discard redundant straight vertices.
export function compact(vertices, keepInline = false) {
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
      const forward = axis && (current[axis] - before[axis]) * (point[axis] - current[axis]) >= 0;
      if (!forward || keepInline) break;
      result.pop();
    }
    result.push({ x: point.x, y: point.y });
  }
  return result;
}

export function connect(vertices, point, horizontalFirst = true) {
  const previous = vertices.at(-1);
  if (previous.x !== point.x && previous.y !== point.y)
    vertices.push(horizontalFirst ? { x: point.x, y: previous.y } : { x: previous.x, y: point.y });
  if (!equal(previous, point)) vertices.push({ ...point });
}

export const DEFAULT_DIRECTIONS = { start: { x: 1, y: 0 }, end: { x: -1, y: 0 } };
export const offsetPoint = (point, direction, distance) => ({
  x: point.x + direction.x * distance,
  y: point.y + direction.y * distance,
});

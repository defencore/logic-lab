import { dimensions, GRID, snap } from './geometry/placement.js';
import { LIMIT } from './geometry/points.js';
import { screenToWorld } from './viewport.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const gridBounds = (bounds) => ({
  left: Math.ceil(bounds.left / GRID),
  right: Math.floor(bounds.right / GRID),
  top: Math.ceil(bounds.top / GRID),
  bottom: Math.floor(bounds.bottom / GRID),
});

function exclusion(node, size, padding) {
  const occupied = dimensions(node);
  // Boundary positions are allowed: they leave exactly the requested clearance.
  return {
    left: Math.floor((node.x - size.w - padding) / GRID) + 1,
    right: Math.ceil((node.x + occupied.w + padding) / GRID) - 1,
    top: Math.floor((node.y - size.h - padding) / GRID) + 1,
    bottom: Math.ceil((node.y + occupied.h + padding) / GRID) - 1,
  };
}

function nearestFreeX(row, preferred, bounds, obstacles) {
  let next = bounds.left;
  let best = null;
  const consider = (left, right) => {
    if (left > right) return;
    const value = clamp(preferred, left, right);
    if (best === null || Math.abs(value - preferred) < Math.abs(best - preferred)) best = value;
  };
  for (const obstacle of obstacles) {
    if (row < obstacle.top || row > obstacle.bottom || obstacle.right < next) continue;
    if (obstacle.left > bounds.right) break;
    consider(next, Math.min(bounds.right, obstacle.left - 1));
    next = Math.max(next, obstacle.right + 1);
    if (next > bounds.right) return best;
  }
  consider(next, bounds.right);
  return best;
}

function nearestFree(preferred, bounds, obstacles) {
  if (bounds.left > bounds.right || bounds.top > bounds.bottom) return null;
  const rows = new Set([clamp(preferred.y, bounds.top, bounds.bottom)]);
  for (const obstacle of obstacles) {
    if (obstacle.top > bounds.top && obstacle.top <= bounds.bottom) rows.add(obstacle.top - 1);
    if (obstacle.bottom >= bounds.top && obstacle.bottom < bounds.bottom)
      rows.add(obstacle.bottom + 1);
  }
  let best = null;
  let distance = Infinity;
  const ordered = [...rows].sort(
    (a, b) => Math.abs(a - preferred.y) - Math.abs(b - preferred.y) || b - a,
  );
  for (const y of ordered) {
    const vertical = (y - preferred.y) ** 2;
    if (vertical > distance) break;
    const x = nearestFreeX(y, preferred.x, bounds, obstacles);
    if (x === null) continue;
    const candidateDistance = vertical + (x - preferred.x) ** 2;
    if (candidateDistance < distance) {
      best = { x: x * GRID, y: y * GRID };
      distance = candidateDistance;
    }
  }
  return best;
}

/** Find the nearest free grid position, preferring room entirely inside the visible canvas. */
export function findNodePlacement(node, nodes, { view, viewport, padding = 24 }) {
  const size = dimensions(node);
  const center = screenToWorld(view, { x: viewport.width / 2, y: viewport.height / 2 });
  const preferred = {
    x: snap(center.x - size.w / 2) / GRID,
    y: snap(center.y - size.h / 2) / GRID,
  };
  const world = { left: -LIMIT, right: LIMIT - size.w, top: -LIMIT, bottom: LIMIT - size.h };
  const topLeft = screenToWorld(view, { x: 0, y: 0 });
  const bottomRight = screenToWorld(view, { x: viewport.width, y: viewport.height });
  const visible = gridBounds({
    left: Math.max(world.left, topLeft.x),
    right: Math.min(world.right, bottomRight.x - size.w),
    top: Math.max(world.top, topLeft.y),
    bottom: Math.min(world.bottom, bottomRight.y - size.h),
  });
  // Groups are backgrounds, so neither existing nor newly added groups obstruct components.
  const obstacles =
    node.type === 'group'
      ? []
      : nodes
          .filter((existing) => existing.type !== 'group')
          .map((existing) => exclusion(existing, size, padding))
          .sort((a, b) => a.left - b.left);
  // The excluded x intervals change only at obstacle boundary rows: at most 2N + 1 rows.
  return (
    nearestFree(preferred, visible, obstacles) ||
    nearestFree(preferred, gridBounds(world), obstacles)
  );
}

/** Bring an automatically placed node into view when the visible canvas was already full. */
export function revealNodePlacement(view, viewport, node) {
  const size = dimensions(node);
  const revealAxis = (position, length, extent, offset) => {
    const start = position * view.zoom + offset;
    const span = length * view.zoom;
    if (span > extent) return extent / 2 - (position + length / 2) * view.zoom;
    return offset + Math.max(0, -start) - Math.max(0, start + span - extent);
  };
  return {
    ...view,
    x: revealAxis(node.x, size.w, viewport.width, view.x),
    y: revealAxis(node.y, size.h, viewport.height, view.y),
  };
}

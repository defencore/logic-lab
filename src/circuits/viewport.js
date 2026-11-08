export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 4;
export const FIT_MAX_ZOOM = 1.4;
export const ZOOM_IN_FACTOR = 1.25;
export const ZOOM_OUT_FACTOR = 0.8;
export const WHEEL_LINE_HEIGHT = 16;
export const MAX_WHEEL_DELTA = 160;
export const WHEEL_ZOOM_SENSITIVITY = 0.002;

const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

export function clampZoom(value) {
  if (Number.isNaN(value) || typeof value !== 'number') return 1;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

// Views translate in screen CSS pixels; circuit coordinates are scaled first.
export function worldToScreen(view, point) {
  return { x: point.x * view.zoom + view.x, y: point.y * view.zoom + view.y };
}

export function screenToWorld(view, point) {
  return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
}

export function zoomAt(view, localPoint, factor) {
  const anchor = screenToWorld(view, localPoint);
  const zoom = clampZoom(view.zoom * factor);
  return {
    ...view,
    x: localPoint.x - anchor.x * zoom,
    y: localPoint.y - anchor.y * zoom,
    zoom,
  };
}

export function panBy(view, dx, dy) {
  return { ...view, x: view.x + finite(dx), y: view.y + finite(dy) };
}

// Match WirePad's wheel policy, including its Shift override of pinch modifiers.
export function classifyWheel(event) {
  const horizontalOnly = finite(event.deltaX) !== 0 && finite(event.deltaY) === 0;
  return event.shiftKey || (!(event.ctrlKey || event.metaKey) && (event.altKey || horizontalOnly))
    ? 'pan'
    : 'zoom';
}

export function normalizeWheel(event, pageHeight) {
  const factor =
    event.deltaMode === 1
      ? WHEEL_LINE_HEIGHT
      : event.deltaMode === 2
        ? Math.max(0, finite(pageHeight))
        : 1;
  return { x: finite(event.deltaX) * factor, y: finite(event.deltaY) * factor };
}

export function wheelZoomFactor(deltaY) {
  const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, finite(deltaY)));
  return Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
}

/** Frame circuit bounds with WirePad's responsive padding and maximum fit scale. */
export function fitViewport(bounds, size) {
  const width = finite(size.width),
    height = finite(size.height);
  if (width <= 0 || height <= 0) return null;
  const boundsWidth = Math.max(0, finite(bounds.width));
  const boundsHeight = Math.max(0, finite(bounds.height));
  const horizontalRoom = Math.max(1, width - Math.min(105, width * 0.16));
  const verticalRoom = Math.max(1, height - Math.min(138, height * 0.26));
  const zoom =
    boundsWidth || boundsHeight
      ? Math.min(
          FIT_MAX_ZOOM,
          Math.max(MIN_ZOOM, horizontalRoom / Math.max(1, boundsWidth)),
          Math.max(MIN_ZOOM, verticalRoom / Math.max(1, boundsHeight)),
        )
      : 1;
  return {
    x: width / 2 - (finite(bounds.x) + boundsWidth / 2) * zoom,
    y: height / 2 - (finite(bounds.y) + boundsHeight / 2) * zoom,
    zoom,
  };
}

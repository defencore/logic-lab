import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  FIT_MAX_ZOOM,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
  clampZoom,
  zoomAt,
  panBy,
  worldToScreen,
  screenToWorld,
  normalizeWheel,
  classifyWheel,
  wheelZoomFactor,
  fitViewport,
} from '../src/navigation.js';

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
const nearPoint = (actual, expected) => {
  near(actual.x, expected.x);
  near(actual.y, expected.y);
};

test('zoom limits and toolbar factors match WirePad', () => {
  assert.equal(MIN_ZOOM, 0.01);
  assert.equal(MAX_ZOOM, 4);
  assert.equal(FIT_MAX_ZOOM, 1.4);
  assert.equal(ZOOM_IN_FACTOR, 1.25);
  assert.equal(ZOOM_OUT_FACTOR, 0.8);
  assert.equal(clampZoom(-Infinity), MIN_ZOOM);
  assert.equal(clampZoom(0), MIN_ZOOM);
  assert.equal(clampZoom(Infinity), MAX_ZOOM);
  assert.equal(clampZoom(NaN), 1);
  assert.equal(clampZoom(undefined), 1);
});

test('world and screen conversions preserve fractional points across zoom and translation', () => {
  for (const zoom of [MIN_ZOOM, 0.375, 1, 2.75, MAX_ZOOM]) {
    const view = { x: -263.375, y: 95.625, zoom };
    for (const world of [
      { x: 0, y: 0 },
      { x: -240.5, y: 78.25 },
      { x: 490.125, y: -270.75 },
    ]) {
      nearPoint(screenToWorld(view, worldToScreen(view, world)), world);
    }
  }
});

test('pointer-centered zoom preserves the circuit coordinate beneath the cursor even at both limits', () => {
  const original = { x: 125.25, y: -90.125, zoom: 0.75 };
  for (const pointer of [
    { x: 0, y: 0 },
    { x: 712.5, y: 130.75 },
    { x: 43.5, y: 598.125 },
  ]) {
    let view = { ...original };
    const world = screenToWorld(view, pointer);
    for (const factor of [
      ZOOM_IN_FACTOR,
      ZOOM_IN_FACTOR,
      ZOOM_OUT_FACTOR,
      20,
      20,
      0.000001,
      0.000001,
      75,
    ]) {
      view = zoomAt(view, pointer, factor);
      nearPoint(worldToScreen(view, world), pointer);
      nearPoint(screenToWorld(view, pointer), world);
      assert.ok(view.zoom >= MIN_ZOOM && view.zoom <= MAX_ZOOM);
    }
  }
  assert.deepEqual(original, { x: 125.25, y: -90.125, zoom: 0.75 });
});

test('zooming in and out around the same anchor restores the starting viewport without mutating it', () => {
  const start = { x: -163.5, y: 208.25, zoom: 0.65 };
  const zoomed = zoomAt(start, { x: 470, y: 190 }, ZOOM_IN_FACTOR);
  const restored = zoomAt(zoomed, { x: 470, y: 190 }, ZOOM_OUT_FACTOR);
  nearPoint(restored, start);
  near(restored.zoom, start.zoom);
  assert.notEqual(zoomed, start);
  assert.deepEqual(start, { x: -163.5, y: 208.25, zoom: 0.65 });
});

test('pan distances are screen pixels at every scale rather than circuit units', () => {
  for (const zoom of [MIN_ZOOM, 0.5, 1, 4]) {
    const view = { x: 100, y: -25, zoom };
    const world = { x: 300, y: 400 };
    const before = worldToScreen(view, world);
    const moved = panBy(view, 45.5, -73.25);
    const after = worldToScreen(moved, world);
    nearPoint(after, { x: before.x + 45.5, y: before.y - 73.25 });
    assert.equal(moved.zoom, zoom);
    assert.deepEqual(view, { x: 100, y: -25, zoom });
  }
});

test('wheel deltas normalize pixel, line and page units for both axes', () => {
  assert.deepEqual(normalizeWheel({ deltaX: 2.5, deltaY: -3.25, deltaMode: 0 }, 600), {
    x: 2.5,
    y: -3.25,
  });
  assert.deepEqual(normalizeWheel({ deltaX: 2.5, deltaY: -3.25, deltaMode: 1 }, 600), {
    x: 40,
    y: -52,
  });
  assert.deepEqual(normalizeWheel({ deltaX: 0.5, deltaY: -1, deltaMode: 2 }, 480), {
    x: 240,
    y: -480,
  });
  assert.deepEqual(normalizeWheel({ deltaX: NaN, deltaY: Infinity, deltaMode: 0 }, 600), {
    x: 0,
    y: 0,
  });
});

test('wheel classification follows scroll, modifier and trackpad pinch priorities', () => {
  const wheel = { deltaX: 0, deltaY: 40 };
  assert.equal(classifyWheel(wheel), 'zoom');
  assert.equal(classifyWheel({ ...wheel, deltaX: 4 }), 'zoom');
  assert.equal(classifyWheel({ ...wheel, shiftKey: true }), 'pan');
  assert.equal(classifyWheel({ ...wheel, altKey: true }), 'pan');
  assert.equal(classifyWheel({ deltaX: 40, deltaY: 0 }), 'pan');
  for (const modifier of ['ctrlKey', 'metaKey']) {
    assert.equal(classifyWheel({ ...wheel, [modifier]: true }), 'zoom');
    assert.equal(classifyWheel({ ...wheel, deltaX: 40, deltaY: 0, [modifier]: true }), 'zoom');
    assert.equal(classifyWheel({ ...wheel, altKey: true, [modifier]: true }), 'zoom');
    assert.equal(classifyWheel({ ...wheel, shiftKey: true, [modifier]: true }), 'pan');
  }
});

test('wheel zoom uses the normalized vertical axis and limits acceleration from large deltas', () => {
  const line = normalizeWheel({ deltaX: 0, deltaY: 2, deltaMode: 1 }, 600);
  near(wheelZoomFactor(line.y), Math.exp(-32 * 0.002));
  near(wheelZoomFactor(10000), Math.exp(-160 * 0.002));
  near(wheelZoomFactor(-10000), Math.exp(160 * 0.002));
  assert.equal(wheelZoomFactor(0), 1);
  assert.ok(wheelZoomFactor(20) < 1);
  assert.ok(wheelZoomFactor(-20) > 1);
});

test('fit viewport centers complete bounds with responsive WirePad padding', () => {
  const bounds = { x: -200, y: 100, width: 2000, height: 400 };
  const size = { width: 800, height: 600 };
  const view = fitViewport(bounds, size);
  nearPoint(worldToScreen(view, { x: 800, y: 300 }), { x: 400, y: 300 });
  near(view.zoom, (800 - 105) / 2000);
  const topLeft = worldToScreen(view, { x: bounds.x, y: bounds.y });
  const bottomRight = worldToScreen(view, {
    x: bounds.x + bounds.width,
    y: bounds.y + bounds.height,
  });
  assert.ok(topLeft.x >= 0 && topLeft.y >= 0);
  assert.ok(bottomRight.x <= size.width && bottomRight.y <= size.height);
  const compact = fitViewport(bounds, { width: 320, height: 240 });
  near(compact.zoom, (320 - 320 * 0.16) / 2000);
});

test('fit handles tiny circuits, single points and one-dimensional bounds without losing them', () => {
  assert.equal(
    fitViewport({ x: 0, y: 0, width: 10, height: 10 }, { width: 800, height: 600 }).zoom,
    FIT_MAX_ZOOM,
  );
  for (const bounds of [
    { x: 400, y: -100, width: 4000, height: 0 },
    { x: -80, y: 400, width: 0, height: 4000 },
  ]) {
    const view = fitViewport(bounds, { width: 800, height: 600 });
    const first = worldToScreen(view, { x: bounds.x, y: bounds.y });
    const last = worldToScreen(view, { x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    assert.ok(first.x >= 0 && first.y >= 0 && last.x <= 800 && last.y <= 600);
  }
  assert.deepEqual(
    fitViewport({ x: 100, y: -200, width: 0, height: 0 }, { width: 800, height: 600 }),
    { x: 300, y: 500, zoom: 1 },
  );
  assert.equal(
    fitViewport({ x: 0, y: 0, width: 100, height: 100 }, { width: 0, height: 600 }),
    null,
  );
});

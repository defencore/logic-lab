import test from 'node:test';
import assert from 'node:assert/strict';
import { waveformPng } from '../src/waveform-export.js';

function captureCanvas(t) {
  const original = globalThis.document;
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
  const strokes = [];
  const points = [];
  let path = [];
  const context = {
    measureText: (text) => ({ width: [...text].length * 7 }),
    fillRect() {},
    fillText() {},
    setLineDash() {},
    fill() {},
    beginPath() {
      path = [];
    },
    moveTo(x, y) {
      path.push({ operation: 'move', x, y });
    },
    lineTo(x, y) {
      path.push({ operation: 'line', x, y });
    },
    arc(x, y) {
      points.push({ x, y });
    },
    stroke() {
      strokes.push({ color: this.strokeStyle, path: path.slice() });
    },
  };
  globalThis.document = {
    fonts: { ready: Promise.resolve() },
    createElement: () => ({
      getContext: () => context,
      toBlob: (callback, type) => callback(new Blob(['image'], { type })),
    }),
  };
  return {
    points,
    trace: (color) => strokes.find((stroke) => stroke.color === color)?.path,
  };
}

const options = {
  title: 'Осцилограма',
  startTime: 0,
  endTime: 1,
  sampleTimes: [0, 0.1, 0.9, 1],
};
const channel = (history, extra = {}) => ({
  label: 'Сигнал',
  color: '#258461',
  history,
  current: history.at(-1),
  stepped: false,
  ...extra,
});
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);

test('PNG uses nonuniform simulation times and keeps a newer channel at its actual trailing times', async (t) => {
  const canvas = captureCanvas(t);
  await waveformPng([channel([0, 1, 0, 1]), channel([0, 1], { color: '#9474c0' })], options);
  const full = canvas.trace('#258461');
  const newer = canvas.trace('#9474c0');
  for (const [index, x] of [232, 350.4, 1297.6, 1416].entries()) near(full[index].x, x);
  near(newer[0].x, full[2].x);
  near(newer[1].x, full[3].x);
  assert.ok(newer[0].x > 1200, 'A newly added channel must not stretch over the full time axis.');
});

test('PNG leaves unknown intervals disconnected and keeps digital transitions at sample times', async (t) => {
  const canvas = captureCanvas(t);
  await waveformPng(
    [channel([0, 'X', 1, 'Z', 0]), channel([0, 1, 0], { color: '#9474c0', stepped: true })],
    { ...options, sampleTimes: [0, 0.1, 0.4, 0.6, 1] },
  );
  const gaps = canvas.trace('#258461');
  assert.deepEqual(
    gaps.map((point) => point.operation),
    ['move', 'move', 'move'],
  );
  for (const [index, fraction] of [0, 0.4, 1].entries()) near(gaps[index].x, 232 + fraction * 1184);
  const stepped = canvas.trace('#9474c0');
  assert.deepEqual(
    stepped.map((point) => point.operation),
    ['move', 'line', 'line', 'line', 'line'],
  );
  near(stepped[0].x, 232 + 0.4 * 1184);
  near(stepped[1].x, 232 + 0.6 * 1184);
  near(stepped[2].x, stepped[1].x);
  near(stepped[1].y, stepped[0].y);
  assert.notEqual(stepped[2].y, stepped[1].y);
});

test('PNG rejects missing, unordered, insufficient, nonfinite or out-of-range sample times', async (t) => {
  captureCanvas(t);
  for (const sampleTimes of [
    undefined,
    [0, 0.1, 0.1, 1],
    [0, 0.9, 0.1, 1],
    [0, 0.1, NaN, 1],
    [0, 0.1, Infinity, 1],
    [0, 0.1],
    [-0.1, 0.1, 0.9, 1],
    [0, 0.1, 0.9, 1.1],
  ])
    await assert.rejects(
      waveformPng([channel([0, 1, 0, 1])], { ...options, sampleTimes }),
      TypeError,
    );
});

test('PNG places an unsampled current value at the end without inventing a historical line', async (t) => {
  const canvas = captureCanvas(t);
  await waveformPng([channel([], { current: 1 })], {
    ...options,
    startTime: 1,
    endTime: 1,
    sampleTimes: [],
  });
  assert.equal(canvas.trace('#258461').length, 1);
  assert.equal(canvas.trace('#258461')[0].operation, 'move');
  assert.equal(canvas.points.length, 1);
  near(canvas.points[0].x, 1416);
});

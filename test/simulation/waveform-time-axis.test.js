import test from 'node:test';
import assert from 'node:assert/strict';
import { paintTraces } from '../../src/signals/waveforms.js';

function plot(trace) {
  const paths = [];
  let path = [];
  const context = {
    setTransform() {},
    clearRect() {},
    setLineDash() {},
    beginPath() {
      path = [];
    },
    moveTo(x, y) {
      path.push(['move', x, y]);
    },
    lineTo(x, y) {
      path.push(['line', x, y]);
    },
    stroke() {
      paths.push(path);
    },
  };
  const canvas = {
    width: 100,
    height: 100,
    getBoundingClientRect: () => ({ width: 100, height: 100 }),
    getContext: () => context,
  };
  paintTraces(canvas, [trace], 1);
  return paths.at(-1);
}

test('live waveforms place irregular observations at actual simulation times', () => {
  const path = plot({
    history: [0, 1, 0],
    current: 0,
    color: '#000',
    sampleTimes: [0, 0.01, 1],
    endTime: 1,
    timeWindow: 1,
  });
  assert.deepEqual(
    path.map((point) => point[1]),
    [0, 1, 100],
  );
});

test('a newly observed channel aligns its short history to the end of shared sample times', () => {
  const path = plot({
    history: [0, 1],
    current: 1,
    color: '#000',
    sampleTimes: [0, 0.1, 0.8, 1],
    endTime: 1,
    timeWindow: 1,
  });
  assert.deepEqual(
    path.map((point) => point[1]),
    [80, 100],
  );
});

test('a channel without samples does not invent a flat historical signal', () => {
  const path = plot({
    history: [],
    current: 1,
    color: '#000',
    sampleTimes: [],
    endTime: 5,
    timeWindow: 1,
  });
  assert.deepEqual(
    path.map((point) => point[1]),
    [100],
  );
});

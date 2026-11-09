import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogicAnalyzer, logicChannelChoices } from '../../src/signals/logic-analyzer.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';
import { appendRecording, createRecording } from '../../src/signals/recording.js';
import { updateBusMonitor } from '../../src/workbench/bus-monitor-node.js';

test('the analyzer records microsecond PWM edges even with a much coarser waveform sampling window', () => {
  const project = {
    nodes: [{ id: 'pwm', type: 'pwm', params: { frequency: 1000, duty: 0.001 } }],
    wires: [],
  };
  const choices = logicChannelChoices(project, 'en');
  assert.deepEqual(
    choices.map(({ port }) => port),
    ['out'],
  );
  const analyzer = createLogicAnalyzer();
  analyzer.configure(project, choices);
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01;
  simulate(project, runtime, 0);
  analyzer.capture(project, runtime);
  advanceRuntime(project, runtime, 0.002, {
    onStep: (value) => analyzer.capture(project, value),
  });
  const edges = analyzer.transitions(project, 0);
  assert.deepEqual(
    edges.slice(0, 4).map(({ value }) => value),
    [1, 0, 1, 0],
  );
  assert.ok(Math.abs(edges[1].at - 0.000001) < 1e-12);
  assert.ok(Math.abs(edges[3].at - 0.001001) < 1e-12);
  assert.deepEqual(runtime.historyTimes, []);
});

test('digital capture retains X and Z changes at the same paused time and excludes repeated levels', () => {
  const recording = createRecording({
    traces: [{ id: 'signal', label: 'signal' }],
    startedAt: 1,
    sampleInterval: 0.01,
    eventDriven: true,
  });
  for (const value of [0, 1, 1, 'X', 'Z']) appendRecording(recording, 1, [value]);
  assert.deepEqual(
    recording.samples.map(({ time, values }) => [time, values[0]]),
    [
      [0, 0],
      [0, 1],
      [0, 'X'],
      [0, 'Z'],
    ],
  );
});

test('four- and eight-bit bus monitors show the physical input values and preserve a floating nibble', () => {
  const fields = Object.fromEntries(
    ['hex', 'dec', 'bin'].map((name) => [name, { textContent: '' }]),
  );
  const root = { querySelector: (selector) => fields[selector.slice(10, -1)] };
  const runtime = {
    inputs: {
      display: Object.fromEntries(
        Array.from({ length: 8 }, (_, bit) => [`in${bit}`, Number(bit < 4)]),
      ),
    },
  };
  updateBusMonitor(root, { id: 'display', type: 'bus_monitor_4' }, runtime);
  assert.equal(fields.hex.textContent, '0xF');
  assert.equal(fields.dec.textContent, '15');
  assert.equal(fields.bin.textContent, '1111');
  updateBusMonitor(root, { id: 'display', type: 'bus_monitor_8' }, runtime);
  assert.equal(fields.hex.textContent, '0x0F');
  for (let bit = 4; bit < 8; bit++) delete runtime.inputs.display[`in${bit}`];
  updateBusMonitor(root, { id: 'display', type: 'bus_monitor_8' }, runtime);
  assert.equal(fields.hex.textContent, '0xZF');
  assert.equal(fields.bin.textContent, 'ZZZZ1111');
});

import { open, value, output, input, advanceProcess, processState } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('feeder laboratory maintains bowl feedback, guards empty storage and refills on an edge', () => {
  const context = open('animal-feeder'),
    requests = new Set();
  advanceProcess(context, 35, (current) => {
    assert.equal(output(current, 'feeder', 'alarm'), 0);
    assert.ok(output(current, 'feeder', 'level') <= 61);
    requests.add(input(current, 'feeder', 'dispense'));
  });
  assert.deepEqual([...requests].sort(), [0, 1]);
  assert.ok(output(context, 'feeder', 'fed') >= 3);
  const bowl = output(context, 'feeder', 'level');
  value(context, 'refill', 1);
  assert.equal(output(context, 'feeder', 'hopper'), 500);
  assert.equal(output(context, 'feeder', 'level'), bowl);
  value(context, 'force', 1);
  advanceProcess(context, 0.1);
  const reduced = output(context, 'feeder', 'hopper');
  assert.ok(reduced < 500);
  value(context, 'refill', 1);
  assert.equal(output(context, 'feeder', 'hopper'), reduced);
  const project = createExample('animal-feeder');
  project.nodes.find((node) => node.id === 'feeder').params.initialHopper = 0;
  const empty = { project, runtime: createRuntime() };
  simulate(project, empty.runtime, 0);
  assert.equal(output(empty, 'feeder', 'empty'), 1);
  assert.equal(input(empty, 'feeder', 'dispense'), 0);
  value(empty, 'refill', 1);
  assert.equal(output(empty, 'feeder', 'empty'), 0);
  assert.equal(input(empty, 'feeder', 'dispense'), 1);
});

test('feeder manual bypass visibly overfills and records an alarm until reset', () => {
  const context = open('animal-feeder');
  value(context, 'force', 1);
  advanceProcess(context, 8);
  assert.equal(output(context, 'feeder', 'alarm'), 1);
  assert.ok(processState(context, 'feeder').spilled > 0);
  value(context, 'force', 0);
  advanceProcess(context, 0.1);
  assert.equal(output(context, 'feeder', 'alarm'), 1);
  value(context, 'reset', 1);
  assert.equal(output(context, 'feeder', 'alarm'), 0);
  assert.equal(output(context, 'feeder', 'level'), 10);
});

test('tank laboratory holds the hysteresis band and creates a real latched overflow on bypass', () => {
  const context = open('water-tank'),
    middle = new Set();
  assert.equal(input(context, 'tank', 'pump'), 0);
  advanceProcess(context, 40, (current) => {
    const level = output(current, 'tank', 'level');
    assert.equal(output(current, 'tank', 'overflow'), 0);
    assert.ok(level >= 19.5 && level <= 80.5);
    if (level > 40 && level < 50) middle.add(input(current, 'tank', 'pump'));
  });
  assert.deepEqual([...middle].sort(), [0, 1]);
  value(context, 'drain', 0);
  value(context, 'force', 1);
  advanceProcess(context, 10);
  assert.equal(output(context, 'tank', 'level'), 100);
  assert.equal(output(context, 'tank', 'overflow'), 1);
  assert.ok(processState(context, 'tank').spilled > 0);
  value(context, 'force', 0);
  value(context, 'drain', 1);
  advanceProcess(context, 0.1);
  assert.equal(output(context, 'tank', 'overflow'), 1);
  value(context, 'reset', 1);
  assert.equal(output(context, 'tank', 'overflow'), 0);
  assert.equal(output(context, 'tank', 'level'), 35);
});

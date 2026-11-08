import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { validateProject, parseProject, serializeProject } from '../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  serializeSequence,
  parseSequence,
  replaySequence,
} from '../../../src/experiments/actions.js';

const floors = Array.from({ length: 9 }, (_, index) => index + 1);

function open() {
  const project = createExample('elevator-logic'),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}
function set(context, id, value) {
  context.project.nodes.find((node) => node.id === id).params.value = value;
  simulate(context.project, context.runtime, 0);
}
function advance(context, seconds, inspect = () => {}) {
  const count = Math.ceil(seconds / 0.005);
  for (let index = 0; index < count; index++) {
    simulate(context.project, context.runtime, seconds / count);
    assert.deepEqual(context.runtime.diagnostics, []);
    inspect(context.runtime);
  }
}

test('visible gate dispatch remembers released calls, serves3→5→9→1 and prevents conflicting SR/door/motion states', () => {
  const context = open(),
    example = EXAMPLES.find(({ id }) => id === 'elevator-logic');
  assert.deepEqual(validateProject(context.project), context.project);
  assert.deepEqual(parseProject(serializeProject(context.project)), context.project);
  assert.ok(context.project.nodes.some(({ type }) => type === 'sr_latch'));
  assert.ok(context.project.nodes.some(({ type }) => type === 'monostable'));
  const order = [];
  let cursor = 0,
    previousOpen = 0,
    pendingSecond = false;
  for (let index = 1; index <= 2500; index++) {
    const at = index * 0.005;
    while (example.actionPreset[cursor]?.at <= at + 1e-9) {
      const action = example.actionPreset[cursor++];
      set(context, action.node, action.value);
    }
    advance(context, 0.005, (runtime) => {
      const out = runtime.outputs.plant,
        input = runtime.inputs.plant;
      assert.equal(out.fault, 0);
      assert.ok(!(input.up && input.down));
      assert.ok(!(input.open && input.close));
      if (out.moving) assert.equal(out.door_closed, 1);
      for (const floor of floors) {
        const sr = runtime.inputs[`request${floor}`];
        assert.ok(!(sr.s && sr.r), 'Clear has priority through the visible NOT reset gate.');
      }
      if (out.door_open && !previousOpen) {
        order.push(floors.find((floor) => out[`floor${floor}`] === 1));
        if (order.length === 1) pendingSecond = runtime.outputs.request9.q === 1;
      }
      previousOpen = out.door_open;
    });
  }
  assert.deepEqual(order, [3, 5, 9, 1]);
  assert.equal(pendingSecond, true);
  assert.deepEqual(
    floors.map((i) => context.runtime.outputs[`request${i}`].q),
    floors.map(() => 0),
  );
  assert.equal(context.runtime.outputs.plant.floor1, 1);
  assert.equal(context.runtime.outputs.plant.door_closed, 1);
});

test('the unsafe UP bypass faults with open doors and the common RESET recovers plant, timer and all memories', () => {
  const context = open();
  set(context, 'call1', 1);
  advance(context, 0.02);
  set(context, 'call1', 0);
  advance(context, 0.1);
  assert.ok(context.runtime.outputs.plant.door_position > 0);
  const position = context.runtime.outputs.plant.position;
  set(context, 'unsafe', 1);
  assert.equal(context.runtime.outputs.plant.fault, 1);
  assert.equal(context.runtime.state.plant.scenario.failure, 'motion_with_open_door');
  advance(context, 0.3);
  assert.equal(context.runtime.outputs.plant.position, position);
  set(context, 'unsafe', 0);
  set(context, 'reset', 1);
  set(context, 'reset', 0);
  assert.equal(context.runtime.outputs.plant.fault, 0);
  assert.equal(context.runtime.outputs.plant.door_closed, 1);
  assert.equal(context.runtime.outputs.dwell.out, 0);
  assert.deepEqual(
    floors.map((i) => context.runtime.outputs[`request${i}`].q),
    floors.map(() => 0),
  );
  set(context, 'call9', 1);
  advance(context, 0.02);
  set(context, 'call9', 0);
  assert.equal(context.runtime.outputs.request9.q, 1);
  advance(context, 4.9);
  assert.equal(context.runtime.outputs.plant.floor9, 1);
  assert.equal(context.runtime.outputs.plant.fault, 0);
});

test('requests cannot move the cabin when the visible actuator wiring is removed', () => {
  const context = open();
  context.project.wires = context.project.wires.filter((wire) => wire.to.node !== 'plant');
  set(context, 'call9', 1);
  advance(context, 0.02);
  set(context, 'call9', 0);
  advance(context, 0.5);
  assert.equal(context.runtime.outputs.request9.q, 1);
  assert.equal(context.runtime.outputs.plant.position, 1);
  assert.equal(context.runtime.outputs.plant.door_position, 0);
});

test('the portable multi-request preset round-trips and finishes home with no pending calls or faults', () => {
  const example = EXAMPLES.find(({ id }) => id === 'elevator-logic');
  const initial = example.create();
  const sequence = createSequence(initial, { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, 12.1);
  const result = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.equal(result.done, true);
  assert.equal(sequence.actions.length, 9);
  assert.deepEqual(result.runtime.diagnostics, []);
  assert.equal(result.runtime.outputs.plant.floor1, 1);
  assert.equal(result.runtime.outputs.plant.door_closed, 1);
  assert.equal(result.runtime.outputs.plant.fault, 0);
  assert.equal(result.runtime.outputs.plant.moving, 0);
  assert.deepEqual(
    floors.map((i) => result.runtime.outputs[`request${i}`].q),
    floors.map(() => 0),
  );
  assert.deepEqual(initial, example.create());
});

test('all nine momentary call sources retain released requests and encode independent binary targets', () => {
  for (const floor of floors) {
    const context = open();
    assert.ok(context.project.nodes.length <= 200);
    for (const number of floors)
      assert.equal(context.project.nodes.find(({ id }) => id === `call${number}`).type, 'button');
    assert.equal(context.project.nodes.find(({ id }) => id === 'reset').type, 'button');
    // Stay away from the called floor so its request is observed before service clears it.
    context.project.nodes.find(({ id }) => id === 'plant').params.initialFloor =
      floor === 1 ? 9 : 1;
    set(context, 'reset', 1);
    set(context, 'reset', 0);
    set(context, `call${floor}`, 1);
    set(context, `call${floor}`, 0);
    assert.equal(context.runtime.outputs[`call${floor}`].out, 0);
    assert.equal(context.runtime.outputs[`request${floor}`].q, 1);
    assert.equal(context.runtime.outputs.target.out, floor);
    for (let bit = 0; bit < 8; bit++)
      assert.equal(context.runtime.inputs.target[`in${bit}`], (floor >> bit) & 1);
    for (const number of floors) {
      const selected =
        number === 1
          ? context.runtime.outputs.request1.q
          : context.runtime.outputs[`target${number}`].out;
      assert.equal(selected, Number(number === floor));
    }
    for (const id of ['below-target', 'above-target'])
      assert.equal(context.project.nodes.find((node) => node.id === id).params.unit, 'floor');
  }
});

test('nine simultaneous released calls are all served with actual full door cycles and no hidden destinations', () => {
  const context = open(),
    order = [];
  for (const floor of floors) set(context, `call${floor}`, 1);
  for (const floor of floors) set(context, `call${floor}`, 0);
  let previousOpen = 0;
  advance(context, 13, (runtime) => {
    const output = runtime.outputs.plant;
    assert.equal(output.fault, 0);
    if (output.door_open && !previousOpen)
      order.push(floors.find((floor) => output[`floor${floor}`] === 1));
    previousOpen = output.door_open;
  });
  assert.deepEqual(order, floors);
  assert.equal(context.runtime.outputs.plant.floor9, 1);
  assert.equal(context.runtime.outputs.plant.door_closed, 1);
  assert.deepEqual(
    floors.map((floor) => context.runtime.outputs[`request${floor}`].q),
    floors.map(() => 0),
  );
});

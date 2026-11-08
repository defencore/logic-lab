import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceElevator,
  evaluateElevator,
  initialElevatorState,
  elevatorParameterError,
} from '../../../src/scenes/models/elevator/index.js';
import { floorAt, FLOOR_ZONE, FLOORS } from '../../../src/scenes/models/elevator/config.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import { getDefinition } from '../../../src/components/catalog/index.js';
import { sceneHealth, sceneMessageKey } from '../../../src/scenes/data/scenarios.js';
import { TEXT } from '../../../src/locales/index.js';

const node = (params = {}) => ({ id: 'lift', type: 'elevator', enabled: true, params });
const next = (state, inputs, dt = 0, component = node()) =>
  advanceElevator(component, state, inputs, dt);

test('the physical plant moves only when externally commanded and never dispatches or opens at a floor', () => {
  const component = node(),
    start = initialElevatorState(component);
  assert.equal(next(start, {}, 20).position, 1);
  const middle = next(start, { up: 1 }, 2);
  assert.equal(middle.position, 2);
  assert.equal(evaluateElevator(component, middle, { up: 1 }).floor2, 1);
  assert.equal(middle.door, 0);
  assert.equal(middle.moving, 1);
  const top = next(middle, { up: 1 }, 20);
  assert.equal(top.position, 9);
  assert.equal(top.moving, 0);
  assert.equal(next(top, { down: 1 }, 20).position, 1);
  assert.equal(middle.position, 2, 'Advancement must not mutate the previous snapshot.');
  assert.equal(start.position, 1);
});

test('doors take physical time, hold partial openings and expose separate endpoint sensors', () => {
  let state = initialElevatorState(node());
  state = next(state, { open: 1 }, 0.4);
  assert.equal(state.door, 0.4);
  assert.deepEqual(
    [
      evaluateElevator(node(), state, {}).door_open,
      evaluateElevator(node(), state, {}).door_closed,
    ],
    [0, 0],
  );
  assert.equal(next(state, {}, 5).door, 0.4);
  state = next(state, { open: 1 }, 1);
  assert.equal(state.door, 1);
  assert.equal(evaluateElevator(node(), state, {}).door_open, 1);
  state = next(state, { close: 1 }, 2);
  assert.equal(state.door, 0);
  assert.equal(evaluateElevator(node(), state, {}).door_closed, 1);
});

test('each unsafe command latches a specific fault, freezes the plant and requires explicit reset', () => {
  for (const [patch, inputs, reason] of [
    [{}, { up: 1, down: 1 }, 'drive_conflict'],
    [{}, { open: 1, close: 1 }, 'door_conflict'],
    [{ door: 0.1 }, { up: 1 }, 'motion_with_open_door'],
    [{}, { up: 1, open: 1 }, 'motion_with_open_door'],
    [{ position: 1.5 }, { open: 1 }, 'open_between_floors'],
  ]) {
    const start = { ...initialElevatorState(node()), ...patch };
    const failed = next(start, inputs, 1);
    assert.equal(failed.failure, reason);
    assert.equal(failed.fault, true);
    assert.equal(failed.position, start.position);
    assert.equal(failed.door, start.door);
    const held = next(failed, {}, 10);
    assert.equal(held.fault, true);
    assert.equal(held.position, start.position);
    const output = evaluateElevator(node(), held, { up: 'X' });
    assert.equal(output.fault, 1);
    assert.equal(output.moving, 0);
    const reset = next(held, { reset: 1, up: 'X' });
    assert.deepEqual(reset, initialElevatorState(node()));
    const snapshot = { node: node(), state: failed, outputs: evaluateElevator(node(), failed, {}) };
    assert.equal(sceneHealth(snapshot).status, 'fault');
    const key = sceneMessageKey(snapshot, reason);
    for (const language of ['en', 'ua']) assert.ok(TEXT[language][key]?.length > 30);
  }
});

test('unknown commands stop the world while readings remain known; RUN and disabled states preserve physical state', () => {
  const start = { ...initialElevatorState(node()), position: 1.5 };
  const unknown = next(start, { up: 'X' }, 3);
  assert.equal(unknown.position, 1.5);
  assert.equal(unknown.time, 0);
  assert.equal(unknown.uncertain, true);
  const output = evaluateElevator(node(), unknown, { up: 'X' });
  assert.equal(output.position, 1.5);
  assert.equal(output.door_closed, 1);
  assert.equal(output.moving, 'X');
  assert.equal(output.fault, 'X');
  assert.equal(next(start, { up: 1, run: 0 }, 3).position, 1.5);
  const disabled = { ...node(), enabled: false };
  assert.equal(next(start, { up: 1 }, 3, disabled), start);
  assert.ok(Object.values(evaluateElevator(disabled, start, {})).every((value) => value === 'Z'));
  assert.equal(next(initialElevatorState(node()), { up: 'Z' }, 1).position, 1);
});

test('floor alignment is a physical zone, and fast travel can pass the middle floor without automatic stopping', () => {
  assert.equal(floorAt(5 - FLOOR_ZONE), 5);
  assert.equal(floorAt(5 + FLOOR_ZONE), 5);
  assert.equal(floorAt(5.016), null);
  const component = node({ travelSpeed: 4 });
  const state = next(
    { ...initialElevatorState(component), position: 4.9 },
    { up: 1 },
    0.1,
    component,
  );
  assert.ok(Math.abs(state.position - 5.3) < 1e-12);
  assert.equal(state.moving, 1);
  assert.equal(state.fault, false);
  const aligned = next({ ...initialElevatorState(node()), position: 1.01 }, { open: 1 }, 0.1);
  assert.equal(aligned.fault, false);
  assert.equal(aligned.door, 0.1);
});

test('invalid physical configuration produces X and configured reset restores the chosen starting floor and door', () => {
  for (const params of [
    { initialFloor: 0 },
    { initialFloor: 10 },
    { initialFloor: 0.5 },
    { initialDoor: -1 },
    { travelSpeed: 0 },
    { travelSpeed: 5 },
    { doorSpeed: Infinity },
  ]) {
    assert.ok(elevatorParameterError(node(params)));
    assert.ok(
      Object.values(evaluateElevator(node(params), null, {})).every((value) => value === 'X'),
    );
  }
  const component = node({ initialFloor: 9, initialDoor: 1 });
  assert.equal(elevatorParameterError(component), null);
  const reset = next(
    { ...initialElevatorState(component), position: 1, door: 0, fault: true },
    { reset: 1 },
    0,
    component,
  );
  assert.equal(reset.position, 9);
  assert.equal(reset.door, 1);
  assert.equal(reset.fault, false);
});

test('the circuit engine registers all separate elevator contacts, defaults and disabled release', () => {
  const definition = getDefinition('elevator');
  assert.equal(definition.inputs.length, 6);
  assert.equal(definition.outputs.length, 15);
  assert.ok([...definition.inputs, ...definition.outputs].every((pin) => !pin.group));
  const component = { ...node(), x: 0, y: 0 },
    project = { nodes: [component], wires: [] };
  const runtime = createRuntime();
  simulate(project, runtime, 1);
  assert.deepEqual(runtime.diagnostics, []);
  assert.equal(runtime.outputs.lift.floor1, 1);
  assert.equal(Object.hasOwn(runtime.outputs.lift, 'floor0'), false);
  component.enabled = false;
  simulate(project, runtime, 1);
  assert.ok(Object.values(runtime.outputs.lift).every((value) => value === 'Z'));
});

test('all nine numbered floors expose independent sensors and valid initial/reset positions', () => {
  for (const floor of FLOORS) {
    const component = node({ initialFloor: floor });
    assert.equal(elevatorParameterError(component), null);
    const state = initialElevatorState(component);
    const output = evaluateElevator(component, state, {});
    assert.equal(output.position, floor);
    for (const sensor of FLOORS) assert.equal(output[`floor${sensor}`], Number(sensor === floor));
    const reset = next({ ...state, position: 5.5 }, { reset: 1, up: 1 }, 1, component);
    assert.equal(reset.position, floor);
    assert.equal(evaluateElevator(component, reset, { reset: 1, up: 1 }).moving, 0);
  }
});

test('held RESET overrides travel requests and keeps MOVING low at the configured starting position', () => {
  const component = node({ initialFloor: 1 });
  let state = { ...initialElevatorState(component), position: 1.5, moving: 1 };
  for (const inputs of [
    { reset: 1, up: 1 },
    { reset: 1, down: 1 },
    { reset: 1, up: 'X' },
  ]) {
    state = next(state, inputs, 2, component);
    const output = evaluateElevator(component, state, inputs);
    assert.equal(state.position, 1);
    assert.equal(state.moving, 0);
    assert.equal(output.position, 1);
    assert.equal(output.moving, 0);
  }
});

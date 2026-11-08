import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { createRuntime, simulate } from '../src/simulator.js';

const node = (id, type, params = {}) => ({ id, type, x: 0, y: 0, enabled: true, params });
const wire = (id, source, output, target, input) => ({
  id,
  from: { node: source, port: output },
  to: { node: target, port: input },
});
const near = (actual, expected) =>
  assert.ok(
    typeof actual === 'number' && Math.abs(actual - expected) < 1e-8,
    `${actual} ≠ ${expected}`,
  );

function axis(parameters = {}) {
  const project = {
    nodes: [
      node('step', 'switch', { value: 0 }),
      node('dir', 'switch', { value: 1 }),
      node('enable', 'switch', { value: 1 }),
      node('reset', 'switch', { value: 0 }),
      node('motor', 'stepper', { initial: 5, ...parameters }),
    ],
    wires: ['step', 'dir', 'enable', 'reset'].map((id) => wire(id, id, 'out', 'motor', id)),
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  const set = (id, value) => {
    project.nodes.find((item) => item.id === id).params.value = value;
    simulate(project, runtime, 0.001);
  };
  const pulse = () => {
    set('step', 0);
    set('step', 1);
  };
  return {
    project,
    runtime,
    set,
    pulse,
    motor: project.nodes.at(-1),
    read: () => runtime.outputs.motor,
  };
}

test('STEP rising edges convert full steps and microsteps to millimeters and unwrapped degrees', () => {
  const fixture = axis({ initial: 0 });
  for (let index = 0; index < 200; index++) fixture.pulse();
  near(fixture.read().position, 8);
  near(fixture.read().angle, 360);
  const micro = axis({ initial: 0, microsteps: 4 });
  for (let index = 0; index < 4; index++) micro.pulse();
  near(micro.read().position, 0.04);
  near(micro.read().angle, 1.8);
  micro.set('dir', 0);
  micro.pulse();
  near(micro.read().position, 0.03);
});

test('a held STEP and a direction change without a fresh rising edge do not move the motor', () => {
  const fixture = axis();
  fixture.pulse();
  near(fixture.read().position, 5.04);
  assert.equal(fixture.read().moving, 1);
  for (let sample = 0; sample < 10; sample++) simulate(fixture.project, fixture.runtime, 0.001);
  near(fixture.read().position, 5.04);
  assert.equal(fixture.read().moving, 0);
  fixture.set('dir', 0);
  near(fixture.read().position, 5.04);
  fixture.pulse();
  near(fixture.read().position, 5);
});

test('enable and component activation hold position without replaying ignored edges', () => {
  const fixture = axis();
  fixture.set('enable', 0);
  fixture.pulse();
  near(fixture.read().position, 5);
  fixture.set('enable', 1);
  near(fixture.read().position, 5);
  fixture.pulse();
  near(fixture.read().position, 5.04);
  fixture.motor.enabled = false;
  fixture.set('step', 0);
  fixture.set('step', 1);
  assert.equal(fixture.read().position, 'Z');
  fixture.motor.enabled = true;
  simulate(fixture.project, fixture.runtime, 0.001);
  near(fixture.read().position, 5.04);
  fixture.pulse();
  near(fixture.read().position, 5.08);
});

test('a newly connected high STEP source and a reconnected high source cannot invent movement', () => {
  const fixture = axis();
  fixture.project.nodes.push(node('replacement', 'switch', { value: 1 }));
  fixture.project.wires.find((item) => item.id === 'step').from.node = 'replacement';
  simulate(fixture.project, fixture.runtime, 0.001);
  near(fixture.read().position, 5);
  const connection = fixture.project.wires.shift();
  simulate(fixture.project, fixture.runtime, 0.001);
  fixture.project.wires.push(connection);
  simulate(fixture.project, fixture.runtime, 0.001);
  near(fixture.read().position, 5);
  fixture.set('replacement', 0);
  fixture.set('replacement', 1);
  near(fixture.read().position, 5.04);
});

test('reset restores the configured initial millimeters without treating a high STEP as another step', () => {
  const fixture = axis({ initial: 5.125 });
  fixture.pulse();
  near(fixture.read().position, 5.165);
  fixture.set('reset', 1);
  near(fixture.read().position, 5.125);
  fixture.set('reset', 0);
  near(fixture.read().position, 5.125);
  fixture.pulse();
  near(fixture.read().position, 5.165);
  const clamped = axis({ initial: 300 });
  near(clamped.read().position, 200);
});

test('mechanical endpoints clamp travel and a reversed direction moves away from the stop', () => {
  const fixture = axis({ initial: 0.08, min: 0, max: 0.1 });
  fixture.pulse();
  near(fixture.read().position, 0.1);
  fixture.pulse();
  near(fixture.read().position, 0.1);
  assert.equal(fixture.read().moving, 0);
  fixture.set('dir', 0);
  for (let index = 0; index < 3; index++) fixture.pulse();
  near(fixture.read().position, 0);
  fixture.pulse();
  near(fixture.read().position, 0);
});

test('an uncertain direction or enable at a step edge makes position unknown until reset', () => {
  for (const pin of ['dir', 'enable']) {
    const fixture = axis();
    fixture.project.nodes.push(node('conflict', 'switch', { value: 0 }));
    fixture.project.wires.push(wire('conflict', 'conflict', 'out', 'motor', pin));
    simulate(fixture.project, fixture.runtime, 0.001);
    fixture.pulse();
    assert.equal(fixture.read().position, 'X', pin);
    assert.ok(fixture.runtime.diagnostics.some(({ code }) => code === 'motion_unknown'));
    fixture.project.wires.pop();
    fixture.set('reset', 1);
    near(fixture.read().position, 5);
  }
});

test('floating STEP holds known position, floating DIR faults only on a step, and optional controls have explicit defaults', () => {
  const fixture = axis();
  fixture.project.wires = fixture.project.wires.filter(
    ({ id }) => !['enable', 'reset'].includes(id),
  );
  simulate(fixture.project, fixture.runtime, 0.001);
  fixture.pulse();
  near(fixture.read().position, 5.04);
  fixture.project.wires = fixture.project.wires.filter(({ id }) => id !== 'step');
  simulate(fixture.project, fixture.runtime, 0.001);
  near(fixture.read().position, 5.04);
  fixture.project.wires.push(wire('step', 'step', 'out', 'motor', 'step'));
  fixture.project.wires = fixture.project.wires.filter(({ id }) => id !== 'dir');
  fixture.pulse();
  assert.equal(fixture.read().position, 'X');
});

test('invalid mechanical parameters fail visibly without exceptions or numeric corruption', () => {
  for (const parameters of [
    { stepsPerRevolution: 0 },
    { stepsPerRevolution: 1.5 },
    { microsteps: -1 },
    { microsteps: 0.5 },
    { lead: 0 },
    { min: 20, max: 10 },
  ]) {
    const fixture = axis(parameters);
    assert.equal(fixture.read().position, 'X');
    assert.equal(fixture.read().angle, 'X');
    assert.ok(fixture.runtime.diagnostics.some(({ code }) => code === 'invalid_motion'));
  }
});

function sensor(type, position, params = {}) {
  const project = {
    nodes: [node('axis', 'stepper', { initial: position }), node('sensor', type, params)],
    wires: [wire('position', 'axis', 'position', 'sensor', 'position')],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime, read: () => runtime.outputs.sensor };
}

test('endstops detect inclusive minimum/maximum boundaries and normally-closed contacts invert only known signals', () => {
  assert.equal(sensor('limit_switch', 5, { threshold: 5, mode: 'below' }).read().out, 1);
  assert.equal(sensor('limit_switch', 6, { threshold: 5, mode: 'below' }).read().out, 0);
  assert.equal(sensor('limit_switch', 5, { threshold: 5, mode: 'above' }).read().out, 1);
  assert.equal(sensor('limit_switch', 4, { threshold: 5, mode: 'above' }).read().out, 0);
  assert.equal(sensor('limit_switch', 5, { threshold: 5, normallyClosed: true }).read().out, 0);
  assert.equal(sensor('limit_switch', 6, { threshold: 5, normallyClosed: true }).read().out, 1);
  const floating = sensor('limit_switch', 5, { normallyClosed: true });
  floating.project.wires = [];
  simulate(floating.project, floating.runtime, 0);
  assert.equal(floating.read().out, 'X');
});

test('position windows measure actual millimeters and dynamic TARGET overrides Threshold', () => {
  const fixture = sensor('position_sensor', 5.5, { threshold: 5, tolerance: 0.5, mode: 'window' });
  assert.deepEqual(fixture.read(), { position: 5.5, out: 1 });
  fixture.project.nodes.push(
    node('code', 'bus_input', { value: 255 }),
    node('target', 'dac', { vcc: 8 }),
  );
  fixture.project.wires.push(
    ...Array.from({ length: 8 }, (_, bit) =>
      wire(`code-target-${bit}`, 'code', `out${bit}`, 'target', `in${bit}`),
    ),
    wire('target-sensor', 'target', 'out', 'sensor', 'target'),
  );
  simulate(fixture.project, fixture.runtime, 0);
  assert.equal(fixture.read().out, 0);
  fixture.project.nodes[1].params.mode = 'below';
  simulate(fixture.project, fixture.runtime, 0);
  assert.equal(fixture.read().out, 1);
  fixture.project.nodes[1].params.mode = 'above';
  simulate(fixture.project, fixture.runtime, 0);
  assert.equal(fixture.read().out, 0);
  fixture.project.nodes.find(({ id }) => id === 'target').enabled = false;
  simulate(fixture.project, fixture.runtime, 0);
  assert.equal(fixture.read().out, 'X');
  near(fixture.read().position, 5.5);
});

test('position sensors preserve Z/X measurements and reject invalid modes rather than inventing a detection', () => {
  const fixture = sensor('position_sensor', 5);
  fixture.project.wires = [];
  simulate(fixture.project, fixture.runtime, 0);
  assert.deepEqual(fixture.read(), { position: 'Z', out: 'X' });
  fixture.project.nodes.push(node('bad', 'dac'));
  fixture.project.wires.push(wire('unknown', 'bad', 'out', 'sensor', 'position'));
  simulate(fixture.project, fixture.runtime, 0);
  assert.deepEqual(fixture.read(), { position: 'X', out: 'X' });
  assert.equal(sensor('position_sensor', 5, { mode: 'unsupported' }).read().out, 'X');
  assert.equal(sensor('position_sensor', 5, { tolerance: -1 }).read().out, 'X');
  assert.equal(sensor('limit_switch', 5, { mode: 'unsupported' }).read().out, 'X');
});

test('homing sensor feedback stops motion after committing the step that reaches the endstop', () => {
  const fixture = axis({ initial: 0.12, min: 0, max: 1 });
  fixture.project.wires = fixture.project.wires.filter(({ id }) => id !== 'enable');
  fixture.project.nodes.push(
    node('home', 'limit_switch'),
    node('not-home', 'not'),
    node('permission', 'or'),
  );
  fixture.project.wires.push(
    wire('sense', 'motor', 'position', 'home', 'position'),
    wire('invert', 'home', 'out', 'not-home', 'a'),
    wire('negative-permission', 'not-home', 'out', 'permission', 'a'),
    wire('positive-permission', 'dir', 'out', 'permission', 'b'),
    wire('permission', 'permission', 'out', 'motor', 'enable'),
  );
  fixture.set('dir', 0);
  for (let index = 0; index < 3; index++) fixture.pulse();
  near(fixture.read().position, 0);
  assert.equal(fixture.runtime.outputs.home.out, 1);
  for (let index = 0; index < 5; index++) fixture.pulse();
  near(fixture.read().position, 0);
  fixture.set('step', 0);
  fixture.set('dir', 1);
  fixture.pulse();
  near(fixture.read().position, 0.04);
  assert.equal(fixture.runtime.outputs.home.out, 0);
});

test('a below/window sensor feedback loop approaches a target from both directions and holds inside tolerance', () => {
  const fixture = axis({ initial: 0, min: 0, max: 1 });
  fixture.project.wires = fixture.project.wires.filter(({ id }) => !['dir', 'enable'].includes(id));
  fixture.project.nodes.push(
    node('direction', 'position_sensor', { threshold: 0.12, mode: 'below' }),
    node('window', 'position_sensor', { threshold: 0.12, tolerance: 0.001, mode: 'window' }),
    node('outside', 'not'),
  );
  fixture.project.wires.push(
    wire('direction-position', 'motor', 'position', 'direction', 'position'),
    wire('window-position', 'motor', 'position', 'window', 'position'),
    wire('direction', 'direction', 'out', 'motor', 'dir'),
    wire('window-not', 'window', 'out', 'outside', 'a'),
    wire('enable', 'outside', 'out', 'motor', 'enable'),
  );
  simulate(fixture.project, fixture.runtime, 0);
  for (let index = 0; index < 8; index++) fixture.pulse();
  near(fixture.read().position, 0.12);
  fixture.project.nodes.find(({ id }) => id === 'direction').params.threshold = 0.04;
  fixture.project.nodes.find(({ id }) => id === 'window').params.threshold = 0.04;
  fixture.set('step', 0);
  for (let index = 0; index < 8; index++) fixture.pulse();
  near(fixture.read().position, 0.04);
  assert.equal(fixture.runtime.outputs.window.out, 1);
});

test('mechanical ports carry unit metadata for views and inspectors', () => {
  assert.equal(getDefinition('stepper').outputs.find(({ id }) => id === 'position').unit, 'mm');
  assert.equal(getDefinition('stepper').outputs.find(({ id }) => id === 'angle').unit, '°');
  for (const type of ['position_sensor', 'limit_switch'])
    assert.equal(getDefinition(type).inputs[0].unit, 'mm');
  assert.equal(
    getDefinition('position_sensor').inputs.find(({ id }) => id === 'target').unit,
    'mm',
  );
});

import { node, wire, circuit, source, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('live edits update source values, reused node IDs, wire endpoints and fan-out without stale connectivity', () => {
  const project = circuit(
    [source('a', 0), source('b', 1), node('gate', 'not')],
    [wire('a', 'out', 'gate', 'a')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'gate'), 1);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
  project.nodes[0] = source('a', 0);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 1);
  project.wires[0].from.node = 'b';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
  project.wires.push(wire('a', 'out', 'gate', 'a'));
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 'X');
  project.wires.pop();
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
});

test('editing a detached old wire cannot alter the current circuit after a same-endpoint replacement', () => {
  const project = circuit(
    [source('a', 0), source('b', 1), node('gate', 'not')],
    [wire('a', 'out', 'gate', 'a')],
  );
  const runtime = evaluate(project);
  const old = project.wires[0];
  project.wires = structuredClone(project.wires);
  simulate(project, runtime, 0);
  old.from.node = 'b';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 1);
  assert.equal(runtime.inputs.gate.a, 0);
});

test('changing a component type under a reused ID initializes its own state and drops old output contacts', () => {
  const project = circuit(
    [source('clock', 0), node('device', 'not')],
    [wire('clock', 'out', 'device', 'a')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'device'), 1);
  project.nodes[1] = node('device', 'counter', { initial: 7 });
  project.wires[0].to.port = 'clk';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'device'), 7);
  assert.equal(runtime.outputs.device.out, undefined);
  assert.equal(runtime.outputs.device.out0, 1);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'device'), 8);
});

test('strong conflicts produce X; weak pull-up is overridden by an open drain', () => {
  const project = circuit(
    [
      source('control', 1),
      node('drain', 'open_drain'),
      node('pull', 'pullup'),
      node('lamp', 'led'),
    ],
    [
      wire('control', 'out', 'drain', 'in'),
      wire('drain', 'out', 'lamp', 'in'),
      wire('pull', 'out', 'lamp', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(runtime.inputs.lamp.in, 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.lamp.in, 0);
  project.nodes.push(source('strong', 1));
  project.wires.push(wire('strong', 'out', 'lamp', 'in'));
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.lamp.in, 'X');
});

test('disabled outputs release the bus and simulation removes deleted state', () => {
  const project = circuit([source('s', 1), node('l', 'led')], [wire('s', 'out', 'l', 'in')]);
  const runtime = evaluate(project);
  project.nodes[0].enabled = false;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.l.in, 'Z');
  project.nodes.shift();
  simulate(project, runtime, 0);
  assert.equal(runtime.state.s, undefined);
});

test('shared output fan-out joins a physical net for wired-AND and bus conflicts', () => {
  const project = circuit(
    [
      source('control', 0),
      node('drain', 'open_drain'),
      node('pull', 'pullup'),
      node('a', 'led'),
      node('b', 'led'),
    ],
    [
      wire('control', 'out', 'drain', 'in'),
      wire('drain', 'out', 'a', 'in'),
      wire('pull', 'out', 'a', 'in'),
      wire('pull', 'out', 'b', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(runtime.inputs.a.in, 0);
  assert.equal(runtime.inputs.b.in, 0);
  assert.equal(runtime.wireValues['pull.out-b.in'], 0);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.a.in, 1);
  assert.equal(runtime.inputs.b.in, 1);
});

test('direct simulator calls safely support identifiers inherited by ordinary objects', () => {
  const project = circuit(
    [
      source('value', 1),
      node('constructor', 'ram'),
      node('toString', 'scope'),
      node('__proto__', 'd_ff'),
    ],
    [
      { ...wire('value', 'out', 'toString', 'in'), id: 'constructor' },
      { ...wire('value', 'out', '__proto__', 'd'), id: 'toString' },
      { ...wire('value', 'out', '__proto__', 'clk'), id: '__proto__' },
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0.001);
  // Every possible unread address contains zero, so the read consensus is known.
  assert.equal(output(runtime, 'constructor'), 0);
  assert.equal(output(runtime, '__proto__', 'q'), 1);
  assert.deepEqual(runtime.history.toString, [1]);
  assert.deepEqual(runtime.history.constructor, [0]);
  assert.equal(runtime.wireValues.__proto__, 1);
  for (const key of ['outputs', 'inputs', 'wireValues', 'state', 'history'])
    assert.equal(Object.getPrototypeOf(runtime[key]), null, key);
  project.nodes = project.nodes.filter((component) => component.id !== '__proto__');
  simulate(project, runtime, 0.001);
  assert.equal(runtime.state.__proto__, undefined);
  assert.deepEqual(runtime.history.toString, [1, 1]);
});

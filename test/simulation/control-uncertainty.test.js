import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { node, source, byte, wire, circuit, output } from './core/fixtures/simulator.js';

function value(project, id, next) {
  project.nodes.find((item) => item.id === id).params.value = next;
}
function rig(type, params = {}) {
  const project = circuit(
    [
      source('clk', 0),
      source('zero', 0),
      source('one', 1),
      byte('data', 0),
      byte('address', 0),
      node('target', type, params),
    ],
    [wire('clk', 'out', 'target', 'clk')],
  );
  const runtime = createRuntime();
  const run = () => simulate(project, runtime, 0);
  const connect = (id, port, input) => {
    project.wires.push(...circuit(project.nodes, [wire(id, port, 'target', input)]).wires);
  };
  const pulse = () => {
    value(project, 'clk', 0);
    run();
    value(project, 'clk', 1);
    run();
  };
  return { project, runtime, run, connect, pulse };
}

test('an uncertain reset preserves agreement and exposes disagreement for D/JK/T storage', () => {
  for (const type of ['d_ff', 'jk_ff', 't_ff']) {
    const f = rig(type);
    if (type === 'd_ff') f.connect('one', 'out', 'd');
    else if (type === 'jk_ff') {
      f.connect('one', 'out', 'j');
      f.connect('zero', 'out', 'k');
    } else f.connect('one', 'out', 't');
    f.connect('zero', 'out', 'reset');
    f.connect('one', 'out', 'reset');
    f.run();
    assert.equal(
      output(f.runtime, 'target', 'q'),
      0,
      `${type}: both reset/no-reset retain startup zero`,
    );
    f.pulse();
    assert.equal(output(f.runtime, 'target', 'q'), 'X', type);
    assert.equal(output(f.runtime, 'target', 'nq'), 'X', type);
    f.project.wires = f.project.wires.filter(
      (w) => w.to.port !== 'reset' || w.from.node !== 'zero',
    );
    f.run();
    assert.equal(output(f.runtime, 'target', 'q'), 0, type);
  }
});

test('uncertain register enable merges captured and retained data independently per bit', () => {
  const f = rig('register');
  value(f.project, 'data', 0xf0);
  f.connect('data', 'out', 'd');
  f.connect('zero', 'out', 'enable');
  f.connect('one', 'out', 'enable');
  f.run();
  f.pulse();
  assert.deepEqual(Object.values(f.runtime.outputs.target), [0, 0, 0, 0, 'X', 'X', 'X', 'X']);
  f.project.wires = f.project.wires.filter((w) => w.to.port !== 'enable' || w.from.node !== 'zero');
  f.pulse();
  assert.equal(output(f.runtime, 'target'), 0xf0);
  f.connect('zero', 'out', 'reset');
  f.connect('one', 'out', 'reset');
  f.run();
  assert.deepEqual(Object.values(f.runtime.outputs.target), [0, 0, 0, 0, 'X', 'X', 'X', 'X']);
});

test('uncertain counter enable loses only count bits that can differ', () => {
  const f = rig('counter');
  f.connect('zero', 'out', 'enable');
  f.connect('one', 'out', 'enable');
  f.run();
  f.pulse();
  assert.deepEqual(Object.values(f.runtime.outputs.target), ['X', 0, 0, 0, 0, 0, 0, 0]);
  f.project.wires = f.project.wires.filter((w) => w.to.port !== 'enable' || w.from.node !== 'zero');
  f.pulse();
  assert.deepEqual(Object.values(f.runtime.outputs.target), ['X', 'X', 0, 0, 0, 0, 0, 0]);
});

test('a connected floating enable is uncertain while an absent optional enable uses its documented default', () => {
  const f = rig('counter');
  f.project.nodes.push(node('released', 'tristate'));
  f.project.wires.push(wire('zero', 'out', 'released', 'enable'));
  f.connect('released', 'out0', 'enable');
  f.run();
  f.pulse();
  assert.equal(f.runtime.inputs.target.enable, 'Z');
  assert.ok(
    f.runtime.diagnostics.some(
      (entry) => entry.code === 'floating' && entry.node === 'target' && entry.port === 'enable',
    ),
  );
  assert.deepEqual(Object.values(f.runtime.outputs.target), ['X', 0, 0, 0, 0, 0, 0, 0]);
  const absent = rig('counter');
  absent.run();
  absent.pulse();
  assert.equal(output(absent.runtime, 'target'), 1);
});

test('ROM uncertain CS/OE produces uncertain pins; a definite disable dominates other uncertainty', () => {
  for (const port of ['cs', 'oe']) {
    const f = rig('rom', { data: '255' });
    f.project.wires = [];
    f.connect('address', 'nibble', 'address');
    f.connect('zero', 'out', port);
    f.connect('one', 'out', port);
    f.run();
    assert.deepEqual(Object.values(f.runtime.outputs.target), Array(8).fill('X'), port);
    f.project.nodes.push(source('disable', 0));
    f.connect('disable', 'out', port === 'cs' ? 'oe' : 'cs');
    f.run();
    assert.deepEqual(Object.values(f.runtime.outputs.target), Array(8).fill('Z'), port);
  }
});

test('a possible RAM write merges old and new bytes instead of silently skipping the write', () => {
  const f = rig('ram');
  f.connect('address', 'nibble', 'address');
  f.connect('data', 'out', 'data');
  f.connect('one', 'out', 'we');
  value(f.project, 'data', 0xf0);
  f.run();
  f.pulse();
  value(f.project, 'data', 0xcc);
  f.connect('zero', 'out', 'we');
  f.pulse();
  assert.equal(f.runtime.inputs.target.we, 'X');
  assert.deepEqual(
    Object.values(f.runtime.outputs.target),
    Array(8).fill('X'),
    'read permission is also uncertain',
  );
  f.project.wires = f.project.wires.filter((w) => w.to.port !== 'we' || w.from.node !== 'one');
  f.run();
  assert.deepEqual(Object.values(f.runtime.outputs.target), [0, 0, 'X', 'X', 'X', 'X', 1, 1]);
});

test('an uncertain write address modifies only cells it can select, retaining all other cells and matching bits', () => {
  for (const type of ['ram', 'register_file']) {
    const f = rig(type);
    const address = type === 'ram' ? 'address' : 'write';
    f.connect('address', type === 'ram' ? 'nibble' : 'address', address);
    f.project.nodes.push(source('addressHigh', 1));
    f.connect('addressHigh', 'out', `${address}0`);
    f.connect('data', 'out', 'data');
    f.connect('one', 'out', 'we');
    value(f.project, 'data', 1);
    f.run();
    f.pulse();
    assert.deepEqual(f.runtime.state.target.memoryBits[0], ['X', 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(f.runtime.state.target.memoryBits[1], ['X', 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(f.runtime.state.target.memoryBits[2], Array(8).fill(0));
  }
});

test('uncertain addresses preserve unanimous memory bits during reads', () => {
  const f = rig('ram');
  f.connect('address', 'nibble', 'address');
  f.connect('data', 'out', 'data');
  f.connect('one', 'out', 'we');
  value(f.project, 'data', 0xaa);
  f.run();
  f.pulse();
  value(f.project, 'address', 1);
  value(f.project, 'data', 0xab);
  f.pulse();
  f.project.wires = f.project.wires.filter((w) => w.to.port !== 'we');
  f.connect('zero', 'out', 'we');
  f.project.nodes.push(source('addressLow', 0));
  f.connect('addressLow', 'out', 'address0');
  f.run();
  assert.deepEqual(Object.values(f.runtime.outputs.target), ['X', 1, 0, 1, 0, 1, 0, 1]);
});

test('a possible write of the same data does not destroy known memory contents', () => {
  const f = rig('ram');
  f.connect('address', 'nibble', 'address');
  f.connect('data', 'out', 'data');
  f.connect('zero', 'out', 'we');
  f.connect('one', 'out', 'we');
  f.run();
  f.pulse();
  assert.deepEqual(f.runtime.state.target.memoryBits[0], Array(8).fill(0));
});

test('uncertain clock transitions merge hold/capture and unchanged X never invents another event', () => {
  const f = rig('d_ff');
  f.connect('one', 'out', 'd');
  f.run();
  f.connect('one', 'out', 'clk');
  f.run();
  assert.equal(output(f.runtime, 'target', 'q'), 'X');
  const state = structuredClone(f.runtime.state.target);
  f.run();
  assert.deepEqual(f.runtime.state.target, state);
  f.project.wires = f.project.wires.filter((w) => w.to.port !== 'clk' || w.from.node !== 'one');
  f.pulse();
  assert.equal(output(f.runtime, 'target', 'q'), 1);
});

test('an uncertain STEP cannot silently retain a definite motor position', () => {
  const f = rig('stepper');
  f.project.wires = [];
  f.project.nodes.push(source('stepConflict', 0));
  f.connect('clk', 'out', 'step');
  f.connect('one', 'out', 'dir');
  f.connect('stepConflict', 'out', 'step');
  f.run();
  value(f.project, 'stepConflict', 1);
  f.run();
  assert.equal(f.runtime.inputs.target.step, 'X');
  assert.equal(output(f.runtime, 'target', 'position'), 'X');
});

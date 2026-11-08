import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../examples/index.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';

function open(id) {
  const context = { project: createExample(id), runtime: createRuntime() };
  simulate(context.project, context.runtime, 0);
  return context;
}
function set(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}
function pulse(context) {
  set(context, 'clock', 0);
  set(context, 'clock', 1);
  set(context, 'clock', 0);
}
const output = (context, node, port = 'out') => context.runtime.signals.outputs[node][port];

test('serial-loading laboratory captures each MSB-first bit once and resets asynchronously', () => {
  const context = open('shift-register-sequence');
  const bits = [1, 0, 1, 0, 0, 1, 0, 1];
  const expected = [1, 2, 5, 10, 20, 41, 82, 165];
  for (let index = 0; index < bits.length; index++) {
    set(context, 'ser', bits[index]);
    set(context, 'clock', 1);
    assert.equal(output(context, 'shift'), expected[index]);
    set(context, 'ser', 1 - bits[index]);
    assert.equal(
      output(context, 'shift'),
      expected[index],
      'A steady high CLK cannot capture again.',
    );
    set(context, 'clock', 0);
  }
  assert.equal(output(context, 'shift', 'serial'), 1);
  for (let bit = 0; bit < 8; bit++)
    assert.equal(context.runtime.inputs[`bit${bit}`].in, (165 >> bit) & 1);
  set(context, 'clock', 1);
  set(context, 'reset', 1);
  assert.equal(output(context, 'shift'), 0, 'RST clears despite CLK already being high.');
  set(context, 'reset', 0);
  assert.equal(output(context, 'shift'), 0);
});

test('RAM addressing laboratory retains all 16 locations and separates CS, WE and OE', () => {
  const context = open('ram-addressing');
  for (let address = 0; address < 16; address++) {
    set(context, 'address', address);
    set(context, 'data', address * 17);
    set(context, 'write', 1);
    assert.equal(output(context, 'memory'), 'Z');
    pulse(context);
    set(context, 'write', 0);
  }
  for (const address of [15, 0, 7, 2, 9, 1, 14, 3, 13, 4, 12, 5, 11, 6, 10, 8]) {
    set(context, 'address', address);
    assert.equal(output(context, 'memory'), address * 17);
  }
  set(context, 'address', 2);
  set(context, 'data', 255);
  pulse(context);
  assert.equal(output(context, 'memory'), 34, 'WE=0 prevents a full write pulse.');
  set(context, 'chip', 0);
  set(context, 'write', 1);
  pulse(context);
  set(context, 'write', 0);
  set(context, 'chip', 1);
  assert.equal(output(context, 'memory'), 34, 'CS=0 prevents storage changes.');
  set(context, 'read', 0);
  set(context, 'write', 1);
  pulse(context);
  set(context, 'write', 0);
  assert.equal(output(context, 'memory'), 'Z');
  set(context, 'read', 1);
  assert.equal(output(context, 'memory'), 255, 'OE controls visibility, not write permission.');
});

test('ROM lookup laboratory maps every hexadecimal address to its exact segment mask', () => {
  const context = open('rom-lookup');
  const masks = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111, 119, 124, 57, 94, 121, 113];
  for (let address = 0; address < 16; address++) {
    set(context, 'address', address);
    assert.equal(output(context, 'rom'), masks[address]);
    assert.equal(context.runtime.signals.inputs.display.in, masks[address]);
  }
  for (const control of ['read', 'chip']) {
    set(context, control, 0);
    assert.equal(output(context, 'rom'), 'Z');
    set(context, control, 1);
    assert.equal(output(context, 'rom'), 113);
  }
  const changed = [...masks];
  changed[1] = 63;
  set(context, 'rom', changed.join(','), 'data');
  set(context, 'address', 1);
  assert.equal(context.runtime.signals.inputs.display.in, 63);
  set(context, 'address', 10);
  assert.equal(output(context, 'rom'), 119, 'Changing one table entry preserves other glyphs.');
});

test('register-file laboratory writes WA while RA independently selects another retained byte', () => {
  const context = open('register-file-addressing');
  set(context, 'read-address', 7);
  set(context, 'write', 1);
  for (let address = 0; address < 8; address++) {
    set(context, 'write-address', address);
    set(context, 'data', 30 + address);
    pulse(context);
    assert.equal(output(context, 'registers'), address === 7 ? 37 : 0);
  }
  set(context, 'write', 0);
  for (let address = 0; address < 8; address++) {
    set(context, 'read-address', address);
    assert.equal(output(context, 'registers'), 30 + address);
  }
  set(context, 'data', 255);
  pulse(context);
  assert.equal(output(context, 'registers'), 37, 'WE=0 preserves the addressed register.');
  set(context, 'read-address', 13);
  assert.equal(context.runtime.signals.inputs.registers.read, 5);
  assert.equal(output(context, 'registers'), 35);
});

test('bank-select laboratory decodes all 32 addresses without aliasing equal local offsets', () => {
  const context = open('memory-bank-select');
  for (let address = 0; address < 32; address++) {
    set(context, 'address', address);
    set(context, 'data', address * 7 + 3);
    set(context, 'write', 1);
    pulse(context);
    set(context, 'write', 0);
  }
  for (let address = 0; address < 32; address++) {
    set(context, 'address', address);
    const bank = address < 16 ? 0 : 1;
    assert.equal(context.runtime.signals.inputs[`bank${bank}`].address, address & 15);
    assert.equal(context.runtime.inputs[`bank${bank}-led`].in, 1);
    assert.equal(context.runtime.inputs[`bank${1 - bank}-led`].in, 0);
    assert.equal(output(context, `bank${1 - bank}`), 'Z');
    assert.equal(output(context, 'read-byte'), address * 7 + 3);
    assert.deepEqual(context.runtime.diagnostics, []);
  }
  set(context, 'read', 0);
  assert.equal(output(context, 'read-byte'), 'Z');
  set(context, 'read', 1);
  assert.equal(output(context, 'read-byte'), 220);
});

test('memory action presets reference actual controls, preserve bit contacts, and reproduce their results', () => {
  for (const [id, node, expected] of [
    ['shift-register-sequence', 'shift', 165],
    ['ram-addressing', 'memory', 165],
    ['rom-lookup', 'rom', 113],
    ['register-file-addressing', 'registers', 170],
    ['memory-bank-select', 'read-byte', 165],
  ]) {
    const example = EXAMPLES.find((item) => item.id === id);
    const context = open(id);
    let time = 0;
    for (const action of example.actionPreset) {
      assert.ok(action.at >= time);
      simulate(context.project, context.runtime, action.at - time);
      const source = context.project.nodes.find((item) => item.id === action.node);
      assert.ok(['switch', 'bus_input'].includes(source.type));
      assert.equal(action.key, 'value');
      set(context, action.node, action.value);
      time = action.at;
    }
    assert.equal(output(context, node), expected, id);
    assert.deepEqual(example.actionProbes, [{ node, port: 'out', side: 'outputs' }]);
    for (const component of context.project.nodes)
      for (const port of [
        ...getDefinition(component.type).inputs,
        ...getDefinition(component.type).outputs,
      ])
        assert.equal(port.width, 1);
    assert.ok(context.project.wires.every((wire) => wire.width === 1));
    assert.deepEqual(context.runtime.diagnostics, [], id);
  }
});

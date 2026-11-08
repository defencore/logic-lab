import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { parameterRule } from '../../src/components/parameter-rules.js';
import { SOURCE_PARAMETERS } from '../../src/simulation/input-sources.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';

const project = (params = {}, enabled = true) => ({
  nodes: [
    { id: 'key', type: 'hotkey', enabled, params },
    { id: 'lamp', type: 'led', params: {} },
  ],
  wires: [{ id: 'wire', from: { node: 'key', port: 'out' }, to: { node: 'lamp', port: 'in' } }],
});

test('hotkey has exactly one separate physical output bit and a binary recordable source contract', () => {
  const definition = getDefinition('hotkey');
  assert.deepEqual(definition.defaults, { binding: '', mode: 'hold', value: 0 });
  assert.deepEqual(definition.inputs, []);
  assert.equal(definition.outputs.length, 1);
  assert.equal(definition.outputs[0].id, 'out');
  assert.equal(definition.outputs[0].width, 1);
  assert.deepEqual(SOURCE_PARAMETERS.hotkey, { value: [0, 1, true] });
  assert.deepEqual(parameterRule('hotkey', 'value'), { min: 0, max: 1, step: 1, integer: true });
});

test('hold and inverted outputs follow raw press state while new inverted inputs start high', () => {
  for (const [mode, expected] of [
    ['hold', [0, 1, 0]],
    ['inverted', [1, 0, 1]],
  ]) {
    const circuit = project({ mode }),
      runtime = createRuntime();
    for (const [index, value] of [0, 1, 0].entries()) {
      circuit.nodes[0].params.value = value;
      simulate(circuit, runtime, 0);
      assert.equal(runtime.outputs.key.out, expected[index], `${mode}/${value}`);
      assert.equal(runtime.inputs.lamp.in, expected[index]);
    }
    const fresh = createRuntime();
    simulate(project({ mode }), fresh, 0);
    assert.equal(fresh.outputs.key.out, expected[0]);
  }
});

test('toggle stores the raw latched state without flipping again during simulation or repeated same-value actions', () => {
  const circuit = project({ binding: 'Shift+KeyK', mode: 'toggle', value: 0 }),
    runtime = createRuntime();
  for (const value of [0, 1, 1, 0, 0, 1]) {
    circuit.nodes[0].params.value = value;
    simulate(circuit, runtime, 0.05);
    assert.equal(runtime.outputs.key.out, value);
  }
  simulate(circuit, runtime, 1);
  assert.equal(runtime.outputs.key.out, 1);
});

test('invalid hotkey configuration stays unknown rather than presenting a plausible known output', () => {
  for (const params of [
    { mode: 'unsupported' },
    { value: -1 },
    { value: 2 },
    { value: 0.5 },
    { value: true },
    { binding: 'NotAKey' },
    { binding: 'Ctrl+KeyA' },
  ]) {
    const runtime = createRuntime();
    simulate(project(params), runtime, 0);
    assert.equal(runtime.outputs.key.out, 'X', JSON.stringify(params));
    assert.equal(runtime.inputs.lamp.in, 'X');
  }
});

test('disabled keyboard sources float independently of their pressed state or mode', () => {
  for (const mode of ['hold', 'inverted', 'toggle']) {
    const runtime = createRuntime();
    simulate(project({ mode, value: 1 }, false), runtime, 0);
    assert.equal(runtime.outputs.key.out, 'Z');
    assert.equal(runtime.inputs.lamp.in, 'Z');
  }
});

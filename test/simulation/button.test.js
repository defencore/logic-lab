import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { parameterRule } from '../../src/components/parameter-rules.js';
import { SOURCE_PARAMETERS } from '../../src/simulation/input-sources.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { getGuide } from '../../src/learning/guides/index.js';
import {
  createFragment,
  serializeFragment,
  parseFragment,
  instantiateFragment,
} from '../../src/circuits/fragments.js';

function project(value = 0) {
  return {
    version: 1,
    name: 'Button circuit',
    nodes: [
      { id: 'push', type: 'button', x: 0, y: 0, params: { value } },
      { id: 'lamp', type: 'led', x: 200, y: 0, params: {} },
    ],
    wires: [{ id: 'wire', from: { node: 'push', port: 'out' }, to: { node: 'lamp', port: 'in' } }],
  };
}

test('a momentary button is an independent binary source with one individual Q output and localized guidance', () => {
  const definition = getDefinition('button');
  assert.deepEqual(definition.defaults, { value: 0 });
  assert.deepEqual(definition.inputs, []);
  assert.equal(definition.outputs.length, 1);
  assert.deepEqual(definition.outputs[0], { id: 'out', label: 'Q', width: 1 });
  assert.deepEqual(SOURCE_PARAMETERS.button, { value: [0, 1, true] });
  assert.deepEqual(parameterRule('button', 'value'), { min: 0, max: 1, step: 1, integer: true });
  for (const language of ['en', 'ua']) {
    const guide = getGuide('button', language);
    assert.ok(guide.purpose.length > 40);
    assert.equal(guide.steps.length, 3);
    assert.ok(guide.outputs.out.length > 15);
  }
});

test('button output follows recorded 0/1 values exactly and disabling releases it to Z', () => {
  const circuit = project(),
    runtime = createRuntime();
  for (const value of [0, 1, 1, 0, 1, 0]) {
    circuit.nodes[0].params.value = value;
    simulate(circuit, runtime, 0);
    assert.equal(runtime.outputs.push.out, value);
    assert.equal(runtime.inputs.lamp.in, value);
  }
  for (const value of [-1, 0.5, 2, true, '1']) {
    circuit.nodes[0].params.value = value;
    simulate(circuit, runtime, 0);
    assert.equal(runtime.outputs.push.out, 'X');
  }
  circuit.nodes[0].params.value = 1;
  circuit.nodes[0].enabled = false;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.outputs.push.out, 'Z');
  assert.equal(runtime.inputs.lamp.in, 'Z');
});

test('copy/paste normalizes a transient press without changing the original held button', () => {
  const circuit = project(1),
    copied = createFragment(circuit, new Set(['push', 'lamp']));
  assert.equal(circuit.nodes[0].params.value, 1);
  assert.equal(copied.nodes[0].params.value, 0);
  const restored = parseFragment(serializeFragment(copied));
  let serial = 0;
  const pasted = instantiateFragment(restored, circuit, { uid: (kind) => `${kind}-${++serial}` });
  assert.equal(pasted.nodes.find(({ type }) => type === 'button').params.value, 0);
  assert.equal(circuit.nodes[0].params.value, 1);
  const runtime = createRuntime();
  simulate({ ...circuit, nodes: pasted.nodes, wires: pasted.wires }, runtime, 0);
  assert.equal(runtime.inputs[pasted.nodes.find(({ type }) => type === 'led').id].in, 0);
});

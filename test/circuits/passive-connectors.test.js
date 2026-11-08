import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { traceNet } from '../../src/circuits/continuity.js';

const node = (id, type, params = {}) => ({ id, type, params, enabled: true });
const wire = (id, from, port, to, input) => ({
  id,
  from: { node: from, port },
  to: { node: to, port: input },
});
function fixture(type, source = 'pullup') {
  const input = type === 'splitter' ? 'in0' : 'b0';
  const output = type === 'splitter' ? 'b0' : 'out0';
  return {
    nodes: [node('pull', source), node('connector', type), node('low', 'gnd'), node('led', 'led')],
    wires: [
      wire('before', 'pull', 'out', 'connector', input),
      wire('after', 'connector', output, 'led', 'in'),
      wire('low', 'low', 'out', 'led', 'in'),
    ],
  };
}
for (const type of ['splitter', 'merger']) {
  test(`${type} preserves weak pull strength and propagates contention back to the input`, () => {
    const project = fixture(type);
    const runtime = simulate(project, createRuntime(), 0);
    assert.equal(runtime.inputs.led.in, 0);
    assert.equal(runtime.inputs.connector[type === 'splitter' ? 'in0' : 'b0'], 0);
    assert.deepEqual(traceNet(project, { wire: 'before' }).wires, ['after', 'before', 'low']);
    project.nodes[0].type = 'vcc';
    simulate(project, runtime, 0);
    assert.equal(runtime.inputs.led.in, 'X');
    assert.equal(runtime.inputs.connector[type === 'splitter' ? 'in0' : 'b0'], 'X');
  });
  test(`${type} disconnects when disabled and rejoining invalidates compiled connectivity`, () => {
    const project = fixture(type, 'vcc');
    const runtime = simulate(project, createRuntime(), 0);
    assert.equal(runtime.inputs.led.in, 'X');
    project.nodes[1].enabled = false;
    simulate(project, runtime, 0);
    assert.equal(runtime.inputs.led.in, 0);
    assert.deepEqual(traceNet(project, { wire: 'before' }).wires, ['before']);
    project.nodes[1].enabled = true;
    simulate(project, runtime, 0);
    assert.equal(runtime.inputs.led.in, 'X');
  });
}

test('chained passive conductors preserve independent floating and weakly driven bit nets', () => {
  const project = {
    nodes: [
      node('pull', 'pullup'),
      node('a', 'splitter'),
      node('b', 'merger'),
      node('led', 'led'),
      node('other', 'led'),
    ],
    wires: [
      wire('pull', 'pull', 'out', 'a', 'in0'),
      wire('chain', 'a', 'b0', 'b', 'b0'),
      wire('out', 'b', 'out0', 'led', 'in'),
      wire('float', 'b', 'out1', 'other', 'in'),
    ],
  };
  const runtime = simulate(project, createRuntime(), 0);
  assert.equal(runtime.inputs.led.in, 1);
  assert.equal(runtime.inputs.other.in, 'Z');
  assert.deepEqual(traceNet(project, { wire: 'pull' }).wires, ['chain', 'out', 'pull']);
});

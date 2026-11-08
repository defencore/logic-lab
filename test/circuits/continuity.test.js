import test from 'node:test';
import assert from 'node:assert/strict';
import { traceNet } from '../../src/circuits/continuity.js';

const node = (id, type = 'and', params = {}) => ({ id, type, params, x: 0, y: 0 });
const input = (node, port = 'a') => ({ node, port, side: 'in' });
const output = (node, port = 'out') => ({ node, port, side: 'out' });
const wire = (id, from, to) => ({
  id,
  from: { node: from.node, port: from.port },
  to: { node: to.node, port: to.port },
});
const empty = { wires: [], pins: [], nodes: [] };

function fanout() {
  return {
    nodes: [node('source', 'switch', { value: 1 }), node('gate'), node('lamp', 'led')],
    wires: [
      wire('to-gate', output('source'), input('gate')),
      wire('to-lamp', output('source'), input('lamp', 'in')),
    ],
  };
}

test('continuity traces every shared-output branch from either a pin or a wire', () => {
  const project = fanout();
  const expected = {
    wires: ['to-gate', 'to-lamp'],
    pins: [input('gate'), input('lamp', 'in'), output('source')],
    nodes: ['gate', 'lamp', 'source'],
  };
  assert.deepEqual(traceNet(project, output('source')), expected);
  assert.deepEqual(traceNet(project, input('lamp', 'in')), expected);
  assert.deepEqual(traceNet(project, { wire: 'to-gate' }), expected);
});

test('shared inputs join drivers and all their branches into one physical net', () => {
  const project = fanout();
  project.nodes.push(node('other', 'switch', { value: 0 }), node('far', 'led'));
  project.wires.push(
    wire('other-driver', output('other'), input('gate')),
    wire('other-branch', output('other'), input('far', 'in')),
  );
  const result = traceNet(project, output('source'));
  assert.deepEqual(result.wires, ['other-branch', 'other-driver', 'to-gate', 'to-lamp']);
  assert.deepEqual(result.nodes, ['far', 'gate', 'lamp', 'other', 'source']);
  assert.ok(result.pins.some((pin) => pin.node === 'other' && pin.side === 'out'));
  assert.ok(!result.pins.some((pin) => pin.node === 'gate' && pin.port === 'b'));
});

test('continuity never propagates through component logic or across other pins', () => {
  const project = {
    nodes: [node('source', 'switch'), node('gate'), node('sink', 'led')],
    wires: [
      wire('before-gate', output('source'), input('gate')),
      wire('after-gate', output('gate'), input('sink', 'in')),
    ],
  };
  assert.deepEqual(traceNet(project, output('source')).wires, ['before-gate']);
  assert.deepEqual(traceNet(project, output('gate')).wires, ['after-gate']);
  assert.deepEqual(traceNet(project, input('gate', 'b')), {
    wires: [],
    pins: [input('gate', 'b')],
    nodes: ['gate'],
  });
});

test('continuity treats each data bit as an independent net', () => {
  const project = {
    nodes: [node('byte', 'bus_input'), node('dac', 'dac'), node('lamp', 'led')],
    wires: [
      wire('bit-zero', output('byte', 'out0'), input('dac', 'in0')),
      wire('bit-one', output('byte', 'out1'), input('dac', 'in1')),
      wire('observe-zero', output('byte', 'out0'), input('lamp', 'in')),
    ],
  };
  assert.deepEqual(traceNet(project, input('dac', 'in0')).wires, ['bit-zero', 'observe-zero']);
  assert.deepEqual(traceNet(project, input('dac', 'in1')).wires, ['bit-one']);
  assert.deepEqual(traceNet(project, output('byte', 'out')).wires, []);
});

test('equal signal values and geometric wire crossings do not create connectivity', () => {
  const project = {
    nodes: [node('one', 'switch', { value: 1 }), node('two', 'switch', { value: 1 }), node('gate')],
    wires: [
      {
        ...wire('horizontal', output('one'), input('gate', 'a')),
        points: [
          { x: 0, y: 10 },
          { x: 20, y: 10 },
        ],
      },
      {
        ...wire('vertical', output('two'), input('gate', 'b')),
        points: [
          { x: 10, y: 0 },
          { x: 10, y: 20 },
        ],
      },
    ],
  };
  assert.deepEqual(traceNet(project, { wire: 'horizontal' }).wires, ['horizontal']);
  assert.deepEqual(traceNet(project, output('two')).wires, ['vertical']);
});

test('cycles through shared contacts terminate and result order does not depend on project order', () => {
  const project = {
    nodes: [node('a', 'switch'), node('b', 'switch'), node('c'), node('d')],
    wires: [
      wire('ac', output('a'), input('c')),
      wire('ad', output('a'), input('d')),
      wire('bc', output('b'), input('c')),
      wire('bd', output('b'), input('d')),
    ],
  };
  const expected = traceNet(project, output('a'));
  assert.deepEqual(expected.wires, ['ac', 'ad', 'bc', 'bd']);
  assert.equal(expected.pins.length, 4);
  assert.deepEqual(
    traceNet(
      { nodes: [...project.nodes].reverse(), wires: [...project.wires].reverse() },
      { wire: 'bd' },
    ),
    expected,
  );
});

test('stale or malformed wires do not join valid contacts and invalid seeds are empty', () => {
  const project = fanout();
  project.nodes.push(node('unknown', 'not-in-catalog'));
  project.wires.push(
    wire('missing-node', output('missing'), input('gate', 'b')),
    wire('missing-port', output('source', 'missing'), input('gate', 'b')),
    wire('wrong-side', input('gate'), input('gate', 'b')),
    wire('unknown-type', output('unknown'), input('gate', 'b')),
    { id: 'no-endpoints' },
    null,
  );
  assert.deepEqual(traceNet(project, output('source')).wires, ['to-gate', 'to-lamp']);
  for (const seed of [
    null,
    {},
    { wire: 'missing-node' },
    { wire: 'not-present' },
    output('missing'),
    output('unknown'),
    output('source', 'missing'),
    { node: 'source', port: 'out' },
    { node: 'source', port: 'out', side: 'in' },
  ])
    assert.deepEqual(traceNet(project, seed), empty);
  assert.deepEqual(traceNet(undefined, output('source')), empty);
  assert.deepEqual(traceNet({ nodes: {}, wires: {} }, output('source')), empty);
});

test('new edits are reflected immediately and tracing never mutates project data', () => {
  const project = fanout();
  const initial = JSON.stringify(project);
  const first = traceNet(project, output('source'));
  assert.equal(JSON.stringify(project), initial);
  first.pins[0].node = 'changed-result';
  first.wires.push('changed-result');
  assert.deepEqual(traceNet(project, output('source')).wires, ['to-gate', 'to-lamp']);
  assert.ok(!traceNet(project, output('source')).nodes.includes('changed-result'));
  project.wires.pop();
  assert.deepEqual(traceNet(project, output('source')).wires, ['to-gate']);
  assert.deepEqual(traceNet(project, input('lamp', 'in')), {
    wires: [],
    pins: [input('lamp', 'in')],
    nodes: ['lamp'],
  });
});

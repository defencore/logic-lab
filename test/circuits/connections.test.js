import test from 'node:test';
import assert from 'node:assert/strict';
import { checkConnection } from '../../src/circuits/connections.js';

const endpoint = (node, port) => ({ node, port });
const fixture = () => ({
  nodes: [
    { id: 'switch', type: 'switch' },
    { id: 'and', type: 'and' },
    { id: 'other', type: 'switch' },
    { id: 'byte', type: 'bus_input' },
    { id: 'dac', type: 'dac' },
    { id: 'adc', type: 'adc' },
    { id: 'decoder', type: 'decoder' },
    { id: 'scope', type: 'scope' },
  ],
  wires: [],
});

test('individual digital lines connect directly across components while analog types remain distinct', () => {
  const project = fixture();
  for (const [from, to, expected] of [
    [endpoint('switch', 'out'), endpoint('and', 'a'), { ok: true, width: 1 }],
    [endpoint('dac', 'out'), endpoint('adc', 'in'), { ok: true, width: 1 }],
    [endpoint('byte', 'out0'), endpoint('dac', 'in0'), { ok: true, width: 1 }],
    [endpoint('byte', 'nibble3'), endpoint('decoder', 'in3'), { ok: true, width: 1 }],
    [endpoint('switch', 'out'), endpoint('dac', 'in7'), { ok: true, width: 1 }],
    [endpoint('byte', 'out7'), endpoint('and', 'a'), { ok: true, width: 1 }],
    [endpoint('switch', 'out'), endpoint('adc', 'in'), { ok: false, reason: 'incompatible' }],
    [endpoint('dac', 'out'), endpoint('and', 'a'), { ok: false, reason: 'incompatible' }],
    [endpoint('byte', 'out0'), endpoint('adc', 'in'), { ok: false, reason: 'incompatible' }],
    [endpoint('dac', 'out'), endpoint('decoder', 'in0'), { ok: false, reason: 'incompatible' }],
  ])
    assert.deepEqual(checkConnection(project, from, to), expected);
});

test('observation inputs accept individual digital lines and analog signals', () => {
  const project = fixture();
  for (const [source, port, width] of [
    ['switch', 'out', 1],
    ['dac', 'out', 1],
    ['byte', 'out0', 1],
    ['byte', 'nibble3', 1],
    ['byte', 'address2', 1],
  ])
    assert.deepEqual(checkConnection(project, endpoint(source, port), endpoint('scope', 'in')), {
      ok: true,
      width,
    });
});

test('packed group names are not physical contacts', () => {
  const project = fixture();
  for (const [from, to] of [
    [endpoint('byte', 'out'), endpoint('dac', 'in0')],
    [endpoint('byte', 'out0'), endpoint('dac', 'in')],
    [endpoint('byte', 'nibble'), endpoint('decoder', 'in0')],
    [endpoint('byte', 'address'), endpoint('and', 'a')],
  ])
    assert.deepEqual(checkConnection(project, from, to), { ok: false, reason: 'missing' });
});

test('missing components, ports, reversed directions, and malformed endpoints reject safely', () => {
  const project = fixture();
  project.nodes.push({ id: 'unknown', type: 'not-in-catalog' });
  for (const [from, to] of [
    [null, endpoint('and', 'a')],
    [endpoint('switch', 'out'), undefined],
    [endpoint('absent', 'out'), endpoint('and', 'a')],
    [endpoint('switch', 'out'), endpoint('absent', 'in')],
    [endpoint('unknown', 'out'), endpoint('and', 'a')],
    [endpoint('switch', 'out'), endpoint('unknown', 'in')],
    [endpoint('switch', 'missing'), endpoint('and', 'a')],
    [endpoint('switch', 'out'), endpoint('and', 'missing')],
    [endpoint('and', 'a'), endpoint('and', 'b')],
    [endpoint('switch', 'out'), endpoint('and', 'out')],
    [endpoint(5, 'out'), endpoint('and', 'a')],
  ])
    assert.deepEqual(checkConnection(project, from, to), { ok: false, reason: 'missing' });
  assert.deepEqual(checkConnection(null, endpoint('switch', 'out'), endpoint('and', 'a')), {
    ok: false,
    reason: 'missing',
  });
});

test('a reconnect can exclude its own wire while duplicates on another wire still reject', () => {
  const project = fixture();
  const from = endpoint('switch', 'out');
  const to = endpoint('and', 'a');
  project.wires.push({ id: 'edited', from, to, width: 1 });
  const before = structuredClone(project);
  assert.deepEqual(checkConnection(project, from, to), { ok: false, reason: 'duplicate' });
  assert.deepEqual(checkConnection(project, from, to, { excludeWire: 'edited' }), {
    ok: true,
    width: 1,
  });
  assert.deepEqual(checkConnection(project, from, endpoint('and', 'b')), { ok: true, width: 1 });
  assert.deepEqual(checkConnection(project, endpoint('other', 'out'), to), { ok: true, width: 1 });
  assert.deepEqual(project, before);
  project.wires.push({ id: 'another', from: { ...from }, to: { ...to }, width: 1 });
  assert.deepEqual(checkConnection(project, from, to, { excludeWire: 'edited' }), {
    ok: false,
    reason: 'duplicate',
  });
});

test('same-component feedback and disabled components remain valid physical connections', () => {
  const project = fixture();
  project.nodes.find((node) => node.id === 'and').enabled = false;
  assert.deepEqual(checkConnection(project, endpoint('and', 'out'), endpoint('and', 'a')), {
    ok: true,
    width: 1,
  });
});

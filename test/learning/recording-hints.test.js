import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { recordingInputHint } from '../../src/learning/recording-hints.js';

test('experiment hints identify the current lift and lock controls in both languages', () => {
  for (const language of ['ua', 'en']) {
    const lift = recordingInputHint(createExample('elevator-logic'), language);
    for (const name of ['CALL 1–9', 'RUN', 'RESET', '3D']) assert.ok(lift.includes(name), name);
    assert.doesNotMatch(lift, /SER|CLK/);
    const lock = recordingInputHint(createExample('keypad-code-lock'), language);
    for (const name of ['#', '*', 'SECRET']) assert.ok(lock.includes(name), name);
    assert.doesNotMatch(lock, /SER|CLK/);
  }
});

test('shift, memory and ordinary inputs receive circuit-specific instructions without stale example assumptions', () => {
  assert.match(recordingInputHint(createExample('shift-register-sequence'), 'ua'), /SER.*CLK.*RST/);
  assert.match(recordingInputHint(createExample('ram'), 'ua'), /WE.*CLK/);
  const rom = { nodes: [{ id: 'rom', type: 'rom', params: {} }], wires: [] };
  const hint = recordingInputHint(rom, 'en');
  assert.match(hint, /ROM address/);
  assert.doesNotMatch(hint, /WE|CLK|SER/);
  const simple = createExample('half-adder');
  simple.nodes.find((node) => node.type === 'switch').label = 'Custom input A';
  assert.match(recordingInputHint(simple, 'en'), /Custom input A/);
  assert.match(recordingInputHint({ nodes: [], wires: [] }, 'ua'), /Додайте керовані входи/);
});

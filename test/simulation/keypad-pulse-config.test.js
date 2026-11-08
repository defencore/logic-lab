import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { keypadParameterError } from '../../src/components/keypad.js';
import { parameterRule } from '../../src/components/parameter-rules.js';
import { evaluateKeypad } from '../../src/simulation/keypad.js';
import { parseProject, serializeProject } from '../../src/circuits/project.js';
import { createSequence, appendAction } from '../../src/experiments/actions.js';
import { graphFingerprint } from '../../src/assessment/index.js';

const project = (params = {}) => ({
  version: 1,
  name: 'Pulse configuration',
  nodes: [
    {
      id: 'pad',
      type: 'keypad',
      enabled: true,
      label: '',
      x: 0,
      y: 0,
      params: {
        ...getDefinition('keypad').defaults,
        ...params,
      },
    },
  ],
  wires: [],
});

test('pulse is the new default with a bounded simulated duration while hold and toggle remain valid', () => {
  assert.deepEqual(getDefinition('keypad').defaults, {
    mode: 'pulse',
    keys: 0,
    pulseDuration: 0.04,
  });
  assert.deepEqual(parameterRule('keypad', 'pulseDuration'), {
    min: 0.02,
    max: 10,
    step: 0.01,
    integer: false,
  });
  for (const mode of ['pulse', 'hold', 'toggle'])
    assert.equal(keypadParameterError({ mode, keys: 0 }), null);
  for (const pulseDuration of [0.02, 0.04, 10]) {
    const source = project({ pulseDuration });
    assert.deepEqual(parseProject(serializeProject(source)), source);
  }
});

test('invalid pulse durations fail validation and imports atomically rather than silently changing contact timing', () => {
  for (const pulseDuration of [-1, 0, 0.019, 10.01, Infinity, NaN, '0.04', null]) {
    const source = project({ pulseDuration }),
      before = structuredClone(source);
    assert.ok(keypadParameterError(source.nodes[0].params));
    assert.deepEqual(evaluateKeypad(source.nodes[0].params, { row0: 1 }), {
      col0: 'X',
      col1: 'X',
      col2: 'X',
    });
    assert.throws(() => parseProject(JSON.stringify(source)), /Keypad|finite number/);
    assert.deepEqual(source, before);
  }
});

test('pulse recordings store only applied masks; duration stays semantic and electrical evaluation never starts a UI queue', () => {
  const source = project(),
    sequence = createSequence(source, { probes: [{ node: 'pad', port: 'col1', side: 'outputs' }] });
  assert.throws(
    () => appendAction(sequence, { at: 0, node: 'pad', key: 'pulseDuration', value: 0.08 }),
    /supported input/,
  );
  const changed = structuredClone(source);
  changed.nodes[0].params.keys = 16;
  assert.equal(
    graphFingerprint(changed, { ignoreSourceValues: true }),
    graphFingerprint(source, { ignoreSourceValues: true }),
  );
  changed.nodes[0].params.pulseDuration = 0.08;
  assert.notEqual(graphFingerprint(changed), graphFingerprint(source));
  const p = { mode: 'pulse', pulseDuration: 0.04, keys: 16 };
  for (let index = 0; index < 5; index++)
    assert.deepEqual(evaluateKeypad(p, { row1: 1 }), { col0: 0, col1: 1, col2: 0 });
  assert.equal(p.keys, 16);
  assert.deepEqual(evaluateKeypad({ ...p, keys: 0 }, { row1: 1 }), { col0: 0, col1: 0, col2: 0 });
});

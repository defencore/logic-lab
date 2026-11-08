import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { KEYPAD_KEYS, KEYPAD_MAX_MASK, keypadParameterError } from '../../src/components/keypad.js';
import { parameterRule } from '../../src/components/parameter-rules.js';
import { SOURCE_PARAMETERS } from '../../src/simulation/input-sources.js';
import { evaluateKeypad } from '../../src/simulation/keypad.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { parseProject, serializeProject } from '../../src/circuits/project.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  serializeSequence,
  parseSequence,
  replaySequence,
} from '../../src/experiments/actions.js';

function fixture(parameters = {}) {
  const keypad = { id: 'pad', type: 'keypad', enabled: true, params: { ...parameters } };
  const rows = Array.from({ length: 4 }, (_, row) => ({
    id: `driver${row}`,
    type: 'switch',
    params: { value: 0 },
  }));
  const project = {
    nodes: [...rows, keypad],
    wires: rows.map((node, row) => ({
      id: `row-wire${row}`,
      from: { node: node.id, port: 'out' },
      to: { node: 'pad', port: `row${row}` },
    })),
  };
  const runtime = createRuntime();
  const update = () => {
    simulate(project, runtime, 0);
    return runtime.outputs.pad;
  };
  update();
  return { project, runtime, keypad, rows, update };
}

function portable(project) {
  return {
    version: 1,
    name: 'Keypad scan',
    nodes: project.nodes.map((node, index) => ({ ...node, x: index * 300, y: 100 })),
    wires: project.wires,
  };
}

test('keypad has seven separate scan contacts and a bounded recordable 12-bit key mask', () => {
  const definition = getDefinition('keypad');
  assert.deepEqual(definition.defaults, { mode: 'pulse', keys: 0, pulseDuration: 0.04 });
  assert.deepEqual(
    definition.inputs.map(({ id }) => id),
    ['row0', 'row1', 'row2', 'row3'],
  );
  assert.deepEqual(
    definition.outputs.map(({ id }) => id),
    ['col0', 'col1', 'col2'],
  );
  for (const pin of [...definition.inputs, ...definition.outputs]) {
    assert.equal(pin.width, 1);
    assert.equal(pin.group, undefined, 'no hidden bus or automatic encoded output');
  }
  assert.deepEqual(
    KEYPAD_KEYS.map(({ label }) => label),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'],
  );
  assert.deepEqual(SOURCE_PARAMETERS.keypad, { keys: [0, KEYPAD_MAX_MASK, true] });
  assert.deepEqual(parameterRule('keypad', 'keys'), { min: 0, max: 4095, step: 1, integer: true });
});

test('all twelve keys return only their own column on the selected physical row in every UI mode', () => {
  for (const mode of ['pulse', 'hold', 'toggle']) {
    const f = fixture({ mode });
    for (const key of KEYPAD_KEYS) {
      f.keypad.params.keys = key.mask;
      for (let row = 0; row < 4; row++) {
        f.rows.forEach((source, index) => {
          source.params.value = Number(index === row);
        });
        const actual = f.update();
        for (let column = 0; column < 3; column++)
          assert.equal(
            actual[`col${column}`],
            Number(row === key.row && column === key.column),
            `${mode}/${key.label}/R${row + 1}/C${column + 1}`,
          );
      }
      const before = structuredClone(f.project);
      f.update();
      assert.deepEqual(f.project, before, 'simulation never releases or toggles a UI contact mask');
    }
    f.keypad.params.keys = 0;
    assert.deepEqual(f.update(), { col0: 0, col1: 0, col2: 0 });
  }
});

test('ideal per-key isolation supports chords without inventing a fourth corner', () => {
  const f = fixture({ keys: KEYPAD_KEYS[0].mask | KEYPAD_KEYS[1].mask | KEYPAD_KEYS[3].mask });
  f.rows[1].params.value = 1;
  assert.deepEqual(f.update(), { col0: 1, col1: 0, col2: 0 }, '1+2+4 does not create a phantom5');
  f.rows[0].params.value = 1;
  assert.deepEqual(f.update(), { col0: 1, col1: 1, col2: 0 });
  f.rows.forEach((row) => {
    row.params.value = 0;
  });
  assert.deepEqual(f.update(), { col0: 0, col1: 0, col2: 0 });
});

test('unknown and floating scan rows affect only pressed columns and a known high row dominates', () => {
  const mask = KEYPAD_KEYS[0].mask;
  for (const unknown of ['X', 'Z', undefined]) {
    assert.deepEqual(evaluateKeypad({ mode: 'hold', keys: mask }, { row0: unknown }), {
      col0: 'X',
      col1: 0,
      col2: 0,
    });
    assert.deepEqual(evaluateKeypad({ mode: 'hold', keys: 0 }, { row0: unknown }), {
      col0: 0,
      col1: 0,
      col2: 0,
    });
    assert.deepEqual(
      evaluateKeypad(
        { mode: 'hold', keys: mask | KEYPAD_KEYS[3].mask },
        { row0: unknown, row1: 1 },
      ),
      { col0: 1, col1: 0, col2: 0 },
    );
  }
  const f = fixture({ keys: mask });
  f.project.nodes.push({ id: 'noise', type: 'vcc', params: {} });
  f.project.wires.push({
    id: 'conflict',
    from: { node: 'noise', port: 'out' },
    to: { node: 'pad', port: 'row0' },
  });
  assert.deepEqual(f.update(), { col0: 'X', col1: 0, col2: 0 });
  assert.equal(f.runtime.inputs.pad.row0, 'X');
  f.keypad.params.keys |= KEYPAD_KEYS[3].mask;
  f.rows[1].params.value = 1;
  assert.deepEqual(f.update(), { col0: 1, col1: 0, col2: 0 });
});

test('invalid key configuration produces unknown outputs while disabling the keypad releases them', () => {
  for (const parameters of [
    { keys: -1 },
    { keys: 4096 },
    { keys: 0.5 },
    { keys: true },
    { keys: '1' },
    { mode: 'unsupported' },
  ]) {
    const f = fixture(parameters);
    assert.ok(keypadParameterError({ ...getDefinition('keypad').defaults, ...parameters }));
    assert.deepEqual(f.update(), { col0: 'X', col1: 'X', col2: 'X' });
    f.keypad.enabled = false;
    assert.deepEqual(f.update(), { col0: 'Z', col1: 'Z', col2: 'Z' });
  }
});

test('portable projects preserve the exact keypad setup and reject invalid modes or masks atomically', () => {
  const valid = portable(fixture({ mode: 'toggle', keys: 2064 }).project);
  const before = structuredClone(valid);
  const restored = parseProject(serializeProject(valid));
  assert.deepEqual(restored.nodes.find(({ id }) => id === 'pad').params, {
    mode: 'toggle',
    keys: 2064,
  });
  assert.deepEqual(valid, before);
  for (const params of [
    { mode: 'sticky', keys: 0 },
    { mode: 'hold', keys: -1 },
    { mode: 'toggle', keys: 4096 },
    { mode: 'hold', keys: 2.5 },
  ]) {
    const invalid = structuredClone(valid);
    invalid.nodes.find(({ id }) => id === 'pad').params = params;
    const original = structuredClone(invalid);
    assert.throws(() => parseProject(JSON.stringify(invalid)), /Keypad/);
    assert.deepEqual(invalid, original, 'validation never repairs or mutates untrusted keys');
  }
  const defaults = portable(fixture().project);
  assert.doesNotThrow(() => parseProject(serializeProject(defaults)));
});

test('press, chord and release masks survive sequence serialization and reproduce actual scanned columns', () => {
  const f = fixture({ mode: 'hold' });
  f.rows[1].params.value = 1;
  const sequence = createSequence(portable(f.project), {
    id: 'keypad-roundtrip',
    probes: ['col0', 'col1', 'col2'].map((port) => ({ node: 'pad', port, side: 'outputs' })),
  });
  for (const [at, value] of [
    [0.1, 16],
    [0.2, 24],
    [0.3, 0],
    [0.4, 2048],
    [0.5, 0],
  ])
    appendAction(sequence, { at, node: 'pad', key: 'keys', value });
  finishSequence(sequence, 0.6);
  const restored = parseSequence(serializeSequence(sequence));
  assert.deepEqual(restored.actions, sequence.actions);
  const playback = replaySequence(restored);
  assert.deepEqual(
    playback.observations
      .filter(({ after }) => after >= 0 && after < 5)
      .map(({ values }) => values),
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
  assert.equal(playback.project.nodes.find(({ id }) => id === 'pad').params.keys, 0);
  const before = structuredClone(sequence);
  for (const value of [-1, 4096, 0.5])
    assert.throws(
      () => appendAction(sequence, { at: 0.6, node: 'pad', key: 'keys', value }),
      /range/,
    );
  assert.throws(
    () => appendAction(sequence, { at: 0.6, node: 'pad', key: 'mode', value: 1 }),
    /supported input/,
  );
  assert.deepEqual(sequence, before);
});

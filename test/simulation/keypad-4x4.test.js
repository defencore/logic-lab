import test from 'node:test';
import assert from 'node:assert/strict';
import { keypadLayout } from '../../src/components/keypad.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { validateProject } from '../../src/circuits/project.js';
import {
  appendAction,
  createSequence,
  finishSequence,
  parseSequence,
  replaySequence,
  serializeSequence,
} from '../../src/experiments/actions.js';

test('4×4 keypad exposes a fourth column and replays D as the sixteenth contact', () => {
  const project = validateProject({
    version: 1,
    name: 'Keypad 4×4',
    nodes: [
      { id: 'pad', type: 'keypad_4x4', x: 240, y: 0, params: { mode: 'toggle' } },
      { id: 'row', type: 'vcc', x: 0, y: 0, params: {} },
    ],
    wires: [{ id: 'row4', from: { node: 'row', port: 'out' }, to: { node: 'pad', port: 'row3' } }],
  });
  assert.deepEqual(
    getDefinition('keypad_4x4').outputs.map((pin) => pin.label),
    ['C1', 'C2', 'C3', 'C4'],
  );
  const key = keypadLayout('keypad_4x4').keys.find(({ label }) => label === 'D');
  assert.deepEqual(key, { label: 'D', index: 15, mask: 32768, row: 3, column: 3 });
  const sequence = createSequence(project, {
    probes: [{ node: 'pad', side: 'outputs', port: 'col3' }],
  });
  appendAction(sequence, { at: 0.01, node: 'pad', key: 'keys', value: key.mask });
  appendAction(sequence, { at: 0.02, node: 'pad', key: 'keys', value: 0 });
  finishSequence(sequence, 0.03);
  const replay = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.deepEqual(
    replay.observations.map(({ values }) => values[0]),
    [0, 1, 0, 0],
  );
  project.nodes[0].params.keys = 65536;
  assert.throws(() => validateProject(project), /0 to 65535/);
});

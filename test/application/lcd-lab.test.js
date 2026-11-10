import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createCommands } from '../../src/application/commands.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { LCD_COLUMNS, lcd1602Snapshot } from '../../src/simulation/lcd1602.js';
import {
  prepareTransfers,
  rowGuideReady,
  rowTransfers,
} from '../../src/workbench/lcd-lab-guide.js';

const commands = (...bytes) => bytes.map((byte) => ({ rs: 0, byte }));
const row = (address, text) => [
  ...commands(address),
  ...Array.from(text, (character) => ({ rs: 1, byte: character.charCodeAt(0) })),
];

function setup(edit = () => {}) {
  const project = createExample('lcd1602-parallel');
  edit(project);
  const runtime = simulate(project, createRuntime(), 0);
  const actionsRecorded = [];
  let checkpoints = 0;
  const application = createCommands({
    state: { project, runtime },
    services: {
      classroom: {
        allowInput: () => true,
        inputChanged: (id, key, value) => actionsRecorded.push([id, key, value]),
      },
    },
    actions: {
      checkpoint: () => checkpoints++,
      updateSignals() {},
      persist() {},
      changed: () => simulate(project, runtime, 0),
    },
  });
  return {
    send: application.sendLcdLabBytes,
    runtime,
    actionsRecorded,
    get checkpoints() {
      return checkpoints;
    },
  };
}

test('LCD panel writes via real RS, BYTE and both E edges and produces two independent rows', () => {
  const lab = setup();
  const { send, runtime, actionsRecorded } = lab;
  const fullRow = '0123456789ABCDEF';
  assert.equal(fullRow.length, LCD_COLUMNS);
  assert.equal(rowGuideReady(runtime.state.lcd), false);
  assert.deepEqual(send(prepareTransfers(runtime.state.lcd)), { sent: 3 });
  assert.equal(rowGuideReady(runtime.state.lcd), true);
  assert.deepEqual(send(rowTransfers(1, fullRow)), { sent: LCD_COLUMNS + 1 });
  assert.equal(runtime.state.lcd.address, 0x40 + LCD_COLUMNS);
  assert.deepEqual(send(rowTransfers(0, 'HI')), { sent: 3 });
  assert.equal(runtime.state.lcd.address, 2);
  assert.equal(lab.checkpoints, 3);
  assert.deepEqual(
    lcd1602Snapshot(runtime.state.lcd).rows.map((row) => row.trimEnd()),
    ['HI', fullRow],
  );
  assert.deepEqual(
    actionsRecorded.filter(([id]) => id === 'enable').map(([, , value]) => value),
    Array.from({ length: 2 * (LCD_COLUMNS + 7) }, (_, i) => 1 - (i % 2)),
  );
  send(commands(0x18));
  assert.equal(rowGuideReady(runtime.state.lcd), false);
  assert.deepEqual(send(prepareTransfers(runtime.state.lcd)), { sent: 4 });
  assert.equal(rowGuideReady(runtime.state.lcd), true);
  send(rowTransfers(0, 'B'));
  assert.deepEqual(
    lcd1602Snapshot(runtime.state.lcd).rows.map((row) => row.trimEnd()),
    ['BI', fullRow],
  );
});

test('LCD panel rejects an invalid or oversize batch before changing any source', () => {
  const lab = setup();
  const { send, actionsRecorded } = lab;
  for (const invalidText of ['', 'Ї', 'A'.repeat(LCD_COLUMNS + 1)])
    assert.equal(rowTransfers(0, invalidText), null);
  assert.deepEqual(send([]), { sent: 0, error: 'input' });
  assert.deepEqual(send(row(0x80, 'A'.repeat(LCD_COLUMNS + 1))), { sent: 0, error: 'input' });
  assert.deepEqual(send([...commands(0x38), { rs: 2, byte: 0x41 }]), { sent: 0, error: 'input' });
  assert.deepEqual(send([...commands(0x38), { rs: 1, byte: 256 }]), { sent: 0, error: 'input' });
  assert.deepEqual(send(Array(1)), { sent: 0, error: 'input' });
  assert.equal(lab.checkpoints, 0);
  assert.deepEqual(actionsRecorded, []);
});

test('LCD panel refuses a mismatched data bus without pulsing E or reporting a write', () => {
  const { send, actionsRecorded } = setup((project) => {
    const first = project.wires.find((wire) => wire.to.port === 'd0');
    const second = project.wires.find((wire) => wire.to.port === 'd1');
    [first.from, second.from] = [second.from, first.from];
  });
  assert.deepEqual(send(commands(1)), { sent: 0, error: 'wiring' });
  assert.equal(
    actionsRecorded.some(([id]) => id === 'enable'),
    false,
  );
  assert.deepEqual(send(commands(0x38, 1, 0x0c)), { sent: 1, error: 'wiring' });
  assert.deepEqual(
    actionsRecorded.filter(([id]) => id === 'enable').map(([, , value]) => value),
    [1, 0],
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createCommands } from '../../src/application/commands.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { lcd1602Snapshot } from '../../src/simulation/lcd1602.js';

function setup(edit = () => {}) {
  const project = createExample('lcd1602-parallel');
  edit(project);
  const runtime = simulate(project, createRuntime(), 0);
  const actionsRecorded = [];
  const commands = createCommands({
    state: { project, runtime },
    services: {
      classroom: {
        allowInput: () => true,
        inputChanged: (id, key, value) => actionsRecorded.push([id, key, value]),
      },
    },
    actions: {
      checkpoint() {},
      updateSignals() {},
      persist() {},
      changed: () => simulate(project, runtime, 0),
    },
  });
  return { send: commands.sendLcdLabBytes, runtime, actionsRecorded };
}

test('LCD panel writes via real RS, BYTE and both E edges and produces two independent rows', () => {
  const { send, runtime, actionsRecorded } = setup();
  assert.deepEqual(send({ rs: 0, bytes: [0x38, 0x06, 0x0c] }), { sent: 3 });
  assert.deepEqual(send({ rs: 1, bytes: [72, 73] }), { sent: 2 });
  assert.deepEqual(send({ rs: 0, bytes: [0xc0] }), { sent: 1 });
  assert.deepEqual(send({ rs: 1, bytes: [79, 75] }), { sent: 2 });
  assert.deepEqual(
    lcd1602Snapshot(runtime.state.lcd).rows.map((row) => row.trimEnd()),
    ['HI', 'OK'],
  );
  assert.deepEqual(
    actionsRecorded.filter(([id]) => id === 'enable').map(([, , value]) => value),
    Array.from({ length: 16 }, (_, i) => 1 - (i % 2)),
  );
  send({ rs: 0, bytes: [0x38, 0x06, 0x0c] });
  assert.deepEqual(
    lcd1602Snapshot(runtime.state.lcd).rows.map((row) => row.trimEnd()),
    ['HI', 'OK'],
  );
});

test('LCD panel refuses a mismatched data bus without pulsing E or reporting a write', () => {
  const { send, actionsRecorded } = setup((project) => {
    const first = project.wires.find((wire) => wire.to.port === 'd0');
    const second = project.wires.find((wire) => wire.to.port === 'd1');
    [first.from, second.from] = [second.from, first.from];
  });
  assert.deepEqual(send({ rs: 0, bytes: [1] }), { sent: 0, error: 'wiring' });
  assert.equal(
    actionsRecorded.some(([id]) => id === 'enable'),
    false,
  );
});

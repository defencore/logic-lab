import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryFixture } from '../simulation/fixtures/state-inspection.js';
import {
  byteFormats,
  inspectMemory,
  inspectByte,
} from '../../src/workbench/state-inspection/model.js';
import {
  inspectionMarkup,
  memoryMapMarkup,
  byteWidgetMarkup,
} from '../../src/workbench/state-inspection/markup.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';

test('memory inspection shows stored cells while read output is Z and retains last-write metadata across focus', () => {
  const f = memoryFixture();
  f.pulse();
  f.set('we', 0);
  f.set('oe', 0);
  assert.equal(f.runtime.signals.outputs.memory.out, 'Z');
  const first = inspectMemory(f.node, f.project, f.runtime);
  assert.equal(first.rows.length, 16);
  assert.deepEqual(first.rows[2].formats, { bin: '00100101', hex: '0x25', dec: '37' });
  assert.equal(first.readActive, false);
  assert.deepEqual(first.read, [2]);
  assert.equal(first.rows[2].lastWritten, true);
  assert.deepEqual(first.rows[2].changed, [0, 2, 5]);
  inspectionMarkup(f.node, 'ua');
  assert.deepEqual(inspectMemory(f.node, f.project, f.runtime), first);
  f.set('oe', 1);
  assert.equal(inspectMemory(f.node, f.project, f.runtime).readActive, true);
});

test('ROM exposes16 decoded bytes and register file exposes8 independently selected read/write rows', () => {
  const rom = memoryFixture('rom');
  rom.node.params.data = '0xA5,37';
  rom.set('oe', 0);
  const image = inspectMemory(rom.node, rom.project, rom.runtime);
  assert.equal(image.rows.length, 16);
  assert.deepEqual(image.rows[0].formats, { bin: '10100101', hex: '0xA5', dec: '165' });
  assert.equal(image.rows[1].formats.dec, '37');
  assert.equal(image.rows[15].formats.dec, '0');
  assert.deepEqual(image.write, []);
  const rf = memoryFixture('register_file');
  rf.pulse();
  const registers = inspectMemory(rf.node, rf.project, rf.runtime);
  assert.equal(registers.rows.length, 8);
  assert.deepEqual(registers.read, [2]);
  assert.deepEqual(registers.write, [5]);
  assert.equal(registers.rows[5].formats.dec, '37');
  assert.equal(registers.rows[2].formats.dec, '0');
  assert.equal(registers.readActive, true, 'register-file read is independent of WE');
});

test('byte formatting preserves known nibbles and individual X/Z instead of inventing a numeric byte', () => {
  assert.deepEqual(byteFormats([1, 'X', 'X', 'X', 0, 1, 0, 1]), {
    bin: '1010XXX1',
    hex: '0xAX',
    dec: 'X',
  });
  assert.deepEqual(byteFormats(Array(8).fill('Z')), { bin: 'ZZZZZZZZ', hex: '0xZZ', dec: 'Z' });
  assert.deepEqual(byteFormats([1, 0, 1, 0, 0, 1, 0, 1]), {
    bin: '10100101',
    hex: '0xA5',
    dec: '165',
  });
  const node = { id: 'reg', type: 'register', enabled: false, params: {} };
  const runtime = {
    state: { reg: { q: 'X', qBits: [1, 'X', 'X', 'X', 0, 1, 0, 1] } },
    outputs: { reg: {} },
  };
  assert.equal(inspectByte(node, runtime).formats.hex, '0xAX');
  assert.equal(inspectByte(node, runtime).stored, true);
  assert.equal(inspectByte(node, runtime).enabled, false);
});

test('unknown address pins show every possible location without conflating current read and actual last write', () => {
  const f = memoryFixture();
  f.set('address', 0);
  f.project.wires = f.project.wires.filter(
    ({ to }) => to.node !== 'memory' || to.port !== 'address0',
  );
  simulate(f.project, f.runtime, 0);
  f.pulse();
  f.set('we', 0);
  const data = inspectMemory(f.node, f.project, f.runtime);
  assert.deepEqual(data.read, [0, 1]);
  assert.equal(data.readCertain, true, 'read enable is known; the address itself is uncertain');
  assert.equal(data.lastWrite.definite, false);
  assert.deepEqual(data.rows[0].bits, ['X', 0, 'X', 0, 0, 'X', 0, 0]);
  assert.equal(data.rows[2].lastWritten, false);
});

test('memory maps and byte widgets are readonly and teach bit order in both languages', () => {
  for (const language of ['ua', 'en']) {
    const ram = memoryMapMarkup({ type: 'ram' }, language);
    assert.equal((ram.match(/data-memory-address=/g) || []).length, 16);
    assert.equal((ram.match(/data-memory-bit=/g) || []).length, 128);
    for (const heading of ['BIN', 'HEX', 'DEC']) assert.match(ram, new RegExp(heading));
    assert.doesNotMatch(ram, /<input|<textarea|contenteditable/);
    assert.equal(
      (memoryMapMarkup({ type: 'register_file' }, language).match(/data-memory-address=/g) || [])
        .length,
      8,
    );
    const shift = byteWidgetMarkup({ type: 'shift_register' }, language);
    assert.ok(shift.indexOf('data-byte-bit="7"') < shift.indexOf('data-byte-bit="0"'));
    assert.match(shift, /Q7 ← … ← Q1 ← Q0 ← SER · SOUT = Q7/);
    assert.match(shift, /data-byte-before/);
    assert.match(shift, /data-byte-after/);
  }
  const f = memoryFixture();
  const reset = createRuntime();
  simulate(f.project, reset, 0);
  assert.equal(inspectMemory(f.node, f.project, reset).lastWrite, null);
});

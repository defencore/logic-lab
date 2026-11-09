import test from 'node:test';
import assert from 'node:assert/strict';
import circuit from '../../examples/lcd1602-parallel/circuit.json' with { type: 'json' };
import lesson from '../../examples/lcd1602-parallel/lesson.js';
import { validateProject } from '../../src/circuits/project.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { pinPlacement, dimensions } from '../../src/circuits/geometry/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { lcd1602Snapshot } from '../../src/simulation/lcd1602.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
} from '../../src/experiments/actions.js';

const blank = ' '.repeat(16);
function bench({ fourBit = false, writableRw = false } = {}) {
  const project = structuredClone(circuit);
  if (fourBit) project.wires = project.wires.filter((wire) => !/^d[0-3]$/.test(wire.id));
  if (writableRw)
    Object.assign(
      project.nodes.find((node) => node.id === 'ground'),
      { type: 'switch', params: { value: 0 } },
    );
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  let runtime = createRuntime();
  const settle = () => simulate(project, runtime, 0);
  const set = (node, value) => {
    nodes.get(node).params.value = value;
    settle();
  };
  function pulse(value, rs = 0) {
    set('rs', rs);
    set('byte', value);
    set('enable', 1);
    set('enable', 0);
  }
  const nibble = (value, rs = 0) => pulse(value << 4, rs);
  function write(value, rs = 0) {
    if (fourBit) {
      nibble(value >> 4, rs);
      nibble(value & 15, rs);
    } else pulse(value, rs);
  }
  function initialize() {
    if (fourBit) for (const value of [3, 3, 3, 2]) nibble(value);
    for (const value of [fourBit ? 0x28 : 0x38, 0x08, 0x01, 0x06, 0x0c]) write(value);
  }
  settle();
  return {
    nodes,
    project,
    settle,
    set,
    write,
    nibble,
    initialize,
    get runtime() {
      return runtime;
    },
    get frame() {
      return lcd1602Snapshot(runtime.state.lcd);
    },
    reset() {
      runtime = createRuntime();
      settle();
    },
  };
}

test('the LCD offers eleven distinct one-bit terminals, with data pins across the bottom', () => {
  const definition = getDefinition('lcd1602');
  const lcd = circuit.nodes.find((node) => node.type === 'lcd1602');
  assert.deepEqual(
    definition.inputs.map((pin) => pin.id),
    ['rs', 'rw', 'e', ...Array.from({ length: 8 }, (_, bit) => `d${bit}`)],
  );
  assert.equal(definition.outputs.length, 0);
  assert.ok(definition.inputs.every((pin) => pin.width === 1));
  const contacts = definition.inputs.map((pin) => pinPlacement(lcd, pin.id, 'in'));
  const { w, h } = dimensions(lcd);
  assert.equal(new Set(contacts.map(({ x, y }) => `${x},${y}`)).size, 11);
  assert.ok(contacts.slice(0, 3).every(({ edge }) => edge === 'left'));
  assert.ok(
    contacts.slice(3).every(({ x, y, edge }) => edge === 'bottom' && x > 0 && x < w && y === h),
  );
  assert.deepEqual(validateProject(circuit), circuit);
});

test('8-bit writes use only the falling E edge and preserve two independent visible rows', () => {
  const lcd = bench();
  assert.equal(lcd.frame.displayOn, false);
  assert.deepEqual(lcd.frame.rows, [blank, blank]);
  lcd.initialize();
  lcd.set('rs', 1);
  lcd.set('byte', 72);
  lcd.set('enable', 1);
  lcd.settle();
  assert.deepEqual(lcd.frame.rows, [blank, blank]);
  lcd.set('enable', 0);
  lcd.settle();
  assert.equal(lcd.frame.address, 1, 'settling the same low level cannot repeat a write');
  lcd.write(73, 1);
  lcd.write(0xc0);
  lcd.write(79, 1);
  lcd.write(75, 1);
  assert.deepEqual(lcd.frame.rows, ['HI'.padEnd(16), 'OK'.padEnd(16)]);
  assert.equal(lcd.frame.address, 0x42);
  assert.deepEqual(lcd.runtime.diagnostics, []);
});

test('display off, home, shift, cursor and clear affect the intended parts of LCD state', () => {
  const lcd = bench();
  lcd.initialize();
  lcd.write(0x0f);
  lcd.write(65, 1);
  lcd.write(66, 1);
  assert.deepEqual(lcd.frame.cursor, { row: 0, column: 2, underline: true, blink: true });
  lcd.write(0x18);
  assert.equal(lcd.frame.rows[0], 'B'.padEnd(16));
  assert.equal(lcd.frame.cursor.column, 1);
  lcd.write(0x08);
  assert.deepEqual(lcd.frame.rows, [blank, blank]);
  assert.equal(lcd.frame.cursor, null);
  lcd.write(0x0e);
  lcd.write(0x02);
  assert.equal(lcd.frame.rows[0], 'AB'.padEnd(16));
  assert.equal(lcd.frame.cursor.column, 0);
  lcd.write(0x04);
  lcd.write(0xc1);
  lcd.write(88, 1);
  lcd.write(89, 1);
  assert.equal(lcd.frame.rows[1], 'YX'.padEnd(16));
  assert.equal(lcd.frame.address, 0x27, 'decrement wraps to the first row’s last stored cell');
  lcd.write(0x01);
  assert.deepEqual(lcd.frame.rows, [blank, blank]);
  assert.equal(lcd.frame.address, 0);
  lcd.write(67, 1);
  assert.equal(lcd.frame.address, 1, 'clear restores increment mode');
  lcd.reset();
  assert.equal(lcd.frame.displayOn, false);
  assert.equal(lcd.frame.dataBits, 8);
  assert.deepEqual(lcd.frame.rows, [blank, blank]);
});

test('the 17th character stays in hidden DDRAM until the view shifts', () => {
  const lcd = bench();
  lcd.initialize();
  for (const ch of 'ABCDEFGHIJKLMNOPQ') lcd.write(ch.charCodeAt(0), 1);
  assert.deepEqual(lcd.frame.rows, ['ABCDEFGHIJKLMNOP', blank]);
  assert.equal(lcd.frame.address, 17);
  lcd.write(0x18);
  assert.deepEqual(lcd.frame.rows, ['BCDEFGHIJKLMNOPQ', blank]);
});

test('4-bit bootstrap and two-nibble writes operate with D0–D3 genuinely disconnected', () => {
  const lcd = bench({ fourBit: true });
  assert.deepEqual(lcd.runtime.diagnostics, []);
  lcd.initialize();
  assert.equal(lcd.frame.dataBits, 4);
  assert.equal(lcd.frame.twoLines, true);
  lcd.nibble(4, 1);
  assert.equal(lcd.frame.awaitingLowNibble, true);
  assert.equal(lcd.frame.rows[0], blank);
  lcd.nibble(8, 1);
  assert.equal(lcd.frame.awaitingLowNibble, false);
  assert.equal(lcd.frame.rows[0], 'H'.padEnd(16));
  lcd.write(0xc0);
  lcd.write(0x4f, 1);
  assert.equal(lcd.frame.rows[1], 'O'.padEnd(16));
  lcd.nibble(4, 1);
  lcd.nibble(9, 0);
  assert.equal(lcd.frame.fault, 'phase');
  assert.equal(lcd.frame.rows[1], 'O'.padEnd(16));
  lcd.write(0x4b, 1);
  assert.equal(lcd.frame.rows[1], 'OK'.padEnd(16));
  assert.equal(lcd.frame.fault, null);
  assert.deepEqual(lcd.runtime.diagnostics, []);
});

test('reads, conflicting data and unsupported CGRAM writes cannot overwrite DDRAM', () => {
  const lcd = bench({ writableRw: true });
  lcd.initialize();
  lcd.write(65, 1);
  lcd.set('ground', 1);
  lcd.write(66, 1);
  assert.equal(lcd.frame.fault, 'read');
  lcd.set('ground', 0);
  lcd.project.nodes.push({ id: 'conflict', type: 'vcc', x: 0, y: 0, params: {}, enabled: true });
  lcd.project.wires.push({
    id: 'conflicting-d7',
    from: { node: 'conflict', port: 'out' },
    to: { node: 'lcd', port: 'd7' },
    width: 1,
  });
  lcd.write(66, 1);
  assert.equal(lcd.frame.fault, 'data');
  lcd.project.wires.pop();
  lcd.write(0x40);
  lcd.write(66, 1);
  assert.equal(lcd.frame.fault, 'cgram');
  assert.equal(lcd.frame.rows[0], 'A'.padEnd(16));
  lcd.write(0x81);
  lcd.write(66, 1);
  assert.equal(lcd.frame.fault, null);
  assert.equal(lcd.frame.rows[0], 'AB'.padEnd(16));
});

test('the supplied laboratory preset replays actual parallel writes and leaves both messages visible', () => {
  const sequence = createSequence(circuit, { probes: lesson.actionProbes });
  for (const action of lesson.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, lesson.actionPreset.at(-1).at + 0.1);
  const playback = replaySequence(sequence);
  assert.deepEqual(lcd1602Snapshot(playback.runtime.state.lcd).rows, [
    'LOGIC LAB'.padEnd(16),
    'PARALLEL LCD'.padEnd(16),
  ]);
  assert.deepEqual(playback.runtime.diagnostics, []);
  assert.equal(playback.runtime.inputs.lcd.e, 0);
  assert.equal(playback.runtime.inputs.lcd.rw, 0);
});

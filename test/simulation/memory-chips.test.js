import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { decodeEepromData } from '../../src/components/eeprom.js';
import { validateProject } from '../../src/circuits/project.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
} from '../../src/experiments/actions.js';
import { inspectByte, inspectMemory } from '../../src/workbench/state-inspection/model.js';
import { inspectionMarkup } from '../../src/workbench/state-inspection/markup.js';
import { byte, circuit, node, output, source, wire } from './core/fixtures/simulator.js';

function fixture(nodes, wires) {
  const project = { ...circuit(nodes, wires), version: 1, name: 'Memory chips' };
  project.wires.forEach((connection, index) => {
    connection.id = `wire-${index}`;
  });
  const runtime = createRuntime();
  const settle = () => simulate(project, runtime, 0);
  const set = (id, value) => {
    project.nodes.find((item) => item.id === id).params.value = value;
    settle();
  };
  settle();
  return {
    project,
    runtime,
    settle,
    set,
    pulse: (id) => {
      set(id, 0);
      set(id, 1);
    },
    out: (id, port) => output(runtime, id, port),
  };
}

function shiftFixture({ tiedClocks = false, cascade = false } = {}) {
  const nodes = [
    source('ser', 0),
    source('shift', 0),
    source('latch', 0),
    source('clear', 1),
    source('enable', 0),
    node('chip', 'hc595'),
  ];
  const wires = [
    wire('ser', 'out', 'chip', 'ser'),
    wire('shift', 'out', 'chip', 'srclk'),
    wire(tiedClocks ? 'shift' : 'latch', 'out', 'chip', 'rclk'),
    wire('clear', 'out', 'chip', 'mr'),
    wire('enable', 'out', 'chip', 'oe'),
  ];
  if (cascade) {
    nodes.push(node('second', 'hc595'));
    wires.push(
      wire('chip', 'serial', 'second', 'ser'),
      wire('shift', 'out', 'second', 'srclk'),
      wire('latch', 'out', 'second', 'rclk'),
    );
  }
  return fixture(nodes, wires);
}

test('74HC595 shifts, stores and clears independently with individual QA–QH pins', () => {
  const f = shiftFixture();
  for (const bit of [1, 0, 1, 1]) {
    f.set('ser', bit);
    f.pulse('shift');
    assert.equal(f.out('chip'), 0);
  }
  const chip = f.project.nodes.find(({ id }) => id === 'chip');
  assert.equal(inspectByte(chip, f.runtime).shift.dec, '11');
  f.pulse('latch');
  assert.equal(f.out('chip'), 11);
  assert.deepEqual(
    getDefinition('hc595').outputs.map(({ label }) => label),
    ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QH′'],
  );
  assert.deepEqual(Object.values(f.runtime.outputs.chip), [1, 1, 0, 1, 0, 0, 0, 0, 0]);
  f.set('enable', 1);
  assert.equal(f.out('chip'), 'Z');
  f.set('clear', 0);
  assert.equal(inspectByte(chip, f.runtime).shift.dec, '0');
  assert.equal(inspectByte(chip, f.runtime).formats.dec, '11');
  assert.equal(inspectByte(chip, f.runtime).parallel, 'Z');
  f.set('enable', 0);
  assert.equal(f.out('chip'), 11);
  f.pulse('latch');
  assert.equal(f.out('chip'), 0);
  assert.equal(f.runtime.state.chip.lastByteChange.sequence, 2);
  assert.match(inspectionMarkup(chip, 'ua'), /Зберігання · QA–QH.*data-chip-shift.*QH′/);
});

test('simultaneous rising clocks latch the shift byte that existed before the edge', () => {
  const f = shiftFixture({ tiedClocks: true });
  f.set('ser', 1);
  f.pulse('shift');
  assert.equal(f.out('chip'), 0);
  f.set('ser', 0);
  f.pulse('shift');
  assert.equal(f.out('chip'), 1);
  f.pulse('shift');
  assert.equal(f.out('chip'), 2);
  assert.equal(f.runtime.state.chip.lastByteChange.sequence, 3);
});

test('74HC595 reset samples high clocks without inventing shift or latch edges', () => {
  const f = shiftFixture();
  f.set('ser', 1);
  f.pulse('shift');
  f.pulse('latch');
  assert.equal(f.out('chip'), 1);
  const reset = createRuntime();
  simulate(f.project, reset, 0);
  assert.deepEqual(reset.state.chip.shiftBits, Array(8).fill(0));
  assert.equal(output(reset, 'chip'), 0);
  assert.equal(reset.state.chip.lastByteChange, undefined);
});

test('cascaded 74HC595s sample old QH′ at a shared edge even with QA–QH released', () => {
  const f = shiftFixture({ cascade: true });
  f.set('enable', 1);
  f.set('ser', 1);
  f.pulse('shift');
  f.set('ser', 0);
  for (let index = 0; index < 7; index++) f.pulse('shift');
  assert.equal(f.out('chip'), 'Z');
  assert.equal(f.out('chip', 'serial'), 1);
  f.pulse('latch');
  assert.equal(f.out('second'), 0);
  f.pulse('shift');
  assert.equal(f.out('chip', 'serial'), 0);
  f.pulse('latch');
  assert.equal(f.out('second'), 1);
});

test('74HC595 preserves known physical output bits with unknown data and distinguishes floating controls', () => {
  const f = shiftFixture();
  const sourceNode = (id) => f.project.nodes.find((item) => item.id === id);
  sourceNode('ser').enabled = false;
  f.pulse('shift');
  f.pulse('latch');
  assert.equal(f.out('chip'), 'X');
  assert.deepEqual(Object.values(f.runtime.outputs.chip), ['X', 0, 0, 0, 0, 0, 0, 0, 0]);
  sourceNode('enable').enabled = false;
  f.settle();
  assert.deepEqual(Object.values(f.runtime.outputs.chip), [...Array(8).fill('X'), 0]);
  f.project.wires = f.project.wires.filter(({ to }) => to.port !== 'oe');
  f.settle();
  assert.equal(f.runtime.outputs.chip.out1, 0, 'unwired OE̅ uses its low default');
  sourceNode('ser').enabled = true;
  f.set('ser', 1);
  f.pulse('shift');
  sourceNode('clear').enabled = false;
  f.settle();
  assert.deepEqual(f.runtime.state.chip.shiftBits, ['X', 'X', 0, 0, 0, 0, 0, 0]);
  assert.equal(f.runtime.state.chip.lastByteChange.sequence, 1, 'MR̅ cannot latch storage');
});

function eepromFixture() {
  const chip = node('memory', 'eeprom', { data: '12,0xA5,8' });
  const f = fixture(
    [
      byte('address', 1),
      byte('data', 0x3c),
      source('clk', 0),
      source('we', 0),
      source('oe', 1),
      source('cs', 1),
      chip,
    ],
    [
      wire('address', 'nibble', 'memory', 'address'),
      wire('data', 'out', 'memory', 'data'),
      ...['clk', 'we', 'oe', 'cs'].map((id) => wire(id, 'out', 'memory', id)),
    ],
  );
  return { ...f, chip };
}

test('EEPROM clocks writes into the live map and reloads the saved image on reset', () => {
  const f = eepromFixture();
  assert.equal(f.out('memory'), 0xa5);
  f.pulse('clk');
  assert.equal(f.runtime.state.memory.lastWrite, undefined);
  f.set('we', 1);
  assert.equal(f.out('memory'), 'Z');
  assert.equal(f.runtime.state.memory.memory[1], 0xa5, 'WE alone cannot write');
  f.set('cs', 0);
  f.pulse('clk');
  assert.equal(f.runtime.state.memory.lastWrite, undefined);
  f.set('cs', 1);
  f.pulse('clk');
  f.set('we', 0);
  assert.equal(f.out('memory'), 0x3c);
  f.set('oe', 0);
  assert.equal(f.out('memory'), 'Z');
  const memory = inspectMemory(f.chip, f.project, f.runtime);
  assert.deepEqual(memory.rows.map((row) => row.formats.dec).slice(0, 4), ['12', '60', '8', '0']);
  assert.equal(memory.rows[1].lastWritten, true);
  assert.deepEqual(memory.rows[1].changed, [0, 3, 4, 7]);
  assert.equal(memory.readActive, false);
  assert.equal(f.chip.params.data, '12,0xA5,8');
  assert.match(inspectionMarkup(f.chip, 'en'), /Simulation reset reloads the saved image/);
  const reset = createRuntime();
  f.set('oe', 1);
  f.set('we', 1);
  simulate(f.project, reset, 0);
  assert.equal(output(reset, 'memory'), 'Z');
  assert.equal(reset.state.memory.memory[1], 0xa5, 'reset while WE=CLK=1 cannot invent a write');
  f.set('we', 0);
  simulate(f.project, reset, 0);
  assert.equal(output(reset, 'memory'), 0xa5);
  assert.equal(reset.state.memory.lastWrite, undefined);
});

test('EEPROM uncertain address merges each affected byte and leaves other cells intact', () => {
  const f = eepromFixture();
  f.project.wires = f.project.wires.filter(({ to }) => to.port !== 'address0');
  f.set('we', 1);
  f.pulse('clk');
  f.set('we', 0);
  assert.equal(f.runtime.state.memory.lastWrite.definite, false);
  assert.deepEqual(f.runtime.state.memory.lastWrite.addresses, [0, 1]);
  assert.deepEqual(f.runtime.state.memory.memoryBits[0], [0, 0, 1, 1, 'X', 'X', 0, 0]);
  assert.equal(f.runtime.state.memory.memory[2], 8);
  assert.equal(f.runtime.outputs.memory.out2, 1);
  assert.equal(f.runtime.outputs.memory.out0, 'X');
});

test('EEPROM sequence replays writes and reset from the unchanged preload', () => {
  const f = eepromFixture();
  const sequence = createSequence(f.project, { probes: [{ node: 'memory', port: 'out' }] });
  for (const [at, id, value] of [
    [0, 'we', 1],
    [0, 'clk', 1],
    [0, 'we', 0],
    [0, 'clk', 0],
  ])
    appendAction(sequence, { at, node: id, key: 'value', value });
  appendAction(sequence, { at: 0.01, op: 'reset' });
  finishSequence(sequence, 0.01);
  const replay = replaySequence(sequence);
  assert.deepEqual(
    replay.observations.map(({ values }) => values[0]),
    [0xa5, 'Z', 'Z', 0x3c, 0x3c, 0xa5],
  );
  assert.equal(output(replay.runtime, 'memory'), 0xa5);
  assert.equal(replay.runtime.state.memory.lastWrite, undefined);
  assert.equal(output(f.runtime, 'memory'), 0xa5);
  assert.equal(replay.runtime.state.memory.memory[1], 0xa5);
});

test('EEPROM image accepts at most sixteen unsigned bytes and fills omitted addresses with zero', () => {
  assert.deepEqual(decodeEepromData('12, 0xA5; 255'), [12, 165, 255, ...Array(13).fill(0)]);
  assert.deepEqual(decodeEepromData([3, '0xFE']), [3, 254, ...Array(14).fill(0)]);
  assert.deepEqual(decodeEepromData(''), Array(16).fill(0));
  for (const malformed of ['-1', '256', '1.5', '1e2', '0x100', 'abc', Array(17).fill(1), [[1]]])
    assert.equal(decodeEepromData(malformed), null);
});

test('project validation rejects malformed EEPROM images without truncating the extra byte', () => {
  const f = eepromFixture();
  assert.equal(validateProject(f.project).nodes.at(-1).params.data, '12,0xA5,8');
  for (const data of ['12,256', '12,1.5', Array(17).fill(42)]) {
    f.chip.params.data = data;
    assert.throws(() => validateProject(f.project), /EEPROM data must contain at most 16 bytes/);
  }
});

import { node, wire, circuit, source, byte, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, getDefinition } from '../../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('every catalog component produces exactly its declared output ports', () => {
  for (const definition of COMPONENTS) {
    const runtime = evaluate(circuit([node('device', definition.type)]));
    assert.deepEqual(
      Object.keys(runtime.outputs.device).sort(),
      definition.outputs.map((port) => port.id).sort(),
      definition.type,
    );
    assert.equal(getDefinition(definition.type), definition);
  }
  assert.equal(getDefinition('missing'), undefined);
});

test('every digital contact is a separate bit with an unambiguous group and position', () => {
  for (const definition of COMPONENTS) {
    for (const direction of ['inputs', 'outputs']) {
      const contacts = definition[direction];
      assert.equal(new Set(contacts.map((pin) => pin.id)).size, contacts.length, definition.type);
      assert.ok(
        contacts.every((pin) => pin.width === 1),
        definition.type,
      );
      for (const signal of definition.signals[direction]) {
        const pins = contacts.filter((pin) => pin.group === signal.id || pin.id === signal.id);
        assert.equal(pins.length, signal.width, `${definition.type}.${signal.id}`);
        if (signal.width > 1)
          assert.deepEqual(
            pins.map(({ id, bit, groupWidth }) => [id, bit, groupWidth]),
            Array.from({ length: signal.width }, (_, bit) => [
              `${signal.id}${bit}`,
              bit,
              signal.width,
            ]),
          );
      }
    }
  }
  assert.deepEqual(
    getDefinition('bus_input')
      .outputs.filter((pin) => pin.group === 'out')
      .map((pin) => pin.label),
    ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  );
  assert.deepEqual(
    getDefinition('sevenseg').inputs.map((pin) => pin.label),
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'],
  );
});

test('a mux routes each bit independently through floating and conflicting adjacent lines', () => {
  const project = circuit(
    [source('one', 1), source('zero', 0), source('high', 1), source('low', 0), node('mux', 'mux')],
    [
      wire('low', 'out', 'mux', 'sel'),
      wire('high', 'out', 'mux', 'a0'),
      wire('low', 'out', 'mux', 'a1'),
      wire('one', 'out', 'mux', 'a2'),
      wire('zero', 'out', 'mux', 'a2'),
    ],
  );
  const runtime = evaluate(project);
  assert.deepEqual(Object.values(runtime.outputs.mux), [1, 0, 'X', 'Z', 'Z', 'Z', 'Z', 'Z']);
  assert.equal(runtime.signals.inputs.mux.a, 'X');
  assert.equal(runtime.signals.outputs.mux.out, 'X');
  assert.equal(runtime.outputs.mux.out, undefined);
});

test('registers capture and retain known data bits beside unknown inputs', () => {
  const project = circuit(
    [source('one', 1), source('zero', 0), source('clk', 0), node('reg', 'register')],
    [
      wire('one', 'out', 'reg', 'd0'),
      wire('zero', 'out', 'reg', 'd1'),
      wire('clk', 'out', 'reg', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  project.nodes.find((node) => node.id === 'clk').params.value = 1;
  simulate(project, runtime, 0);
  assert.deepEqual(Object.values(runtime.outputs.reg), [1, 0, 'X', 'X', 'X', 'X', 'X', 'X']);
  assert.equal(runtime.signals.outputs.reg.out, 'X');
  project.wires = project.wires.filter((connection) => connection.to.port !== 'd0');
  simulate(project, runtime, 0);
  assert.equal(runtime.outputs.reg.out0, 1);
  project.wires.push(wire('one', 'out', 'reg', 'reset'));
  simulate(project, runtime, 0);
  assert.deepEqual(Object.values(runtime.outputs.reg), Array(8).fill(0));
});

test('a shift register moves an unknown bit without erasing the other stored bits', () => {
  const project = circuit(
    [source('one', 1), source('clk', 0), node('shift', 'shift_register', { initial: 128 })],
    [wire('clk', 'out', 'shift', 'clk')],
  );
  const runtime = evaluate(project);
  assert.equal(runtime.outputs.shift.serial, 1);
  project.nodes.find((node) => node.id === 'clk').params.value = 1;
  simulate(project, runtime, 0);
  assert.deepEqual(Object.values(runtime.outputs.shift), ['X', 0, 0, 0, 0, 0, 0, 0, 0]);
  project.nodes.find((node) => node.id === 'clk').params.value = 0;
  project.wires.push(wire('one', 'out', 'shift', 'd'));
  simulate(project, runtime, 0);
  project.nodes.find((node) => node.id === 'clk').params.value = 1;
  simulate(project, runtime, 0);
  assert.deepEqual(Object.values(runtime.outputs.shift), [1, 'X', 0, 0, 0, 0, 0, 0, 0]);
});

test('RAM and register-file writes store each bit independently at the addressed word', () => {
  for (const type of ['ram', 'register_file']) {
    const project = circuit(
      [
        byte('address', 3),
        source('one', 1),
        source('zero', 0),
        source('clk', 0),
        source('we', 1),
        node('memory', type),
      ],
      [
        ...(type === 'ram'
          ? [wire('address', 'nibble', 'memory', 'address')]
          : [
              wire('address', 'address', 'memory', 'read'),
              wire('address', 'address', 'memory', 'write'),
            ]),
        wire('one', 'out', 'memory', 'data0'),
        wire('zero', 'out', 'memory', 'data1'),
        wire('clk', 'out', 'memory', 'clk'),
        wire('we', 'out', 'memory', 'we'),
      ],
    );
    const runtime = evaluate(project);
    project.nodes.find((node) => node.id === 'clk').params.value = 1;
    simulate(project, runtime, 0);
    project.nodes.find((node) => node.id === 'we').params.value = 0;
    simulate(project, runtime, 0);
    assert.deepEqual(
      Object.values(runtime.outputs.memory),
      [1, 0, 'X', 'X', 'X', 'X', 'X', 'X'],
      type,
    );
    project.nodes.find((node) => node.id === 'address').params.value = 4;
    simulate(project, runtime, 0);
    assert.deepEqual(Object.values(runtime.outputs.memory), Array(8).fill(0), type);
  }
});

test('unknown mux selection preserves matching bit values without joining their nets', () => {
  const runtime = evaluate(
    circuit(
      [source('one', 1), source('zero', 0), node('mux', 'mux')],
      [
        wire('zero', 'out', 'mux', 'a0'),
        wire('zero', 'out', 'mux', 'b0'),
        wire('one', 'out', 'mux', 'a1'),
        wire('zero', 'out', 'mux', 'b1'),
      ],
    ),
  );
  assert.equal(runtime.outputs.mux.out0, 0);
  assert.equal(runtime.outputs.mux.out1, 'X');
  assert.equal(runtime.outputs.mux.out2, 'Z');
});

test('demux, tri-state and bit connectors preserve each line including Z and X', () => {
  const project = circuit(
    [
      source('one', 1),
      source('zero', 0),
      source('conflictHigh', 1),
      source('conflictLow', 0),
      node('demux', 'demux'),
      node('tri', 'tristate'),
      node('split', 'splitter'),
      node('merge', 'merger'),
    ],
    [
      wire('zero', 'out', 'demux', 'sel'),
      wire('one', 'out', 'demux', 'in0'),
      wire('conflictHigh', 'out', 'demux', 'in2'),
      wire('conflictLow', 'out', 'demux', 'in2'),
      wire('one', 'out', 'tri', 'enable'),
      ...Array.from({ length: 8 }, (_, bit) => wire('demux', `a${bit}`, 'tri', `in${bit}`)),
      wire('tri', 'out', 'split', 'in'),
      ...Array.from({ length: 8 }, (_, bit) => wire('split', `b${bit}`, 'merge', `b${bit}`)),
    ],
  );
  const runtime = evaluate(project);
  const expected = [1, 'Z', 'X', 'Z', 'Z', 'Z', 'Z', 'Z'];
  assert.deepEqual(Object.values(runtime.outputs.tri), expected);
  assert.deepEqual(Object.values(runtime.outputs.split), expected);
  assert.deepEqual(Object.values(runtime.outputs.merge), expected);
  assert.deepEqual(Object.values(runtime.outputs.demux).slice(8), Array(8).fill(0));
  project.wires.find((connection) => connection.to.port === 'enable').from.node = 'zero';
  simulate(project, runtime, 0);
  assert.deepEqual(Object.values(runtime.outputs.tri), Array(8).fill('Z'));
  assert.deepEqual(Object.values(runtime.outputs.merge), Array(8).fill('Z'));
});

test('packed internal signal names cannot be used as physical connection endpoints', () => {
  const project = {
    nodes: [byte('byte', 255), node('dac', 'dac')],
    wires: [wire('byte', 'out', 'dac', 'in')],
  };
  const runtime = evaluate(project);
  assert.deepEqual(Object.values(runtime.inputs.dac), Array(8).fill('Z'));
  assert.deepEqual(Object.keys(runtime.wireValues), []);
});

test('single-bit initial states cannot expose nonbinary values', () => {
  for (const type of ['d_ff', 'jk_ff', 't_ff']) {
    const runtime = evaluate(
      circuit(
        [source('clk', 0), node('ff', type, { initial: 2 })],
        [wire('clk', 'out', 'ff', 'clk')],
      ),
    );
    assert.equal(output(runtime, 'ff', 'q'), 1);
    assert.equal(output(runtime, 'ff', 'nq'), 0);
  }
});

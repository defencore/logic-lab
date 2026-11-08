import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, getDefinition } from '../src/catalog.js';
import { createRuntime, simulate } from '../src/simulator.js';

const node = (id, type, params = {}) => ({ id, type, x: 0, y: 0, enabled: true, params });
const wire = (source, sourcePort, target, targetPort) => ({
  id: `${source}.${sourcePort}-${target}.${targetPort}`,
  from: { node: source, port: sourcePort },
  to: { node: target, port: targetPort },
});
const circuit = (nodes, wires = []) => ({
  nodes,
  wires: wires.flatMap((connection) => {
    const source = getDefinition(nodes.find((node) => node.id === connection.from.node)?.type);
    const target = getDefinition(nodes.find((node) => node.id === connection.to.node)?.type);
    const outputs =
      source?.outputs.filter(
        (pin) => pin.id === connection.from.port || pin.group === connection.from.port,
      ) || [];
    const inputs =
      target?.inputs.filter(
        (pin) => pin.id === connection.to.port || pin.group === connection.to.port,
      ) || [];
    if (outputs.length <= 1 && inputs.length <= 1) return [connection];
    assert.equal(
      outputs.length,
      inputs.length,
      'Test fixtures must connect matching groups of individual lines',
    );
    return outputs.map((pin, index) => ({
      ...connection,
      id: `${connection.id}-${index}`,
      from: { ...connection.from, port: pin.id },
      to: { ...connection.to, port: inputs[index].id },
      width: 1,
    }));
  }),
});
const source = (id, value) => node(id, 'switch', { value });
const byte = (id, value) => node(id, 'bus_input', { value });
const output = (runtime, id, port = 'out') => runtime.signals.outputs[id][port];
const evaluate = (project) => simulate(project, createRuntime(), 0);

test('all seven gate truth tables are correct', () => {
  const functions = {
    and: (a, b) => a & b,
    or: (a, b) => a | b,
    xor: (a, b) => a ^ b,
    nand: (a, b) => 1 - (a & b),
    nor: (a, b) => 1 - (a | b),
    xnor: (a, b) => 1 - (a ^ b),
  };
  for (const [type, fn] of Object.entries(functions))
    for (let a = 0; a <= 1; a++)
      for (let b = 0; b <= 1; b++) {
        const project = circuit(
          [source('a', a), source('b', b), node('gate', type)],
          [wire('a', 'out', 'gate', 'a'), wire('b', 'out', 'gate', 'b')],
        );
        assert.equal(output(evaluate(project), 'gate'), fn(a, b), `${type}(${a}, ${b})`);
      }
  for (let a = 0; a <= 1; a++)
    assert.equal(
      output(
        evaluate(circuit([source('a', a), node('gate', 'not')], [wire('a', 'out', 'gate', 'a')])),
        'gate',
      ),
      1 - a,
    );
});

test('live edits update source values, reused node IDs, wire endpoints and fan-out without stale connectivity', () => {
  const project = circuit(
    [source('a', 0), source('b', 1), node('gate', 'not')],
    [wire('a', 'out', 'gate', 'a')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'gate'), 1);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
  project.nodes[0] = source('a', 0);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 1);
  project.wires[0].from.node = 'b';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
  project.wires.push(wire('a', 'out', 'gate', 'a'));
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 'X');
  project.wires.pop();
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 0);
});

test('editing a detached old wire cannot alter the current circuit after a same-endpoint replacement', () => {
  const project = circuit(
    [source('a', 0), source('b', 1), node('gate', 'not')],
    [wire('a', 'out', 'gate', 'a')],
  );
  const runtime = evaluate(project);
  const old = project.wires[0];
  project.wires = structuredClone(project.wires);
  simulate(project, runtime, 0);
  old.from.node = 'b';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'gate'), 1);
  assert.equal(runtime.inputs.gate.a, 0);
});

test('changing a component type under a reused ID initializes its own state and drops old output contacts', () => {
  const project = circuit(
    [source('clock', 0), node('device', 'not')],
    [wire('clock', 'out', 'device', 'a')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'device'), 1);
  project.nodes[1] = node('device', 'counter', { initial: 7 });
  project.wires[0].to.port = 'clk';
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'device'), 7);
  assert.equal(runtime.outputs.device.out, undefined);
  assert.equal(runtime.outputs.device.out0, 1);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'device'), 8);
});

test('reactivating sequential components does not capture clock or trigger edges ignored while disabled', () => {
  for (const type of ['d_ff', 'counter', 'shift_register', 'monostable']) {
    const sequential = node('memory', type);
    const project = circuit(
      [source('data', 1), source('clock', 0), sequential],
      [
        wire('clock', 'out', 'memory', type === 'monostable' ? 'trigger' : 'clk'),
        ...(['d_ff', 'shift_register'].includes(type) ? [wire('data', 'out', 'memory', 'd')] : []),
      ],
    );
    const runtime = evaluate(project);
    sequential.enabled = false;
    project.nodes.find((node) => node.id === 'clock').params.value = 1;
    simulate(project, runtime, 0);
    sequential.enabled = true;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'memory', type === 'd_ff' ? 'q' : 'out'), 0, type);
    project.nodes.find((node) => node.id === 'clock').params.value = 0;
    simulate(project, runtime, 0);
    project.nodes.find((node) => node.id === 'clock').params.value = 1;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'memory', type === 'd_ff' ? 'q' : 'out'), 1, type);
  }
});

test('controlling inputs resolve gates while floating inputs remain visible', () => {
  const project = circuit(
    [source('zero', 0), source('one', 1), node('a', 'and'), node('o', 'or'), node('x', 'xor')],
    [wire('zero', 'out', 'a', 'a'), wire('one', 'out', 'o', 'a')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'a'), 0);
  assert.equal(output(runtime, 'o'), 1);
  assert.equal(output(runtime, 'x'), 'X');
  assert.equal(runtime.inputs.x.a, 'Z');
  assert.ok(runtime.diagnostics.some((entry) => entry.code === 'floating'));
});

test('combinational chains settle independently of node order', () => {
  const nodes = [source('a', 1)];
  const wires = [];
  let previous = 'a';
  for (let index = 0; index < 80; index++) {
    nodes.unshift(node(`n${index}`, 'not'));
    wires.push(wire(previous, 'out', `n${index}`, 'a'));
    previous = `n${index}`;
  }
  assert.equal(output(evaluate(circuit(nodes, wires)), previous), 1);
});

test('strong conflicts produce X; weak pull-up is overridden by an open drain', () => {
  const project = circuit(
    [
      source('control', 1),
      node('drain', 'open_drain'),
      node('pull', 'pullup'),
      node('lamp', 'led'),
    ],
    [
      wire('control', 'out', 'drain', 'in'),
      wire('drain', 'out', 'lamp', 'in'),
      wire('pull', 'out', 'lamp', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(runtime.inputs.lamp.in, 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.lamp.in, 0);
  project.nodes.push(source('strong', 1));
  project.wires.push(wire('strong', 'out', 'lamp', 'in'));
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.lamp.in, 'X');
});

test('disabled outputs release the bus and simulation removes deleted state', () => {
  const project = circuit([source('s', 1), node('l', 'led')], [wire('s', 'out', 'l', 'in')]);
  const runtime = evaluate(project);
  project.nodes[0].enabled = false;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.l.in, 'Z');
  project.nodes.shift();
  simulate(project, runtime, 0);
  assert.equal(runtime.state.s, undefined);
});

test('shared output fan-out joins a physical net for wired-AND and bus conflicts', () => {
  const project = circuit(
    [
      source('control', 0),
      node('drain', 'open_drain'),
      node('pull', 'pullup'),
      node('a', 'led'),
      node('b', 'led'),
    ],
    [
      wire('control', 'out', 'drain', 'in'),
      wire('drain', 'out', 'a', 'in'),
      wire('pull', 'out', 'a', 'in'),
      wire('pull', 'out', 'b', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(runtime.inputs.a.in, 0);
  assert.equal(runtime.inputs.b.in, 0);
  assert.equal(runtime.wireValues['pull.out-b.in'], 0);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(runtime.inputs.a.in, 1);
  assert.equal(runtime.inputs.b.in, 1);
});

test('D flip-flop captures once per rising edge and resets asynchronously', () => {
  const project = circuit(
    [source('d', 1), source('clk', 0), source('reset', 0), node('ff', 'd_ff')],
    [
      wire('d', 'out', 'ff', 'd'),
      wire('clk', 'out', 'ff', 'clk'),
      wire('reset', 'out', 'ff', 'reset'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'ff', 'q'), 0);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ff', 'q'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0.1);
  assert.equal(output(runtime, 'ff', 'q'), 1);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ff', 'q'), 0);
});

test('flip-flops sample simultaneous edges without racing through a chain', () => {
  const project = circuit(
    [source('data', 1), source('clk', 0), node('a', 'd_ff'), node('b', 'd_ff')],
    [
      wire('data', 'out', 'a', 'd'),
      wire('a', 'q', 'b', 'd'),
      wire('clk', 'out', 'a', 'clk'),
      wire('clk', 'out', 'b', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'a', 'q'), 1);
  assert.equal(output(runtime, 'b', 'q'), 0);
});

test('counter counts clock rising edges and respects enable', () => {
  const project = circuit(
    [node('clk', 'clock', { frequency: 2 }), source('en', 1), node('counter', 'counter')],
    [wire('clk', 'out', 'counter', 'clk'), wire('en', 'out', 'counter', 'enable')],
  );
  const runtime = evaluate(project);
  for (let step = 0; step < 200; step++) simulate(project, runtime, 0.01);
  assert.equal(output(runtime, 'counter'), 4);
  project.nodes[1].params.value = 0;
  for (let step = 0; step < 100; step++) simulate(project, runtime, 0.01);
  assert.equal(output(runtime, 'counter'), 4);
});

test('SR latch remembers its state and flags an invalid set/reset', () => {
  const project = circuit(
    [source('s', 1), source('r', 0), node('latch', 'sr_latch')],
    [wire('s', 'out', 'latch', 's'), wire('r', 'out', 'latch', 'r')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'latch', 'q'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'latch', 'q'), 1);
  project.nodes[0].params.value = 1;
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'latch', 'q'), 'X');
  assert.ok(runtime.diagnostics.some((entry) => entry.code === 'invalid_sr'));
});

test('JK and T flip-flops toggle on rising edges', () => {
  const project = circuit(
    [source('one', 1), source('clk', 0), node('jk', 'jk_ff'), node('t', 't_ff')],
    [
      wire('one', 'out', 'jk', 'j'),
      wire('one', 'out', 'jk', 'k'),
      wire('one', 'out', 't', 't'),
      wire('clk', 'out', 'jk', 'clk'),
      wire('clk', 'out', 't', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  for (let count = 0; count < 4; count++) {
    project.nodes[1].params.value = 1;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'jk', 'q'), (count + 1) % 2);
    assert.equal(output(runtime, 't', 'q'), (count + 1) % 2);
    project.nodes[1].params.value = 0;
    simulate(project, runtime, 0);
  }
});

test('register and shift register retain data between edges', () => {
  const project = circuit(
    [
      byte('data', 173),
      source('serial', 1),
      source('clk', 0),
      node('reg', 'register'),
      node('shift', 'shift_register'),
    ],
    [
      wire('data', 'out', 'reg', 'd'),
      wire('serial', 'out', 'shift', 'd'),
      wire('clk', 'out', 'reg', 'clk'),
      wire('clk', 'out', 'shift', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'reg'), 173);
  assert.equal(output(runtime, 'shift'), 1);
  project.nodes[2].params.value = 0;
  simulate(project, runtime, 0);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'shift'), 3);
});

test('RAM writes on a rising edge, reads addressed data and releases its output', () => {
  const project = circuit(
    [
      byte('address', 3),
      byte('data', 197),
      source('clk', 0),
      source('we', 1),
      source('oe', 1),
      node('ram', 'ram'),
    ],
    [
      wire('address', 'nibble', 'ram', 'address'),
      wire('data', 'out', 'ram', 'data'),
      wire('clk', 'out', 'ram', 'clk'),
      wire('we', 'out', 'ram', 'we'),
      wire('oe', 'out', 'ram', 'oe'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'ram'), 'Z');
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  project.nodes[3].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 197);
  project.nodes[0].params.value = 4;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 0);
  project.nodes[4].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 'Z');
});

test('ROM and register-file addresses use fixed 4-bit and 3-bit pins', () => {
  const project = circuit(
    [
      byte('address', 2),
      byte('data', 91),
      source('clk', 0),
      source('we', 1),
      node('rom', 'rom', { data: '0,0xA0,0xff' }),
      node('rf', 'register_file'),
    ],
    [
      wire('address', 'nibble', 'rom', 'address'),
      wire('address', 'address', 'rf', 'read'),
      wire('address', 'address', 'rf', 'write'),
      wire('data', 'out', 'rf', 'data'),
      wire('clk', 'out', 'rf', 'clk'),
      wire('we', 'out', 'rf', 'we'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'rom'), 255);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'rf'), 91);
});

test('DAC/ADC round trip preserves every byte and clamps voltage range', () => {
  const project = circuit(
    [byte('data', 0), node('dac', 'dac'), node('adc', 'adc')],
    [wire('data', 'out', 'dac', 'in'), wire('dac', 'out', 'adc', 'in')],
  );
  const runtime = createRuntime();
  for (let value = 0; value <= 255; value++) {
    project.nodes[0].params.value = value;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'adc'), value);
  }
  assert.equal(output(runtime, 'dac'), 5);
});

test('ALU operations produce byte, carry/borrow and zero flags', () => {
  const project = circuit(
    [byte('a', 250), byte('b', 10), byte('op', 0), node('alu', 'alu')],
    [
      wire('a', 'out', 'alu', 'a'),
      wire('b', 'out', 'alu', 'b'),
      wire('op', 'address', 'alu', 'op'),
    ],
  );
  const runtime = evaluate(project);
  assert.deepEqual(runtime.signals.outputs.alu, { out: 4, carry: 1, zero: 0 });
  project.nodes[2].params.value = 4;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'alu'), 240);
  project.nodes[0].params.value = 10;
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.deepEqual(runtime.signals.outputs.alu, { out: 0, carry: 0, zero: 1 });
});

test('splitter/merger preserve bit order and decoder maps digits', () => {
  const project = circuit(
    [
      byte('byte', 165),
      node('split', 'splitter'),
      node('merge', 'merger'),
      node('decode', 'decoder'),
    ],
    [
      wire('byte', 'out', 'split', 'in'),
      wire('byte', 'nibble', 'decode', 'in'),
      ...Array.from({ length: 8 }, (_, index) => wire('split', `b${index}`, 'merge', `b${index}`)),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'merge'), 165);
  assert.equal(output(runtime, 'decode'), 0x6d);
});

test('tri-state releases the net, encoders detect one-hot and priority', () => {
  const project = circuit(
    [
      byte('data', 0b10100000),
      source('en', 0),
      node('tri', 'tristate'),
      node('enc', 'encoder'),
      node('pri', 'priority_encoder'),
    ],
    [
      wire('data', 'out', 'tri', 'in'),
      wire('en', 'out', 'tri', 'enable'),
      wire('data', 'out', 'enc', 'in'),
      wire('data', 'out', 'pri', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'tri'), 'Z');
  assert.equal(output(runtime, 'enc'), 'X');
  assert.equal(output(runtime, 'pri'), 7);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'tri'), 160);
});

test('Schmitt hysteresis holds its state between switching thresholds', () => {
  const project = circuit(
    [byte('voltage', 0), node('dac', 'dac'), node('s', 'schmitt')],
    [wire('voltage', 'out', 'dac', 'in'), wire('dac', 'out', 's', 'in')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 's'), 0);
  project.nodes[0].params.value = 128;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 0);
  project.nodes[0].params.value = 220;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 1);
  project.nodes[0].params.value = 128;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 1);
  project.nodes[0].params.value = 20;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 0);
});

test('monostable pulse expires and does not retrigger while active', () => {
  const project = circuit(
    [source('trigger', 0), node('timer', 'monostable', { duration: 0.1 })],
    [wire('trigger', 'out', 'timer', 'trigger')],
  );
  const runtime = evaluate(project);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'timer'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0.03);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0.03);
  simulate(project, runtime, 0.05);
  assert.equal(output(runtime, 'timer'), 0);
});

test('PWM duty maps to four independent servo angles and clock phases remain digital', () => {
  const project = circuit(
    [node('pwm', 'pwm', { duty: 0.18, frequency: 105 }), node('servo', 'servo')],
    [wire('pwm', 'duty', 'servo', 's1')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'servo', 'a1'), -90);
  project.nodes[0].params.duty = 0.5;
  simulate(project, runtime, 0.1);
  assert.ok(Math.abs(output(runtime, 'servo', 'a1')) < 1e-10);
  project.nodes[0].params.duty = 0.82;
  simulate(project, runtime, 0.1);
  assert.equal(output(runtime, 'servo', 'a1'), 90);
  assert.ok([0, 1].includes(output(runtime, 'pwm')));
  assert.equal(output(runtime, 'servo', 'a2'), 0);
});

test('AM/FM outputs stay bounded and scopes cap their numeric history', () => {
  for (const type of ['am', 'fm']) {
    const project = circuit(
      [node('wave', type), node('scope', 'scope')],
      [wire('wave', 'out', 'scope', 'in')],
    );
    const runtime = createRuntime();
    for (let step = 0; step < 500; step++) {
      simulate(project, runtime, 0.001);
      assert.ok(output(runtime, 'wave') >= 0 && output(runtime, 'wave') <= 5);
    }
    assert.equal(runtime.history.scope.length, 256);
    assert.ok(runtime.history.scope.every(Number.isFinite));
  }
});

test('signal histories trace outputless indicators and numeric processing blocks', () => {
  const project = circuit(
    [
      source('input', 0),
      byte('data', 128),
      node('led', 'led'),
      node('counter', 'counter'),
      node('dac', 'dac'),
      node('adc', 'adc'),
      node('pwm', 'pwm'),
      node('servo', 'servo'),
      node('matrix', 'matrix'),
      node('sevenseg', 'sevenseg'),
      node('scope', 'scope'),
      node('floating', 'led'),
    ],
    [
      wire('input', 'out', 'led', 'in'),
      wire('input', 'out', 'counter', 'clk'),
      wire('data', 'out', 'dac', 'in'),
      wire('dac', 'out', 'adc', 'in'),
      wire('pwm', 'duty', 'servo', 's1'),
      wire('data', 'out', 'matrix', 'rows'),
      wire('data', 'out', 'matrix', 'cols'),
      wire('data', 'out', 'sevenseg', 'in'),
      wire('input', 'out', 'scope', 'in'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0.001);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0.001);
  assert.deepEqual(runtime.history.led, [0, 1]);
  assert.deepEqual(runtime.history.counter, [0, 1]);
  assert.deepEqual(runtime.history.scope, [0, 1]);
  assert.deepEqual(runtime.history.matrix, [128, 128]);
  assert.deepEqual(runtime.history.sevenseg, [128, 128]);
  assert.deepEqual(runtime.history.adc, [128, 128]);
  assert.ok(runtime.history.dac.every((value) => Math.abs(value - (128 / 255) * 5) < 1e-10));
  assert.ok(runtime.history.servo.every((value) => Math.abs(value) < 1e-10));
  assert.deepEqual(runtime.history.floating, [null, null]);
  simulate(project, runtime, 0);
  assert.equal(runtime.history.led.length, 2);
  for (let sample = 0; sample < 300; sample++) simulate(project, runtime, 0.001);
  for (const id of ['led', 'counter', 'dac', 'adc', 'servo', 'matrix', 'sevenseg', 'scope'])
    assert.equal(runtime.history[id].length, 256, id);
});

test('half-millisecond samples capture all 105 Hz clock edges', () => {
  const project = circuit(
    [node('clock', 'clock', { frequency: 105 }), node('count', 'counter')],
    [wire('clock', 'out', 'count', 'clk')],
  );
  const runtime = evaluate(project);
  for (let sample = 0; sample < 2000; sample++) simulate(project, runtime, 0.0005);
  assert.equal(output(runtime, 'count'), 105);
});

test('digital modulation uses the complete modulation range for an individual bit', () => {
  const project = circuit(
    [source('data', 0), node('am', 'am', { carrier: 8, depth: 0.6, amplitude: 5 })],
    [wire('data', 'out', 'am', 'mod')],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 1 / 32);
  assert.ok(Math.abs(output(runtime, 'am') - 3.125) < 1e-10);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.ok(Math.abs(output(runtime, 'am') - 5) < 1e-10);
  project.nodes[0] = byte('data', 128);
  project.wires[0].from.port = 'out7';
  simulate(project, runtime, 0);
  assert.ok(Math.abs(output(runtime, 'am') - 5) < 1e-10);
});

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
    const runtime = evaluate(circuit([node('ff', type, { initial: 2 })]));
    assert.equal(output(runtime, 'ff', 'q'), 1);
    assert.equal(output(runtime, 'ff', 'nq'), 0);
  }
});

test('direct simulator calls safely support identifiers inherited by ordinary objects', () => {
  const project = circuit(
    [
      source('value', 1),
      node('constructor', 'ram'),
      node('toString', 'scope'),
      node('__proto__', 'd_ff'),
    ],
    [
      { ...wire('value', 'out', 'toString', 'in'), id: 'constructor' },
      { ...wire('value', 'out', '__proto__', 'd'), id: 'toString' },
      { ...wire('value', 'out', '__proto__', 'clk'), id: '__proto__' },
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0.001);
  assert.equal(output(runtime, 'constructor'), 'X');
  assert.equal(output(runtime, '__proto__', 'q'), 1);
  assert.deepEqual(runtime.history.toString, [1]);
  assert.deepEqual(runtime.history.constructor, [null]);
  assert.equal(runtime.wireValues.__proto__, 1);
  for (const key of ['outputs', 'inputs', 'wireValues', 'state', 'history'])
    assert.equal(Object.getPrototypeOf(runtime[key]), null, key);
  project.nodes = project.nodes.filter((component) => component.id !== '__proto__');
  simulate(project, runtime, 0.001);
  assert.equal(runtime.state.__proto__, undefined);
  assert.deepEqual(runtime.history.toString, [1, 1]);
});

test('history sampling runs independently from physics and is synchronized across nodes', () => {
  const project = circuit(
    [
      node('clock', 'clock', { frequency: 105 }),
      node('counter', 'counter'),
      node('scope', 'scope'),
    ],
    [wire('clock', 'out', 'counter', 'clk'), wire('clock', 'out', 'scope', 'in')],
  );
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01;
  simulate(project, runtime, 0);
  assert.deepEqual(Object.keys(runtime.history), []);
  assert.equal(runtime.lastSampleTime, 0);
  for (let step = 0; step < 2000; step++) {
    const previousLength = runtime.history.clock?.length || 0;
    simulate(project, runtime, 0.0005);
    const length = runtime.history.clock?.length || 0;
    assert.equal(runtime.history.counter?.length || 0, length);
    assert.equal(runtime.history.scope?.length || 0, length);
    if (length > previousLength)
      assert.equal(runtime.history.scope.at(-1), runtime.history.clock.at(-1));
  }
  assert.equal(
    output(runtime, 'counter'),
    105,
    'Clock edges are still evaluated at the physics rate',
  );
  assert.equal(
    runtime.history.scope.length,
    100,
    'One second records 100 samples at a 10 ms interval',
  );
  const previousTime = runtime.lastSampleTime;
  simulate(project, runtime, 0);
  assert.equal(runtime.history.scope.length, 100);
  assert.equal(runtime.lastSampleTime, previousTime);
});

test('one-millisecond physics produces one hundred history samples per second at ten milliseconds', () => {
  const project = circuit(
    [source('value', 1), node('scope', 'scope')],
    [wire('value', 'out', 'scope', 'in')],
  );
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01;
  for (let step = 0; step < 1000; step++) simulate(project, runtime, 0.001);
  assert.equal(runtime.history.scope.length, 100);
  assert.deepEqual(runtime.history.scope, Array(100).fill(1));
});

test('rolling waveform timestamps reflect actual sample times and stay aligned with values', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 10, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  runtime.sampleInterval = 0.0035;
  for (let step = 0; step < 1200; step++) simulate(project, runtime, 0.001);
  assert.equal(runtime.historyTimes.length, 256);
  assert.equal(runtime.history.clock.length, runtime.historyTimes.length);
  assert.ok(Math.abs(runtime.historyTimes.at(-1) - 1.197) < 1e-10);
  assert.ok(Math.abs(runtime.historyTimes[0] - 0.305) < 1e-10);
  const intervals = runtime.historyTimes.slice(1).map((time, i) => time - runtime.historyTimes[i]);
  assert.ok(intervals.some((interval) => Math.abs(interval - 0.003) < 1e-10));
  assert.ok(intervals.some((interval) => Math.abs(interval - 0.004) < 1e-10));
  const before = [...runtime.historyTimes];
  simulate(project, runtime, 0);
  assert.deepEqual(runtime.historyTimes, before);
});

test('narrow monitor windows preserve sampling cadence across fractional physics steps', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01 / 255;
  for (let step = 0; step < 334; step++) simulate(project, runtime, 0.00003);
  assert.equal(runtime.historyTimes.length, 255);
  assert.equal(runtime.history.clock.length, 255);
  assert.ok(Math.abs(runtime.historyTimes[0] - 0.00006) < 1e-10);
  assert.ok(Math.abs(runtime.historyTimes.at(-1) - 0.01002) < 1e-10);
  const transitions = runtime.history.clock
    .slice(1)
    .filter((value, i) => value !== runtime.history.clock[i]).length;
  assert.ok(transitions >= 19 && transitions <= 20);
});

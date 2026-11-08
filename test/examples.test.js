import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXAMPLES, createExample } from '../examples/index.js';
import { validateProject, parseProject, serializeProject } from '../src/project.js';
import { createRuntime, simulate } from '../src/simulator.js';
import { dimensions } from '../src/geometry.js';

function open(id) {
  const project = createExample(id),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}
function value(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}
function advance(context, seconds, interval = 0.0005) {
  const count = Math.ceil(seconds / interval);
  for (let i = 0; i < count; i++) simulate(context.project, context.runtime, seconds / count);
}
const output = (context, node, port = 'out') => context.runtime.signals.outputs[node][port];
const input = (context, node, port = 'in') => context.runtime.signals.inputs[node][port];

test('all learning examples have valid fresh circuits and complete bilingual lessons', () => {
  assert.equal(EXAMPLES.length, 19);
  assert.equal(new Set(EXAMPLES.map((example) => example.id)).size, EXAMPLES.length);
  for (const example of EXAMPLES) {
    assert.ok(
      ['basics', 'sequential', 'mixed', 'architecture', 'physical', 'motion'].includes(
        example.category,
      ),
    );
    assert.ok(['beginner', 'intermediate'].includes(example.level));
    const project = createExample(example.id),
      copy = createExample(example.id);
    assert.equal(project.exampleId, example.id);
    assert.deepEqual(validateProject(project), project);
    assert.deepEqual(parseProject(serializeProject(project)), project);
    project.nodes[0].params.value = 999;
    project.nodes[0].x = -999;
    assert.notEqual(copy.nodes[0].params.value, 999);
    assert.notEqual(copy.nodes[0].x, -999);
    const ids = new Set(copy.nodes.map((node) => node.id));
    for (const language of ['en', 'ua']) {
      const lesson = example.lesson[language];
      assert.ok(lesson.goal.length > 15);
      assert.ok(lesson.expected.length > 20);
      assert.ok(lesson.steps.length >= 3);
      for (const step of lesson.steps) {
        assert.ok(step.title.length > 3);
        assert.ok(step.text.length > 30);
        assert.ok(step.nodes.length > 0);
        assert.ok(
          step.nodes.every((id) => ids.has(id)),
          `${example.id}: unknown lesson node`,
        );
      }
    }
    const runtime = createRuntime();
    simulate(copy, runtime, 0);
    assert.deepEqual(
      runtime.diagnostics,
      [],
      `${example.id}: starting circuit must be ready to explore`,
    );
  }
  assert.throws(() => createExample('missing-lesson'), /Unknown example/);
});

test('expanded example components have room for all separate bit contacts', () => {
  for (const example of EXAMPLES) {
    const { nodes } = example.create();
    for (let index = 0; index < nodes.length; index++) {
      const a = nodes[index],
        da = dimensions(a);
      for (const b of nodes.slice(index + 1)) {
        const db = dimensions(b);
        assert.ok(
          a.x + da.w <= b.x || b.x + db.w <= a.x || a.y + da.h <= b.y || b.y + db.h <= a.y,
          `${example.id}: ${a.id} overlaps ${b.id}`,
        );
      }
    }
  }
});

test('byte observation scopes trace one selected bit while components retain full values', () => {
  for (const [example, source, signal, probe] of [
    ['alu', 'alu', 'out', 'result'],
    ['bus-mux', 'demux', 'a', 'left'],
    ['bus-mux', 'demux', 'b', 'right'],
    ['ram', 'ram', 'out', 'ram-view'],
    ['ram', 'rom', 'out', 'rom-view'],
    ['ram', 'registers', 'out', 'reg-view'],
  ]) {
    const context = open(example);
    const word = output(context, source, signal);
    assert.equal(context.runtime.inputs[probe].in, typeof word === 'number' ? word & 1 : word);
    const wire = context.project.wires.find((candidate) => candidate.to.node === probe);
    assert.equal(wire.width, 1);
    assert.equal(wire.from.port, `${signal}0`);
    assert.equal(context.project.nodes.find((node) => node.id === probe).params.range, 1);
  }
});

test('gate and arithmetic lessons reproduce all stated switch combinations', () => {
  const gates = open('logic-gates');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(gates, 'a', a);
      value(gates, 'b', b);
      const expected = {
        and: a & b,
        or: a | b,
        xor: a ^ b,
        nand: 1 - (a & b),
        nor: 1 - (a | b),
        xnor: 1 - (a ^ b),
        not: 1 - a,
      };
      for (const [type, result] of Object.entries(expected))
        assert.equal(input(gates, `${type}-led`), result);
    }
  const half = open('half-adder');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(half, 'a', a);
      value(half, 'b', b);
      assert.equal(input(half, 'sum-led') + 2 * input(half, 'carry-led'), a + b);
    }
  const full = open('full-adder');
  for (const a of [0, 1])
    for (const b of [0, 1])
      for (const carry of [0, 1]) {
        value(full, 'a', a);
        value(full, 'b', b);
        value(full, 'cin', carry);
        assert.equal(input(full, 'sum') + 2 * input(full, 'carry'), a + b + carry);
      }
});

test('manual D-memory lesson captures edges, holds changed data, and resets', () => {
  const context = open('d-memory');
  value(context, 'data', 1);
  assert.equal(input(context, 'q'), 0);
  value(context, 'clock', 1);
  assert.equal(input(context, 'q'), 1);
  assert.equal(input(context, 'nq'), 0);
  value(context, 'data', 0);
  assert.equal(input(context, 'q'), 1);
  value(context, 'clock', 0);
  value(context, 'clock', 1);
  assert.equal(input(context, 'q'), 0);
  value(context, 'clock', 0);
  value(context, 'data', 1);
  value(context, 'clock', 1);
  value(context, 'reset', 1);
  assert.equal(input(context, 'q'), 0);
});

test('counter lesson exposes weighted bit lamps and respects its real controls', () => {
  const context = open('counter');
  advance(context, 2.5);
  assert.equal(output(context, 'counter'), 5);
  for (let i = 0; i < 8; i++) assert.equal(input(context, `bit${i}`), (5 >> i) & 1);
  value(context, 'enable', 0);
  advance(context, 1);
  assert.equal(output(context, 'counter'), 5);
  value(context, 'reset', 1);
  assert.equal(output(context, 'counter'), 0);
  for (let i = 0; i < 8; i++) assert.equal(input(context, `bit${i}`), 0);
});

test('BCD lesson displays every decimal digit and blanks non-BCD codes', () => {
  const context = open('bcd-display');
  const masks = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
  for (let digit = 0; digit < 10; digit++) {
    value(context, 'digit', digit);
    assert.equal(input(context, 'display'), masks[digit]);
  }
  value(context, 'digit', 10);
  assert.equal(input(context, 'display'), 0);
});

test('individual routing lines preserve bytes and switch destination', () => {
  const context = open('bus-mux');
  assert.equal(output(context, 'mux'), 42);
  assert.equal(output(context, 'merger'), 42);
  assert.equal(output(context, 'demux', 'a'), 42);
  assert.equal(output(context, 'demux', 'b'), 0);
  value(context, 'select', 1);
  assert.equal(output(context, 'mux'), 165);
  assert.equal(output(context, 'merger'), 165);
  assert.equal(output(context, 'demux', 'a'), 0);
  assert.equal(output(context, 'demux', 'b'), 165);
});

test('ALU lesson operation codes and overflow flags match its instructions', () => {
  const context = open('alu');
  assert.equal(output(context, 'alu'), 8);
  value(context, 'op', 2);
  assert.equal(output(context, 'alu'), 1);
  value(context, 'op', 4);
  assert.equal(output(context, 'alu'), 6);
  value(context, 'op', 1);
  assert.equal(output(context, 'alu'), 2);
  value(context, 'a', 255);
  value(context, 'b', 1);
  value(context, 'op', 0);
  assert.equal(output(context, 'alu'), 0);
  assert.equal(input(context, 'carry'), 1);
  assert.equal(input(context, 'zero'), 1);
});

test('memory lesson writes on a manual edge, retains address data and releases outputs', () => {
  const context = open('ram');
  assert.equal(output(context, 'ram'), 0);
  assert.equal(output(context, 'rom'), 20);
  assert.equal(output(context, 'registers'), 0);
  value(context, 'write', 1);
  assert.equal(output(context, 'ram'), 'Z');
  value(context, 'clock', 1);
  value(context, 'write', 0);
  assert.equal(output(context, 'ram'), 42);
  assert.equal(output(context, 'registers'), 42);
  value(context, 'address', 3);
  assert.equal(output(context, 'ram'), 0);
  assert.equal(output(context, 'rom'), 30);
  assert.equal(output(context, 'registers'), 0);
  value(context, 'address', 2);
  assert.equal(output(context, 'ram'), 42);
  assert.equal(output(context, 'registers'), 42);
  value(context, 'read', 0);
  assert.equal(output(context, 'ram'), 'Z');
  assert.equal(output(context, 'rom'), 'Z');
  assert.equal(output(context, 'registers'), 42);
});

test('wired-AND lesson permits strong lows, released highs and a floating line', () => {
  const context = open('wired-and');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(context, 'a', a);
      value(context, 'b', b);
      assert.equal(input(context, 'line'), a & b);
    }
  context.project.nodes.find((node) => node.id === 'pull').enabled = false;
  simulate(context.project, context.runtime, 0);
  assert.equal(input(context, 'line'), 'Z');
  assert.ok(context.runtime.diagnostics.some((diagnostic) => diagnostic.code === 'floating'));
});

test('Schmitt lesson reaches opposite outputs at the same middle voltage', () => {
  const context = open('schmitt');
  assert.equal(input(context, 'clean'), 0);
  value(context, 'level', 200);
  assert.equal(input(context, 'clean'), 1);
  value(context, 'level', 128);
  assert.equal(input(context, 'clean'), 1);
  value(context, 'level', 50);
  assert.equal(input(context, 'clean'), 0);
  value(context, 'level', 128);
  assert.equal(input(context, 'clean'), 0);
});

test('one-shot lesson expires while held, ignores active retriggers and resets', () => {
  const context = open('monostable');
  value(context, 'trigger', 1);
  assert.equal(input(context, 'pulse'), 1);
  advance(context, 0.2);
  value(context, 'trigger', 0);
  value(context, 'trigger', 1);
  advance(context, 0.301);
  assert.equal(input(context, 'pulse'), 0);
  advance(context, 0.1);
  assert.equal(input(context, 'pulse'), 0);
  value(context, 'trigger', 0);
  value(context, 'trigger', 1);
  assert.equal(input(context, 'pulse'), 1);
  value(context, 'reset', 1);
  assert.equal(input(context, 'pulse'), 0);
});

test('converter lesson round-trips every byte and reveals a supply mismatch', () => {
  const context = open('adc-dac');
  for (let byte = 0; byte < 256; byte++) {
    value(context, 'value', byte);
    assert.equal(output(context, 'adc'), byte);
    assert.equal(input(context, 'equal'), 1);
  }
  value(context, 'value', 128);
  assert.ok(Math.abs(output(context, 'dac') - (128 / 255) * 5) < 1e-10);
  value(context, 'adc', 2.5, 'vcc');
  assert.equal(output(context, 'adc'), 255);
  assert.equal(input(context, 'equal'), 0);
  assert.equal(input(context, 'less'), 1);
});

test('AM/FM lesson advances its ramp and produces different bounded traces', () => {
  const context = open('mixed-signals');
  advance(context, 0.5);
  assert.equal(output(context, 'counter'), 132);
  assert.equal(output(context, 'dac'), (132 / 255) * 5);
  const am = context.runtime.history['mod-scope'],
    fm = context.runtime.history['fm-scope'];
  assert.ok(am.length > 100 && fm.length > 100);
  assert.ok(am.every((value) => value >= 0 && value <= 5));
  assert.ok(fm.every((value) => value >= 0 && value <= 5));
  assert.notDeepEqual(am, fm);
  assert.ok(Math.max(...am) - Math.min(...am) > 1);
  assert.ok(Math.max(...fm) - Math.min(...fm) > 1);
  value(context, 'enable', 0);
  advance(context, 0.5);
  assert.equal(output(context, 'counter'), 132);
  value(context, 'am', 0, 'depth');
  value(context, 'fm', 0, 'depth');
  assert.deepEqual(context.runtime.diagnostics, []);
});

test('PWM lesson centers and reaches endpoints independently of frequency', () => {
  const context = open('pwm-servos');
  assert.ok(Math.abs(output(context, 'servos', 'a1') + 45) < 1e-8);
  assert.ok(Math.abs(output(context, 'servos', 'a2') - 45) < 1e-8);
  value(context, 'course', 0.5, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1')) < 1e-8);
  value(context, 'course', 0.18, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1') + 90) < 1e-8);
  value(context, 'course', 0.82, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1') - 90) < 1e-8);
  value(context, 'course', 77, 'frequency');
  assert.ok(Math.abs(output(context, 'servos', 'a1') - 90) < 1e-8);
  assert.ok(Math.abs(output(context, 'servos', 'a2') - 45) < 1e-8);
});

test('each laboratory ships its canonical circuit, bilingual worksheet metadata and English lab sheet', async () => {
  for (const example of EXAMPLES) {
    assert.ok(Number.isFinite(example.lab.duration) && example.lab.duration >= 10);
    for (const collection of ['objectives', 'tasks', 'questions', 'deliverables']) {
      for (const language of ['en', 'ua']) {
        const items = example.lab[collection][language];
        assert.ok(Array.isArray(items) && items.length >= 2);
        assert.ok(items.every((item) => typeof item === 'string' && item.length > 10));
      }
    }
    assert.equal(example.circuitPath, `examples/${example.id}/circuit.json`);
    assert.equal(example.labPath, `examples/${example.id}/README.md`);
    const source = await readFile(new URL(`../${example.circuitPath}`, import.meta.url), 'utf8');
    assert.deepEqual(parseProject(source), createExample(example.id));
    const sheet = await readFile(new URL(`../${example.labPath}`, import.meta.url), 'utf8');
    for (const heading of [
      '## Starting circuit',
      '## Objectives',
      '## Procedure',
      '## Expected result',
      '## Review questions',
      '## Deliverables',
    ]) {
      assert.ok(sheet.includes(heading), `${example.id}: missing ${heading}`);
    }
    assert.ok(sheet.includes('./circuit.json'));
    assert.ok(sheet.includes('./lesson.js'));
  }
});

test('stepper lab measures pulse travel, direction, disable, reset and microsteps', () => {
  const context = open('stepper-basics');
  assert.equal(output(context, 'axis', 'position'), 10);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10.8) < 1e-8);
  value(context, 'direction', 0);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10) < 1e-8);
  value(context, 'enable', 0);
  const held = output(context, 'axis', 'position');
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), held);
  value(context, 'reset', 1);
  assert.equal(output(context, 'axis', 'position'), 10);
  value(context, 'reset', 0);
  value(context, 'direction', 1);
  value(context, 'enable', 1);
  value(context, 'axis', 4, 'microsteps');
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10.2) < 1e-8);
});

test('printer homing lab automatically reaches its minimum, stops and permits reverse escape', () => {
  const context = open('printer-homing');
  assert.equal(output(context, 'axis', 'position'), 5);
  advance(context, 2);
  assert.equal(output(context, 'axis', 'position'), 0);
  assert.equal(input(context, 'home-led'), 1);
  assert.equal(input(context, 'axis', 'enable'), 0);
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), 0);
  value(context, 'direction', 1);
  assert.equal(output(context, 'axis', 'position'), 0);
  advance(context, 0.25);
  assert.ok(output(context, 'axis', 'position') > 0.9);
  assert.equal(input(context, 'home-led'), 0);
  value(context, 'direction', 0);
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), 0);
  value(context, 'reset', 1);
  assert.equal(output(context, 'axis', 'position'), 5);
});

test('position-control lab follows shared setpoints, reverses and respects motion enable', () => {
  const context = open('position-control');
  for (const target of [128, 64, 192]) {
    value(context, 'target', target);
    advance(context, 3);
    const requested = (target / 255) * 8;
    assert.ok(Math.abs(output(context, 'axis', 'position') - requested) <= 0.03);
    assert.equal(input(context, 'target-led'), 1);
    const held = output(context, 'axis', 'position');
    advance(context, 0.1);
    assert.equal(output(context, 'axis', 'position'), held);
  }
  value(context, 'run', 0);
  const held = output(context, 'axis', 'position');
  value(context, 'target', 32);
  advance(context, 1);
  assert.equal(output(context, 'axis', 'position'), held);
  assert.equal(input(context, 'target-led'), 0);
  value(context, 'run', 1);
  advance(context, 4);
  assert.ok(Math.abs(output(context, 'axis', 'position') - (32 / 255) * 8) <= 0.03);
  assert.equal(input(context, 'target-led'), 1);
});

test('three-axis printer lab shares pulses while preserving independent mechanics and controls', () => {
  const context = open('printer-xyz');
  assert.deepEqual(
    context.project.nodes.filter((node) => node.type === 'stepper').map((node) => node.id),
    ['x-axis', 'y-axis', 'z-axis'],
  );
  assert.equal(context.project.nodes.length, 22);
  advance(context, 1);
  for (const [axis, expected] of [
    ['x', 6.6],
    ['y', 11.6],
    ['z', 3.4],
  ]) {
    assert.ok(Math.abs(output(context, `${axis}-axis`, 'position') - expected) < 1e-8);
  }
  value(context, 'y-direction', 0);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'y-axis', 'position') - 10) < 1e-8);
  const heldX = output(context, 'x-axis', 'position');
  const previousZ = output(context, 'z-axis', 'position');
  value(context, 'x-enable', 0);
  advance(context, 1);
  assert.equal(output(context, 'x-axis', 'position'), heldX);
  assert.ok(output(context, 'z-axis', 'position') > previousZ + 0.39);
});

test('three-axis printer lab exposes six inclusive limit indicators at hard endpoints', () => {
  for (const side of ['min', 'max']) {
    const project = createExample('printer-xyz');
    for (const axis of ['x', 'y', 'z']) {
      const motor = project.nodes.find((node) => node.id === `${axis}-axis`);
      motor.params.initial =
        side === 'max' ? 20 - motor.params.lead / 200 : motor.params.lead / 200;
      project.nodes.find((node) => node.id === `${axis}-direction`).params.value =
        side === 'max' ? 1 : 0;
    }
    const context = { project, runtime: createRuntime() };
    simulate(project, context.runtime, 0);
    advance(context, 0.1);
    for (const axis of ['x', 'y', 'z']) {
      assert.equal(output(context, `${axis}-axis`, 'position'), side === 'max' ? 20 : 0);
      assert.equal(input(context, `${axis}-${side}-led`), 1);
      assert.equal(input(context, `${axis}-${side === 'max' ? 'min' : 'max'}-led`), 0);
    }
    assert.deepEqual(context.runtime.diagnostics, []);
  }
});

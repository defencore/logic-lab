import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../src/examples.js';
import { validateProject, parseProject, serializeProject } from '../src/project.js';
import { createRuntime, simulate } from '../src/simulator.js';

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
const output = (context, node, port = 'out') => context.runtime.outputs[node][port];
const input = (context, node, port = 'in') => context.runtime.inputs[node][port];

test('all learning examples have valid fresh circuits and complete bilingual lessons', () => {
  assert.equal(EXAMPLES.length, 15);
  assert.equal(new Set(EXAMPLES.map((example) => example.id)).size, EXAMPLES.length);
  for (const example of EXAMPLES) {
    assert.ok(
      ['basics', 'sequential', 'mixed', 'architecture', 'physical'].includes(example.category),
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

test('bus-routing lesson preserves split/merged bytes and switches destination', () => {
  const context = open('bus-mux');
  assert.equal(output(context, 'mux'), 42);
  assert.equal(output(context, 'merger'), 42);
  assert.equal(input(context, 'left'), 42);
  assert.equal(input(context, 'right'), 0);
  value(context, 'select', 1);
  assert.equal(output(context, 'mux'), 165);
  assert.equal(output(context, 'merger'), 165);
  assert.equal(input(context, 'left'), 0);
  assert.equal(input(context, 'right'), 165);
});

test('ALU lesson operation codes and overflow flags match its instructions', () => {
  const context = open('alu');
  assert.equal(input(context, 'result'), 8);
  value(context, 'op', 2);
  assert.equal(input(context, 'result'), 1);
  value(context, 'op', 4);
  assert.equal(input(context, 'result'), 6);
  value(context, 'op', 1);
  assert.equal(input(context, 'result'), 2);
  value(context, 'a', 255);
  value(context, 'b', 1);
  value(context, 'op', 0);
  assert.equal(input(context, 'result'), 0);
  assert.equal(input(context, 'carry'), 1);
  assert.equal(input(context, 'zero'), 1);
});

test('memory lesson writes on a manual edge, retains address data and releases outputs', () => {
  const context = open('ram');
  assert.equal(input(context, 'ram-view'), 0);
  assert.equal(input(context, 'rom-view'), 20);
  assert.equal(input(context, 'reg-view'), 0);
  value(context, 'write', 1);
  assert.equal(input(context, 'ram-view'), 'Z');
  value(context, 'clock', 1);
  value(context, 'write', 0);
  assert.equal(input(context, 'ram-view'), 42);
  assert.equal(input(context, 'reg-view'), 42);
  value(context, 'address', 3);
  assert.equal(input(context, 'ram-view'), 0);
  assert.equal(input(context, 'rom-view'), 30);
  assert.equal(input(context, 'reg-view'), 0);
  value(context, 'address', 2);
  assert.equal(input(context, 'ram-view'), 42);
  assert.equal(input(context, 'reg-view'), 42);
  value(context, 'read', 0);
  assert.equal(input(context, 'ram-view'), 'Z');
  assert.equal(input(context, 'rom-view'), 'Z');
  assert.equal(input(context, 'reg-view'), 42);
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

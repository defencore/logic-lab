import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { compileCircuit } from '../../src/simulation/network.js';
import { traceNet } from '../../src/circuits/continuity.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  serializeSequence,
  parseSequence,
  replaySequence,
} from '../../src/experiments/actions.js';

const node = (id, type, params = {}) => ({ id, type, params, enabled: true, x: 0, y: 0 });
const wire = (id, from, to, port = 'in') => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port },
});
const project = (nodes, wires) => ({ version: 1, name: 'Peripheral inputs', nodes, wires });

function contactCircuit(source = 'gnd', pull = 'pullup') {
  const contact = node('contact', 'contact_switch', { mode: 'momentary', value: 0 });
  const resistor = node('resistor', pull);
  return {
    contact,
    resistor,
    circuit: project(
      [node('source', source), contact, resistor, node('load', 'led')],
      [
        wire('before', 'source', 'contact'),
        wire('after', 'contact', 'load'),
        wire('pull', 'resistor', 'load'),
      ],
    ),
  };
}

test('an open contact preserves a pulled-up level and closing to ground joins both nets immediately', () => {
  const { circuit, contact, resistor } = contactCircuit();
  const runtime = simulate(circuit, createRuntime(), 0);
  const opened = compileCircuit(circuit);
  assert.equal(runtime.inputs.contact.in, 0);
  assert.equal(runtime.outputs.contact.out, 1);
  assert.equal(runtime.inputs.load.in, 1);
  assert.deepEqual(traceNet(circuit, { wire: 'before' }).wires, ['before']);
  contact.params.value = 1;
  simulate(circuit, runtime, 0);
  assert.notEqual(compileCircuit(circuit), opened);
  assert.equal(runtime.outputs.contact.out, 0);
  assert.equal(runtime.inputs.load.in, 0);
  assert.deepEqual(traceNet(circuit, { wire: 'before' }).wires, ['after', 'before', 'pull']);
  contact.params.value = 0;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.inputs.load.in, 1);
  resistor.enabled = false;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.outputs.contact.out, 'Z');
  assert.equal(runtime.inputs.load.in, 'Z');
});

test('pull-down operation, disconnecting a disabled contact and conflicting strong drivers use the actual shared net', () => {
  const { circuit, contact, resistor } = contactCircuit('vcc', 'pulldown');
  contact.params.mode = 'toggle';
  const runtime = simulate(circuit, createRuntime(), 0);
  assert.equal(runtime.inputs.load.in, 0);
  contact.params.value = 1;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.inputs.load.in, 1);
  contact.enabled = false;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.inputs.load.in, 0);
  assert.equal(runtime.outputs.contact.out, 'Z');
  contact.enabled = true;
  resistor.type = 'gnd';
  simulate(circuit, runtime, 0);
  assert.equal(runtime.inputs.contact.in, 'X');
  assert.equal(runtime.outputs.contact.out, 'X');
  assert.equal(runtime.inputs.load.in, 'X');
  contact.params.value = 0;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.inputs.contact.in, 1);
  assert.equal(runtime.inputs.load.in, 0);
});

test('recorded contact positions reproduce pulled-up output levels without creating a strong driver', () => {
  const { circuit } = contactCircuit();
  const sequence = createSequence(circuit, {
    probes: [{ node: 'load', side: 'inputs', port: 'in' }],
  });
  appendAction(sequence, { at: 0.1, node: 'contact', key: 'value', value: 1 });
  appendAction(sequence, { at: 0.2, node: 'contact', key: 'value', value: 0 });
  finishSequence(sequence, 0.2);
  const replay = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.deepEqual(
    replay.observations.map(({ values }) => values),
    [[1], [0], [1]],
  );
  assert.equal(circuit.nodes.find(({ id }) => id === 'contact').params.value, 0);
});

test('potentiometer supplies a fractional voltage to ADC and PWM and releases its output when disabled', () => {
  const knob = node('knob', 'potentiometer');
  const circuit = project(
    [knob, node('adc', 'adc'), node('pwm', 'pwm')],
    [wire('sample', 'knob', 'adc'), wire('duty', 'knob', 'pwm', 'control')],
  );
  const runtime = simulate(circuit, createRuntime(), 0);
  assert.equal(runtime.outputs.knob.out, 2.5);
  assert.equal(runtime.signals.outputs.adc.out, 128);
  assert.equal(runtime.signals.outputs.pwm.duty, 1);
  const network = compileCircuit(circuit);
  for (const value of [0, 0.1375, 0.9371, 2.71828, 5]) {
    knob.params.value = value;
    simulate(circuit, runtime, 0);
    assert.equal(runtime.inputs.adc.in, value);
    assert.equal(runtime.signals.outputs.adc.out, Math.round((value * 255) / 5));
    assert.equal(runtime.signals.outputs.pwm.duty, Math.min(value, 1));
    assert.equal(
      compileCircuit(circuit),
      network,
      'voltage changes do not change electrical topology',
    );
  }
  for (const value of [-0.01, 5.01, NaN, '2.5']) {
    knob.params.value = value;
    simulate(circuit, runtime, 0);
    assert.equal(runtime.outputs.knob.out, 'X');
  }
  knob.enabled = false;
  simulate(circuit, runtime, 0);
  assert.equal(runtime.outputs.knob.out, 'Z');
  assert.equal(runtime.inputs.adc.in, 'Z');
});

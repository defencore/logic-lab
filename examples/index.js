import memoryCircuit0 from './shift-register-sequence/circuit.json' with { type: 'json' };
import memoryLesson0 from './shift-register-sequence/lesson.js';
import memoryCircuit1 from './ram-addressing/circuit.json' with { type: 'json' };
import memoryLesson1 from './ram-addressing/lesson.js';
import memoryCircuit2 from './rom-lookup/circuit.json' with { type: 'json' };
import memoryLesson2 from './rom-lookup/lesson.js';
import memoryCircuit3 from './register-file-addressing/circuit.json' with { type: 'json' };
import memoryLesson3 from './register-file-addressing/lesson.js';
import memoryCircuit4 from './memory-bank-select/circuit.json' with { type: 'json' };
import memoryLesson4 from './memory-bank-select/lesson.js';
import automationCircuit0 from './aquarium-life-support/circuit.json' with { type: 'json' };
import automationLesson0 from './aquarium-life-support/lesson.js';
import automationCircuit1 from './aquarium-feeding/circuit.json' with { type: 'json' };
import automationLesson1 from './aquarium-feeding/lesson.js';
import automationCircuit2 from './aquarium-lighting/circuit.json' with { type: 'json' };
import automationLesson2 from './aquarium-lighting/lesson.js';
import automationCircuit3 from './greenhouse-climate/circuit.json' with { type: 'json' };
import automationLesson3 from './greenhouse-climate/lesson.js';
import automationCircuit4 from './greenhouse-irrigation/circuit.json' with { type: 'json' };
import automationLesson4 from './greenhouse-irrigation/lesson.js';
import automationCircuit5 from './home-climate/circuit.json' with { type: 'json' };
import automationLesson5 from './home-climate/lesson.js';
import automationCircuit6 from './yard-security/circuit.json' with { type: 'json' };
import automationLesson6 from './yard-security/lesson.js';
import automationCircuit7 from './railway-dispatch/circuit.json' with { type: 'json' };
import automationLesson7 from './railway-dispatch/lesson.js';
import scenarioCircuit0 from './traffic-light/circuit.json' with { type: 'json' };
import scenarioLesson0 from './traffic-light/lesson.js';
import scenarioCircuit1 from './traffic-junction/circuit.json' with { type: 'json' };
import scenarioLesson1 from './traffic-junction/lesson.js';
import scenarioCircuit2 from './railway-interlocking/circuit.json' with { type: 'json' };
import scenarioLesson2 from './railway-interlocking/lesson.js';
import scenarioCircuit3 from './animal-feeder/circuit.json' with { type: 'json' };
import scenarioLesson3 from './animal-feeder/lesson.js';
import scenarioCircuit4 from './water-tank/circuit.json' with { type: 'json' };
import scenarioLesson4 from './water-tank/lesson.js';
import xyzCircuit from './printer-xyz/circuit.json' with { type: 'json' };
import xyzLesson from './printer-xyz/lesson.js';
import motionCircuit0 from './stepper-basics/circuit.json' with { type: 'json' };
import motionLesson0 from './stepper-basics/lesson.js';
import motionCircuit1 from './printer-homing/circuit.json' with { type: 'json' };
import motionLesson1 from './printer-homing/lesson.js';
import motionCircuit2 from './position-control/circuit.json' with { type: 'json' };
import motionLesson2 from './position-control/lesson.js';
import circuit0 from './half-adder/circuit.json' with { type: 'json' };
import lesson0 from './half-adder/lesson.js';
import keyboardCircuit from './keyboard-inputs/circuit.json' with { type: 'json' };
import keyboardLesson from './keyboard-inputs/lesson.js';
import alarmCircuit from './active-buzzer-alarm/circuit.json' with { type: 'json' };
import alarmLesson from './active-buzzer-alarm/lesson.js';
import melodyCircuit from './passive-buzzer-melody/circuit.json' with { type: 'json' };
import melodyLesson from './passive-buzzer-melody/lesson.js';
import dividerCircuit from './buzzer-clock-divider/circuit.json' with { type: 'json' };
import dividerLesson from './buzzer-clock-divider/lesson.js';
import circuit1 from './logic-gates/circuit.json' with { type: 'json' };
import lesson1 from './logic-gates/lesson.js';
import circuit2 from './full-adder/circuit.json' with { type: 'json' };
import lesson2 from './full-adder/lesson.js';
import circuit3 from './d-memory/circuit.json' with { type: 'json' };
import lesson3 from './d-memory/lesson.js';
import circuit4 from './counter/circuit.json' with { type: 'json' };
import lesson4 from './counter/lesson.js';
import circuit5 from './bcd-display/circuit.json' with { type: 'json' };
import lesson5 from './bcd-display/lesson.js';
import circuit6 from './bus-mux/circuit.json' with { type: 'json' };
import lesson6 from './bus-mux/lesson.js';
import circuit7 from './alu/circuit.json' with { type: 'json' };
import lesson7 from './alu/lesson.js';
import circuit8 from './ram/circuit.json' with { type: 'json' };
import lesson8 from './ram/lesson.js';
import circuit9 from './wired-and/circuit.json' with { type: 'json' };
import lesson9 from './wired-and/lesson.js';
import circuit10 from './schmitt/circuit.json' with { type: 'json' };
import lesson10 from './schmitt/lesson.js';
import circuit11 from './monostable/circuit.json' with { type: 'json' };
import lesson11 from './monostable/lesson.js';
import circuit12 from './adc-dac/circuit.json' with { type: 'json' };
import lesson12 from './adc-dac/lesson.js';
import circuit13 from './mixed-signals/circuit.json' with { type: 'json' };
import lesson13 from './mixed-signals/lesson.js';
import circuit14 from './pwm-servos/circuit.json' with { type: 'json' };
import lesson14 from './pwm-servos/lesson.js';

export const EXAMPLES = [
  { ...automationLesson0, create: () => structuredClone(automationCircuit0) },
  { ...automationLesson1, create: () => structuredClone(automationCircuit1) },
  { ...automationLesson2, create: () => structuredClone(automationCircuit2) },
  { ...automationLesson3, create: () => structuredClone(automationCircuit3) },
  { ...automationLesson4, create: () => structuredClone(automationCircuit4) },
  { ...automationLesson5, create: () => structuredClone(automationCircuit5) },
  { ...automationLesson6, create: () => structuredClone(automationCircuit6) },
  { ...automationLesson7, create: () => structuredClone(automationCircuit7) },

  { ...memoryLesson0, create: () => structuredClone(memoryCircuit0) },
  { ...memoryLesson1, create: () => structuredClone(memoryCircuit1) },
  { ...memoryLesson2, create: () => structuredClone(memoryCircuit2) },
  { ...memoryLesson3, create: () => structuredClone(memoryCircuit3) },
  { ...memoryLesson4, create: () => structuredClone(memoryCircuit4) },

  { ...keyboardLesson, create: () => structuredClone(keyboardCircuit) },
  { ...alarmLesson, create: () => structuredClone(alarmCircuit) },
  { ...melodyLesson, create: () => structuredClone(melodyCircuit) },
  { ...dividerLesson, create: () => structuredClone(dividerCircuit) },
  { ...lesson0, create: () => structuredClone(circuit0) },
  { ...lesson1, create: () => structuredClone(circuit1) },
  { ...lesson2, create: () => structuredClone(circuit2) },
  { ...lesson3, create: () => structuredClone(circuit3) },
  { ...lesson4, create: () => structuredClone(circuit4) },
  { ...lesson5, create: () => structuredClone(circuit5) },
  { ...lesson6, create: () => structuredClone(circuit6) },
  { ...lesson7, create: () => structuredClone(circuit7) },
  { ...lesson8, create: () => structuredClone(circuit8) },
  { ...lesson9, create: () => structuredClone(circuit9) },
  { ...lesson10, create: () => structuredClone(circuit10) },
  { ...lesson11, create: () => structuredClone(circuit11) },
  { ...lesson12, create: () => structuredClone(circuit12) },
  { ...lesson13, create: () => structuredClone(circuit13) },
  { ...lesson14, create: () => structuredClone(circuit14) },
  { ...motionLesson0, create: () => structuredClone(motionCircuit0) },
  { ...motionLesson1, create: () => structuredClone(motionCircuit1) },
  { ...motionLesson2, create: () => structuredClone(motionCircuit2) },
  { ...xyzLesson, create: () => structuredClone(xyzCircuit) },
  { ...scenarioLesson0, create: () => structuredClone(scenarioCircuit0) },
  { ...scenarioLesson1, create: () => structuredClone(scenarioCircuit1) },
  { ...scenarioLesson2, create: () => structuredClone(scenarioCircuit2) },
  { ...scenarioLesson3, create: () => structuredClone(scenarioCircuit3) },
  { ...scenarioLesson4, create: () => structuredClone(scenarioCircuit4) },
];

export function createExample(id = 'half-adder') {
  const example = EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Unknown example: ${id}`);
  return example.create();
}

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
];

export function createExample(id = 'half-adder') {
  const example = EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Unknown example: ${id}`);
  return example.create();
}

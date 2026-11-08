import { node, wire, circuit, source, byte } from '../core/fixtures/simulator.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

export function memoryFixture(type = 'ram') {
  const project = circuit(
    [
      byte('address', 2),
      byte('write-address', 5),
      byte('data', 37),
      source('clk', 0),
      source('we', 1),
      source('oe', 1),
      node('memory', type),
    ],
    [
      ...(type === 'register_file'
        ? [
            wire('address', 'address', 'memory', 'read'),
            wire('write-address', 'address', 'memory', 'write'),
          ]
        : [wire('address', 'nibble', 'memory', 'address')]),
      ...(type === 'rom'
        ? []
        : [
            wire('data', 'out', 'memory', 'data'),
            wire('clk', 'out', 'memory', 'clk'),
            wire('we', 'out', 'memory', 'we'),
          ]),
      ...(type === 'register_file' ? [] : [wire('oe', 'out', 'memory', 'oe')]),
    ],
  );
  project.version = 1;
  project.name = 'Memory inspection';
  project.wires.forEach((connection, index) => {
    connection.id = `wire-${index}`;
  });
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  const set = (id, value) => {
    project.nodes.find((item) => item.id === id).params.value = value;
    simulate(project, runtime, 0);
  };
  return {
    project,
    runtime,
    node: project.nodes.at(-1),
    set,
    pulse: () => {
      set('clk', 0);
      set('clk', 1);
    },
  };
}

export function byteFixture(type = 'register', initial = 0, data = 37) {
  const project = circuit(
    [
      byte('data', data),
      source('clk', 0),
      source('enable', 1),
      source('reset', 0),
      node('device', type, { initial }),
    ],
    [
      wire('clk', 'out', 'device', 'clk'),
      wire('reset', 'out', 'device', 'reset'),
      ...(type === 'shift_register'
        ? [wire('enable', 'out', 'device', 'd')]
        : [wire('enable', 'out', 'device', 'enable')]),
      ...(type === 'register' ? [wire('data', 'out', 'device', 'd')] : []),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  const set = (id, value) => {
    project.nodes.find((item) => item.id === id).params.value = value;
    simulate(project, runtime, 0);
  };
  return {
    project,
    runtime,
    node: project.nodes.at(-1),
    set,
    pulse: () => {
      set('clk', 0);
      set('clk', 1);
    },
  };
}

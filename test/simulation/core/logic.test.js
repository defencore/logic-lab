import { node, wire, circuit, source, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';

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

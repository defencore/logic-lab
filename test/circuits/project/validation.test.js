import { fixture } from './fixtures/project.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../../src/components/catalog/index.js';
import {
  STORAGE_KEY,
  validateProject,
  parseProject,
  serializeProject,
  loadProject,
  saveProject,
} from '../../../src/circuits/project.js';

test('validation rejects unsafe, malformed, and oversized imports', () => {
  assert.throws(() => parseProject('{ broken'), /valid JSON/);
  assert.throws(() => parseProject(' '.repeat(5_000_001)), /too large/);
  for (const [mutate, pattern] of [
    [
      (p) => {
        p.version = 2;
      },
      /version/,
    ],
    [
      (p) => {
        p.nodes[0].id = '__proto__';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].id = 'toString';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].id = 'hasOwnProperty';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].x = Infinity;
      },
      /finite number/,
    ],
    [
      (p) => {
        p.nodes.push({ ...p.nodes[0] });
      },
      /Duplicate component/,
    ],
    [
      (p) => {
        p.nodes[0].type = 'unknown';
      },
      /Unknown component/,
    ],
    [
      (p) => {
        p.nodes[0].params = { nested: { value: 1 } };
      },
      /only finite/,
    ],
    [
      (p) => {
        p.nodes[0].params = JSON.parse('{"__proto__": 1}');
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes = Array(1001).fill(p.nodes[0]);
      },
      /at most 1000/,
    ],
    [
      (p) => {
        p.viewport = { x: 0, y: 0, zoom: 0 };
      },
      /between/,
    ],
    [
      (p) => {
        p.exampleId = '../half-adder';
      },
      /Example ID/,
    ],
    [
      (p) => {
        p.exampleId = '__proto__';
      },
      /Example ID/,
    ],
    [
      (p) => {
        p.exampleId = 42;
      },
      /Example ID/,
    ],
  ]) {
    const project = fixture();
    mutate(project);
    assert.throws(() => validateProject(project), pattern);
  }
});

test('validation catches invalid connections and preserves multiple drivers', () => {
  for (const [mutate, pattern] of [
    [
      (p) => {
        p.wires[0].from.node = 'missing';
      },
      /missing component/,
    ],
    [
      (p) => {
        p.wires[0].from.port = 'missing';
      },
      /Unknown output/,
    ],
    [
      (p) => {
        p.wires[0].to.port = getDefinition('and').outputs[0].id;
      },
      /Unknown input/,
    ],
    [
      (p) => {
        p.wires[0].width = 8;
      },
      /width must match/,
    ],
    [
      (p) => {
        p.wires.push({ ...p.wires[0], id: 'wire-2' });
      },
      /duplicates an existing/,
    ],
    [
      (p) => {
        p.wires.push({ ...p.wires[0] });
      },
      /Duplicate wire/,
    ],
  ]) {
    const project = fixture();
    mutate(project);
    assert.throws(() => validateProject(project), pattern);
  }
  const project = fixture();
  project.nodes.push({ ...project.nodes[0], id: 'source-2' });
  project.wires.push({
    ...project.wires[0],
    id: 'wire-2',
    from: { ...project.wires[0].from, node: 'source-2' },
  });
  assert.equal(validateProject(project).wires.length, 2);
});

test('counter bits connect directly to scalar pins and packed group endpoints are rejected', () => {
  const project = fixture();
  project.nodes[0].type = 'counter';
  project.wires[0].from.port = 'out7';
  assert.equal(validateProject(project).wires[0].width, 1);
  project.wires[0].from.port = 'out';
  assert.throws(() => validateProject(project), /Unknown output port/);
});

test('analog pins reject digital mismatches but scopes accept either signal type', () => {
  const project = fixture();
  project.nodes[0].type = 'dac';
  project.wires[0].from.port = getDefinition('dac').outputs[0].id;
  assert.throws(() => validateProject(project), /analog and digital/);
  project.nodes[1].type = 'scope';
  project.wires[0].to.port = getDefinition('scope').inputs[0].id;
  assert.equal(validateProject(project).wires.length, 1);
  project.nodes[0].type = 'counter';
  project.wires[0].from.port = getDefinition('counter').outputs[0].id;
  assert.equal(validateProject(project).wires[0].width, 1);
  project.wires[0].width = 8;
  assert.throws(() => validateProject(project), /single signal line/);
});

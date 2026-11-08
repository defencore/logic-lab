import { fixture } from './fixtures/project.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  validateProject,
  parseProject,
  serializeProject,
  loadProject,
  saveProject,
} from '../../../src/circuits/project.js';

test('independently routed byte lines survive export without merging contacts or routes', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'dac';
  project.wires = Array.from({ length: 8 }, (_, bit) => ({
    id: `data-${bit}`,
    from: { node: 'source', port: `out${bit}` },
    to: { node: 'gate', port: `in${bit}` },
    width: 1,
    points: [{ x: 180 + bit * 20, y: 100 + bit * 25 }],
  }));
  assert.deepEqual(parseProject(serializeProject(project)), project);
  project.wires[3].to.port = 'in';
  assert.throws(() => validateProject(project), /Unknown input port/);
});

test('import expands saved grouped connections once and preserves node values and routing', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[0].params.value = 173;
  project.nodes[1].type = 'dac';
  project.wires[0] = {
    id: 'byte-route',
    from: { node: 'source', port: 'out' },
    to: { node: 'gate', port: 'in' },
    width: 8,
    points: [{ x: 200, y: 160 }],
  };
  const restored = parseProject(JSON.stringify(project));
  assert.deepEqual(restored.nodes, project.nodes);
  assert.equal(restored.wires.length, 8);
  for (const [bit, wire] of restored.wires.entries()) {
    assert.deepEqual(wire.from, { node: 'source', port: `out${bit}` });
    assert.deepEqual(wire.to, { node: 'gate', port: `in${bit}` });
    assert.equal(wire.width, 1);
    assert.deepEqual(wire.points, project.wires[0].points);
  }
  assert.deepEqual(validateProject(restored), restored);
  assert.deepEqual(parseProject(serializeProject(restored)), restored);
  assert.throws(() => validateProject(project), /Unknown output port/);
});

test('saved grouped scope connections become a single bit trace without a packed contact', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'scope';
  project.wires[0].from.port = 'nibble';
  project.wires[0].to.port = 'in';
  project.wires[0].width = 4;
  const restored = parseProject(JSON.stringify(project));
  assert.equal(restored.wires.length, 1);
  assert.equal(restored.wires[0].from.port, 'nibble0');
  assert.equal(restored.wires[0].to.port, 'in');
  assert.equal(restored.wires[0].width, 1);
});

test('grouped import conversion does not hide invalid widths, types, or duplicate wire IDs', () => {
  const saved = fixture();
  saved.nodes[0].type = 'bus_input';
  saved.nodes[1].type = 'dac';
  saved.wires[0].from.port = 'out';
  saved.wires[0].to.port = 'in';
  saved.wires[0].width = 8;
  for (const [mutate, pattern] of [
    [
      (project) => {
        project.wires[0].width = 4;
      },
      /width must match/,
    ],
    [
      (project) => {
        project.nodes[1].type = 'adc';
      },
      /analog and digital/,
    ],
    [
      (project) => {
        project.nodes[1].type = 'decoder';
      },
      /different bit widths/,
    ],
    [
      (project) => {
        project.wires.push(structuredClone(project.wires[0]));
      },
      /Duplicate wire ID/,
    ],
    [
      (project) => {
        project.wires[0].id = 'constructor';
      },
      /unsupported characters/,
    ],
    [
      (project) => {
        project.wires[0].points = [{ x: Infinity, y: 0 }];
      },
      /finite number/,
    ],
  ]) {
    const project = structuredClone(saved);
    mutate(project);
    assert.throws(() => parseProject(JSON.stringify(project)), pattern);
  }
});

test('expanded import IDs stay within limits and cannot collide with saved scalar wires', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'dac';
  project.nodes.push(
    { ...fixture().nodes[0], id: 'scalar' },
    { ...fixture().nodes[1], id: 'sink' },
  );
  project.wires[0] = {
    id: 'byte',
    from: { node: 'source', port: 'out' },
    to: { node: 'gate', port: 'in' },
    width: 8,
  };
  project.wires.push({
    id: 'byte-b0',
    from: { node: 'scalar', port: 'out' },
    to: { node: 'sink', port: 'a' },
    width: 1,
  });
  let restored = parseProject(JSON.stringify(project));
  assert.equal(new Set(restored.wires.map((wire) => wire.id)).size, 9);
  assert.equal(restored.wires.at(-1).id, 'byte-b0');
  project.wires[0].id = 'long'.repeat(25);
  restored = parseProject(JSON.stringify(project));
  assert.ok(restored.wires.every((wire) => wire.id.length <= 100));
});

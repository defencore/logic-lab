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
import { EXAMPLES, createExample } from '../../../examples/index.js';

test('JSON round trip preserves routes, viewport, and circuit state', () => {
  const project = fixture();
  project.wireStyle = 'bezier';
  project.exampleId = 'half-adder';
  project.viewport = { x: -40, y: 100, zoom: 1.25 };
  project.wires[0].points = [
    { x: 100, y: 60 },
    { x: 100, y: 100 },
  ];
  assert.deepEqual(parseProject(serializeProject(project)), project);
});

test('projects preserve the complete navigation zoom range', () => {
  for (const zoom of [0.01, 0.1, 1, 4]) {
    const project = fixture();
    project.viewport = { x: -100, y: 80, zoom };
    assert.deepEqual(parseProject(serializeProject(project)).viewport, project.viewport);
  }
  for (const zoom of [0.009, 4.001]) {
    assert.throws(() => validateProject({ ...fixture(), viewport: { x: 0, y: 0, zoom } }));
  }
});

test('component parameter types reject malformed controls and preserve valid ROM data', () => {
  for (const [type, params, pattern] of [
    ['pwm', { duty: '" onfocus="alert(1)' }, /duty must be a finite number/],
    ['clock', { frequency: '10' }, /frequency must be a finite number/],
    ['note', { text: ['unexpected', 'array'] }, /text must be text/],
    ['note', { color: '#aabbcc;background:url(https://example.com)' }, /hexadecimal color/],
    ['rom', { data: [0, 'not a byte'] }, /array of finite numbers/],
  ]) {
    const project = fixture();
    project.nodes = [{ ...project.nodes[0], type, params }];
    project.wires = [];
    assert.throws(() => validateProject(project), pattern);
  }
  const project = fixture();
  project.nodes = [{ ...project.nodes[0], type: 'rom', params: { data: [0, 1, 255] } }];
  project.wires = [];
  assert.deepEqual(parseProject(serializeProject(project)), project);
});

test('export never produces a project too large for its own importer', () => {
  const project = fixture();
  project.nodes = Array.from({ length: 310 }, (_, index) => ({
    id: `note-${index}`,
    type: 'note',
    x: 0,
    y: 0,
    label: '',
    enabled: true,
    params: { text: 'A'.repeat(16384) },
  }));
  project.wires = [];
  assert.throws(() => serializeProject(project), /too large/);
  project.nodes = project.nodes
    .slice(0, 250)
    .map((node) => ({ ...node, params: { text: '界'.repeat(16384) } }));
  assert.ok(JSON.stringify(project).length < 5_000_000);
  assert.throws(
    () => serializeProject(project),
    /too large/,
    'UTF-8 files also respect the upload byte limit',
  );
});

test('every bundled example is valid and survives project serialization', () => {
  for (const example of EXAMPLES) {
    const project = createExample(example.id);
    assert.equal(
      project.exampleId,
      example.id,
      'Example factories retain their lesson association',
    );
    assert.deepEqual(parseProject(serializeProject(project)), project, example.id);
  }
});

import { open, value, output } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { validateProject, parseProject, serializeProject } from '../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import { dimensions } from '../../../src/circuits/geometry/index.js';

test('all learning examples have valid fresh circuits and complete bilingual lessons', () => {
  assert.equal(EXAMPLES.length, 37);
  assert.equal(new Set(EXAMPLES.map((example) => example.id)).size, EXAMPLES.length);
  for (const example of EXAMPLES) {
    assert.ok(
      [
        'basics',
        'sequential',
        'mixed',
        'architecture',
        'physical',
        'motion',
        'scenes',
        'automation',
      ].includes(example.category),
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
    const source = await readFile(
      new URL(`../../../${example.circuitPath}`, import.meta.url),
      'utf8',
    );
    assert.deepEqual(parseProject(source), createExample(example.id));
    const sheet = await readFile(new URL(`../../../${example.labPath}`, import.meta.url), 'utf8');
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

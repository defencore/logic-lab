import { IDS, open, advance, output } from './fixtures/automation-examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXAMPLES, createExample } from '../../../../examples/index.js';
import { validateProject } from '../../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../../src/simulation/index.js';

test('eight new laboratories ship editable circuits, accurate node references and bilingual assessment materials', async () => {
  for (const id of IDS) {
    const example = EXAMPLES.find((example) => example.id === id);
    assert.ok(example, id);
    assert.equal(example.category, id === 'railway-dispatch' ? 'scenes' : 'automation');
    const project = example.create();
    assert.deepEqual(validateProject(project), project);
    const ids = new Set(project.nodes.map((node) => node.id));
    for (const language of ['en', 'ua']) {
      const lesson = example.lesson[language];
      assert.ok(lesson.steps.length >= 3, id);
      assert.ok(lesson.expected.length > 80, id);
      for (const step of lesson.steps) {
        assert.ok(step.text.length > 70, `${id}/${step.title}`);
        assert.ok(
          step.nodes.every((node) => ids.has(node)),
          `${id}: invalid lesson node`,
        );
      }
      for (const field of ['objectives', 'tasks', 'questions', 'deliverables'])
        assert.ok(example.lab[field][language].length >= 2, `${id}/${field}/${language}`);
    }
    const json = JSON.parse(
      await readFile(new URL(`../../../../${example.circuitPath}`, import.meta.url), 'utf8'),
    );
    assert.deepEqual(json, project, id);
    const worksheet = await readFile(
      new URL(`../../../../${example.labPath}`, import.meta.url),
      'utf8',
    );
    for (const heading of [
      'Objectives',
      'Procedure',
      'Expected result',
      'Review questions',
      'Deliverables',
      'Extension',
      'Мета',
      'Порядок виконання',
      'Очікуваний результат',
      'Контрольні запитання',
      'Що подати',
      'Додаткове завдання',
    ])
      assert.ok(worksheet.includes(`## ${heading}`), `${id}/${heading}`);
    const context = open(id);
    assert.deepEqual(context.runtime.diagnostics, [], `${id}: ready-to-run starting circuit`);
    const reversed = createExample(id);
    reversed.nodes.reverse();
    const reverseRuntime = createRuntime();
    simulate(reversed, reverseRuntime, 0);
    assert.deepEqual(
      reverseRuntime.diagnostics,
      [],
      `${id}: feedback must settle in either node order`,
    );
    assert.deepEqual(reverseRuntime.outputs.world, context.runtime.outputs.world, id);
  }
});

test('all seven automatic starting circuits remain healthy through five accelerated days', () => {
  for (const id of IDS.slice(0, 7)) {
    const context = open(id);
    advance(context, 300);
    assert.deepEqual(context.runtime.diagnostics, [], `${id}: no unresolved signals`);
    assert.equal(output(context), 0, `${id}: no baseline alarm`);
    if (id.startsWith('aquarium')) {
      assert.equal(output(context, 'world', 'alive'), 4, id);
      assert.ok(output(context, 'world', 'health') > 95, id);
      assert.ok(output(context, 'world', 'food') > 20, id);
    } else if (id.startsWith('greenhouse')) {
      assert.ok(output(context, 'world', 'health') > 95, id);
      assert.ok(output(context, 'world', 'growth') > 50, id);
    } else {
      assert.ok(output(context, 'world', 'temperature') > 18.5, id);
      assert.ok(output(context, 'world', 'water') > 0, id);
    }
  }
});

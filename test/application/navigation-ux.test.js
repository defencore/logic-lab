import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands } from '../../src/application/commands.js';
import { simulationStepText } from '../../src/workbench/simulation-step.js';
import { shellMarkup } from '../../src/workbench/shell-view.js';
import { TEXT } from '../../src/locales/index.js';
import { editingContext } from './fixture.js';

test('New circuit requires confirmation and preserves the current project until it is approved', () => {
  const context = editingContext();
  context.state.project.nodes.push({ id: 'original', type: 'switch' });
  const original = structuredClone(context.state.project);
  let factory = null;
  context.actions.confirmReplace = (value) => {
    factory = value;
  };
  const commands = createCommands(context);
  commands.newProject();
  assert.deepEqual(context.state.project, original);
  assert.equal(typeof factory, 'function');
  assert.deepEqual(factory(), {
    version: 1,
    name: 'newName',
    nodes: [],
    wires: [],
    wireStyle: 'orthogonal',
  });
  factory = null;
  context.services.classroom = { allowEdit: () => false };
  commands.newProject();
  assert.equal(factory, null);
});

test('simulation step duration is explicit at slow, normal and fast rates in both languages', () => {
  const t = (key) => TEXT.en[key];
  assert.deepEqual(simulationStepText(0.001, 'en', t), {
    duration: '0.01 ms',
    label: 'Simulation step · 0.01 ms',
  });
  assert.equal(simulationStepText(1, 'en', t).duration, '10 ms');
  assert.equal(simulationStepText(10, 'en', t).duration, '100 ms');
  assert.equal(simulationStepText(0.25, 'ua', (key) => TEXT.ua[key]).duration, '2,5 мс');
});

test('the workspace exposes named first actions, project creation, live save state and student workflow slot', () => {
  const html = shellMarkup({
    project: { name: 'Circuit', nodes: [], wires: [] },
    t: (key) => TEXT.ua[key] || key,
    lang: 'ua',
    workspaceView: 'canvas',
    query: '',
    simulationRate: 1,
    timeBase: 1,
    tool: 'select',
    monitorOpen: true,
    formatRate: String,
    formatWindow: String,
  });
  for (const id of [
    'new-project',
    'lesson-toggle-label',
    'student-workflow',
    'contact-zoom-hint',
    'connection-status',
  ])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('Додати компонент'));
  assert.ok(html.includes('Навчальні приклади'));
  assert.match(html, /id="save-state"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="step"[^>]*aria-label="Крок симуляції · 10 мс"/);
});

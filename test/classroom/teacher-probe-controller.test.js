import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeacherController } from '../../src/classroom/teacher-controller.js';
import { createClassroomView } from '../../src/classroom/view.js';
import { sanitizeTeacherForm } from '../../src/classroom/storage.js';
import { probeId } from '../../src/experiments/probes.js';
import { node } from '../assessment/fixtures/lab-assessment.js';

function fixture(t) {
  const previous = globalThis.document;
  const project = {
    version: 1,
    name: 'Criteria',
    nodes: Array.from({ length: 34 }, (_, i) => node(`lamp${i}`, 'led')),
    wires: [],
  };
  const probes = project.nodes.map((item) => ({ node: item.id, side: 'inputs', port: 'in' }));
  const state = {
    mode: 'teacher',
    teacherKey: null,
    sequence: { initialProject: project, probes: probes.slice(0, 32), actions: [{}], duration: 1 },
    observations: [],
    teacherForm: sanitizeTeacherForm({ probes: probes.slice(0, 32).map(probeId) }),
    batch: [],
    pairs: [],
    batchErrors: [],
    referenceWarnings: [],
    issued: [],
  };
  const views = () => createClassroomView({ state, project, language: 'en', example: null });
  const html = views().mainMarkup('teacher');
  const elements = new Map(
    [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => [
      '#' + match[1],
      {
        dataset: {},
        value: '',
        addEventListener(type, fn) {
          this['on' + type] = fn;
        },
      },
    ]),
  );
  elements.delete('#review-results');
  const inputs = [...html.matchAll(/<input[^>]+data-task-probe="(\d+)"([^>]*)>/g)].map((match) => ({
    dataset: { taskProbe: match[1] },
    checked: /\bchecked\b/.test(match[2]),
  }));
  elements.get('#task-title').value = 'Criteria';
  elements.get('#task-instructions').value = 'Observe the lamps';
  elements.get('#task-starter').value = 'interfaces';
  elements.get('#task-starter').tagName = 'SELECT';
  let saves = 0,
    creations = 0;
  const notifications = [];
  globalThis.document = {
    querySelector: (selector) => elements.get(selector),
    querySelectorAll: (selector) => {
      if (selector === '[data-task-probe]') return inputs;
      if (selector === '[data-task-probe]:checked') return inputs.filter((item) => item.checked);
      if (selector === '#task-title,#task-instructions,#task-starter,#issue-students')
        return selector.split(',').map((id) => elements.get(id));
      return [];
    },
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  const controller = createTeacherController({
    adapter: {
      getProject: () => project,
      getLanguage: () => 'en',
      notify: (message) => notifications.push(message),
    },
    state,
    views,
    L: (_, en) => en,
    teacher: { status: () => ({}), createKey: () => creations++ },
    persistDraft: () => saves++,
    safe: (action) => action,
    guardEditableSession() {},
    bindFile() {},
    refreshVisible() {},
    operations: { run: (action) => action() },
  });
  controller.bindTeacher();
  return {
    state,
    inputs,
    elements,
    notifications,
    get saves() {
      return saves;
    },
    get creations() {
      return creations;
    },
  };
}

test('teacher native checkbox changes persist only accepted sets and searching does not rewrite the form', (t) => {
  const f = fixture(t),
    original = f.state.teacherForm;
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.equal(f.inputs[32].checked, false);
  assert.equal(f.state.teacherForm, original);
  assert.equal(f.saves, 0);
  f.elements.get('#task-probe-search').value = 'lamp32';
  f.elements.get('#task-probe-search').oninput();
  assert.equal(f.saves, 0);
  f.inputs[0].checked = false;
  f.inputs[0].onchange();
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.equal(f.saves, 2);
  assert.equal(f.state.teacherForm.probes.length, 32);
  assert.ok(f.state.teacherForm.probes.includes('lamp32:inputs:in'));
  assert.ok(!f.state.teacherForm.probes.includes('lamp0:inputs:in'));
});

test('a forged oversize confirmation fails before key creation or saved form replacement', async (t) => {
  const f = fixture(t),
    original = f.state.teacherForm;
  f.inputs[32].checked = true;
  await assert.rejects(f.elements.get('#teacher-create').onclick(), /at most 32/);
  assert.equal(f.state.teacherForm, original);
  assert.equal(f.saves, 0);
  assert.equal(f.creations, 0);
});

test('a preview becoming read only after render cannot change teacher criteria', (t) => {
  const f = fixture(t),
    original = f.state.teacherForm;
  f.state.player = {};
  f.inputs[0].checked = false;
  f.inputs[0].onchange();
  assert.equal(f.inputs[0].checked, true);
  assert.equal(f.state.teacherForm, original);
  assert.equal(f.saves, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { probeId } from '../../src/experiments/probes.js';
import { createClassroomView } from '../../src/classroom/view.js';
import { sanitizeTeacherForm } from '../../src/classroom/storage.js';
import {
  bindProbePicker,
  probePickerMarkup,
  teacherProbeIds,
  observationCoverageMarkup,
} from '../../src/classroom/probe-picker.js';

function pickerFixture(t, { size = 34, selectedCount = 31 } = {}) {
  const previous = globalThis.document;
  const choices = Array.from({ length: size }, (_, i) => ({
    node: `part${i}`,
    side: 'outputs',
    port: 'q',
    nodeLabel: `Part ${i}`,
    label: `Part ${i} · Q`,
  }));
  const selected = choices.slice(0, selectedCount).map(probeId);
  let saved = [...selected];
  const inputs = choices.map((_, index) => ({
    dataset: { taskProbe: String(index) },
    checked: index < selectedCount,
  }));
  const rows = choices.map((choice) => ({
    hidden: false,
    dataset: { probeSearchText: choice.label.toLowerCase() },
  }));
  const groups = rows.map((row) => ({ hidden: false, querySelectorAll: () => [row] }));
  const elements = new Map(
    ['count', 'feedback', 'search', 'empty'].map((suffix) => [
      `#task-probe-${suffix}`,
      { textContent: '', value: '', hidden: false },
    ]),
  );
  globalThis.document = {
    querySelector: (selector) => elements.get(selector),
    querySelectorAll: (selector) =>
      selector === '[data-task-probe]'
        ? inputs
        : selector === '[data-probe-row="task"]'
          ? rows
          : selector === '[data-probe-group="task"]'
            ? groups
            : [],
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  const picker = bindProbePicker({
    choices,
    selected,
    onChange: (ids) => {
      saved = ids;
    },
  });
  return {
    choices,
    inputs,
    rows,
    groups,
    picker,
    elements,
    get saved() {
      return saved;
    },
  };
}

test('the 33rd native selection is rejected atomically and announces how to make room', (t) => {
  const f = pickerFixture(t);
  f.inputs[31].checked = true;
  f.inputs[31].onchange();
  const before = [...f.saved];
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.equal(f.inputs[32].checked, false);
  assert.deepEqual(f.saved, before);
  assert.equal(f.picker.probes().length, 32);
  assert.match(f.elements.get('#task-probe-feedback').textContent, /at most 32/);
  assert.match(f.elements.get('#task-probe-count').textContent, /Remaining: 0/);
  f.inputs[0].checked = false;
  f.inputs[0].onchange();
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.ok(f.saved.includes(probeId(f.choices[32])));
  assert.equal(f.saved.length, 32);
});

test('search hides groups without discarding checked rows and persisted picks survive a tab render', (t) => {
  const f = pickerFixture(t, { selectedCount: 2 });
  const search = f.elements.get('#task-probe-search');
  search.value = 'part 33';
  search.oninput();
  assert.equal(f.rows[0].hidden, true);
  assert.equal(f.groups[0].hidden, true);
  assert.equal(f.rows[33].hidden, false);
  assert.equal(f.inputs[0].checked, true);
  f.inputs[33].checked = true;
  f.inputs[33].onchange();
  assert.deepEqual(
    f.picker.probes().map(probeId),
    [f.choices[0], f.choices[1], f.choices[33]].map(probeId),
  );
  const state = { teacherForm: { probes: f.saved } };
  const rerender = probePickerMarkup({
    choices: f.choices,
    selected: teacherProbeIds(state, f.choices),
  });
  assert.equal((rerender.match(/data-task-probe="\d+" checked/g) || []).length, 3);
  search.value = 'absent';
  search.oninput();
  assert.equal(f.elements.get('#task-probe-empty').hidden, false);
  assert.equal(f.saved.length, 3);
});

test('all 148 eligible elevator contacts remain selectable, including all 15 plant outputs', () => {
  const project = createExample('elevator-logic');
  const state = {
    teacherForm: sanitizeTeacherForm(),
    sequence: null,
    teacherKey: null,
    observations: [],
  };
  const view = createClassroomView({ state, project, language: 'en', example: null });
  const choices = view.possibleProbes();
  assert.equal(choices.length, 148);
  const plant = choices.filter((probe) => probe.node === 'plant');
  assert.equal(plant.length, 15);
  assert.ok(choices.indexOf(plant[0]) >= 100);
  assert.deepEqual(
    plant.filter((probe) => probe.port.startsWith('floor')).map((probe) => probe.port),
    Array.from({ length: 9 }, (_, i) => `floor${i + 1}`),
  );
  const markup = probePickerMarkup({ choices, selected: plant.map(probeId) });
  assert.equal((markup.match(/data-task-probe=/g) || []).length, 148);
  assert.equal((markup.match(/data-task-probe="\d+" checked/g) || []).length, 15);
});

test('a saved criterion with a deleted node stays visible for explicit correction', () => {
  const project = createExample('elevator-logic');
  const state = {
    teacherForm: sanitizeTeacherForm({ probes: ['deleted:outputs:q'] }),
    sequence: null,
    teacherKey: null,
    observations: [],
  };
  const view = createClassroomView({ state, project, language: 'en', example: null });
  const choices = view.possibleProbes();
  assert.equal(choices.at(-1).missing, true);
  const markup = probePickerMarkup({ choices, selected: teacherProbeIds(state, choices) });
  assert.match(markup, /\(missing\)/);
  assert.match(markup, /data-task-probe="148" checked/);
});

test('teacher guidance states the limits of logical buzzer criteria in both languages', () => {
  assert.match(observationCoverageMarkup('en'), /does not verify sound, frequency, volume/);
  assert.match(observationCoverageMarkup('ua'), /не підтверджує звук, частоту, гучність/);
});

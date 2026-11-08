import assert from 'node:assert/strict';
import { createExample } from '../../../examples/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  captureObservation,
} from '../../../src/experiments/actions.js';
import { createAssignment, issueAssignment } from '../../../src/assessment/index.js';
import { createActionSession } from '../../../src/classroom/action-session.js';
import { createTeacherWorkspace, probeKey } from '../../../src/classroom/teacher-workspace.js';
import { createKeyReference } from '../../../src/classroom/key-reference.js';
import { sanitizeTeacherForm } from '../../../src/classroom/storage.js';

function sequenceFor(project) {
  const sequence = createSequence(project);
  const input = project.nodes.find((node) => node.type === 'switch');
  appendAction(sequence, {
    at: 0,
    node: input.id,
    key: 'value',
    value: Number(!input.params.value),
  });
  return finishSequence(sequence, 0.1);
}
export function fixture() {
  const referenceProject = createExample('half-adder');
  referenceProject.name = 'Stored six';
  const key = createAssignment({
    title: 'Six-component key',
    referenceProject,
    sequence: sequenceFor(referenceProject),
  });
  const issued = issueAssignment(key, { studentId: 'student-01' });
  let project = createExample('half-adder');
  project.name = 'Current seven';
  project.nodes.push({ id: 'extra', type: 'not', x: 2000, y: 0, enabled: true, params: {} });
  let runtime = createRuntime();
  simulate(project, runtime, 0);
  const originalProject = project,
    originalRuntime = runtime,
    originalSequence = sequenceFor(project);
  let viewport = { x: 43, y: 21, zoom: 1.25 },
    lessonStep = 3,
    running = true,
    session,
    bridge;
  const controls = {
    failure: null,
    saves: 0,
    loads: 0,
    notifications: [],
    persisted: [],
    gate: null,
    buttons: new Map(),
    modal: '',
    downloads: [],
    blobs: [],
  };
  const persistDraft = () => {
    controls.saves++;
    if (
      (controls.failure === 'sequence-save' && controls.saves === 1) ||
      (controls.failure === 'teacher-save' && controls.saves === 2)
    )
      throw new Error('Injected persistence failure');
    controls.persisted.push({
      sequence: session.state.sequence,
      observations: session.state.observations,
    });
  };
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    getViewport: () => ({ ...viewport }),
    getLessonStep: () => lessonStep,
    restoreLessonStep: (value) => {
      lessonStep = value;
    },
    restoreViewport: (value) => {
      viewport = value;
    },
    isRunning: () => running,
    setRunning: (value) => {
      running = value;
      session?.simulationStateChanged(value);
    },
    adoptPlayback: (next, nextRuntime) => {
      project = next;
      runtime = nextRuntime;
    },
    refreshPlayback() {},
    closeModal: () => {
      controls.buttons.clear();
      controls.modal = '';
    },
    fitProject: () => {
      viewport = { x: 0, y: 0, zoom: 0.4 };
      lessonStep = 0;
    },
    showModal: (markup) => {
      controls.modal = markup;
      controls.buttons = new Map(
        [...markup.matchAll(/id="([^"]+)"/g)].map((match) => [
          match[1],
          { disabled: false, onclick: null },
        ]),
      );
    },
    notify: (message) => controls.notifications.push(message),
    loadProject: (value) => {
      assert.equal(bridge.isInstalling(), true);
      controls.loads++;
      project = value;
      runtime = createRuntime();
      simulate(project, runtime, 0);
      viewport = { x: 0, y: 0, zoom: 0.5 };
      lessonStep = 0;
      running = true;
      if (controls.failure === 'load') throw new Error('Injected load failure');
    },
  };
  session = createActionSession(adapter, { sequence: originalSequence, onSave: persistDraft });
  Object.assign(session.state, {
    teacherKey: key,
    issued: [issued],
    teacherForm: sanitizeTeacherForm({
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(probeKey),
    }),
    student: { name: 'Teacher practice', id: '', group: '' },
    assignment: null,
    attempt: null,
    notes: 'Original explanation',
    teacherEditorBaseline: structuredClone(project),
    teacherSequenceBaseline: 'original-baseline',
    teacherUseSavedReference: { sequence: 'original-choice', project: structuredClone(project) },
  });
  session.state.observations = [captureObservation(originalSequence, runtime, -1)];
  session.state.dockOpen = false;
  session.simulationStateChanged(true);
  const teacher = createTeacherWorkspace(session.state, { onSave: persistDraft });
  const operations = {
    async run(action) {
      session.state.busy = true;
      try {
        if (controls.gate) await controls.gate;
        return await action();
      } finally {
        session.state.busy = false;
      }
    },
  };
  bridge = createKeyReference({
    adapter,
    state: session.state,
    session,
    teacher,
    L: (_ua, en) => en,
    safe:
      (action) =>
      async (...args) =>
        action(...args),
    operations,
    guardEditableSession: () => {
      if (session.isLocked() || session.state.busy) throw new Error('Session locked');
    },
    updateDock() {},
    persistDraft,
  });
  return {
    key,
    teacher,
    state: session.state,
    session,
    bridge,
    adapter,
    controls,
    originalProject,
    originalRuntime,
    originalSequence,
    get project() {
      return project;
    },
    get runtime() {
      return runtime;
    },
    get viewport() {
      return viewport;
    },
    get lessonStep() {
      return lessonStep;
    },
    get running() {
      return running;
    },
  };
}
export async function withDOM(f, action) {
  const before = {
    document: globalThis.document,
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };
  globalThis.document = {
    querySelector: (selector) => f.controls.buttons.get(selector.replace(/^#/, '')) ?? null,
    createElement: () => ({
      href: '',
      download: '',
      click() {
        f.controls.downloads.push({ name: this.download, href: this.href });
      },
    }),
  };
  URL.createObjectURL = (blob) => {
    f.controls.blobs.push(blob);
    return `blob:key-reference-${f.controls.blobs.length}`;
  };
  URL.revokeObjectURL = () => {};
  try {
    await action();
  } finally {
    globalThis.document = before.document;
    URL.createObjectURL = before.create;
    URL.revokeObjectURL = before.revoke;
  }
}
export function baseline(f) {
  return {
    observations: f.state.observations,
    editor: f.state.teacherEditorBaseline,
    sequence: f.state.teacherSequenceBaseline,
    choice: f.state.teacherUseSavedReference,
  };
}
export function assertOriginal(f, before) {
  assert.equal(f.project, f.originalProject);
  assert.equal(f.runtime, f.originalRuntime);
  assert.equal(f.state.sequence, f.originalSequence);
  assert.equal(f.state.observations, before.observations);
  assert.equal(f.state.teacherEditorBaseline, before.editor);
  assert.equal(f.state.teacherSequenceBaseline, before.sequence);
  assert.equal(f.state.teacherUseSavedReference, before.choice);
  assert.deepEqual(f.viewport, { x: 43, y: 21, zoom: 1.25 });
  assert.equal(f.lessonStep, 3);
  assert.equal(f.running, true);
  assert.equal(f.state.dockOpen, false);
  assert.equal(f.bridge.isInstalling(), false);
}

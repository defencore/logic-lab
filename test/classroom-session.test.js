import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../examples/index.js';
import { createRuntime, simulate } from '../src/simulator.js';
import { createSequence, appendAction, finishSequence } from '../src/action-sequence.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  recordEdit,
} from '../src/lab-assessment.js';
import { createActionSession } from '../src/classroom/action-session.js';
import { createClassroomOperations, readClassroomFile } from '../src/classroom/files.js';
import {
  createClassroomStorage,
  readClassroomStorage,
  sanitizeTeacherForm,
} from '../src/classroom/storage.js';
import { createClassroomView } from '../src/classroom/view.js';
import { createReviewView } from '../src/classroom/review-view.js';
import { createTeacherWorkspace, inspectReference } from '../src/classroom/teacher-workspace.js';
import { serializeAssignmentKey } from '../src/lab-assessment.js';
import { createSubmission, serializeSubmission } from '../src/lab-assessment.js';

function fixture() {
  let project = createExample('shift-register-sequence');
  let runtime = createRuntime();
  let running = false;
  let refreshes = 0;
  simulate(project, runtime, 0);
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    resetForSequence: () => {
      runtime = createRuntime();
      simulate(project, runtime, 0);
    },
    setRunning: (value) => (running = value),
    adoptPlayback: (nextProject, nextRuntime) => {
      project = nextProject;
      runtime = nextRuntime;
    },
    refreshPlayback: (nextProject, nextRuntime) => {
      project = nextProject || project;
      runtime = nextRuntime || runtime;
      refreshes++;
    },
  };
  return {
    adapter,
    get project() {
      return project;
    },
    get runtime() {
      return runtime;
    },
    get running() {
      return running;
    },
    get refreshes() {
      return refreshes;
    },
  };
}
function sequenceFor(project) {
  const sequence = createSequence(project);
  appendAction(sequence, { at: 0, node: 'ser', key: 'value', value: 1 });
  appendAction(sequence, { at: 0, node: 'clock', key: 'value', value: 1 });
  return finishSequence(sequence, 0.1);
}
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('recording saves its fresh baseline immediately and preserves ordered paused input edges', () => {
  const f = fixture();
  const saves = [];
  const session = createActionSession(f.adapter, {
    onSave: () => saves.push(structuredClone(session.state.sequence)),
  });
  session.startRecording();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].actions.length, 0);
  assert.equal(f.runtime.time, 0);
  session.simulationStateChanged(false);
  assert.equal(session.state.simulationRunning, false);
  for (const [node, value] of [
    ['ser', 1],
    ['clock', 1],
    ['clock', 0],
  ]) {
    f.project.nodes.find((item) => item.id === node).params.value = value;
    simulate(f.project, f.runtime, 0);
    session.inputChanged(node, 'value', value);
  }
  session.stopRecording();
  assert.equal(session.state.sequence.actions.length, 3);
  assert.deepEqual(
    session.state.sequence.actions.map((action) => action.at),
    [0, 0, 0],
  );
  assert.equal(f.runtime.signals.outputs.shift.out, 1);
  assert.equal(session.state.observations.length, 4);
  assert.equal(session.isLocked(), false);
});

test('replaying an older circuit restores the exact editable project and runtime on stop', () => {
  const f = fixture();
  const sequence = sequenceFor(f.project);
  const originalProject = f.project;
  const originalRuntime = f.runtime;
  originalProject.nodes.push({
    id: 'new-note',
    type: 'note',
    x: 0,
    y: 0,
    label: 'New work',
    params: { text: 'Keep this' },
  });
  const session = createActionSession(f.adapter, { sequence });
  session.replay();
  assert.equal(
    f.project.nodes.some((node) => node.id === 'new-note'),
    false,
  );
  assert.equal(session.projectToSave(), originalProject);
  session.tick(0.1);
  assert.equal(session.state.player.done, true);
  assert.equal(session.state.playbackRunning, false);
  assert.equal(f.runtime.signals.outputs.shift.out, 1);
  session.stopPlayback();
  assert.equal(f.project, originalProject);
  assert.equal(f.runtime, originalRuntime);
  assert.equal(session.projectToSave(), originalProject);
});

test('single action stepping restarts completed playback without replacing its original restore point', () => {
  const f = fixture();
  const original = f.project;
  const session = createActionSession(f.adapter, { sequence: sequenceFor(original) });
  session.nextAction();
  assert.equal(session.state.player.cursor, 1);
  session.nextAction();
  assert.equal(session.state.player.cursor, 2);
  session.nextAction();
  assert.equal(session.state.player.done, true);
  session.nextAction();
  assert.equal(session.state.player.cursor, 1);
  session.stopPlayback();
  assert.equal(f.project, original);
});

test('starting a new recording during replay records the preserved editable circuit', () => {
  const f = fixture();
  const sequence = sequenceFor(f.project);
  f.project.name = 'My newer circuit';
  const session = createActionSession(f.adapter, { sequence });
  session.replay();
  assert.notEqual(f.project.name, 'My newer circuit');
  session.startRecording();
  assert.equal(session.state.sequence.initialProject.name, 'My newer circuit');
  assert.equal(session.state.recording, true);
  assert.equal(session.state.player, null);
});

test('invalid replay and import do not take over the editable circuit', () => {
  const f = fixture();
  const original = f.project;
  const session = createActionSession(f.adapter);
  assert.throws(() => session.replay(), /Record or import/);
  assert.throws(() => session.setSequence({}), /Unsupported/);
  assert.equal(f.project, original);
  assert.equal(session.state.player, null);
  session.stopPlayback();
  assert.equal(f.refreshes, 0);
});

test('recording caps its duration and stops without saving an invalid over-limit sequence', () => {
  const f = fixture();
  const session = createActionSession(f.adapter);
  session.startRecording();
  f.runtime.time = 119.99;
  assert.ok(Math.abs(session.recordingDelta(1) - 0.01) < 1e-10);
  f.runtime.time = 120;
  assert.equal(session.tick(0).limitReached, true);
  assert.equal(session.state.sequence.duration, 120);
  assert.equal(session.state.recording, false);
  assert.equal(f.running, false);
});

test('draft restoration isolates invalid sections and never writes private teacher keys', () => {
  const storage = memoryStorage();
  const store = createClassroomStorage(storage);
  const sequence = sequenceFor(createExample('shift-register-sequence'));
  store.saveProfile({
    mode: 'teacher',
    student: { name: 'Name', id: 'x'.repeat(200), group: 'g' },
  });
  store.saveDraft({
    assignment: { kind: 'bad' },
    attempt: { kind: 'bad' },
    sequence,
    notes: 'Keep notes',
    teacherForm: { title: 'Draft title', starterMode: 'components', probes: ['shift:outputs:out'] },
    teacherKey: { secret: 'never store' },
  });
  const restored = store.load();
  assert.equal(restored.mode, 'teacher');
  assert.equal(restored.student.id.length, 100);
  assert.equal(restored.assignment, null);
  assert.equal(restored.attempt, null);
  assert.equal(restored.sequence.actions.length, 2);
  assert.equal(restored.notes, 'Keep notes');
  assert.equal(restored.teacherForm.title, 'Draft title');
  assert.ok(!storage.getItem('logic-lab.classroom-draft').includes('never store'));
  storage.setItem('logic-lab.classroom-profile', 'not-json');
  assert.equal(readClassroomStorage(storage).mode, 'student');
});

test('saved attempts retain their identity and construction journal after reload', () => {
  const storage = memoryStorage();
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const assignment = issueAssignment(key, { studentId: 's1' });
  const attempt = createAttempt(assignment, { name: 'Name', id: 's1', group: 'g' });
  recordEdit(attempt, project, { at: 1, event: 'wire' });
  const store = createClassroomStorage(storage);
  store.saveDraft({ assignment, attempt, sequence: sequenceFor(project), notes: 'Result' });
  const restored = store.load();
  assert.equal(restored.attempt.id, attempt.id);
  assert.deepEqual(restored.attempt.journal, attempt.journal);
});

test('storage failure is reported once until a successful save', () => {
  let fail = true;
  let warnings = 0;
  const store = createClassroomStorage(
    {
      setItem: () => {
        if (fail) throw Error('full');
      },
    },
    () => warnings++,
  );
  store.saveProfile({ mode: 'student', student: {} });
  store.saveProfile({ mode: 'student', student: {} });
  assert.equal(warnings, 1);
  fail = false;
  store.saveProfile({ mode: 'student', student: {} });
  fail = true;
  store.saveProfile({ mode: 'student', student: {} });
  assert.equal(warnings, 2);
});

test('asynchronous classroom operations reject overlaps and unlock after failure', async () => {
  const transitions = [];
  const gate = createClassroomOperations((busy) => transitions.push(busy));
  let release;
  const pending = gate.run(() => new Promise((resolve) => (release = resolve)));
  assert.equal(gate.isBusy(), true);
  await assert.rejects(
    gate.run(() => {}),
    /Wait/,
  );
  release('done');
  assert.equal(await pending, 'done');
  await assert.rejects(
    gate.run(() => {
      throw Error('invalid file');
    }),
    /invalid file/,
  );
  assert.equal(gate.isBusy(), false);
  assert.deepEqual(transitions, [true, false, true, false]);
});

test('operation lock is released if updating its busy indicator fails', async () => {
  const gate = createClassroomOperations((busy) => {
    if (busy) throw Error('detached view');
  });
  await assert.rejects(
    gate.run(() => {}),
    /detached view/,
  );
  assert.equal(gate.isBusy(), false);
});

test('classroom file reads enforce the actual 10 MB import contract before reading', async () => {
  let read = false;
  await assert.rejects(
    readClassroomFile({
      size: 10000001,
      text: () => {
        read = true;
        return '{}';
      },
    }),
    /10 MB/,
  );
  assert.equal(read, false);
  assert.equal(await readClassroomFile({ size: 2, text: async () => '{}' }), '{}');
});

test('teacher forms and accessible tabs render saved choices without leaking reference data', () => {
  const state = {
    mode: 'teacher',
    student: { name: '', id: '', group: '' },
    assignment: null,
    teacherKey: {
      title: 'Imported task',
      id: 'task-key',
      referenceProject: createExample('shift-register-sequence'),
    },
    referenceWarnings: [],
    issued: [],
    attempt: null,
    sequence: null,
    observations: [],
    recording: false,
    player: null,
    playbackRunning: false,
    busy: false,
    notes: '',
    batch: [],
    pairs: [],
    batchErrors: [],
    teacherForm: sanitizeTeacherForm({
      title: 'My task',
      instructions: 'Retain me',
      starterMode: 'components',
      studentIds: 's1\ns2',
      probes: [],
    }),
  };
  const view = createClassroomView({
    state,
    language: 'en',
    project: createExample('shift-register-sequence'),
    example: null,
  });
  const markup = view.mainMarkup('teacher');
  assert.match(markup, /value="My task"/);
  assert.match(markup, /Retain me/);
  assert.match(markup, /<option value="components" selected>/);
  assert.match(markup, /s1\ns2/);
  assert.equal((markup.match(/data-task-probe="\d+" checked/g) || []).length, 0);
  assert.match(markup, /role="tabpanel" aria-labelledby="class-tab-teacher"/);
  assert.match(markup, /id="class-tab-teacher"[^>]*tabindex="0"[^>]*aria-selected="true"/);
});

test('imported teacher keys restore issued student files and invalidate an older review', async () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Restored task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const task = issueAssignment(key, { studentId: 's1' });
  const state = {
    teacherForm: sanitizeTeacherForm(),
    teacherKey: null,
    referenceWarnings: [],
    issued: [],
    batch: [{ old: true }],
    pairs: [{}],
    batchErrors: ['old'],
  };
  const workspace = createTeacherWorkspace(state);
  await workspace.importKey(serializeAssignmentKey(key));
  assert.equal(state.issued.length, 1);
  assert.equal(state.issued[0].id, task.id);
  assert.ok(!Object.hasOwn(state.issued[0], 'referenceProject'));
  assert.deepEqual(state.batch, []);
  assert.deepEqual(state.pairs, []);
  assert.deepEqual(state.batchErrors, []);
  assert.equal(workspace.report().taskId, key.id);
  const previous = state.teacherKey;
  await assert.rejects(workspace.importKey('{}'), /Unsupported/);
  assert.equal(state.teacherKey, previous);
});

test('variant batches are atomic when the teacher registry has insufficient capacity', () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  for (let i = 0; i < 199; i++) issueAssignment(key, { studentId: 's' + i });
  const state = {
    teacherKey: key,
    issued: [],
    teacherForm: sanitizeTeacherForm({ studentIds: 'new-a\nnew-b' }),
  };
  const workspace = createTeacherWorkspace(state);
  assert.throws(() => workspace.issueVariants(), /200/);
  assert.equal(state.teacherKey.issued.length, 199);
  assert.equal(state.issued.length, 0);
  assert.equal(state.teacherForm.studentIds, 'new-a\nnew-b');
});

test('reference inspection distinguishes a changing result from a constant criterion', async () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const probes = [{ node: 'shift', port: 'out', side: 'outputs' }];
  const key = createAssignment({ title: 'Task', referenceProject: project, sequence, probes });
  assert.deepEqual(await inspectReference(key), { constant: false, undefined: false });
  const constant = structuredClone(key);
  constant.sequence.actions = [{ at: 0, node: 'ser', key: 'value', value: 1 }];
  assert.deepEqual(await inspectReference(constant), { constant: true, undefined: false });
});

test('teacher review separates functional correctness from corrupted evidence and defers similarity while busy', () => {
  const project = createExample('shift-register-sequence');
  const submission = {
    student: { name: 'Student', id: 's1' },
    assignment: { variant: { id: 'variant-id' } },
  };
  const result = {
    functionalPassed: true,
    passed: false,
    reviewRequired: true,
    workEvidenceMissing: false,
    matched: 3,
    totalChecks: 3,
    mismatches: [],
    integrity: false,
    structureMatches: true,
    observationsMatch: false,
    evidence: { constructionChanges: 2, actions: 3, studentBound: true },
  };
  const state = {
    teacherKey: { referenceProject: project },
    batch: [{ submission, result }],
    pairs: [],
    batchErrors: [],
    busy: true,
  };
  const markup = createReviewView({ state, language: 'en' }).reviewMarkup();
  assert.match(markup, /Checks passed/);
  assert.match(markup, /Instructor review needed/);
  assert.match(markup, /The file checksum does not match/);
  assert.match(markup, /results stored in the file differ/);
  assert.match(markup, /Similarity comparison will be available/);
  assert.doesNotMatch(markup, /No significant structural/);
});

test('cancelled batch checking keeps completed rows and cannot claim a completed similarity report', async () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({ title: 'Task', referenceProject: project, sequence });
  const assignment = issueAssignment(key, { studentId: 's1' });
  const student = { name: 'Student', id: 's1', group: 'g' };
  const attempt = createAttempt(assignment, student);
  recordEdit(attempt, project, { at: 1 });
  const submission = await createSubmission({
    assignment,
    student,
    attempt,
    project,
    sequence,
    notes: 'Observed the edge.',
  });
  const source = serializeSubmission(submission);
  const state = {
    teacherKey: key,
    teacherForm: sanitizeTeacherForm(),
    batch: [],
    pairs: [],
    batchErrors: [],
  };
  const workspace = createTeacherWorkspace(state, {
    onProgress: () => {
      if (state.batch.length === 1) workspace.cancelReview();
    },
  });
  const result = await workspace.reviewFiles([
    { name: 'one.json', size: source.length, text: async () => source },
    { name: 'two.json', size: source.length, text: async () => source },
  ]);
  assert.equal(result.cancelled, true);
  assert.equal(state.batch.length, 1);
  assert.equal(state.reviewing, false);
  assert.equal(state.reviewComparisonComplete, false);
  assert.equal(workspace.report().complete, false);
  assert.equal(workspace.report().comparisonComplete, false);
  const markup = createReviewView({
    state: { ...state, busy: false },
    language: 'en',
  }).reviewMarkup();
  assert.match(markup, /Checking was stopped/);
  assert.match(markup, /Comparison of this batch was not completed/);
  assert.doesNotMatch(markup, /No significant structural/);
});

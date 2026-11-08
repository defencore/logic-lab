import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine } from '../../src/audio/engine.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  createSubmission,
  gradeSubmission,
} from '../../src/assessment/index.js';
import { fakeAudioContext } from './fixture.js';

const flush = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve();
};
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

function circuit(type = 'active_buzzer', value = 0) {
  return {
    version: 1,
    name: 'Recorded sound',
    nodes: [
      { id: 'source', type: 'switch', x: 0, y: 0, params: { value } },
      { id: 'buzzer', type, x: 200, y: 0, params: {} },
    ],
    wires: [
      {
        id: 'input',
        from: { node: 'source', port: 'out' },
        to: { node: 'buzzer', port: 'in' },
        width: 1,
      },
    ],
  };
}
function recorded(project, actions, duration = 1) {
  const sequence = createSequence(project, {
    probes: [{ node: 'buzzer', port: 'in', side: 'inputs' }],
  });
  for (const [at, value] of actions)
    appendAction(sequence, { at, node: 'source', key: 'value', value });
  return finishSequence(sequence, duration);
}
async function fixture({ type = 'active_buzzer', value = 0, actions = [], duration = 1 } = {}) {
  let project = circuit(type, value),
    runtime = createRuntime(),
    session,
    running = false;
  const originalProject = project;
  simulate(project, runtime, 0);
  const sequence = recorded(project, actions, duration);
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  await engine.enable();
  const context = AudioContext.instances[0];
  function sync() {
    const player = session?.state.player;
    const previewing = !!player || !!session?.state.preview;
    engine.sync({
      project,
      runtime,
      rate: 1,
      running: previewing ? !!player && !player.done && session.state.playbackRunning : running,
      completed: !!player?.done,
    });
  }
  session = createActionSession(
    {
      getProject: () => project,
      getRuntime: () => runtime,
      setRunning: (next) => {
        running = next;
        sync();
      },
      adoptPlayback: (nextProject, nextRuntime) => {
        project = nextProject;
        runtime = nextRuntime;
        sync();
      },
      refreshPlayback: () => sync(),
    },
    { sequence },
  );
  sync();
  return {
    context,
    engine,
    session,
    sequence,
    originalProject,
    sync,
    get runtime() {
      return runtime;
    },
    async start() {
      session.replay();
      sync();
      await flush();
      sync();
    },
    frame(audioTime, delta) {
      if (context.state === 'running') context.currentTime = audioTime;
      sync(); // The application anchors transport before advancing any physics.
      session.tick(delta);
      sync();
    },
    deferResume() {
      let release;
      context.resume = () =>
        new Promise((resolve) => {
          release = () => {
            context.state = 'running';
            resolve();
          };
        });
      return async () => {
        assert.equal(typeof release, 'function');
        release();
        await flush();
      };
    },
  };
}

test('the first replay frame schedules a 1–2 ms pulse from actual settled domain events', async () => {
  for (const type of ['active_buzzer', 'passive_buzzer']) {
    const f = await fixture({
      type,
      actions: [
        [0.001, 1],
        [0.002, 0],
      ],
    });
    try {
      await f.start();
      f.frame(0.016, 0.016);
      assert.deepEqual(
        f.runtime.audioEvents.map(({ at, value }) => [at, value]),
        [
          [0, 0],
          [0.001, 1],
          [0.002, 0],
        ],
      );
      assert.equal(f.engine.status().scheduledEvents, 2);
      const source = f.context.nodes.find(
        ({ kind }) => kind === (type === 'active_buzzer' ? 'oscillator' : 'constant'),
      );
      const parameter = type === 'active_buzzer' ? source.outputs[0].gain : source.offset;
      near(
        parameter.events.find(({ value }) => value === (type === 'active_buzzer' ? 0.15 : 1)).at,
        0.101,
      );
      assert.ok(
        parameter.events.some(({ at, value }) => Math.abs(at - 0.102) < 1e-10 && value === 0),
      );
    } finally {
      f.engine.dispose();
    }
  }
});

test('a suspended asynchronous resume retains edges advanced while the audio context is opening', async () => {
  const f = await fixture({
    actions: [
      [0.033, 1],
      [0.034, 0],
    ],
  });
  try {
    await f.start();
    f.frame(0.032, 0.032);
    f.session.pausePlayback();
    f.sync();
    assert.equal(f.context.state, 'suspended');
    assert.equal(f.engine.status().voices, 0);
    const release = f.deferResume();
    f.session.pausePlayback();
    f.frame(0.048, 0.016);
    assert.equal(f.context.state, 'suspended');
    assert.equal(f.runtime.time, 0.048);
    await release();
    f.sync();
    assert.equal(f.engine.status().scheduledEvents, 2);
    const source = f.context.nodes.filter(({ kind }) => kind === 'oscillator').at(-1);
    near(source.outputs[0].gain.events.find(({ value }) => value === 0.15).at, 0.133);
    assert.ok(
      source.outputs[0].gain.events.some(
        ({ at, value }) => Math.abs(at - 0.134) < 1e-10 && value === 0,
      ),
    );
  } finally {
    f.engine.dispose();
  }
});

test('natural completion drains the final 950–990 ms pulse before ending the audio transport', async () => {
  const f = await fixture({
    actions: [
      [0.95, 1],
      [0.99, 0],
    ],
  });
  try {
    await f.start();
    for (let frame = 1; frame <= 62; frame++) f.frame(frame * 0.016, 0.016);
    const source = f.context.nodes.find(({ kind }) => kind === 'oscillator');
    near(source.outputs[0].gain.events.find(({ value }) => value === 0.15).at, 1.05);
    f.frame(1, 0.008);
    assert.equal(f.session.state.player.done, true);
    assert.equal(f.session.state.playbackRunning, false);
    assert.equal(f.context.state, 'running');
    assert.equal(source.stopped, false);
    assert.equal(source.outputs[0].gain.at(1.06), 0.15);
    assert.equal(source.outputs[0].gain.at(1.095), 0);
    f.context.currentTime = 1.2;
    f.sync();
    assert.equal(f.engine.status().voices, 0);
    assert.equal(f.context.state, 'suspended');
    assert.equal(source.stopped, true);
    const count = f.context.nodes.length;
    f.sync();
    assert.equal(
      f.context.nodes.length,
      count,
      'completed transport must not restart its final state',
    );
  } finally {
    f.engine.dispose();
  }
});

test('explicit pause and Stop cut audio immediately and restore the original editor', async () => {
  const f = await fixture({ value: 1 });
  try {
    await f.start();
    f.frame(0.016, 0.016);
    const source = f.context.nodes.find(({ kind }) => kind === 'oscillator');
    f.session.pausePlayback();
    f.sync();
    assert.equal(f.session.state.player.done, false);
    assert.equal(f.engine.status().voices, 0);
    assert.equal(f.context.state, 'suspended');
    assert.equal(source.stopped, true);
    f.session.stopPlayback();
    f.sync();
    assert.equal(f.session.projectToSave(), f.originalProject);
    assert.equal(f.session.state.player, null);
    assert.equal(f.engine.status().voices, 0);
  } finally {
    f.engine.dispose();
  }
});

test('detached grading replays buzzer circuits without creating or scheduling browser audio', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const project = circuit(),
    sequence = recorded(
      project,
      [
        [0.001, 1],
        [0.002, 0],
      ],
      0.01,
    );
  const key = createAssignment({ title: 'Silent grading', referenceProject: project, sequence });
  const student = { id: 's1', name: 'Learner' },
    assignment = issueAssignment(key, { studentId: student.id });
  const submission = await createSubmission({
    assignment,
    student,
    project,
    sequence,
    attempt: createAttempt(assignment, student),
  });
  const result = await gradeSubmission(submission, key);
  assert.equal(result.functionalPassed, true);
  assert.equal(AudioContext.instances.length, 0);
  assert.equal(engine.status().scheduledEvents, 0);
  engine.dispose();
});

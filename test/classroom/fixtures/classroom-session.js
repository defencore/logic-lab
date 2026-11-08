import { createExample } from '../../../examples/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import { createSequence, appendAction, finishSequence } from '../../../src/experiments/actions.js';

export function fixture() {
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

export function sequenceFor(project) {
  const sequence = createSequence(project);
  appendAction(sequence, { at: 0, node: 'ser', key: 'value', value: 1 });
  appendAction(sequence, { at: 0, node: 'clock', key: 'value', value: 1 });
  return finishSequence(sequence, 0.1);
}

export function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

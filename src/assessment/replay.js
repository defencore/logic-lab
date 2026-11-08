import { createPlayback, advancePlayback } from '../experiments/actions.js';
import { fail, abortIfNeeded } from './schema.js';
import { yieldToMain } from './scheduling.js';

export async function run(sequence, project, { signal } = {}) {
  abortIfNeeded(signal);
  const playback = createPlayback(sequence, { project });
  const complexity = Math.max(1, project.nodes.length + project.wires.length);
  const workBudget = Math.min(250_000, Math.floor(20_000_000 / complexity));
  const chunk = Math.max(1, Math.min(250, Math.floor(20_000 / complexity)));
  let operations = 0;
  while (!playback.done) {
    abortIfNeeded(signal);
    operations += advancePlayback(playback, sequence.duration, { maxSteps: chunk }).steps;
    if (operations > workBudget)
      fail('Replay exceeds the supported work budget. Shorten the sequence.');
    if (!playback.done) await yieldToMain(signal);
  }
  abortIfNeeded(signal);
  return playback;
}

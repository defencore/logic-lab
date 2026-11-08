import { createPlayback, advancePlayback, stepPlayback } from '../experiments/actions.js';
import { fail, abortIfNeeded } from './schema.js';
import { yieldToMain } from './scheduling.js';

function checkCheckpoint(sequence, checkpoint) {
  if (checkpoint === undefined) return;
  const after = checkpoint?.after;
  if (!Number.isInteger(after) || after < -1 || after > sequence.actions.length)
    fail('The reference-check checkpoint is invalid.');
  const at =
    after < 0
      ? 0
      : after === sequence.actions.length
        ? sequence.duration
        : sequence.actions[after].at;
  if (!Number.isFinite(checkpoint.at) || Math.abs(checkpoint.at - at) > 1e-8)
    fail('The reference-check checkpoint time does not match its action.');
}

function advanceToCheckpoint(playback, checkpoint, maxSteps) {
  if (!checkpoint || checkpoint.after === playback.sequence.actions.length)
    return advancePlayback(playback, playback.sequence.duration, { maxSteps });
  let steps = 0;
  // Step by action to distinguish consecutive changes sharing exactly the same timestamp.
  while (playback.cursor <= checkpoint.after && steps < maxSteps)
    steps += stepPlayback(playback, { maxSteps: maxSteps - steps }).steps;
  return { steps };
}

export async function run(sequence, project, { signal, checkpoint } = {}) {
  abortIfNeeded(signal);
  const playback = createPlayback(sequence, { project });
  checkCheckpoint(playback.sequence, checkpoint);
  const complexity = Math.max(1, project.nodes.length + project.wires.length);
  const workBudget = Math.min(250_000, Math.floor(20_000_000 / complexity));
  const chunk = Math.max(1, Math.min(250, Math.floor(20_000 / complexity)));
  let operations = 0;
  const reached = () =>
    checkpoint && checkpoint.after < playback.sequence.actions.length
      ? playback.cursor > checkpoint.after
      : playback.done;
  while (!reached()) {
    abortIfNeeded(signal);
    operations += advanceToCheckpoint(playback, checkpoint, chunk).steps;
    if (operations > workBudget)
      fail('Replay exceeds the supported work budget. Shorten the sequence.');
    if (!reached()) await yieldToMain(signal);
  }
  abortIfNeeded(signal);
  return playback;
}

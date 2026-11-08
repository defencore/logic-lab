import { createPlayback, advancePlayback, stepPlayback } from '../experiments/actions.js';
import { fail, abortIfNeeded } from './schema.js';
import { yieldToMain } from './scheduling.js';
import {
  assertReplayWork,
  rememberReplayWork,
  ReplayWorkLimitError,
} from '../experiments/replay-work-policy.js';

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
  const checked =
    checkpoint && checkpoint.after < playback.sequence.actions.length
      ? {
          ...playback.sequence,
          duration: checkpoint.at,
          actions: playback.sequence.actions.slice(0, checkpoint.after + 1),
        }
      : playback.sequence;
  const work = assertReplayWork(checked, playback.project);
  const { stepBudget: workBudget, chunk } = work;
  let operations = 1;
  const reached = () =>
    checkpoint && checkpoint.after < playback.sequence.actions.length
      ? playback.cursor > checkpoint.after
      : playback.done;
  const exceeded = () => {
    const failure = {
      ...work,
      supported: false,
      verified: true,
      maxDuration: Math.max(0, Math.floor((playback.runtime.time - 1e-8) * 1000) / 1000),
      estimatedSteps: operations + 1,
    };
    if (
      work.requiresVerification &&
      (!checkpoint || checkpoint.after === playback.sequence.actions.length)
    )
      rememberReplayWork(playback.sequence, playback.project, {
        steps: operations + 1,
        supported: false,
        maxDuration: failure.maxDuration,
      });
    throw new ReplayWorkLimitError(failure);
  };
  while (!reached()) {
    abortIfNeeded(signal);
    if (operations >= workBudget) exceeded();
    operations += advanceToCheckpoint(
      playback,
      checkpoint,
      Math.min(chunk, workBudget - operations),
    ).steps;
    if (!reached() && operations >= workBudget) exceeded();
    if (!reached()) await yieldToMain(signal);
  }
  abortIfNeeded(signal);
  if (work.requiresVerification && playback.done)
    rememberReplayWork(playback.sequence, playback.project, { steps: operations, supported: true });
  return playback;
}

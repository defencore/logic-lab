import { createPlayback, advancePlayback } from '../experiments/actions.js';
import { yieldToMain } from '../assessment/scheduling.js';

export async function inspectReference(key) {
  const playback = createPlayback(
    { ...key.sequence, probes: key.probes },
    { project: key.referenceProject },
  );
  const complexity = Math.max(
    1,
    key.referenceProject.nodes.length + key.referenceProject.wires.length,
  );
  const budget = Math.min(250000, Math.floor(20000000 / complexity));
  const chunk = Math.max(1, Math.min(250, Math.floor(20000 / complexity)));
  let operations = 0;
  while (!playback.done) {
    operations += advancePlayback(playback, key.sequence.duration, { maxSteps: chunk }).steps;
    if (operations > budget)
      throw new Error('The reference scenario is too complex. Shorten its duration.');
    if (!playback.done) await yieldToMain();
  }
  return {
    constant: key.probes.every(
      (probe, index) =>
        new Set(playback.observations.map((observation) => observation.values[index])).size < 2,
    ),
    undefined: playback.observations.some((observation) =>
      observation.values.some((value) => value === 'X' || value === 'Z'),
    ),
  };
}

import { run } from '../assessment/replay.js';

export async function inspectReference(key) {
  const playback = await run({ ...key.sequence, probes: key.probes }, key.referenceProject);
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

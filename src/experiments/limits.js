export const SEQUENCE_LIMITS = Object.freeze({
  actions: 2000,
  duration: 120,
  probes: 32,
  nodes: 200,
  bytes: 10_000_000,
});

export const REPLAY_LIMITS = Object.freeze({ steps: 250_000, work: 20_000_000, chunkWork: 20_000 });

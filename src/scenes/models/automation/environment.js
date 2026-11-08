export function environment(state, p) {
  const phase = (state.time % p.dayLength) / p.dayLength;
  return {
    day: phase < 0.5,
    motion: (phase > 0.12 && phase < 0.22) || (phase > 0.66 && phase < 0.78),
    rain: phase > 0.35 && phase < 0.48,
  };
}

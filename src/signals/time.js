export const SIMULATION_RATES = [0.001, 0.01, 0.1, 0.25, 0.5, 1, 2, 5, 10];
export const TIME_WINDOWS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];

// Wall-clock stalls must not jump over an unbounded span of simulated time.
export function frameSimulationDelta(now, previous, rate) {
  if (!SIMULATION_RATES.includes(rate)) throw new Error('Invalid simulation rate.');
  const milliseconds = previous === null ? 16 : Math.max(0, now - previous);
  return (Math.min(50, milliseconds) / 1000) * rate;
}

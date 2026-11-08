import { maximumTraceWindow } from '../simulation/timing.js';
import { TIME_WINDOWS } from './time.js';

export function samplingAdvice(project, runtime, timeWindow) {
  const maximum = maximumTraceWindow(project, runtime);
  const target =
    TIME_WINDOWS.filter((value) => value <= maximum * (1 + 1e-10)).at(-1) ?? TIME_WINDOWS[0];
  return { adequate: timeWindow <= maximum * (1 + 1e-10), target };
}

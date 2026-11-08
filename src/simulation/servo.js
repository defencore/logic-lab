const CHANNELS = 4;
const unknown = (value) => value !== 0 && value !== 1;
const tracker = () => ({ previous: 'X', rise: null, lastPulse: null, angle: 'X' });

export function servoParameterError(parameters) {
  const { minPulse, centerPulse, maxPulse, range, signalTimeout } = parameters;
  if (
    ![minPulse, centerPulse, maxPulse, range, signalTimeout].every(Number.isFinite) ||
    !(minPulse > 0 && minPulse < centerPulse && centerPulse < maxPulse) ||
    !(range > 0 && signalTimeout > maxPulse / 1_000_000)
  )
    return 'Servo requires 0 < minimum pulse < center pulse < maximum pulse, positive travel, and a signal timeout longer than its maximum pulse.';
  return null;
}

export function initialServoState() {
  return {
    angles: Array(CHANNELS).fill('X'),
    servoPulses: Array.from({ length: CHANNELS }, tracker),
  };
}

/** Decode completed high pulses; a fraction without a real pulse is not a position command. */
export function advanceServo(state, inputs, parameters, time) {
  const invalid = servoParameterError(parameters);
  const pulses = state.servoPulses.map((previous, index) => {
    const level = inputs[`s${index + 1}`];
    if (invalid || unknown(level)) return tracker();
    const next = { ...previous };
    if (level === 1 && previous.previous === 0) next.rise = time;
    if (level === 0 && previous.previous === 1) {
      if (next.rise !== null) {
        const width = (time - next.rise) * 1_000_000;
        const tolerance = 0.0001;
        if (width >= parameters.minPulse - tolerance && width <= parameters.maxPulse + tolerance) {
          const bounded = Math.max(parameters.minPulse, Math.min(parameters.maxPulse, width));
          const fraction =
            bounded <= parameters.centerPulse
              ? (bounded - parameters.centerPulse) / (parameters.centerPulse - parameters.minPulse)
              : (bounded - parameters.centerPulse) / (parameters.maxPulse - parameters.centerPulse);
          next.angle = (fraction * parameters.range) / 2;
          next.lastPulse = time;
        } else {
          next.angle = 'X';
          next.lastPulse = null;
        }
      }
      next.rise = null;
    }
    if (
      (level === 1 &&
        next.rise !== null &&
        (time - next.rise) * 1_000_000 > parameters.maxPulse + 0.0001) ||
      next.lastPulse === null ||
      time - next.lastPulse > parameters.signalTimeout
    )
      next.angle = 'X';
    next.previous = level;
    return next;
  });
  return { ...state, servoPulses: pulses, angles: pulses.map((pulse) => pulse.angle) };
}

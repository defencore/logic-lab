const MAX_PENDING = 8192;
const COMPACT_AFTER = 4096;
const volume = (value) => (Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0);

/** Schedule the actual piecewise-constant input, never an inferred passive oscillator. */
export function createAudioVoice(context, destination, snapshot) {
  const passive = snapshot.type === 'passive_buzzer';
  const source = passive ? context.createConstantSource() : context.createOscillator();
  const gain = context.createGain();
  const filter = passive ? context.createBiquadFilter() : null;
  const baseline = snapshot.value === 1 ? 1 : 0;
  const parameters = { gain: gain.gain };
  let held = { gain: 0 },
    queue = [],
    automationCount = 0,
    watchdog = null;
  gain.gain.value = 0;
  if (passive) {
    source.offset.value = 0;
    filter.type = 'highpass';
    filter.frequency.value = 35;
    filter.Q.value = Math.SQRT1_2;
    parameters.offset = source.offset;
    held.offset = 0;
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.type = 'square';
    source.frequency.value = 880;
    parameters.frequency = source.frequency;
    held.frequency = 880;
    source.connect(gain);
  }
  gain.connect(destination);
  source.start();
  function write(command) {
    for (const [key, value] of Object.entries(command.values)) {
      parameters[key].setValueAtTime(value, command.at);
      automationCount++;
    }
  }
  function schedule(event, at) {
    if (queue.length >= MAX_PENDING) return false;
    const known = event.value === 0 || event.value === 1;
    const values = passive
      ? { gain: known ? volume(event.volume) : 0, offset: known ? event.value - baseline : 0 }
      : {
          gain:
            event.value === 1 && event.frequency >= 20 && event.frequency <= 20_000
              ? volume(event.volume)
              : 0,
          frequency:
            Number.isFinite(event.frequency) && event.frequency >= 20 && event.frequency <= 20_000
              ? event.frequency
              : 880,
        };
    const command = { at, values };
    queue.push(command);
    write(command);
    return true;
  }
  function prepare(now) {
    if (watchdog !== null) gain.gain.cancelScheduledValues(watchdog);
    watchdog = null;
    let consumed = 0;
    while (consumed < queue.length && queue[consumed].at <= now) {
      held = { ...held, ...queue[consumed].values };
      consumed++;
    }
    if (consumed) queue.splice(0, consumed);
    // Bound browser AudioParam history as well as our own pending-event queue.
    if (automationCount >= COMPACT_AFTER) {
      for (const parameter of Object.values(parameters)) parameter.cancelScheduledValues(0);
      automationCount = 0;
      write({ at: now, values: held });
      queue.forEach(write);
    }
  }
  function armWatchdog(at) {
    gain.gain.setValueAtTime(0, at);
    watchdog = at;
    automationCount++;
  }
  function dispose() {
    for (const parameter of Object.values(parameters)) parameter.cancelScheduledValues(0);
    gain.gain.value = 0;
    try {
      source.stop();
    } catch {}
    source.disconnect();
    filter?.disconnect();
    gain.disconnect();
    queue = [];
  }
  return { type: snapshot.type, schedule, prepare, armWatchdog, dispose };
}

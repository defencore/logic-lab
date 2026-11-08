export const MAX_RECORDING_SAMPLES = 100_000;

export function createRecording({
  name = 'Waveforms',
  traces,
  startedAt = 0,
  sampleInterval,
  maxSamples = MAX_RECORDING_SAMPLES,
}) {
  if (!Number.isFinite(startedAt) || startedAt < 0)
    throw new RangeError('The recording start must be a nonnegative simulation time.');
  if (!Number.isFinite(sampleInterval) || sampleInterval <= 0)
    throw new RangeError('The recording sample interval must be positive.');
  if (!Number.isInteger(maxSamples) || maxSamples < 1 || maxSamples > MAX_RECORDING_SAMPLES)
    throw new RangeError(`A recording can contain at most ${MAX_RECORDING_SAMPLES} samples.`);
  if (!Array.isArray(traces) || !traces.length)
    throw new TypeError('Select at least one signal to record.');
  const ids = new Set();
  const columns = traces.map((trace) => {
    if (typeof trace?.id !== 'string' || !trace.id || ids.has(trace.id))
      throw new TypeError('Recorded signals must have unique nonempty IDs.');
    ids.add(trace.id);
    return Object.freeze({ ...trace, label: String(trace.label || trace.id) });
  });
  return {
    name: String(name),
    traces: Object.freeze(columns),
    startedAt,
    sampleInterval,
    nextSampleAt: 0,
    maxSamples,
    samples: [],
    active: true,
    limitReached: false,
  };
}

const recordedValue = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : value === undefined || value === 'Z'
      ? 'Z'
      : 'X';

/** Record simulation time, independent of display frames and playback speed. */
export function appendRecording(recording, time, values, { force = false } = {}) {
  if (!recording.active) return false;
  if (!Number.isFinite(time)) throw new RangeError('A sample needs a finite simulation time.');
  if (!Array.isArray(values)) throw new TypeError('Sample values must be an array.');
  const relativeTime = time - recording.startedAt;
  if (relativeTime < 0) return false;
  const previous = recording.samples.at(-1);
  if (previous && relativeTime <= previous.time) return false;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(time)) * 8;
  if (!force && relativeTime + tolerance < recording.nextSampleAt) return false;
  recording.samples.push(
    Object.freeze({
      time: relativeTime,
      values: Object.freeze(recording.traces.map((_, index) => recordedValue(values[index]))),
    }),
  );
  // Keep deadlines anchored to the session start instead of accumulating step
  // overshoot. Coarse physics steps skip deadlines without inventing samples.
  if (relativeTime + tolerance >= recording.nextSampleAt)
    recording.nextSampleAt =
      (Math.floor((relativeTime + tolerance) / recording.sampleInterval) + 1) *
      recording.sampleInterval;
  if (recording.samples.length >= recording.maxSamples) {
    recording.limitReached = true;
    recording.active = false;
  }
  return true;
}

export function stopRecording(recording) {
  recording.active = false;
  return recording;
}

function csvHeader(value) {
  let text = String(value);
  if (/^\s*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** UTF-8 BOM helps spreadsheet applications recognize Ukrainian signal labels. */
export function recordingCsv(recording) {
  const header = [
    'time_s',
    ...recording.traces.map((trace) => csvHeader(`${trace.label} [${trace.id}]`)),
  ].join(',');
  const rows = recording.samples.map((sample) => [sample.time, ...sample.values].join(','));
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}

import { getDefinition } from '../components/catalog/index.js';

export const AUDIO_EVENT_CAPACITY = 32768;
const TRIM_BATCH = AUDIO_EVENT_CAPACITY / 4;
const binary = (value) => value === 0 || value === 1;
export const isAudioType = (type) => type === 'active_buzzer' || type === 'passive_buzzer';

export function createAudioRuntime() {
  return { audio: Object.create(null), audioEvents: [], audioSerial: 0 };
}

export function audioParameterError(type, parameters) {
  if (!isAudioType(type)) return null;
  if (!Number.isFinite(parameters.volume) || parameters.volume < 0 || parameters.volume > 1)
    return 'Volume must be a finite number between 0 and 1.';
  if (
    type === 'active_buzzer' &&
    (!Number.isFinite(parameters.frequency) ||
      parameters.frequency < 20 ||
      parameters.frequency > 20000)
  )
    return 'Active buzzer frequency must be between 20 and 20000 Hz.';
  return null;
}

function append(runtime, id, state, value = state.value) {
  if (runtime.audioEvents.length >= AUDIO_EVENT_CAPACITY) runtime.audioEvents.splice(0, TRIM_BATCH);
  runtime.audioEvents.push({
    serial: ++runtime.audioSerial,
    node: id,
    type: state.type,
    at: runtime.time,
    value,
    frequency: state.frequency,
    volume: state.volume,
  });
}

function clearPeriod(state) {
  state.period = null;
  state.measuredFrequency = null;
  state.lastRiseAt = null;
  state.lastFallAt = null;
}

function passiveTiming(state, previous, at) {
  if (!previous || !binary(state.value) || !binary(previous.value)) {
    clearPeriod(state);
    return;
  }
  if (
    state.period !== null &&
    state.lastEdgeAt !== null &&
    at - state.lastEdgeAt > Math.max(3 * state.period, 0.1)
  )
    clearPeriod(state);
  if (state.value === previous.value) return;
  const same = state.value === 1 ? 'lastRiseAt' : 'lastFallAt';
  const opposite = state.value === 1 ? 'lastFallAt' : 'lastRiseAt';
  const before = state[same];
  // A complete observed cycle needs both polarities with nonzero duration.
  if (before !== null && state[opposite] > before && state[opposite] < at) {
    state.period = at - before;
    state.measuredFrequency = 1 / state.period;
  } else if (at === before) {
    clearPeriod(state);
  }
  state[same] = at;
  state.lastEdgeAt = at;
}

/** Record resolved digital levels, never combinational settling intermediates or display samples. */
export function captureAudio(project, runtime, { settled = true } = {}) {
  const live = new Set();
  for (const node of project.nodes) {
    if (!isAudioType(node.type)) continue;
    live.add(node.id);
    let previous = runtime.audio[node.id];
    if (previous && previous.type !== node.type) {
      append(runtime, node.id, previous, null);
      previous = null;
    }
    const parameters = { ...getDefinition(node.type).defaults, ...node.params };
    const parameterError = audioParameterError(node.type, parameters);
    const input = runtime.signals.inputs[node.id]?.in;
    const inputValid = settled && binary(input);
    const enabled = node.enabled !== false;
    const value = enabled && inputValid && !parameterError ? input : null;
    const state = {
      type: node.type,
      value,
      input,
      inputValid,
      enabled,
      parametersValid: !parameterError,
      frequency:
        node.type === 'active_buzzer' &&
        Number.isFinite(parameters.frequency) &&
        parameters.frequency >= 20 &&
        parameters.frequency <= 20000
          ? parameters.frequency
          : null,
      volume:
        Number.isFinite(parameters.volume) && parameters.volume >= 0 && parameters.volume <= 1
          ? parameters.volume
          : 0,
      parameters,
      period: previous?.period ?? null,
      measuredFrequency: previous?.measuredFrequency ?? null,
      lastEdgeAt: previous?.lastEdgeAt ?? null,
      lastRiseAt: previous?.lastRiseAt ?? null,
      lastFallAt: previous?.lastFallAt ?? null,
    };
    if (node.type === 'passive_buzzer') passiveTiming(state, previous, runtime.time);
    else if (previous && value !== previous.value) state.lastEdgeAt = runtime.time;
    if (value === null) {
      clearPeriod(state);
      state.lastEdgeAt = null;
    }
    const configurationChanged =
      previous &&
      (!Object.is(previous.parameters.frequency, parameters.frequency) ||
        !Object.is(previous.parameters.volume, parameters.volume));
    if (!previous || previous.value !== value || configurationChanged)
      append(runtime, node.id, state);
    runtime.audio[node.id] = state;
    if (enabled && parameterError)
      runtime.diagnostics.push({
        level: 'error',
        code: 'invalid_audio',
        node: node.id,
        message: `${node.label || getDefinition(node.type).label}: ${parameterError}`,
      });
  }
  for (const [id, state] of Object.entries(runtime.audio)) {
    if (live.has(id)) continue;
    append(runtime, id, state, null);
    delete runtime.audio[id];
  }
}

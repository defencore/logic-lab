import { createAudioVoice } from './voice.js';
import { captureAudioAnchor, matchesAudioAnchor } from './timeline.js';

const LOOKAHEAD = 0.1;
const WATCHDOG = 0.02;
const MAX_BUFFER = 0.35;
const MAX_VOICES = 16;
const TYPES = new Set(['active_buzzer', 'passive_buzzer']);

/** Explicit user consent owns the context; simulation sync only consumes settled audio events. */
export function createAudioEngine({ AudioContext = globalThis.AudioContext } = {}) {
  let context = null,
    master = null,
    limiter = null,
    enabled = false,
    disposed = false;
  let timeline = null,
    resumePending = null,
    generation = 0,
    error = null,
    stalledAt = null;
  let wantedRunning = false;
  let skippedVoices = 0;
  let pendingAnchor = null,
    draining = null;
  let lastSerial = 0,
    scheduledEvents = 0,
    lastScheduledAt = null,
    timelineResets = 0,
    underruns = 0;
  const voices = new Map();
  function clear() {
    for (const voice of voices.values()) voice.dispose();
    voices.clear();
    timeline = null;
  }
  function silence() {
    clear();
    if (master) master.gain.value = 0;
  }
  function makeContext() {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    limiter = context.createWaveShaper();
    limiter.curve = Float32Array.from(
      { length: 1025 },
      (_, index) => Math.tanh((index / 512 - 1) * 1.5) * 0.8,
    );
    master.connect(limiter);
    limiter.connect(context.destination);
  }
  async function enable() {
    if (disposed || !AudioContext) {
      error = 'unsupported';
      return false;
    }
    const intent = ++generation;
    enabled = true;
    wantedRunning = true;
    error = null;
    try {
      if (!context || context.state === 'closed') makeContext();
      await context.resume();
      if (intent !== generation || !enabled || disposed) {
        if ((!enabled || disposed || !wantedRunning) && context.state === 'running')
          context.suspend().catch(() => {});
        return false;
      }
      if (wantedRunning && context.state !== 'running')
        throw new Error('Audio context is suspended.');
      if (!wantedRunning && context.state === 'running') context.suspend().catch(() => {});
      stalledAt = null;
      return true;
    } catch {
      if (intent === generation) {
        enabled = false;
        error = 'blocked';
        silence();
      }
      return false;
    }
  }
  function suspend() {
    wantedRunning = false;
    pendingAnchor = null;
    draining = null;
    silence();
    if (context?.state === 'running') context.suspend().catch(() => {});
  }
  function disable() {
    generation++;
    enabled = false;
    stalledAt = null;
    suspend();
  }
  function resumeForSync() {
    if (resumePending) return;
    const intent = generation;
    resumePending = context
      .resume()
      .then(() => {
        if (!enabled || disposed || intent !== generation || !wantedRunning) {
          if (context.state === 'running') context.suspend().catch(() => {});
        } else if (context.state !== 'running') {
          enabled = false;
          error = 'blocked';
          silence();
        }
      })
      .catch(() => {
        if (intent === generation) {
          enabled = false;
          error = 'blocked';
          silence();
        }
      })
      .finally(() => {
        resumePending = null;
      });
  }
  function allowedNodes(project) {
    const eligible = project.nodes.filter((node) => TYPES.has(node.type) && node.enabled !== false);
    skippedVoices = Math.max(0, eligible.length - MAX_VOICES);
    return eligible.slice(0, MAX_VOICES);
  }
  function ensureVoice(node, snapshot) {
    if (!snapshot || snapshot.type !== node.type) return null;
    let voice = voices.get(node.id);
    if (!voice && (snapshot.value === 0 || snapshot.value === 1)) {
      voice = createAudioVoice(context, master, snapshot);
      voices.set(node.id, voice);
    }
    return voice;
  }
  function reset(project, runtime, rate, anchor = captureAudioAnchor(runtime, rate)) {
    clear();
    draining = null;
    timelineResets++;
    const at = context.currentTime + LOOKAHEAD;
    timeline = { runtime, rate, base: at - anchor.time / rate, time: anchor.time };
    lastSerial = anchor.serial;
    lastScheduledAt = null;
    for (const node of allowedNodes(project)) {
      const snapshot = anchor.audio[node.id];
      const voice = ensureVoice(node, snapshot);
      if (voice) {
        voice.schedule(snapshot, at);
        voice.armWatchdog(at + WATCHDOG);
      }
    }
    master.gain.value = 0.25;
  }
  function sync({ project, runtime, running, completed = false, rate = 1 }) {
    const allowed = allowedNodes(project);
    if (!enabled || !context || disposed) return;
    if (
      (!running && !completed) ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(runtime?.time)
    ) {
      suspend();
      stalledAt = null;
      return;
    }
    const pendingMatches = matchesAudioAnchor(pendingAnchor, runtime, rate);
    if (completed && timeline?.runtime !== runtime && !pendingMatches) {
      suspend();
      return;
    }
    if (completed && draining?.runtime === runtime) {
      if (context.currentTime >= draining.until) suspend();
      return;
    }
    if (!completed) draining = null;
    wantedRunning = true;
    if (context.state !== 'running') {
      if (!pendingMatches) pendingAnchor = captureAudioAnchor(runtime, rate);
      clear();
      try {
        resumeForSync();
      } catch {
        enabled = false;
        error = 'audio_failed';
        suspend();
      }
      return;
    }
    if (stalledAt !== null && runtime.time <= stalledAt) return;
    stalledAt = null;
    try {
      const serial = runtime.audioSerial || 0;
      if (
        !timeline ||
        timeline.runtime !== runtime ||
        timeline.rate !== rate ||
        runtime.time < timeline.time ||
        serial < lastSerial
      ) {
        const anchor = pendingMatches ? pendingAnchor : captureAudioAnchor(runtime, rate);
        pendingAnchor = null;
        reset(project, runtime, rate, anchor);
      }
      const currentAt = timeline.base + runtime.time / rate;
      if (currentAt < context.currentTime + 0.002) {
        underruns++;
        silence();
        stalledAt = runtime.time;
        return;
      }
      if (currentAt > context.currentTime + MAX_BUFFER) {
        reset(project, runtime, rate);
        return;
      }
      const pending = (runtime.audioEvents || []).filter((event) => event.serial > lastSerial);
      if (
        (pending.length && pending[0].serial !== lastSerial + 1) ||
        (!pending.length && serial > lastSerial)
      ) {
        underruns++;
        reset(project, runtime, rate);
        return;
      }
      const nodes = new Map(allowed.map((node) => [node.id, node]));
      for (const [id, voice] of voices) {
        if (!nodes.has(id) || nodes.get(id).type !== voice.type) {
          voice.dispose();
          voices.delete(id);
        } else voice.prepare(context.currentTime);
      }
      for (const event of pending) {
        lastSerial = event.serial;
        const node = nodes.get(event.node);
        if (
          !node ||
          node.type !== event.type ||
          !Number.isFinite(event.at) ||
          event.at > runtime.time
        )
          continue;
        const snapshot = runtime.audio?.[node.id];
        const voice = ensureVoice(
          node,
          snapshot && (snapshot.value === 0 || snapshot.value === 1) ? snapshot : event,
        );
        if (!voice) continue;
        const at = timeline.base + event.at / rate;
        if (at < context.currentTime || !voice.schedule(event, at)) {
          underruns++;
          reset(project, runtime, rate);
          return;
        }
        scheduledEvents++;
        lastScheduledAt = at;
      }
      for (const node of nodes.values()) {
        if (!voices.has(node.id)) {
          const snapshot = runtime.audio?.[node.id];
          ensureVoice(node, snapshot)?.schedule(snapshot, currentAt);
        }
      }
      for (const voice of voices.values())
        voice.armWatchdog(currentAt + (completed ? 0 : WATCHDOG));
      timeline.time = runtime.time;
      if (completed) draining = { runtime, until: currentAt + 0.005 };
    } catch {
      enabled = false;
      error = 'audio_failed';
      suspend();
    }
  }
  function dispose() {
    disable();
    disposed = true;
    skippedVoices = 0;
    master?.disconnect();
    limiter?.disconnect();
    if (context && context.state !== 'closed') context.close().catch(() => {});
  }
  function status() {
    return {
      enabled,
      available: !!AudioContext && !disposed,
      contextState: context?.state || 'uninitialized',
      contextRunning: context?.state === 'running',
      voices: voices.size,
      skippedVoices,
      draining: !!draining,
      lastSerial,
      scheduledEvents,
      lastScheduledAt,
      timelineResets,
      underruns,
      error,
    };
  }
  return { enable, disable, sync, suspend, dispose, status };
}

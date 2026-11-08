/** Preserve the transport boundary while AudioContext.resume() is asynchronous. */
export function captureAudioAnchor(runtime, rate) {
  return {
    runtime,
    rate,
    time: runtime.time,
    serial: runtime.audioSerial || 0,
    audio: Object.fromEntries(
      Object.entries(runtime.audio || {}).map(([id, snapshot]) => [
        id,
        {
          type: snapshot.type,
          value: snapshot.value,
          frequency: snapshot.frequency,
          volume: snapshot.volume,
        },
      ]),
    ),
  };
}

export function matchesAudioAnchor(anchor, runtime, rate) {
  return (
    !!anchor &&
    anchor.runtime === runtime &&
    anchor.rate === rate &&
    runtime.time >= anchor.time &&
    (runtime.audioSerial || 0) >= anchor.serial
  );
}

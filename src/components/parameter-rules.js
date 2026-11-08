const bounds = {
  carSpeed: [1, 40, 0.5],
  arrivalInterval: [1, 60, 0.5],
  initialCars: [0, 8, 1],
  speedLimit: [1, 255, 1],
  initialA: [-500, -20, 1],
  initialB: [-500, -20, 1],
  hopperCapacity: [1, 100000, 1],
  bowlCapacity: [1, 10000, 1],
  initialHopper: [0, 100000, 1],
  initialLevel: [0, 10000, 1],
  dispenseRate: [0.1, 10000, 0.1],
  eatRate: [0, 1000, 0.1],
  hungryThreshold: [0, 10000, 1],
  fullThreshold: [0, 10000, 1],
  alarmThreshold: [0, 10000, 1],
  portionSize: [1, 10000, 1],
  capacity: [1, 100000, 1],
  pumpRate: [0.1, 10000, 0.1],
  drainRate: [0, 10000, 0.1],
  lowThreshold: [0, 100, 1],
  highThreshold: [0, 100, 1],
  initialTemperature: [-20, 80, 0.5],
  ambientTemperature: [-20, 50, 0.5],
  initialOxygen: [0, 100, 1],
  initialFood: [0, 100, 1],
  initialCleanliness: [0, 100, 1],
  fishCount: [1, 8, 1],
  dayLength: [10, 3600, 1],
  initialMoisture: [0, 100, 1],
  initialWater: [0, 100, 1],
  duty: [0, 1, 0.01],
  depth: [0, 1, 0.01],
  minPulse: [100, 3000, 1],
  centerPulse: [100, 3000, 1],
  maxPulse: [100, 3000, 1],
  signalTimeout: [0.02, 10, 0.01],
  amplitude: [0, 1000, 0.1],
  range: [0, 1000, 0.1],
  low: [-1000, 1000, 0.1],
  high: [-1000, 1000, 0.1],
  stepsPerRevolution: [1, 10000, 1],
  microsteps: [1, 256, 1],
  lead: [0.001, 1000, 0.1],
  min: [-1000000, 1000000, 0.1],
  max: [-1000000, 1000000, 0.1],
  threshold: [-1000000, 1000000, 0.1],
  tolerance: [0, 1000000, 0.1],
  frequency: [0, 1000, 0.1],
  volume: [0, 1, 0.01],
  carrier: [0, 1000, 0.1],
  duration: [0.0005, 1000, 0.01],
  width: [100, 3000, 20],
  height: [100, 3000, 20],
  vcc: [0.01, 1000, 0.1],
};
const integerKeys = new Set([
  'initialCars',
  'fishCount',
  'stepsPerRevolution',
  'microsteps',
  'minPulse',
  'centerPulse',
  'maxPulse',
]);
const bitInitial = new Set(['d_ff', 'jk_ff', 't_ff', 'sr_latch', 'schmitt']);
const byteInitial = new Set(['register', 'shift_register', 'counter']);

/** Numeric meaning comes from the parameter, never from its current value. */
export function parameterRule(type, key) {
  let limits = bounds[key];
  let integer = integerKeys.has(key);
  if (key === 'frequency' && type === 'active_buzzer') limits = [20, 20000, 1];
  if (key === 'value' && ['switch', 'hotkey', 'bus_input'].includes(type)) {
    limits = [0, type === 'bus_input' ? 255 : 1, 1];
    integer = true;
  }
  if (key === 'initial' && (bitInitial.has(type) || byteInitial.has(type))) {
    limits = [0, bitInitial.has(type) ? 1 : 255, 1];
    integer = true;
  }
  if (key === 'initialLevel' && type === 'water_tank') limits = [0, 100, 1];
  return { min: limits?.[0], max: limits?.[1], step: limits?.[2] ?? 'any', integer };
}

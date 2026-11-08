import { finite as numeric, clamp, positive } from '../../common/numbers.js';

export function advanceFeeder(state, c, p, dt) {
  const capacity = positive(p.bowlCapacity, 100);
  const dispenseRate = c.dispense === 1 ? Math.max(0, numeric(p.dispenseRate, 25)) : 0;
  const eatingRate = Math.max(0, numeric(p.eatRate, 4));
  const feedingTime = dispenseRate > 0 ? Math.min(dt, state.hopper / dispenseRate) : 0;
  const dispensed = dispenseRate * feedingTime;
  state.hopper = Math.max(0, state.hopper - dispensed);
  let eaten = 0;
  for (const [duration, incomingRate] of [
    [feedingTime, dispenseRate],
    [dt - feedingTime, 0],
  ]) {
    if (duration <= 0) continue;
    const before = state.bowl;
    const consumed = Math.min(eatingRate * duration, before + incomingRate * duration);
    const rawLevel = before + incomingRate * duration - consumed;
    const spill = Math.max(0, rawLevel - capacity);
    state.bowl = clamp(rawLevel, 0, capacity);
    state.spilled += spill;
    eaten += consumed;
    if (Math.max(before, state.bowl) > numeric(p.alarmThreshold, 90)) {
      state.alarm = true;
      state.failure ||= 'overfed';
    }
    if (spill > 0) {
      state.alarm = true;
      state.failure ||= 'spill';
    }
  }
  state.eaten += eaten;
  state.fed = Math.floor((state.eaten + 1e-9) / positive(p.portionSize, 40));
  state.dispensing = c.dispense === 1 && state.hopper > 1e-9;
  state.animal = {
    phase: state.time % 1,
    eating: state.bowl > 1e-9 || state.dispensing,
    hungry: state.bowl <= numeric(p.hungryThreshold, 20),
  };
}

export function advanceTank(state, c, p, dt) {
  const capacity = positive(p.capacity, 100);
  const input = c.pump === 1 ? Math.max(0, numeric(p.pumpRate, 12)) : 0;
  const output = c.drain === 1 ? Math.max(0, numeric(p.drainRate, 4)) : 0;
  const volume = (state.level / 100) * capacity + (input - output) * dt;
  const spill = Math.max(0, volume - capacity);
  state.spilled += spill;
  state.level = clamp((volume / capacity) * 100, 0, 100);
  state.overflow ||= spill > 1e-10;
  if (state.overflow) state.failure = 'overflow';
  state.pumping = input > 0;
  state.draining = output > 0 && state.level > 0;
}

import {
  JUNCTION,
  RAILWAY,
  crossingClear,
  trainAtEntryTurnout,
  trainAtExitTurnout,
  trainInTurnout,
  trainCollisionBody,
  carCollisionBody,
} from '../../transport/geometry.js';
import { finite as numeric } from '../../common/numbers.js';
import { collisionFraction, stopAtContact } from './collision.js';

export function railFault(state, reason) {
  if (!state.faults.includes(reason)) state.faults.push(reason);
  state.fault = true;
  if (!state.failure) state.failure = reason;
}

export function advanceRailway(state, c, p, dt) {
  const speedLimit = Math.max(0, numeric(p.speedLimit, 60));
  state.roadCars ??= [];
  const old = new Map(
    [...state.trains, ...state.roadCars].map((vehicle) => [vehicle, vehicle.position]),
  );
  // A closing request stops new entrants immediately, while cars already inside clear.
  for (const direction of [1, -1]) {
    const lane = state.roadCars
      .filter((car) => car.direction === direction)
      .sort((a, b) => b.position - a.position);
    let ahead = Infinity;
    for (const car of lane) {
      if (car.crashed) {
        car.speed = 0;
        car.stopped = true;
        ahead = car.position;
        continue;
      }
      const stop =
        (c.barrier === 1 || state.barrier > 1e-9) && car.position <= RAILWAY.roadStopPosition + 1e-9
          ? RAILWAY.roadStopPosition
          : Infinity;
      const before = car.position;
      car.position = Math.max(
        before,
        Math.min(before + RAILWAY.roadSpeed * dt, stop, ahead - JUNCTION.queueHeadway),
      );
      car.stopped = car.position - before < 1e-10;
      car.speed = car.stopped ? 0 : RAILWAY.roadSpeed;
      ahead = car.position;
    }
  }
  state.barrierTarget = c.barrier;
  if (c.barrier === 0) state.barrier = Math.max(0, state.barrier - RAILWAY.barrierRate * dt);
  else if (crossingClear(state.roadCars))
    state.barrier = Math.min(1, state.barrier + RAILWAY.barrierRate * dt);
  for (const train of state.trains) {
    if (train.crashed || train.derailed) {
      train.speed = 0;
      train.stopped = true;
      continue;
    }
    const old = train.position;
    const stop =
      c[`signal_${train.track}`] === 0 && old <= RAILWAY.stopPosition + 1e-9
        ? RAILWAY.stopPosition
        : Infinity;
    train.position = Math.min(old + (c.throttle / 3.6) * dt, stop);
    train.speed = train.position - old > 1e-10 ? c.throttle : 0;
    train.stopped = train.speed === 0;
    const entryPoints = train.track === 'a' ? state.points : state.exitPoints;
    if (entryPoints !== Number(train.track === 'b') && trainAtEntryTurnout(train)) {
      railFault(state, 'wrong_route');
      train.derailed = true;
      train.speed = 0;
      train.stopped = true;
    }
    if (train.exitRoute === undefined && trainAtExitTurnout(train))
      train.exitRoute = train.track === 'a' ? state.exitPoints : state.points;
    if (train.speed > speedLimit) {
      railFault(state, 'overspeed');
      if (trainInTurnout(train)) {
        train.derailed = true;
        train.speed = 0;
        train.stopped = true;
      }
    }
  }
  const roadShape = (car) => carCollisionBody(car, 'railway');
  const contacts = [];
  for (let a = 0; a < state.trains.length; a++) {
    for (let b = a + 1; b < state.trains.length; b++) {
      if (state.trains[a].crashed && state.trains[b].crashed) continue;
      const fraction = collisionFraction(
        state.trains[a],
        state.trains[b],
        old,
        trainCollisionBody,
        trainCollisionBody,
      );
      if (fraction !== null)
        contacts.push({
          a: state.trains[a],
          b: state.trains[b],
          fraction,
          shapeA: trainCollisionBody,
          shapeB: trainCollisionBody,
          reason: 'collision',
        });
    }
    for (const car of state.roadCars) {
      if (state.trains[a].crashed && car.crashed) continue;
      const fraction = collisionFraction(state.trains[a], car, old, trainCollisionBody, roadShape);
      if (fraction !== null)
        contacts.push({
          a: state.trains[a],
          b: car,
          fraction,
          shapeA: trainCollisionBody,
          shapeB: roadShape,
          reason: 'open_barrier',
        });
    }
  }
  const impacted = new Set();
  for (const contact of contacts.sort((a, b) => a.fraction - b.fraction)) {
    if (impacted.has(contact.a) || impacted.has(contact.b)) continue;
    if (contact.a.crashed && contact.b.crashed) continue;
    railFault(state, contact.reason);
    const point = stopAtContact(
      contact.a,
      contact.b,
      old,
      contact.fraction,
      contact.shapeA,
      contact.shapeB,
    );
    state.collisionPoint ||= point;
    state.collisionPair ||= [contact.a.id, contact.b.id];
    impacted.add(contact.a);
    impacted.add(contact.b);
  }
  for (const train of state.trains)
    if (!train.crashed && !train.derailed && train.position > 95) {
      train.position = -110 + (train.position - 95);
      delete train.exitRoute;
      state.passed++;
    }
  for (const car of state.roadCars)
    if (!car.crashed && car.position > RAILWAY.roadExitPosition) {
      const lane = state.roadCars.filter(
        (other) => other !== car && other.direction === car.direction,
      );
      if (
        lane.every((other) => other.position >= RAILWAY.roadEntryPosition + JUNCTION.queueHeadway)
      ) {
        car.position =
          RAILWAY.roadEntryPosition +
          Math.min(car.position - RAILWAY.roadExitPosition, RAILWAY.roadSpeed * dt);
        state.roadPassed = (state.roadPassed || 0) + 1;
      } else {
        car.position = RAILWAY.roadExitPosition + 0.001;
        car.speed = 0;
        car.stopped = true;
      }
    }
}

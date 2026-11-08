import { JUNCTION, carCollisionBody } from '../../transport/geometry.js';
import { bodyContact } from '../../transport/shapes.js';
import { finite as numeric, positive } from '../../common/numbers.js';
import { collisionFraction } from './collision.js';

export function advanceTraffic(state, c, p, dt) {
  if (state.crash) return;
  const speed = Math.max(0, numeric(p.carSpeed, 12));
  const old = new Map(state.cars.map((car) => [car, car.position]));
  for (const axis of ['ns', 'ew']) {
    const green = c[`${axis}_green`] === 1 && c[`${axis}_yellow`] === 0;
    const lane = state.cars
      .filter((car) => car.axis === axis)
      .sort((a, b) => b.position - a.position);
    let ahead = Infinity;
    for (const car of lane) {
      const old = car.position;
      const stop = !green && old <= JUNCTION.stopPosition + 1e-9 ? JUNCTION.stopPosition : Infinity;
      car.position = Math.max(old, Math.min(old + speed * dt, stop, ahead - JUNCTION.queueHeadway));
      car.stopped = car.position - old < 1e-9;
      ahead = car.position;
    }
    state.spawn[axis] += dt;
    const interval = positive(p.arrivalInterval, 4);
    const arrivals = Math.floor((state.spawn[axis] + 1e-10) / interval);
    if (arrivals > 0) {
      state.spawn[axis] = Math.max(0, state.spawn[axis] - arrivals * interval);
      const tail = lane.at(-1)?.position ?? Infinity;
      if (lane.length < 12 && tail >= JUNCTION.spawnPosition + JUNCTION.queueHeadway) {
        const car = {
          id: `car-${state.nextId++}`,
          axis,
          position: JUNCTION.spawnPosition,
          stopped: false,
          crashed: false,
        };
        state.cars.push(car);
        lane.push(car);
      }
    }
  }
  let first = null;
  for (let a = 0; a < state.cars.length; a++)
    for (let b = a + 1; b < state.cars.length; b++) {
      const one = state.cars[a],
        two = state.cars[b];
      const fraction = collisionFraction(one, two, old, carCollisionBody, carCollisionBody);
      if (fraction !== null && (!first || fraction < first.fraction))
        first = { one, two, fraction };
    }
  if (first) {
    state.crash = true;
    state.failure = 'collision';
    for (const car of state.cars)
      if (old.has(car))
        car.position = old.get(car) + (car.position - old.get(car)) * first.fraction;
    first.one.crashed = true;
    first.two.crashed = true;
    state.collisionPoint = bodyContact(carCollisionBody(first.one), carCollisionBody(first.two));
    state.collisionPair = [first.one.id, first.two.id];
    for (const car of state.cars) car.stopped = true;
  }
  const departed = state.cars.filter((car) => car.position > JUNCTION.exitPosition);
  state.passed += departed.length;
  state.cars = state.cars.filter((car) => car.position <= JUNCTION.exitPosition);
}

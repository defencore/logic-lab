import { bodiesOverlap, bodyContact } from '../../transport/shapes.js';

export function collisionFraction(a, b, old, shapeA, shapeB) {
  const at = (vehicle, fraction) => ({
    ...vehicle,
    position:
      (old.get(vehicle) ?? vehicle.position) +
      (vehicle.position - (old.get(vehicle) ?? vehicle.position)) * fraction,
  });
  if (bodiesOverlap(shapeA(at(a, 0)), shapeB(at(b, 0)))) return 0;
  if (!bodiesOverlap(shapeA(a), shapeB(b))) return null;
  let low = 0,
    high = 1;
  for (let index = 0; index < 24; index++) {
    const middle = (low + high) / 2;
    if (bodiesOverlap(shapeA(at(a, middle)), shapeB(at(b, middle)))) high = middle;
    else low = middle;
  }
  return high;
}

export function stopAtContact(a, b, old, fraction, shapeA, shapeB) {
  for (const vehicle of [a, b]) {
    const start = old.get(vehicle) ?? vehicle.position;
    vehicle.position = start + (vehicle.position - start) * fraction;
    vehicle.crashed = true;
    vehicle.stopped = true;
    vehicle.speed = 0;
  }
  return bodyContact(shapeA(a), shapeB(b));
}

import { finite, active } from '../../common/numbers.js';
import { JUNCTION, junctionCarPose } from '../../transport/geometry.js';
import { buildCar, buildAftermath } from './transport-objects.js';
import { buildSignal } from './signals.js';

export function createTrafficJunction(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const asphalt = material(0x49525c),
    paint = material(0xf6f0d9);
  // Separate coplanar road arms avoid overlapping asphalt faces in the centre.
  mesh(root, box(2.7, 0.09, 14.2), asphalt, 0, 0.15).userData.role = 'junction-asphalt';
  for (const side of [-1, 1])
    mesh(root, box(5.75, 0.09, 2.7), asphalt, side * 4.225, 0.15).userData.role =
      'junction-asphalt';
  for (const side of [-1, 1])
    for (let p = 2.1; p < 6.4; p += 1.0) {
      mesh(root, box(0.06, 0.013, 0.45), paint, 0, 0.205, p * side);
      mesh(root, box(0.45, 0.013, 0.06), paint, p * side, 0.205, 0);
    }
  const zebraCenter = -JUNCTION.zebraNear - JUNCTION.zebraWidth / 2;
  for (const side of [-1, 1])
    for (let i = -3; i <= 3; i++) {
      mesh(root, box(0.23, 0.015, JUNCTION.zebraWidth), paint, i * 0.32, 0.207, zebraCenter * side);
      mesh(root, box(JUNCTION.zebraWidth, 0.015, 0.23), paint, zebraCenter * side, 0.207, i * 0.32);
    }
  const nsStop = mesh(root, box(1.2, 0.015, 0.06), paint, -0.65, 0.208, JUNCTION.stopLine);
  const ewStop = mesh(root, box(0.06, 0.015, 1.2), paint, JUNCTION.stopLine, 0.208, 0.65);
  nsStop.userData.role = ewStop.userData.role = 'junction-stop-line';
  const ns = buildSignal(context, root, 1.7, -2.0, Math.PI, 1, {
    yellow: 'ns_yellow',
    green: 'ns_green',
  });
  const ew = buildSignal(context, root, -2.0, -1.7, -Math.PI / 2, 1, {
    yellow: 'ew_yellow',
    green: 'ew_green',
  });
  for (const x of [-4.2, 4.2])
    for (const z of [-4.2, 4.2]) {
      mesh(root, cylinder(0.12, 0.15, 1.25), material(0x6d5940), x, 0.75, z);
      const crown = mesh(root, sphere(0.8), material(0x64865a), x, 1.8, z);
      crown.scale.y = 1.2;
    }
  const cars = new Map();
  const aftermath = buildAftermath(context, root);
  aftermath.userData.role = 'collision-aftermath';
  const colors = [0x517fa6, 0xc27847, 0xe2e0cf, 0x82976b, 0x9b6a8f];
  return {
    update({ state = {} }) {
      const lights = state.lights || {};
      ns.set(
        !active(lights.ns_green) && !active(lights.ns_yellow),
        lights.ns_yellow,
        lights.ns_green,
      );
      ew.set(
        !active(lights.ew_green) && !active(lights.ew_yellow),
        lights.ew_yellow,
        lights.ew_green,
      );
      const live = new Set();
      (state.cars || []).forEach((data, index) => {
        live.add(data.id);
        let car = cars.get(data.id);
        if (!car) {
          car = buildCar(context, colors[index % colors.length]);
          car.group.name = `junction-car:${data.id}`;
          car.group.userData.transportId = data.id;
          car.group.userData.transportKind = 'junction_car';
          car.group.userData.axis = data.axis;
          cars.set(data.id, car);
          root.add(car.group);
        }
        const pose = junctionCarPose(data);
        car.group.position.set(pose.x, JUNCTION.vehicleY, pose.z);
        car.group.rotation.set(0, pose.heading, 0);
        car.damage.visible = !!data.crashed;
        car.group.visible =
          Math.abs(data.position * JUNCTION.scale) <= 7.1 - JUNCTION.carLength / 2;
        for (const wheel of car.wheels)
          wheel.rotation.x = (finite(data.position) * JUNCTION.scale) / 0.115;
      });
      for (const [id, car] of cars)
        if (!live.has(id)) {
          car.group.removeFromParent();
          cars.delete(id);
        }
      aftermath.visible = !!state.crash && !!state.collisionPoint;
      if (state.collisionPoint)
        aftermath.position.set(state.collisionPoint.x, 0, state.collisionPoint.z);
    },
  };
}

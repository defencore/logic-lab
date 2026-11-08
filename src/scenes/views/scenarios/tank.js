import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';

export function createWaterTank(context) {
  const { root, mesh, box, cylinder, sphere, material, geometry, keep } = context;
  const metal = material(0xb7c6c8, 0.75, 0.3),
    pumpPaint = material(0x3f7b79, 0.35),
    dark = material(0x344947);
  mesh(root, box(10.5, 0.11, 9), material(0xc4d1d0), 0, 0.15).userData.frameIgnore = true;
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: 0xd8edf0,
      transparent: true,
      opacity: 0.24,
      roughness: 0.16,
      metalness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const waterPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x3e9fbb,
      transparent: true,
      opacity: 0.67,
      roughness: 0.17,
      metalness: 0.15,
      depthWrite: false,
    }),
  );
  const flowPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x65bfda,
      transparent: true,
      opacity: 0.78,
      roughness: 0.18,
      depthWrite: false,
    }),
  );
  const tank = mesh(
    root,
    geometry('tank-wall', () => new THREE.CylinderGeometry(1.65, 1.65, 4.8, 48, 1, true)),
    glass,
    0,
    3.2,
  );
  tank.renderOrder = 4;
  mesh(root, cylinder(1.69, 1.69, 0.14, 48), metal, 0, 0.79);
  const topRing = mesh(
    root,
    geometry('tank-rim', () => new THREE.TorusGeometry(1.65, 0.07, 10, 48)),
    metal,
    0,
    5.6,
  );
  topRing.rotation.x = Math.PI / 2;
  for (const x of [-1.0, 1.0])
    for (const z of [-1.0, 1.0]) mesh(root, cylinder(0.08, 0.1, 0.55), dark, x, 0.48, z);
  const water = mesh(root, cylinder(1.57, 1.57, 1, 48), waterPaint, 0, 1);
  water.userData.role = 'tank-water';
  water.renderOrder = 2;
  const surface = mesh(
    root,
    geometry('water-surface', () => new THREE.CircleGeometry(1.57, 48)),
    flowPaint,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.renderOrder = 3;
  const ripples = [0.35, 0.7, 1.1].map((r) => {
    const ring = mesh(
      root,
      geometry(`ripple:${r}`, () => new THREE.TorusGeometry(r, 0.012, 5, 48)),
      material(0xafe5ed, 0.15, 0.2),
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  });
  const pipe = (points) =>
    mesh(
      root,
      keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
          35,
          0.1,
          10,
          false,
        ),
      ),
      metal,
    );
  pipe([
    [-3.0, 0.6, 0],
    [-3.0, 4.9, 0],
    [-2.7, 6.0, 0],
    [-0.4, 6.0, 0],
    [0, 5.8, 0],
  ]).userData.role = 'tank-inlet';
  pipe([
    [1.5, 0.94, 0],
    [2.8, 0.94, 0],
    [3.3, 0.65, 0],
    [3.8, 0.65, 0],
    [4.0, 0.5, 0],
    [4.0, 0.36, 0],
  ]).userData.role = 'tank-drain';
  mesh(root, box(1.25, 0.24, 1.2), dark, -3.0, 0.32);
  const pump = mesh(root, cylinder(0.48, 0.48, 0.9), pumpPaint, -3.0, 0.92, 0.25);
  pump.rotation.x = Math.PI / 2;
  pump.userData.role = 'tank-pump';
  const propeller = new THREE.Group();
  propeller.position.set(-3.0, 0.92, 0.73);
  root.add(propeller);
  propeller.userData.role = 'tank-propeller';
  mesh(propeller, cylinder(0.09, 0.09, 0.08), metal).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const blade = mesh(
      propeller,
      box(0.3, 0.075, 0.04),
      metal,
      Math.cos(i * Math.PI * 0.4) * 0.17,
      Math.sin(i * Math.PI * 0.4) * 0.17,
      0.01,
    );
    blade.rotation.z = i * Math.PI * 0.4 + 0.4;
  }
  const stream = mesh(root, cylinder(0.055, 0.055, 1, 14), flowPaint, 0, 3.0);
  const drainStream = mesh(root, cylinder(0.06, 0.06, 0.14, 14), flowPaint, 4.0, 0.29);
  drainStream.userData.role = 'tank-drain-stream';
  mesh(root, box(0.8, 0.018, 0.7), dark, 4.0, 0.215);
  for (let index = -3; index <= 3; index++)
    mesh(root, box(0.035, 0.02, 0.62), metal, 4 + index * 0.1, 0.23);
  const floodPaint = keep(
    new THREE.MeshStandardMaterial({
      color: 0x50a9c5,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.25,
      depthWrite: false,
    }),
  );
  const flood = mesh(
    root,
    geometry('flood', () => new THREE.CircleGeometry(1, 60)),
    floodPaint,
    0,
    0.218,
  );
  flood.rotation.x = -Math.PI / 2;
  flood.userData.role = 'tank-flood';
  const overflowStreams = [-1, 1].map((side) =>
    mesh(
      root,
      keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 1.55, 5.57, 0.4),
            new THREE.Vector3(side * 1.95, 5.3, 0.5),
            new THREE.Vector3(side * 2.0, 1.0, 0.5),
            new THREE.Vector3(side * 2.1, 0.25, 0.5),
          ]),
          45,
          0.045,
          8,
          false,
        ),
      ),
      flowPaint,
    ),
  );
  const ruler = mesh(root, box(0.32, 4.8, 0.08), material(0xe4ece7), 0, 3.2, 1.73);
  ruler.userData.role = 'tank-level-ruler';
  for (const y of [1.0, 5.4])
    mesh(root, box(0.12, 0.09, 0.18), metal, 0, y, 1.67).userData.role =
      y < 2 ? 'tank-low-sensor' : 'tank-high-sensor';
  for (let i = 0; i <= 10; i++)
    mesh(root, box(i % 5 === 0 ? 0.27 : 0.17, 0.025, 0.015), dark, 0, 0.86 + i * 0.468, 1.78);
  const beaconPaint = keep(
    new THREE.MeshStandardMaterial({ color: 0x3a9867, emissive: 0x3a9867, emissiveIntensity: 0.4 }),
  );
  mesh(root, sphere(0.11), beaconPaint, -2.5, 1.16, 0.45);
  return {
    update({ state = {}, parameters = {} }) {
      const ratio = clamp(finite(state.level) / 100),
        height = Math.max(0.005, ratio * 4.68),
        top = 0.86 + height;
      water.visible = ratio > 0;
      surface.visible = ratio > 0;
      water.scale.y = height;
      water.position.y = 0.86 + height / 2;
      surface.position.y = top + 0.01;
      for (let i = 0; i < ripples.length; i++) {
        const wave =
          state.pumping || state.draining ? Math.sin(finite(state.time) * 4 - i) * 0.1 : 0;
        ripples[i].visible = ratio > 0;
        ripples[i].position.y = top + 0.025;
        ripples[i].scale.setScalar(1 + wave);
      }
      if (state.pumping) propeller.rotation.z = finite(state.time) * 10;
      stream.visible = !!state.pumping;
      stream.scale.y = Math.max(0.05, 5.8 - top);
      stream.position.y = top + (5.8 - top) / 2;
      drainStream.visible = !!state.draining;
      const spilled = Math.max(0, finite(state.spilled));
      flood.visible = spilled > 0;
      const extent = 2 + Math.sqrt(spilled / Math.max(1, finite(parameters.capacity, 100))) * 2.1;
      flood.scale.set(Math.min(5.0, extent), Math.min(4.2, extent * 0.8), 1);
      overflowStreams.forEach(
        (flow) => (flow.visible = !!state.overflow && state.pumping && ratio > 0.99),
      );
      beaconPaint.color.setHex(state.overflow ? 0xd24b36 : state.pumping ? 0x3a9867 : 0x77847c);
      beaconPaint.emissive.copy(beaconPaint.color);
    },
  };
}

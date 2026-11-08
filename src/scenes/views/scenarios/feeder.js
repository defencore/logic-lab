import * as THREE from 'three';
import { finite, clamp } from '../../common/numbers.js';

export function createAnimalFeeder(context) {
  const { root, mesh, box, cylinder, sphere, material, geometry, keep } = context;
  const steel = material(0xb5c0bd, 0.75, 0.3),
    green = material(0x4e7a68, 0.2),
    feed = material(0xb68b4c);
  mesh(root, box(9.0, 0.08, 5.8), material(0xcbbd9d), -0.3, 0.13).userData.frameIgnore = true;
  const clear = keep(
    new THREE.MeshStandardMaterial({
      color: 0xe6f0e9,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  for (const x of [-3.2, -2.0])
    for (const z of [-0.65, 0.65]) mesh(root, cylinder(0.07, 0.07, 3.2), steel, x, 1.75, z);
  mesh(root, cylinder(1.05, 1.05, 1.6, 36), clear, -2.6, 4.0);
  mesh(root, cylinder(1.12, 1.12, 0.12, 36), green, -2.6, 4.84);
  mesh(root, cylinder(1.1, 0.16, 1.1, 36), steel, -2.6, 2.65);
  const hopperFill = mesh(root, cylinder(0.98, 0.98, 1), feed, -2.6, 3.4);
  const funnelFeed = mesh(root, cylinder(0.98, 0.13, 0.95, 32), feed, -2.6, 2.75);
  const motor = mesh(root, box(0.8, 0.6, 0.75), green, -3.7, 2.1);
  motor.userData.role = 'feeder-motor';
  const coupling = mesh(root, cylinder(0.065, 0.065, 0.68), steel, -2.975, 2.1);
  coupling.rotation.z = Math.PI / 2;
  coupling.userData.role = 'feeder-coupling';
  mesh(root, box(0.9, 0.12, 0.8), steel, -3.7, 1.74);
  for (const z of [-0.3, 0.3]) mesh(root, box(0.1, 1.5, 0.08), steel, -3.7, 0.92, z);
  const pipe = mesh(root, cylinder(0.21, 0.21, 3.2, 28), clear, -1.0, 2.1);
  pipe.rotation.z = Math.PI / 2;
  const auger = new THREE.Group();
  auger.position.set(-1, 2.1, 0);
  root.add(auger);
  const shaft = mesh(auger, cylinder(0.045, 0.045, 3.3), steel);
  shaft.rotation.z = Math.PI / 2;
  shaft.userData.role = 'feeder-shaft';
  const helix = new THREE.CatmullRomCurve3(
    Array.from(
      { length: 150 },
      (_, i) =>
        new THREE.Vector3(
          -1.5 + (i / 149) * 3,
          Math.sin((i / 149) * Math.PI * 24) * 0.14,
          Math.cos((i / 149) * Math.PI * 24) * 0.14,
        ),
    ),
  );
  mesh(auger, keep(new THREE.TubeGeometry(helix, 170, 0.035, 6, false)), material(0xc0a066, 0.65));
  const chute = mesh(root, cylinder(0.2, 0.2, 0.65), steel, 0.7, 1.85);
  chute.rotation.z = 0.4;
  chute.userData.role = 'feeder-chute';
  const bowl = new THREE.Group();
  bowl.position.set(0.95, 0.15, 0);
  bowl.userData.role = 'feeder-bowl';
  root.add(bowl);
  mesh(
    bowl,
    geometry(
      'bowl',
      () =>
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.62, 0.02),
            new THREE.Vector2(0.9, 0.08),
            new THREE.Vector2(0.86, 0.42),
            new THREE.Vector2(0.74, 0.34),
            new THREE.Vector2(0.66, 0.09),
          ],
          40,
        ),
    ),
    material(0x7f9997, 0.7, 0.3),
  );
  const bowlFood = mesh(bowl, cylinder(0.72, 0.64, 0.2, 32), feed, 0, 0.17);
  bowlFood.userData.role = 'feeder-bowl-food';
  const pelletGeometry = sphere(0.045);
  const spilled = keep(new THREE.InstancedMesh(pelletGeometry, feed, 140));
  spilled.castShadow = true;
  root.add(spilled);
  spilled.count = 0;
  const stream = keep(new THREE.InstancedMesh(pelletGeometry, feed, 13));
  stream.castShadow = true;
  root.add(stream);
  const matrix = new THREE.Object3D();
  const animal = new THREE.Group();
  animal.position.set(2.55, 0.085, 0);
  animal.userData.role = 'feeder-animal';
  animal.rotation.y = -Math.PI / 2;
  root.add(animal);
  const fur = material(0xb38b60),
    paws = material(0x604c3d),
    black = material(0x25312b);
  mesh(
    animal,
    geometry('animal-torso', () =>
      new THREE.CapsuleGeometry(0.35, 0.75, 5, 20).rotateX(Math.PI / 2),
    ),
    fur,
    0,
    0.84,
    -0.05,
  );
  const legs = [];
  for (const x of [-0.24, 0.24])
    for (const z of [-0.48, 0.43]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.66, z);
      animal.add(leg);
      mesh(leg, cylinder(0.075, 0.06, 0.52, 16), fur, 0, -0.24);
      mesh(leg, sphere(0.105), paws, 0, -0.47, 0.04).userData.role = 'feeder-paw';
      legs.push(leg);
    }
  const head = new THREE.Group();
  head.position.set(0, 1.05, 0.55);
  animal.add(head);
  mesh(head, sphere(0.32), fur, 0, 0.08, 0.2);
  const muzzle = mesh(head, sphere(0.2), material(0xcab495), 0, -0.02, 0.46);
  muzzle.scale.set(0.85, 0.7, 1.1);
  mesh(head, sphere(0.072), black, 0, 0, 0.65);
  for (const x of [-0.22, 0.22]) {
    const ear = mesh(
      head,
      geometry('animal-ear', () => new THREE.ConeGeometry(0.15, 0.34, 5)),
      paws,
      x,
      0.39,
      0.14,
    );
    ear.rotation.z = x * -0.9;
    mesh(head, sphere(0.042), black, x, 0.16, 0.42);
  }
  const tongue = mesh(head, box(0.09, 0.025, 0.16), material(0xc7877f), 0, -0.04, 0.72);
  tongue.userData.role = 'feeder-tongue';
  tongue.visible = false;
  const tail = new THREE.Group();
  tail.position.set(0, 0.92, -0.77);
  animal.add(tail);
  mesh(
    tail,
    keep(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0.35, -0.22),
          new THREE.Vector3(0.18, 0.58, -0.32),
        ]),
        18,
        0.06,
        8,
        false,
      ),
    ),
    fur,
  );
  const warning = keep(
    new THREE.MeshStandardMaterial({ color: 0x35885d, emissive: 0x35885d, emissiveIntensity: 0.2 }),
  );
  mesh(root, sphere(0.1), warning, -3.7, 2.48, 0.26);
  return {
    update({ state = {}, parameters = {} }) {
      const hopperRatio = clamp(
        finite(state.hopper) / Math.max(1, finite(parameters.hopperCapacity, 500)),
      );
      hopperFill.scale.y = Math.max(0.001, hopperRatio * 1.52);
      hopperFill.position.y = 3.22 + hopperRatio * 0.76;
      hopperFill.visible = hopperRatio > 0;
      funnelFeed.visible = hopperRatio > 0;
      const bowlRatio = clamp(
        finite(state.bowl) / Math.max(1, finite(parameters.bowlCapacity, 100)),
      );
      bowlFood.visible = bowlRatio > 0;
      bowlFood.scale.y = Math.max(0.001, bowlRatio * 1.2);
      bowlFood.position.y = 0.09 + bowlRatio * 0.12;
      bowlFood.scale.x = bowlFood.scale.z = 0.9 + bowlRatio * 0.1;
      if (state.dispensing) auger.rotation.x = finite(state.time) * 8;
      stream.visible = !!state.dispensing;
      for (let i = 0; i < 13; i++) {
        const p = (finite(state.time) * 1.8 + i / 13) % 1;
        matrix.position.set(
          0.83 + Math.sin(i * 2.4) * 0.04,
          1.5 - p * (1.5 - (0.24 + bowlRatio * 0.24)),
          Math.cos(i * 2.4) * 0.08,
        );
        matrix.rotation.set(i, i * 1.7, 0);
        matrix.updateMatrix();
        stream.setMatrixAt(i, matrix.matrix);
      }
      stream.instanceMatrix.needsUpdate = true;
      spilled.count = Math.min(140, Math.ceil(finite(state.spilled) * 2));
      for (let i = 0; i < spilled.count; i++) {
        const r = 1.0 + Math.sqrt(i / 140) * 1.4;
        matrix.position.set(0.95 + Math.cos(i * 2.399) * r, 0.21, Math.sin(i * 2.399) * r);
        matrix.rotation.set(i, i * 0.7, i * 0.2);
        matrix.updateMatrix();
        spilled.setMatrixAt(i, matrix.matrix);
      }
      spilled.instanceMatrix.needsUpdate = true;
      const phase = finite(state.animal?.phase) * Math.PI * 2;
      head.rotation.x = state.animal?.eating
        ? 0.95 + Math.sin(phase * 2) * 0.04
        : -0.1 + Math.sin(phase) * 0.04;
      tongue.visible = !!state.animal?.eating;
      tail.rotation.z = Math.sin(phase) * (state.animal?.eating ? 0.2 : 0.4);
      legs.forEach(
        (leg, index) =>
          (leg.rotation.x =
            !state.animal?.eating && state.animal?.hungry
              ? Math.sin(phase + index * Math.PI) * 0.1
              : 0),
      );
      warning.color.setHex(state.alarm ? 0xcb5438 : 0x35885d);
      warning.emissive.copy(warning.color);
    },
  };
}

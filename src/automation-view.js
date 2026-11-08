import * as THREE from 'three';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const on = (value) => value === 1;

function paint(context, color, options = {}) {
  return context.keep(new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...options }));
}
function tube(context, parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return context.mesh(
    parent,
    context.keep(new THREE.TubeGeometry(curve, 24, radius, 8, false)),
    material,
  );
}
function ring(context, parent, radius, material, x, y, z) {
  return context.mesh(
    parent,
    context.geometry(
      `automation-ring:${radius}`,
      () => new THREE.TorusGeometry(radius, 0.035, 8, 32),
    ),
    material,
    x,
    y,
    z,
  );
}
function lamp(context, parent, x, y, z, color = 0xffd76b) {
  const material = paint(context, 0x726d50, { emissive: color, emissiveIntensity: 0 });
  const object = context.mesh(parent, context.sphere(0.13), material, x, y, z);
  object.userData.role = 'actuator-lamp';
  return {
    object,
    material,
    set(enabled) {
      material.emissiveIntensity = enabled ? 2.4 : 0;
      material.color.set(enabled ? color : 0x726d50);
    },
  };
}
function spray(
  context,
  parent,
  origin,
  material,
  count = 15,
  targetY = 0.36,
  spread = 1.1,
  arc = 0.45,
) {
  const drops = Array.from({ length: count }, (_, index) => {
    const object = context.mesh(parent, context.sphere(0.028), material);
    object.userData = { role: 'water-drop', frameIgnore: true };
    return { object, phase: index / count };
  });
  return {
    update(time, active) {
      drops.forEach(({ object, phase }, index) => {
        object.visible = active;
        const progress = (time * 0.65 + phase) % 1,
          angle = index * 2.399;
        object.position.set(
          origin[0] + Math.cos(angle) * progress * spread,
          origin[1] + (targetY - origin[1]) * progress + Math.sin(progress * Math.PI) * arc,
          origin[2] + Math.sin(angle) * progress * spread,
        );
      });
    },
  };
}
function plant(context, parent, x, z, height = 1, leafColor = 0x408c52) {
  const group = new THREE.Group();
  parent.add(group);
  group.position.set(x, 0, z);
  const stem = context.material(0x477d41),
    leaf = paint(context, leafColor);
  context.mesh(group, context.cylinder(0.035, 0.05, height), stem, 0, height / 2, 0);
  const leaves = [];
  for (let index = 0; index < 5; index++) {
    const object = context.mesh(
      group,
      context.sphere(0.25),
      leaf,
      (index % 2 ? 1 : -1) * 0.2,
      0.2 + (index * height) / 6,
      0,
    );
    object.scale.set(1.5, 0.22, 0.65);
    object.rotation.z = (index % 2 ? 1 : -1) * 0.35;
    leaves.push(object);
  }
  return { group, leaf, leaves };
}
function thermometer(context, parent, x, y, z) {
  const shell = paint(context, 0xece8db),
    mercury = paint(context, 0xd46846);
  context.mesh(parent, context.box(0.26, 1.65, 0.12), shell, x, y, z);
  const bar = context.mesh(parent, context.box(0.09, 1.2, 0.04), mercury, x, y - 0.12, z + 0.08);
  context.mesh(parent, context.sphere(0.12), mercury, x, y - 0.65, z + 0.08);
  for (let index = 0; index < 8; index++)
    context.mesh(
      parent,
      context.box(0.07, 0.014, 0.035),
      context.material(0x56615b),
      x + 0.075,
      y - 0.5 + index * 0.15,
      z + 0.075,
    );
  return {
    update(value) {
      const level = clamp((finite(value, 20) + 5) / 50, 0.05, 1);
      bar.scale.y = level;
      bar.position.y = y - 0.72 + 0.6 * level;
    },
  };
}

function fishPose(time, index, count) {
  const layers = Math.ceil(count / 2);
  const spacing = layers === 4 ? 0.76 : layers === 3 ? 1 : 1.1;
  const bottom = layers === 4 ? 1.57 : layers === 3 ? 1.7 : layers === 2 ? 2.05 : 2.6;
  const phase = time * (0.32 + index * 0.025) + index * 1.7;
  return {
    x: Math.sin(phase) * 2.5,
    y: bottom + Math.floor(index / 2) * spacing + Math.sin(phase * 0.7) * 0.025,
    z: (index % 2 ? 0.55 : -0.55) + Math.cos(phase) * 0.17,
    heading: Math.atan2(0.17 * Math.sin(phase), 2.5 * Math.cos(phase)),
  };
}

function fish(context, index) {
  const group = new THREE.Group();
  group.userData = { role: 'aquarium-fish', fishId: index + 1 };
  group.scale.setScalar(0.82);
  const colors = [0xf0a24e, 0x5a9fb7, 0xe58a7f, 0xb6a8d2, 0x9da75b, 0xdcb94e, 0x7cb4a9, 0xb79b75];
  const bodyMaterial = paint(context, colors[index % colors.length]);
  const body = context.mesh(group, context.sphere(0.46), bodyMaterial);
  body.scale.set(1.35, 0.68, 0.5);
  const belly = context.mesh(
    group,
    context.sphere(0.35),
    context.material(0xf7e6c4),
    0.05,
    -0.1,
    0,
  );
  belly.scale.set(1.4, 0.5, 0.53);
  const finMaterial = paint(context, colors[index % colors.length], { side: THREE.DoubleSide });
  const tailShape = context.geometry('fish-tail', () => new THREE.ConeGeometry(0.34, 0.48, 3));
  const tail = context.mesh(group, tailShape, finMaterial, -0.69, 0, 0);
  tail.rotation.z = Math.PI / 2;
  tail.scale.z = 0.35;
  const dorsal = context.mesh(
    group,
    context.geometry('fish-fin', () => new THREE.ConeGeometry(0.2, 0.38, 3)),
    finMaterial,
    -0.08,
    0.35,
    0,
  );
  dorsal.scale.z = 0.25;
  const eyes = [],
    crosses = [];
  for (const side of [-1, 1]) {
    const eye = context.mesh(
      group,
      context.sphere(0.082),
      context.material(0xfff9e8),
      0.37,
      0.08,
      side * 0.21,
    );
    const pupil = context.mesh(
      group,
      context.sphere(0.04),
      context.material(0x25343a),
      0.39,
      0.08,
      side * 0.275,
    );
    eyes.push(eye, pupil);
    for (const angle of [-0.75, 0.75]) {
      const cross = context.mesh(
        group,
        context.box(0.17, 0.035, 0.02),
        context.material(0x25343a),
        0.38,
        0.08,
        side * 0.285,
      );
      cross.rotation.z = angle;
      cross.visible = false;
      cross.userData.role = 'dead-fish-eye';
      crosses.push(cross);
    }
  }
  return {
    group,
    tail,
    bodyMaterial,
    baseColor: new THREE.Color(colors[index % colors.length]),
    eyes,
    crosses,
  };
}

function aquarium(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const rim = material(0x344c54, 0.35),
    wood = material(0x96724d),
    sand = material(0xc5b28b);
  mesh(root, box(8.6, 0.3, 4.7), wood, 0, 0.7, 0).userData.role = 'aquarium-table';
  for (const x of [-3.6, 3.6])
    for (const z of [-1.8, 1.8])
      mesh(root, box(0.35, 0.465, 0.35), wood, x, 0.3175, z).userData.role = 'aquarium-leg';
  mesh(root, box(8.1, 0.1, 4.1), material(0x718d8f), 0, 0.9, 0);
  mesh(root, box(7.9, 0.13, 3.9), sand, 0, 1.015, 0).userData.role = 'aquarium-sand';
  const glass = paint(context, 0xc0edf0, {
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    roughness: 0.1,
  });
  const water = paint(context, 0x65cbd5, {
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const waterMesh = mesh(root, box(7.88, 3.27, 3.88), water, 0, 2.715, 0);
  waterMesh.userData.role = 'aquarium-water';
  waterMesh.renderOrder = 2;
  for (const z of [-1.94, 1.94])
    mesh(root, box(7.88, 0.025, 0.025), material(0x65aeb9), 0, 4.35, z);
  for (const x of [-3.94, 3.94])
    mesh(root, box(0.025, 0.025, 3.88), material(0x65aeb9), x, 4.35, 0);
  for (const x of [-4, 4])
    mesh(root, box(0.06, 3.8, 4.05), glass, x, 2.85, 0).userData.role = 'aquarium-glass';
  for (const z of [-2, 2]) {
    const panel = mesh(root, box(8.05, 3.8, 0.06), glass, 0, 2.85, z);
    panel.renderOrder = 3;
    panel.userData.role = 'aquarium-glass';
  }
  for (const y of [0.98, 4.75]) {
    for (const z of [-2, 2]) mesh(root, box(8.15, 0.13, 0.14), rim, 0, y, z);
    for (const x of [-4, 4]) mesh(root, box(0.14, 0.13, 4.1), rim, x, y, 0);
  }
  for (const x of [-4, 4])
    for (const z of [-2, 2]) mesh(root, box(0.08, 3.8, 0.08), rim, x, 2.85, z);
  for (let index = 0; index < 30; index++) {
    const stone = mesh(
      root,
      sphere(0.13 + (index % 3) * 0.035),
      material(index % 2 ? 0xb69f7e : 0xd9c7a2),
      Math.sin(index * 2.4) * 3.6,
      1.1,
      -1.55 + Math.cos(index * 1.8) * 0.12,
    );
    stone.scale.y = 0.55;
  }
  for (const [x, z, height] of [
    [-2.9, -1.65, 1.7],
    [2.9, -1.65, 1.4],
    [-1.3, -1.65, 1.1],
    [1.4, -1.65, 0.9],
  ]) {
    const stem = plant(context, root, x, z, height, 0x3d8a64);
    stem.group.position.y = 1.08;
  }
  mesh(root, box(0.9, 0.6, 0.5), material(0x99785b), 0, 1.38, -1.65);
  const cave = ring(context, root, 0.24, material(0x3e4b47), 0, 1.4, -1.38);
  cave.scale.set(1.3, 1, 1);
  const heaterMaterial = paint(context, 0x746a57, { emissive: 0xf77c37, emissiveIntensity: 0 });
  const heater = mesh(root, cylinder(0.11, 0.11, 2.5), heaterMaterial, -3.55, 2.4, -1.5);
  heater.userData.role = 'aquarium-heater';
  mesh(root, cylinder(0.15, 0.15, 0.35), rim, -3.55, 3.8, -1.5);
  tube(
    context,
    root,
    [
      [-3.55, 3.9, -1.5],
      [-3.55, 5, -1.5],
      [-4.6, 5, -1.5],
      [-4.6, 0.8, -1.5],
    ],
    0.045,
    rim,
  );
  mesh(root, box(0.5, 0.7, 0.5), rim, -4.6, 0.435, -1.5);
  mesh(root, box(0.6, 1.5, 0.65), rim, 3.5, 3.1, -1.5);
  const rotor = mesh(
    root,
    context.geometry('aquarium-filter-rotor', () => new THREE.TorusGeometry(0.2, 0.04, 8, 20)),
    material(0x79c4b4),
    3.5,
    3.2,
    -1.12,
  );
  rotor.userData.role = 'aquarium-filter';
  mesh(rotor, box(0.06, 0.35, 0.035), material(0xabe7d4));
  mesh(rotor, box(0.35, 0.06, 0.035), material(0xabe7d4));
  mesh(root, box(0.9, 1.2, 0.9), rim, 4.8, 0.685, 0.5);
  const chiller = new THREE.Group();
  root.add(chiller);
  chiller.position.set(4.8, 0.8, 0.98);
  chiller.userData.role = 'aquarium-cooler';
  ring(context, chiller, 0.3, material(0x71afc3), 0, 0, 0);
  for (let index = 0; index < 3; index++) {
    const blade = mesh(chiller, box(0.08, 0.34, 0.04), material(0x71afc3));
    blade.position.set(
      Math.sin((index * Math.PI * 2) / 3) * 0.08,
      Math.cos((index * Math.PI * 2) / 3) * 0.08,
      0,
    );
    blade.rotation.z = (-index * Math.PI * 2) / 3;
  }
  const coolerLamp = lamp(context, root, 4.8, 1.15, 0.98, 0x82d6f2);
  tube(
    context,
    root,
    [
      [4.8, 1.3, 0.5],
      [4.8, 4.9, 0.5],
      [3.2, 4.9, 0.5],
      [3.2, 3.8, 0.5],
    ],
    0.055,
    material(0x6694a5),
  );
  tube(
    context,
    root,
    [
      [4.8, 0.1, 1.4],
      [4.8, 5.0, 1.4],
      [3.3, 5.0, 1.4],
      [3.3, 4.5, 1.4],
    ],
    0.06,
    material(0x9bb5b4),
  );
  const freshWater = Array.from({ length: 10 }, () =>
    mesh(root, sphere(0.035), material(0x7bc9de)),
  );
  freshWater.forEach(
    (object) => (object.userData = { role: 'aquarium-water-change', frameIgnore: true }),
  );
  const oxygenStone = mesh(root, box(0.7, 0.12, 0.35), material(0x687a85), -2, 1.14, 0.7);
  oxygenStone.userData.role = 'aquarium-aerator';
  const bubbleMaterial = paint(context, 0xb8f3f6, {
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    metalness: 0.1,
  });
  const bubbles = Array.from({ length: 22 }, (_, index) =>
    mesh(root, sphere(0.035 + (index % 3) * 0.012), bubbleMaterial),
  );
  bubbles.forEach((object) => (object.userData = { role: 'oxygen-bubble', frameIgnore: true }));
  for (const x of [-2.8, 2.8])
    mesh(root, box(0.16, 0.16, 4.1), rim, x, 4.87, 0).userData.role = 'aquarium-bridge';
  const hood = mesh(root, box(6.8, 0.18, 0.55), rim, 0, 5.04, -0.45);
  hood.userData.role = 'aquarium-light';
  const lights = Array.from({ length: 8 }, (_, index) =>
    lamp(context, root, -2.8 + index * 0.8, 4.88, -0.45),
  );
  const feeder = mesh(root, box(0.75, 0.55, 0.7), material(0xd4a36b), 2.6, 5.225, 0.8);
  feeder.userData.role = 'aquarium-feeder';
  mesh(root, cylinder(0.1, 0.1, 0.18), rim, 2.6, 4.88, 0.8);
  const pellets = Array.from({ length: 10 }, () => mesh(root, sphere(0.045), material(0x986242)));
  pellets.forEach((object) => (object.userData = { role: 'food-pellet', frameIgnore: true }));
  const meter = thermometer(context, root, -3.65, 2.85, 2.085);
  const fishes = new Map(),
    dirtyWaterColor = new THREE.Color(0x779154),
    cleanWaterColor = new THREE.Color(0x65cbd5),
    stressedFishColor = new THREE.Color(0xa9ac93);
  return {
    update({ state = {} }) {
      const time = finite(state.time),
        c = state.controls || {};
      water.color
        .copy(dirtyWaterColor)
        .lerp(cleanWaterColor, clamp(finite(state.cleanliness, 80) / 100));
      heaterMaterial.emissiveIntensity = on(c.heater) ? 1.3 : 0;
      lights.forEach((light) => light.set(on(c.light)));
      rotor.rotation.z = on(c.filter) ? time * 5 : 0;
      chiller.rotation.z = on(c.cooler) ? time * 6 : 0;
      coolerLamp.set(on(c.cooler));
      freshWater.forEach((object, index) => {
        object.visible = on(c.water_change);
        const phase = (time * 1.3 + index / 10) % 1;
        object.position.set(3.3, 4.5 - phase * 0.65, 1.4);
      });
      meter.update(state.temperature);
      bubbles.forEach((object, index) => {
        object.visible = on(c.aerator);
        const phase = (time * 0.45 + index / 22) % 1;
        object.position.set(
          -2 + Math.sin(index * 2.7 + phase * 5) * 0.19,
          1.3 + phase * 2.95,
          0.7 + Math.cos(index * 1.8) * 0.12,
        );
      });
      pellets.forEach((object, index) => {
        object.visible = on(c.feed);
        const phase = (time * 0.5 + index / 10) % 1;
        object.position.set(
          2.6 + Math.sin(index * 3.5) * 0.2,
          4.78 - phase * 3.6,
          0.8 + Math.cos(index) * 0.2,
        );
      });
      const list = state.fish || [];
      for (const [index, data] of list.entries()) {
        if (!fishes.has(data.id)) {
          const model = fish(context, index);
          fishes.set(data.id, model);
          root.add(model.group);
        }
        const model = fishes.get(data.id);
        model.group.visible = true;
        if (data.alive !== false) {
          const pose = fishPose(time, index, list.length);
          model.group.position.set(pose.x, pose.y, pose.z);
          // The long axis follows the path tangent, including smooth turns.
          model.group.rotation.set(0, pose.heading, 0);
          model.tail.rotation.y = Math.sin(time * 7 + index) * 0.35;
        } else {
          const origin = fishPose(finite(data.deadAt, time), index, list.length);
          const rise = clamp((time - finite(data.deadAt, time)) * 0.45);
          // Spread on the separate swimming levels before rising to one surface.
          const spread = THREE.MathUtils.smoothstep(rise, 0, 0.5);
          const lift = THREE.MathUtils.smoothstep(rise, 0.5, 1);
          model.group.position.set(
            THREE.MathUtils.lerp(origin.x, -2.65 + Math.floor(index / 2) * 1.75, spread),
            THREE.MathUtils.lerp(origin.y, 4.07, lift),
            THREE.MathUtils.lerp(origin.z, index % 2 ? 0.8 : -0.8, spread),
          );
          model.group.rotation.set(Math.PI, 0, 0);
          model.tail.rotation.y = 0;
        }
        model.group.userData.alive = data.alive !== false;
        model.eyes.forEach((eye) => (eye.visible = data.alive !== false));
        model.crosses.forEach((cross) => (cross.visible = data.alive === false));
        model.bodyMaterial.color
          .copy(stressedFishColor)
          .lerp(model.baseColor, clamp(finite(data.health, 100) / 100, 0.15, 1));
      }
      for (const [id, model] of fishes)
        if (!list.some((data) => data.id === id)) model.group.visible = false;
    },
  };
}

function greenhouse(context) {
  const { root, mesh, box, cylinder, material } = context;
  const frame = material(0x526e60, 0.35),
    soil = material(0x674a35),
    water = paint(context, 0x60b4cb);
  const floorY = 0.285,
    eaveY = 3.85,
    ridgeY = 4.95,
    halfDepth = 3.8,
    pitch = Math.atan2(ridgeY - eaveY, halfDepth);
  const slab = mesh(root, box(10, 0.2, 8), material(0xa8bb96), 0, 0.185, 0);
  slab.userData = { role: 'greenhouse-slab', frameIgnore: true };
  for (const x of [-4.6, 0, 4.6]) {
    for (const z of [-halfDepth, halfDepth])
      mesh(root, cylinder(0.06, 0.06, eaveY - floorY), frame, x, (eaveY + floorY) / 2, z);
    // One gable rib per bay, with straight rafters seated on the side posts.
    tube(
      context,
      root,
      [
        [x, eaveY, -halfDepth],
        [x, ridgeY, 0],
      ],
      0.055,
      frame,
    );
    tube(
      context,
      root,
      [
        [x, ridgeY, 0],
        [x, eaveY, halfDepth],
      ],
      0.055,
      frame,
    );
  }
  for (const z of [-halfDepth, halfDepth])
    for (const y of [floorY + 0.06, eaveY]) mesh(root, box(9.3, 0.08, 0.08), frame, 0, y, z);
  mesh(root, box(9.3, 0.09, 0.09), frame, 0, ridgeY, 0);
  const glass = paint(context, 0xb9ddd0, {
    transparent: true,
    opacity: 0.065,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const wallHeight = eaveY - floorY;
  for (const x of [-4.6, 4.6]) {
    mesh(root, box(0.035, wallHeight, 7.6), glass, x, floorY + wallHeight / 2, 0);
    const shape = new THREE.Shape();
    shape.moveTo(-halfDepth, 0);
    shape.lineTo(halfDepth, 0);
    shape.lineTo(0, ridgeY - eaveY);
    shape.closePath();
    const end = mesh(
      root,
      context.geometry('greenhouse-gable', () => new THREE.ShapeGeometry(shape)),
      glass,
      x,
      eaveY,
      0,
    );
    end.rotation.y = Math.PI / 2;
  }
  mesh(root, box(9.2, wallHeight, 0.035), glass, 0, floorY + wallHeight / 2, -halfDepth);
  for (const x of [-2.65, 2.65])
    mesh(root, box(3.9, wallHeight, 0.035), glass, x, floorY + wallHeight / 2, halfDepth);
  for (const x of [-0.7, 0.7]) mesh(root, box(0.07, 2.6, 0.08), frame, x, floorY + 1.3, halfDepth);
  mesh(root, box(1.47, 0.07, 0.08), frame, 0, floorY + 2.6, halfDepth);
  mesh(root, box(1.33, 2.53, 0.035), glass, 0, floorY + 1.265, halfDepth);
  mesh(
    root,
    box(1.33, wallHeight - 2.6, 0.035),
    glass,
    0,
    floorY + 2.6 + (wallHeight - 2.6) / 2,
    halfDepth,
  );
  mesh(root, cylinder(0.035, 0.035, 0.22), frame, 0.47, 1.65, halfDepth + 0.06).rotation.x =
    Math.PI / 2;
  const roofPanel = (x1, x2, z1, z2) => {
    const z = (z1 + z2) / 2,
      side = z < 0 ? -1 : 1;
    const panel = mesh(
      root,
      box(x2 - x1, 0.025, (z2 - z1) / Math.cos(pitch)),
      glass,
      (x1 + x2) / 2,
      ridgeY - Math.abs(z) * Math.tan(pitch),
      z,
    );
    panel.rotation.x = side * pitch;
    panel.userData.role = 'greenhouse-roof';
  };
  roofPanel(-4.6, 4.6, 0, halfDepth);
  roofPanel(-4.6, -1.25, -halfDepth, 0);
  roofPanel(1.25, 4.6, -halfDepth, 0);
  roofPanel(-1.25, 1.25, -halfDepth, -2.65);
  roofPanel(-1.25, 1.25, -0.45, 0);
  const vent = new THREE.Group();
  root.add(vent);
  vent.position.set(0, ridgeY - 0.45 * Math.tan(pitch), -0.45);
  vent.userData.role = 'greenhouse-vent';
  const ventLength = 2.2 / Math.cos(pitch);
  mesh(vent, box(2.5, 0.035, ventLength), glass, 0, 0, -ventLength / 2);
  for (const x of [-1.25, 1.25])
    mesh(vent, box(0.045, 0.06, ventLength), frame, x, 0, -ventLength / 2);
  for (const z of [0, -ventLength]) mesh(vent, box(2.5, 0.06, 0.045), frame, 0, 0, z);
  const plants = [],
    wiltColor = new THREE.Color(0x9b7d48),
    healthyLeafColor = new THREE.Color(0x4c9655);
  const sprays = [];
  for (const x of [-2.65, 2.65]) {
    mesh(root, box(2.6, 0.65, 6.4), material(0xac8664), x, floorY + 0.325, 0);
    mesh(root, box(2.42, 0.12, 6.2), soil, x, 0.995, 0).userData.role = 'greenhouse-soil';
    for (let index = 0; index < 5; index++) {
      const item = plant(
        context,
        root,
        x,
        -2.4 + index * 1.2,
        1.2,
        index % 2 ? 0x679b4d : 0x4e945c,
      );
      item.group.position.y = 1.055;
      item.group.userData.role = 'greenhouse-plant';
      plants.push(item);
      mesh(item.group, context.sphere(0.12), material(0xd16c45), 0.17, 0.7, 0.16);
    }
    const pipeMaterial = material(0x394c49);
    tube(
      context,
      root,
      [
        [x, 1.055, -2.95],
        [x, 3.25, -2.95],
        [x, 3.25, 2.95],
      ],
      0.04,
      pipeMaterial,
    );
    for (const z of [-1.6, 1.6]) {
      mesh(root, cylinder(0.08, 0.05, 0.13), pipeMaterial, x, 3.17, z);
      sprays.push(spray(context, root, [x, 3.1, z], water, 12, 1.085, 1.1, 0.08));
    }
  }
  for (const z of [-2, 0, 2])
    mesh(root, box(1.1, 0.045, 0.8), material(0xd9cbb3), 0, floorY + 0.0225, z);
  const fan = new THREE.Group();
  root.add(fan);
  fan.position.set(0, 2.75, -3.69);
  fan.userData.role = 'greenhouse-fan';
  mesh(root, box(1.05, 1.05, 0.1), frame, 0, 2.75, -3.75);
  ring(context, root, 0.47, material(0xc0d0c4), 0, 2.75, -3.68);
  for (let index = 0; index < 4; index++) {
    const blade = mesh(fan, box(0.16, 0.48, 0.045), material(0xa2b7ab));
    blade.position.set(
      Math.sin((index * Math.PI) / 2) * 0.16,
      Math.cos((index * Math.PI) / 2) * 0.16,
      0,
    );
    blade.rotation.z = (-index * Math.PI) / 2;
  }
  const heater = paint(context, 0x7b6956, { emissive: 0xe87d3c, emissiveIntensity: 0 });
  mesh(root, box(0.8, 0.65, 0.65), heater, 0, floorY + 0.325, -3.1);
  const light = lamp(context, root, 0, 4.02, 0, 0xd3c0ff);
  mesh(root, box(4.5, 0.12, 0.35), frame, 0, 4.2, 0);
  for (const x of [-2, 2]) mesh(root, cylinder(0.025, 0.025, 0.645), frame, x, 4.5825, 0);
  const meter = thermometer(context, root, 3.9, 2.4, 3.86);
  const flood = mesh(
    root,
    box(8.7, 0.025, 6.8),
    paint(context, 0x73bbce, { transparent: true, opacity: 0.45, depthWrite: false }),
    0,
    0.35,
    0,
  );
  flood.userData.role = 'greenhouse-flood';
  return {
    bounds: new THREE.Box3(new THREE.Vector3(-5, 0.085, -4), new THREE.Vector3(5, 5.75, 4.05)),
    update({ state = {} }) {
      const c = state.controls || {},
        time = finite(state.time),
        growth = clamp(finite(state.growth, 15) / 100),
        health = clamp(finite(state.health, 100) / 100);
      plants.forEach((item, index) => {
        item.group.scale.set(0.7 + growth * 0.35, 0.45 + growth * 1.1, 0.7 + growth * 0.35);
        item.leaf.color.copy(wiltColor).lerp(healthyLeafColor, health);
        item.leaves.forEach(
          (leaf, leafIndex) =>
            (leaf.rotation.z =
              (leafIndex % 2 ? 1 : -1) * (0.25 + (1 - health) * 1.0) +
              Math.sin(time * 0.8 + index) * 0.025),
        );
      });
      vent.rotation.x = -pitch + (on(c.vent) ? 0.65 : 0);
      fan.rotation.z = on(c.vent) ? time * 7 : 0;
      heater.emissiveIntensity = on(c.heater) ? 1.4 : 0;
      light.set(on(c.grow_light));
      sprays.forEach((item) => item.update(time, on(c.pump)));
      flood.visible = finite(state.moisture) >= 88;
      meter.update(state.temperature);
    },
  };
}

function home(context) {
  const { root, mesh, box, cylinder, sphere, material } = context;
  const wall = material(0xe8d7bc),
    roof = material(0x6c8b81),
    wood = material(0x947453),
    metal = material(0x4c6766, 0.4);
  const slab = mesh(root, box(12, 0.25, 11), material(0xaabe8c), 0, 0.21, 0);
  slab.userData = { role: 'home-slab', frameIgnore: true };
  mesh(root, box(5.7, 0.16, 4.5), material(0xaaa99c), -1, 0.415, -1.25);
  mesh(root, box(5.5, 2.85, 4.3), wall, -1, 1.92, -1.25).userData.role = 'home-walls';
  const roofPitch = Math.atan2(1.45, 3);
  for (const side of [-1, 1]) {
    const panel = mesh(
      root,
      box(Math.hypot(3, 1.45), 0.12, 4.8),
      roof,
      -1 + side * 1.5,
      4.07,
      -1.25,
    );
    panel.rotation.z = -side * roofPitch;
    panel.userData.role = 'home-roof';
  }
  mesh(root, box(0.16, 0.12, 4.9), roof, -1, 4.805, -1.25);
  const gable = new THREE.Shape();
  gable.moveTo(-2.75, 0);
  gable.lineTo(2.75, 0);
  gable.lineTo(2.75, 0.12);
  gable.lineTo(0, 1.39);
  gable.lineTo(-2.75, 0.12);
  gable.closePath();
  const gableMaterial = paint(context, 0xe8d7bc, { side: THREE.DoubleSide });
  for (const z of [-3.4, 0.9])
    mesh(
      root,
      context.geometry('home-gable', () => new THREE.ShapeGeometry(gable)),
      gableMaterial,
      -1,
      3.345,
      z,
    );
  mesh(root, box(0.65, 1.3, 0.65), material(0x9c7967), -2.8, 4.15, -2.2);
  const windowMaterial = paint(context, 0x607d83, { emissive: 0xffcc7c, emissiveIntensity: 0 });
  for (const x of [-2.7, 0.7]) {
    mesh(root, box(1.15, 1.1, 0.08), windowMaterial, x, 2.1, 0.94);
    for (const dx of [-0.6, 0, 0.6]) mesh(root, box(0.05, 1.2, 0.08), wood, x + dx, 2.1, 1.01);
    for (const y of [1.5, 2.1, 2.7]) mesh(root, box(1.25, 0.06, 0.08), wood, x, y, 1.01);
  }
  mesh(root, box(0.9, 1.9, 0.13), wood, -1, 1.48, 0.98);
  mesh(root, sphere(0.055), material(0xd3b77d, 0.8), -0.7, 1.5, 1.08);
  mesh(root, box(2.1, 0.25, 1.3), material(0xb0ac9c), -1, 0.21, 6.05);
  mesh(root, box(2, 0.08, 5.6), material(0xc5bba4), -1, 0.375, 3.9).userData.role = 'home-path';
  mesh(root, box(1.3, 0.17, 0.6), material(0xb3aa96), -1, 0.42, 1.2);
  const fenceZ = 5.1,
    gateZ = 5.32;
  const fenceMesh = (shape, x, y, z) => {
    const object = mesh(root, shape, wood, x, y, z);
    object.userData.role = 'home-fence';
    return object;
  };
  for (const x of [-5.6, 5.6]) {
    for (let z = -4.8; z <= 4.8; z += 0.6) fenceMesh(box(0.1, 1.1, 0.32), x, 0.885, z);
    for (const y of [0.65, 1.2]) fenceMesh(box(0.1, 0.1, 9.9), x, y, 0);
  }
  for (let x = -5.5; x <= 5.5; x += 0.65) {
    fenceMesh(box(0.32, 1.1, 0.1), x, 0.885, -5.1);
    if (x < -2.65 || x > 0.7) fenceMesh(box(0.32, 1.1, 0.1), x, 0.885, fenceZ);
  }
  for (const y of [0.65, 1.2]) {
    fenceMesh(box(11.2, 0.1, 0.1), 0, y, -5.1);
    fenceMesh(box(2.85, 0.1, 0.1), -4.175, y, fenceZ);
    fenceMesh(box(4.95, 0.1, 0.1), 3.125, y, fenceZ);
  }
  for (const x of [-2.5, 0.55])
    mesh(root, box(0.25, 1.5, 0.3), metal, x, 1.085, fenceZ).userData.role = 'home-gate-post';
  mesh(root, box(5.6, 0.025, 0.16), metal, -2.5, 0.3475, gateZ).userData.role = 'home-gate-track';
  const gate = new THREE.Group();
  root.add(gate);
  gate.position.set(-0.975, 0.96, gateZ);
  gate.userData.role = 'home-gate';
  for (let x = -1.2; x <= 1.21; x += 0.4) mesh(gate, box(0.1, 1, 0.1), metal, x, 0, 0);
  for (const y of [-0.4, 0.4]) mesh(gate, box(2.7, 0.1, 0.1), metal, 0, y, 0);
  for (const x of [-1.1, 1.1]) {
    const wheel = mesh(gate, cylinder(0.075, 0.075, 0.07, 20), material(0x303e3d), x, -0.525, 0);
    wheel.rotation.x = Math.PI / 2;
    wheel.userData.role = 'home-gate-wheel';
  }
  const exterior = [];
  for (const x of [-4.7, 4.7]) {
    mesh(root, cylinder(0.045, 0.045, 2.2), metal, x, 1.435, 3.7);
    exterior.push(lamp(context, root, x, 2.6, 3.7));
  }
  mesh(root, cylinder(0.82, 0.82, 0.15), material(0xa0a99c), 4.3, 0.41, -3.4);
  const tank = mesh(
    root,
    cylinder(0.7, 0.7, 2.2),
    paint(context, 0x7b9e9f, { transparent: true, opacity: 0.22, depthWrite: false }),
    4.3,
    1.585,
    -3.4,
  );
  tank.userData.role = 'home-water-tank';
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rib = mesh(
      root,
      box(0.035, 2.15, 0.035),
      metal,
      4.3 + Math.sin(angle) * 0.715,
      1.61,
      -3.4 + Math.cos(angle) * 0.715,
    );
    rib.userData.role = 'home-tank-rib';
  }
  mesh(root, cylinder(0.73, 0.73, 0.1), metal, 4.3, 2.735, -3.4);
  mesh(root, cylinder(0.75, 0.75, 0.09), metal, 4.3, 0.53, -3.4);
  const water = mesh(root, cylinder(0.65, 0.65, 2.0), paint(context, 0x599eae), 4.3, 1.6, -3.4);
  water.userData.role = 'home-water';
  tube(
    context,
    root,
    [
      [4.3, 0.65, -3.4],
      [4.3, 0.65, 2.1],
      [2.8, 0.65, 2.1],
    ],
    0.06,
    metal,
  );
  const sprinkler = mesh(root, cylinder(0.07, 0.09, 0.6), metal, 2.8, 0.635, 2.1);
  sprinkler.userData.role = 'home-sprinkler';
  const drops = spray(
    context,
    root,
    [2.8, 0.98, 2.1],
    paint(context, 0x77c4d9),
    24,
    0.365,
    1.1,
    0.65,
  );
  const alarm = lamp(context, root, 1.2, 3.2, 1.02, 0xf15448);
  alarm.object.userData.role = 'home-alarm';
  const heater = paint(context, 0x89785e, { emissive: 0xf58b42, emissiveIntensity: 0 });
  mesh(root, box(0.9, 0.6, 0.2), heater, -2.7, 1.0, 1.0);
  const fan = new THREE.Group();
  root.add(fan);
  const fanMount = ring(context, root, 0.43, material(0xa6bbb1), 1.79, 2.3, -1);
  fanMount.rotation.y = Math.PI / 2;
  fan.position.set(1.81, 2.3, -1.0);
  fan.rotation.y = Math.PI / 2;
  fan.userData.role = 'home-fan';
  for (let index = 0; index < 3; index++) {
    const blade = mesh(fan, box(0.15, 0.46, 0.05), metal);
    blade.position.set(
      Math.sin((index * 2 * Math.PI) / 3) * 0.15,
      Math.cos((index * 2 * Math.PI) / 3) * 0.15,
      0,
    );
    blade.rotation.z = (-index * 2 * Math.PI) / 3;
  }
  mesh(fan, cylinder(0.1, 0.1, 0.1), metal).rotation.x = Math.PI / 2;
  const visitor = new THREE.Group();
  root.add(visitor);
  visitor.userData.role = 'home-visitor';
  mesh(visitor, sphere(0.18), material(0xdab08b), 0, 1.15, 0);
  mesh(visitor, box(0.34, 0.5, 0.22), material(0x6488ac), 0, 0.75, 0);
  for (const x of [-0.11, 0.11]) mesh(visitor, box(0.1, 0.45, 0.12), material(0x46565b), x, 0.3, 0);
  const rainMaterial = paint(context, 0x82b6d1, { transparent: true, opacity: 0.55 });
  const rain = Array.from({ length: 40 }, () => {
    const drop = mesh(root, box(0.02, 0.2, 0.02), rainMaterial);
    drop.userData.frameIgnore = true;
    return drop;
  });
  const meter = thermometer(context, root, -4.2, 2.4, 1.0);
  return {
    bounds: new THREE.Box3(new THREE.Vector3(-5.8, 0.085, -5.2), new THREE.Vector3(5.8, 4.9, 6.7)),
    update({ state = {}, parameters = {} }) {
      const c = state.controls || {},
        time = finite(state.time),
        dayLength = finite(parameters.dayLength, 60),
        phase = (time % dayLength) / dayLength;
      const raining = phase > 0.35 && phase < 0.48,
        motion = (phase > 0.12 && phase < 0.22) || (phase > 0.66 && phase < 0.78);
      windowMaterial.emissiveIntensity = on(c.indoor_light) ? 1.5 : 0;
      windowMaterial.color.set(on(c.indoor_light) ? 0xf5d38f : 0x607d83);
      exterior.forEach((item) => item.set(on(c.outdoor_light)));
      gate.position.x = -0.975 - clamp(finite(state.gate)) * 3.05;
      const level = clamp(finite(state.water, 70) / 100);
      water.visible = level > 0;
      water.scale.y = level;
      water.position.y = 0.6 + level;
      drops.update(time, on(c.sprinkler) && finite(state.water) > 0);
      alarm.set(!!state.alarmActive || !!state.alarm);
      heater.emissiveIntensity = on(c.heater) ? 1.3 : 0;
      fan.rotation.z = on(c.fan) ? time * 6 : 0;
      visitor.visible = motion;
      visitor.position.set(-1, 0.34, 5.75 + Math.sin(time) * 0.08);
      rain.forEach((object, index) => {
        object.visible = raining;
        object.position.set(
          Math.sin(index * 2.4) * 5.6,
          0.7 + ((((index / 40 - time * 0.7) % 1) + 1) % 1) * 5.2,
          Math.cos(index * 1.7) * 4.9,
        );
      });
      meter.update(state.temperature);
    },
  };
}

export function createAutomationModel(type, context) {
  const construct = { aquarium, greenhouse, smart_home: home }[type];
  if (!construct) throw new Error(`Unsupported automation scene: ${type}`);
  return construct(context);
}

export const AUTOMATION_FRAMING = Object.freeze({
  aquarium: {
    target: [0, 2.7, 0],
    perspective: [10.5, 7.5, 11.5],
    front: [0, 3.1, 16],
    top: [0, 22, 0.001],
  },
  greenhouse: {
    target: [0, 2.1, 0],
    perspective: [12, 9, 13],
    front: [0, 4.0, 19],
    top: [0, 26, 0.001],
  },
  smart_home: {
    target: [0, 1.8, 0.5],
    perspective: [12, 10, 14],
    front: [0, 4.5, 21],
    top: [0, 28, 0.501],
  },
});

// The renderer and collision solver consume these same visible primitive recipes.
// A train is a compound solid, not its large rectangular reservation envelope.
const part = (id, shape, size, position = [0, 0, 0], options = {}) =>
  Object.freeze({
    id,
    shape,
    size: Object.freeze(size),
    position: Object.freeze(position),
    ...options,
  });

export const CAR_SCALE = Object.freeze([0.96, 1, 1]);
export const TRAIN_SCALE = Object.freeze([0.68, 0.68, 0.68]);
export const CAR_PARTS = Object.freeze([
  part('body', 'capsule', [0.19, 0.43, 5, 16], [0, 0.25, 0], {
    rotation: [Math.PI / 2, 0, 0],
    scale: [1.3, 1, 0.65],
    paint: 'body',
  }),
  part('cabin', 'box', [0.36, 0.22, 0.38], [0, 0.43, -0.02], { paint: 'body' }),
  part('windshield', 'box', [0.31, 0.15, 0.028], [0, 0.45, 0.19], {
    rotation: [-0.25, 0, 0],
    paint: 'glass',
  }),
  ...[-1, 1].map((side) =>
    part(`window:${side}`, 'box', [0.032, 0.14, 0.3], [side * 0.185, 0.45, -0.02], {
      paint: 'glass',
    }),
  ),
  ...[-1, 1].flatMap((side) =>
    [-0.27, 0.27].map((z) =>
      part(`wheel:${side}:${z}`, 'cylinder', [0.115, 0.115, 0.079, 18], [side * 0.22, 0.13, z], {
        rotation: [0, 0, Math.PI / 2],
        paint: 'tire',
        wheel: true,
      }),
    ),
  ),
  ...[-1, 1].flatMap((side) => [
    part(`headlight:${side}`, 'sphere', [0.05, 24, 16], [side * 0.16, 0.27, 0.39], {
      scale: [1, 1, 0.4],
      paint: 'lamp',
    }),
    part(`taillight:${side}`, 'sphere', [0.039, 24, 16], [side * 0.16, 0.27, -0.4], {
      scale: [1, 1, 0.4],
      paint: 'tail',
    }),
  ]),
]);

export const TRAIN_PARTS = Object.freeze([
  part('chassis', 'box', [0.64, 0.13, 1.3], [0, 0.25, -0.12], { paint: 'dark' }),
  part('boiler', 'cylinder', [0.24, 0.24, 0.85, 28], [0, 0.6, 0.04], {
    rotation: [Math.PI / 2, 0, 0],
    paint: 'body',
  }),
  part('nose', 'cylinder', [0.23, 0.23, 0.045, 28], [0, 0.6, 0.49], {
    rotation: [Math.PI / 2, 0, 0],
    paint: 'dark',
  }),
  part('cab', 'box', [0.59, 0.6, 0.4], [0, 0.68, -0.5], { paint: 'body' }),
  part('roof', 'box', [0.68, 0.07, 0.52], [0, 1.02, -0.5], { paint: 'dark' }),
  ...[-1, 1].map((side) =>
    part(`window:${side}`, 'box', [0.035, 0.21, 0.27], [side * 0.3, 0.79, -0.5], {
      paint: 'glass',
    }),
  ),
  part('chimney', 'cylinder', [0.08, 0.11, 0.31, 28], [0, 0.96, 0.26], { paint: 'dark' }),
  part('chimney-cap', 'cylinder', [0.13, 0.13, 0.06, 28], [0, 1.13, 0.26], { paint: 'metal' }),
  part('headlight', 'sphere', [0.075, 24, 16], [0, 0.64, 0.54], { paint: 'lamp' }),
  part('plow', 'cone', [0.36, 0.28, 4], [0, 0.22, 0.66], {
    rotation: [Math.PI / 2, 0, 0],
    paint: 'plow',
  }),
  part('wagon', 'box', [0.58, 0.38, 0.55], [0, 0.49, -1.14], { paint: 'body' }),
  ...Array.from({ length: 9 }, (_, i) =>
    part(
      `coal:${i}`,
      'sphere',
      [0.09, 24, 16],
      [Math.sin(i * 2.4) * 0.16, 0.7 + (i % 2) * 0.04, -1.15 + Math.cos(i * 2.4) * 0.14],
      { paint: 'dark' },
    ),
  ),
  ...[-1, 1].flatMap((side) =>
    [-1.3, -0.98, -0.47, -0.06, 0.35].map((z) =>
      part(`wheel:${side}:${z}`, 'cylinder', [0.15, 0.15, 0.08, 18], [side * 0.32, 0.17, z], {
        rotation: [0, 0, Math.PI / 2],
        paint: 'dark',
        wheel: true,
      }),
    ),
  ),
]);

export function primitiveVertices({ shape, size }) {
  const points = [];
  if (shape === 'box') {
    for (const x of [-size[0] / 2, size[0] / 2])
      for (const y of [-size[1] / 2, size[1] / 2])
        for (const z of [-size[2] / 2, size[2] / 2]) points.push([x, y, z]);
  } else if (shape === 'cylinder' || shape === 'cone') {
    const [top, bottom, height, segments] =
      shape === 'cone' ? [0, size[0], size[1], size[2]] : size;
    for (const [radius, y] of [
      [top, height / 2],
      [bottom, -height / 2],
    ])
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push([radius * Math.sin(angle), y, radius * Math.cos(angle)]);
      }
  } else if (shape === 'sphere') {
    const [radius, width, height] = size;
    for (let y = 0; y <= height; y++)
      for (let x = 0; x <= width; x++) {
        const theta = (y / height) * Math.PI,
          phi = (x / width) * Math.PI * 2;
        points.push([
          -radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.cos(theta),
          radius * Math.sin(theta) * Math.sin(phi),
        ]);
      }
  } else if (shape === 'capsule') {
    const [radius, height, cap, radial] = size;
    for (let row = 0; row <= cap * 2 + 1; row++) {
      let y, ring;
      if (row <= cap) {
        const angle = ((row / cap) * Math.PI) / 2;
        y = -height / 2 - radius * Math.cos(angle);
        ring = radius * Math.sin(angle);
      } else if (row === cap + 1) {
        y = height / 2;
        ring = radius;
      } else {
        const angle = (((row - cap - 1) / cap) * Math.PI) / 2;
        y = height / 2 + radius * Math.sin(angle);
        ring = radius * Math.cos(angle);
      }
      for (let x = 0; x <= radial; x++) {
        const angle = (x / radial) * Math.PI * 2;
        points.push([-ring * Math.cos(angle), y, ring * Math.sin(angle)]);
      }
    }
  } else throw new Error(`Unsupported transport primitive: ${shape}`);
  return points.map((point) => point.map(Math.fround));
}

function transformRecipe(point, recipe, groupScale) {
  let [x, y, z] = point.map((value, axis) => value * (recipe.scale?.[axis] ?? 1));
  const [rx, ry, rz] = recipe.rotation ?? [0, 0, 0];
  [x, y] = [Math.cos(rz) * x - Math.sin(rz) * y, Math.sin(rz) * x + Math.cos(rz) * y];
  [x, z] = [Math.cos(ry) * x + Math.sin(ry) * z, -Math.sin(ry) * x + Math.cos(ry) * z];
  [y, z] = [Math.cos(rx) * y - Math.sin(rx) * z, Math.sin(rx) * y + Math.cos(rx) * z];
  return [x, y, z].map((value, axis) => (value + recipe.position[axis]) * groupScale[axis]);
}
function compile(recipes, scale) {
  return recipes.map((recipe) => {
    const points = primitiveVertices(recipe).map((point) => transformRecipe(point, recipe, scale));
    const low = [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis])));
    const high = [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis])));
    return { id: recipe.id, wheel: !!recipe.wheel, points, low, high };
  });
}
const compiled = { car: compile(CAR_PARTS, CAR_SCALE), train: compile(TRAIN_PARTS, TRAIN_SCALE) };

function placeParts(source, pose) {
  const cosine = Math.cos(pose.heading),
    sine = Math.sin(pose.heading);
  const bounds = (low, high) => {
    const centreX = (low[0] + high[0]) / 2,
      centreZ = (low[2] + high[2]) / 2;
    const halfX = (high[0] - low[0]) / 2,
      halfZ = (high[2] - low[2]) / 2;
    const x = pose.x + cosine * centreX + sine * centreZ;
    const z = pose.z - sine * centreX + cosine * centreZ;
    const hx = Math.abs(cosine) * halfX + Math.abs(sine) * halfZ;
    const hz = Math.abs(sine) * halfX + Math.abs(cosine) * halfZ;
    return { low: [x - hx, pose.y + low[1], z - hz], high: [x + hx, pose.y + high[1], z + hz] };
  };
  source.bounds ??= {
    low: [0, 1, 2].map((axis) => Math.min(...source.map((p) => p.low[axis]))),
    high: [0, 1, 2].map((axis) => Math.max(...source.map((p) => p.high[axis]))),
  };
  let parts;
  return {
    ...bounds(source.bounds.low, source.bounds.high),
    get parts() {
      return (parts ??= source.map((local) => ({
        ...local,
        pose,
        cosine,
        sine,
        ...bounds(local.low, local.high),
      })));
    },
  };
}
export const collisionBody = (kind, pose) => placeParts(compiled[kind], pose);
export const boxCollisionBody = (size, pose) =>
  placeParts(compile([part('blade', 'box', size)], [1, 1, 1]), pose);

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const neg = (a) => a.map((v) => -v);
const length2 = (a) => dot(a, a);
const EPS = 1e-10;
function boundsOverlap(a, b) {
  return [0, 1, 2].every(
    (axis) => a.low[axis] <= b.high[axis] + EPS && b.low[axis] <= a.high[axis] + EPS,
  );
}
function world(part, point) {
  return [
    part.pose.x + part.cosine * point[0] + part.sine * point[2],
    part.pose.y + point[1],
    part.pose.z - part.sine * point[0] + part.cosine * point[2],
  ];
}
function support(part, direction) {
  const localDirection = [
    part.cosine * direction[0] - part.sine * direction[2],
    direction[1],
    part.sine * direction[0] + part.cosine * direction[2],
  ];
  let best = part.points[0],
    maximum = -Infinity;
  for (const point of part.points) {
    const distance = dot(point, localDirection);
    if (distance > maximum) {
      maximum = distance;
      best = point;
    }
  }
  return world(part, best);
}
function solve(matrix, values) {
  const rows = matrix.map((row, i) => [...row, values[i]]);
  for (let col = 0; col < rows.length; col++) {
    let pivot = col;
    for (let row = col + 1; row < rows.length; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < 1e-13) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    for (let k = col; k <= rows.length; k++) rows[col][k] /= divisor;
    for (let row = 0; row < rows.length; row++)
      if (row !== col) {
        const factor = rows[row][col];
        for (let k = col; k <= rows.length; k++) rows[row][k] -= factor * rows[col][k];
      }
  }
  return rows.map((row) => row.at(-1));
}
function closestSimplex(simplex) {
  let best;
  for (let mask = 1; mask < 1 << simplex.length; mask++) {
    const selected = simplex.filter((_, i) => mask & (1 << i)),
      n = selected.length;
    const matrix = selected.map((one) => [...selected.map((two) => dot(one.v, two.v)), 1]);
    matrix.push([...selected.map(() => 1), 0]);
    const solution = solve(matrix, [...selected.map(() => 0), 1]);
    if (!solution || solution.slice(0, n).some((value) => value < -1e-9)) continue;
    const weights = solution.slice(0, n);
    const weighted = (key) =>
      [0, 1, 2].map((axis) =>
        selected.reduce((sum, vertex, i) => sum + vertex[key][axis] * weights[i], 0),
      );
    const v = weighted('v'),
      squared = length2(v);
    if (!best || squared < best.squared)
      best = { v, squared, a: weighted('a'), b: weighted('b'), selected };
  }
  return best;
}
function convexDistance(a, b) {
  const minkowski = (direction) => {
    const one = support(a, direction),
      two = support(b, neg(direction));
    return { v: sub(one, two), a: one, b: two };
  };
  let simplex = [minkowski([1, 0, 0])],
    closest = closestSimplex(simplex);
  for (let iteration = 0; iteration < 48; iteration++) {
    if (closest.squared < 1e-20) break;
    const next = minkowski(neg(closest.v));
    if (closest.squared - dot(closest.v, next.v) < 1e-14) break;
    simplex = [...closest.selected, next];
    closest = closestSimplex(simplex);
  }
  return { distance: Math.sqrt(closest.squared), pointA: closest.a, pointB: closest.b };
}
export function collisionPair(a, b) {
  if (!boundsOverlap(a, b)) return null;
  for (const one of a.parts)
    for (const two of b.parts)
      if (boundsOverlap(one, two) && convexDistance(one, two).distance <= 1e-7) return [one, two];
  return null;
}
export const bodiesOverlap = (a, b) => collisionPair(a, b) !== null;
export function bodyContactDetail(a, b) {
  const pair = collisionPair(a, b);
  if (!pair) return null;
  return { ...convexDistance(...pair), partA: pair[0].id, partB: pair[1].id };
}
export function bodyContact(a, b) {
  const contact = bodyContactDetail(a, b);
  return (
    contact && {
      x: (contact.pointA[0] + contact.pointB[0]) / 2,
      z: (contact.pointA[2] + contact.pointB[2]) / 2,
    }
  );
}
export function bodySeparation(a, b) {
  let minimum = Infinity;
  for (const one of a.parts)
    for (const two of b.parts) {
      const lowerBound = Math.hypot(
        ...[0, 1, 2].map((axis) =>
          Math.max(0, one.low[axis] - two.high[axis], two.low[axis] - one.high[axis]),
        ),
      );
      if (lowerBound <= minimum) minimum = Math.min(minimum, convexDistance(one, two).distance);
    }
  return minimum;
}

export function collisionPartVertices(part) {
  return part.points.map((point) => world(part, point));
}

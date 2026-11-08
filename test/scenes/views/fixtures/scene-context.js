import * as THREE from 'three';

export function sceneContext({ mechanics = false } = {}) {
  const resources = new Set(),
    root = new THREE.Group(),
    cache = new Map(),
    materials = new Map();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const geometry = (key, factory) => {
    if (!cache.has(key)) cache.set(key, keep(factory()));
    return cache.get(key);
  };
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return materials.get(key);
  };
  const context = {
    root,
    keep,
    geometry,
    material,
    release(resource) {
      resources.delete(resource);
      resource.dispose();
    },
    box: (w, h, d) => geometry(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
    cylinder: (top, bottom, height, segments = 24) =>
      geometry(
        `c:${top}:${bottom}:${height}:${segments}`,
        () => new THREE.CylinderGeometry(top, bottom, height, segments),
      ),
    sphere: (r) => geometry(`s:${r}`, () => new THREE.SphereGeometry(r, 16, 12)),
    mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
      const object = new THREE.Mesh(shape, paint);
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    },
    label(parent, text, x, y, z, width = 2.4) {
      const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial()));
      sprite.position.set(x, y, z);
      sprite.scale.set(width, 0.2, 1);
      sprite.userData.frameIgnore = true;
      parent.add(sprite);
      return {
        sprite,
        set: (value) => {
          sprite.userData.text = value;
        },
        dispose: () => sprite.removeFromParent(),
      };
    },
  };
  if (mechanics) {
    context.cylinder = (radius, length, segments = 24) =>
      geometry(`mc:${radius}:${length}:${segments}`, () =>
        new THREE.CylinderGeometry(radius, radius, length, segments).rotateZ(-Math.PI / 2),
      );
    for (const [key, color] of Object.entries({
      steel: 0xbac5c4,
      brightSteel: 0xe0e6e2,
      black: 0x293631,
      dark: 0x53625c,
      ivory: 0xe0e7db,
      brass: 0xc5a25b,
      sensorBody: 0x36574a,
    }))
      context[key] = material(color);
    context.accents = [0x63917a, 0x7293b1, 0xc29a5e].map((color) => material(color));
    context.wireMaterials = [0xc97661, 0x6a8f71, 0x59748d, 0xd4b461].map((color) =>
      material(color),
    );
  }
  return { context, root, dispose: () => resources.forEach((resource) => resource.dispose?.()) };
}
export function objects(root, role) {
  const found = [];
  root.traverse((object) => {
    if (object.userData.role === role) found.push(object);
  });
  return found;
}
export function worldBounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object, true);
}

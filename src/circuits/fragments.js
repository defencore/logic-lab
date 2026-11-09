import { isMomentaryInput } from '../components/peripheral-inputs.js';
import { isKeypad } from '../components/keypad.js';
import { validateProject } from './project.js';

const KIND = 'logic-lab-fragment';
const MAX_BYTES = 10_000_000;
const LIMIT = 1_000_000;
const UNSAFE = new Set(['__proto__', 'prototype', 'constructor']);
const RESERVED_IDS = new Set([...Object.getOwnPropertyNames(Object.prototype), 'prototype']);
const messages = {
  fragment_format: 'This is not a supported Logic Lab fragment.',
  fragment_invalid: 'The fragment contains invalid components or connections.',
  fragment_too_large: 'The fragment exceeds 10 MB.',
  fragment_limits: 'The pasted fragment exceeds the project component or wire limit.',
  fragment_position: 'The fragment cannot be placed within the workspace coordinate limits.',
  fragment_ids: 'Fresh component and wire identifiers could not be generated.',
};

export class FragmentError extends Error {
  constructor(code, cause) {
    super(messages[code] || code, cause ? { cause } : undefined);
    this.name = 'FragmentError';
    this.code = code;
  }
}

function checkedProject(project) {
  try {
    return validateProject(project);
  } catch (error) {
    throw new FragmentError('fragment_invalid', error);
  }
}
function checkedFragment(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.kind !== KIND ||
    value.version !== 1 ||
    Object.keys(value).some((key) => !['kind', 'version', 'nodes', 'wires'].includes(key)) ||
    !Array.isArray(value.nodes) ||
    !value.nodes.length ||
    !Array.isArray(value.wires)
  )
    throw new FragmentError('fragment_format');
  const { nodes, wires } = checkedProject({
    version: 1,
    name: 'Clipboard fragment',
    nodes: value.nodes,
    wires: value.wires,
  });
  // Transient presses and copied keyboard toggle state never activate a pasted source.
  nodes
    .filter((node) => node.type === 'hotkey' || isMomentaryInput(node))
    .forEach((node) => {
      node.params.value = 0;
    });
  nodes
    .filter((node) => isKeypad(node.type))
    .forEach((node) => {
      node.params.keys = 0;
    });
  return { kind: KIND, version: 1, nodes, wires };
}
function checkSize(source) {
  if (source.length > MAX_BYTES || new TextEncoder().encode(source).byteLength > MAX_BYTES)
    throw new FragmentError('fragment_too_large');
}

export function createFragment(project, selected) {
  if (selected == null) return null;
  if (!(selected instanceof Set) && !Array.isArray(selected))
    throw new FragmentError('fragment_format');
  if (!project || !Array.isArray(project.nodes) || !Array.isArray(project.wires))
    throw new FragmentError('fragment_invalid');
  const ids = new Set(selected);
  const nodes = project.nodes.filter((node) => ids.has(node.id));
  if (!nodes.length) return null;
  const live = new Set(nodes.map((node) => node.id));
  const wires = project.wires.filter(
    (wire) => live.has(wire?.from?.node) && live.has(wire?.to?.node),
  );
  return checkedFragment({ kind: KIND, version: 1, nodes, wires });
}

export function serializeFragment(fragment) {
  const source = JSON.stringify(checkedFragment(fragment));
  checkSize(source);
  return source;
}

export function parseFragment(source) {
  if (typeof source !== 'string') throw new FragmentError('fragment_format');
  checkSize(source);
  let value;
  try {
    value = JSON.parse(source, (key, item) => {
      if (UNSAFE.has(key)) throw new FragmentError('fragment_format');
      return item;
    });
  } catch (error) {
    if (error instanceof FragmentError) throw error;
    throw new FragmentError('fragment_format', error);
  }
  return checkedFragment(value);
}

function translation(fragment, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new FragmentError('fragment_position');
  const bounds = { x: [Infinity, -Infinity], y: [Infinity, -Infinity] };
  const extend = (point) => {
    for (const axis of ['x', 'y']) {
      bounds[axis][0] = Math.min(bounds[axis][0], point[axis]);
      bounds[axis][1] = Math.max(bounds[axis][1], point[axis]);
    }
  };
  fragment.nodes.forEach(extend);
  fragment.wires.forEach((wire) => wire.points?.forEach(extend));
  const move = (axis, requested) =>
    Math.max(-LIMIT - bounds[axis][0], Math.min(LIMIT - bounds[axis][1], requested));
  const x = move('x', dx),
    y = move('y', dy);
  if ((dx || dy) && !x && !y) throw new FragmentError('fragment_position');
  return { x, y };
}

export function instantiateFragment(fragment, project, { uid, dx = 40, dy = 40 } = {}) {
  const source = checkedFragment(fragment),
    target = checkedProject(project);
  if (
    source.nodes.length + target.nodes.length > 1000 ||
    source.wires.length + target.wires.length > 5000
  )
    throw new FragmentError('fragment_limits');
  if (typeof uid !== 'function') throw new FragmentError('fragment_ids');
  const offset = translation(source, dx, dy);
  const used = new Set(
    [...target.nodes, ...target.wires, ...source.nodes, ...source.wires].map((item) => item.id),
  );
  function fresh(prefix) {
    for (let attempt = 0; attempt < 32; attempt++) {
      let value;
      try {
        value = uid(prefix);
      } catch (error) {
        throw new FragmentError('fragment_ids', error);
      }
      if (
        typeof value !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(value) ||
        RESERVED_IDS.has(value)
      )
        throw new FragmentError('fragment_ids');
      if (!used.has(value)) {
        used.add(value);
        return value;
      }
    }
    throw new FragmentError('fragment_ids');
  }
  const bindings = new Set(
    target.nodes
      .filter((node) => node.type === 'hotkey')
      .map((node) => node.params.binding)
      .filter(Boolean),
  );
  const ids = new Map();
  let clearedHotkeys = 0;
  const nodes = source.nodes.map((node) => {
    const copy = structuredClone(node);
    copy.id = fresh('n');
    copy.x += offset.x;
    copy.y += offset.y;
    ids.set(node.id, copy.id);
    if (copy.type === 'hotkey') {
      const binding = copy.params.binding || '';
      copy.params.binding = binding;
      if (binding && bindings.has(binding)) {
        copy.params.binding = '';
        clearedHotkeys++;
      } else if (binding) bindings.add(binding);
    }
    return copy;
  });
  const wires = source.wires.map((wire) => ({
    ...structuredClone(wire),
    id: fresh('w'),
    from: { node: ids.get(wire.from.node), port: wire.from.port },
    to: { node: ids.get(wire.to.node), port: wire.to.port },
    ...(wire.points
      ? { points: wire.points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })) }
      : {}),
  }));
  const combined = checkedProject({
    ...target,
    nodes: [...target.nodes, ...nodes],
    wires: [...target.wires, ...wires],
  });
  return {
    nodes: combined.nodes.slice(target.nodes.length),
    wires: combined.wires.slice(target.wires.length),
    clearedHotkeys,
  };
}

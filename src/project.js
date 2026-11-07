import { getDefinition } from './catalog.js';

export const STORAGE_KEY = 'logic-lab.project.v1';
const MAX_NODES = 1000;
const MAX_WIRES = 5000;
const MAX_FILE_LENGTH = 5_000_000;
const MAX_FILE_BYTES = 10_000_000;
const RESERVED_IDENTIFIERS = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  'prototype',
]);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function fail(message) {
  throw new Error(message);
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value;
}

function text(value, label, max = 200) {
  if (typeof value !== 'string' || value.length > max)
    fail(`${label} must be text of at most ${max} characters.`);
  return value;
}

function identifier(value, label) {
  const result = text(value, label, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(result) || RESERVED_IDENTIFIERS.has(result)) {
    fail(`${label} contains unsupported characters.`);
  }
  return result;
}

function finite(value, label, limit = 1_000_000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit)
    fail(`${label} must be a finite number within ±${limit}.`);
  return value;
}

function primitive(value, label) {
  if (value === null || typeof value === 'boolean') return value;
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= Number.MAX_SAFE_INTEGER
  )
    return value;
  if (typeof value === 'string' && value.length <= 16384) return value;
  fail(`${label} must contain only finite numbers, text, booleans, or null.`);
}

function parameters(value, label, definition) {
  record(value, label);
  const result = {};
  const entries = Object.entries(value);
  if (entries.length > 100) fail(`${label} has too many fields.`);
  for (const [key, item] of entries) {
    identifier(key, `${label} key`);
    const expected = definition.defaults[key];
    if (typeof expected === 'number' && (typeof item !== 'number' || !Number.isFinite(item))) {
      fail(`${label}.${key} must be a finite number.`);
    }
    if (typeof expected === 'boolean' && typeof item !== 'boolean')
      fail(`${label}.${key} must be true or false.`);
    if (
      typeof expected === 'string' &&
      typeof item !== 'string' &&
      !(
        key === 'data' &&
        Array.isArray(item) &&
        item.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
      )
    ) {
      fail(
        `${label}.${key} must be text${key === 'data' ? ' or an array of finite numbers' : ''}.`,
      );
    }
    if (key === 'color' && typeof expected === 'string' && !/^#[0-9a-f]{6}$/i.test(item)) {
      fail(`${label}.color must be a six-digit hexadecimal color.`);
    }
    if (Array.isArray(item)) {
      if (item.length > 4096) fail(`${label}.${key} has too many values.`);
      result[key] = item.map((entry) => primitive(entry, `${label}.${key}`));
    } else result[key] = primitive(item, `${label}.${key}`);
  }
  return result;
}

function portFor(node, portId, direction) {
  const definition = getDefinition(node.type);
  const pin = definition[direction].find((candidate) => candidate.id === portId);
  if (!pin)
    fail(`Unknown ${direction === 'outputs' ? 'output' : 'input'} port "${portId}" on ${node.id}.`);
  return pin;
}

export function validateProject(value) {
  record(value, 'Project');
  if (value.version !== 1) fail('Unsupported project version. Expected version 1.');
  const name = text(value.name, 'Project name', 200).trim() || 'Untitled circuit';
  if (!Array.isArray(value.nodes) || value.nodes.length > MAX_NODES)
    fail(`Project must contain at most ${MAX_NODES} components.`);
  if (!Array.isArray(value.wires) || value.wires.length > MAX_WIRES)
    fail(`Project must contain at most ${MAX_WIRES} wires.`);
  const ids = new Set();
  const nodes = value.nodes.map((item, index) => {
    record(item, `Component ${index + 1}`);
    const id = identifier(item.id, 'Component ID');
    if (ids.has(id)) fail(`Duplicate component ID "${id}".`);
    ids.add(id);
    const type = identifier(item.type, `Type of ${id}`);
    const definition = getDefinition(type);
    if (!definition) fail(`Unknown component type "${type}".`);
    if (own(item, 'enabled') && typeof item.enabled !== 'boolean')
      fail(`Enabled state of ${id} must be true or false.`);
    return {
      id,
      type,
      x: finite(item.x, `X position of ${id}`),
      y: finite(item.y, `Y position of ${id}`),
      label: own(item, 'label') ? text(item.label, `Label of ${id}`, 500) : '',
      enabled: item.enabled !== false,
      params: parameters(item.params ?? {}, `Parameters of ${id}`, definition),
    };
  });
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const wireIds = new Set();
  const connections = new Set();
  const wires = value.wires.map((item, index) => {
    record(item, `Wire ${index + 1}`);
    const id = identifier(item.id, 'Wire ID');
    if (wireIds.has(id)) fail(`Duplicate wire ID "${id}".`);
    wireIds.add(id);
    record(item.from, `Source of ${id}`);
    record(item.to, `Destination of ${id}`);
    const from = {
      node: identifier(item.from.node, `Source component of ${id}`),
      port: identifier(item.from.port, `Source port of ${id}`),
    };
    const to = {
      node: identifier(item.to.node, `Destination component of ${id}`),
      port: identifier(item.to.port, `Destination port of ${id}`),
    };
    const sourceNode = nodeMap.get(from.node);
    const targetNode = nodeMap.get(to.node);
    if (!sourceNode || !targetNode) fail(`Wire "${id}" references a missing component.`);
    const sourcePin = portFor(sourceNode, from.port, 'outputs');
    const targetPin = portFor(targetNode, to.port, 'inputs');
    if (!targetPin.acceptAny && !!sourcePin.analog !== !!targetPin.analog)
      fail(`Wire "${id}" connects incompatible analog and digital ports.`);
    const width = sourcePin.width ?? 1;
    if (!targetPin.acceptAny && width !== (targetPin.width ?? 1))
      fail(`Wire "${id}" connects ports with different bit widths.`);
    if (own(item, 'width') && item.width !== width)
      fail(`Wire "${id}" width must match its source port (${width}).`);
    const connection = JSON.stringify([from.node, from.port, to.node, to.port]);
    if (connections.has(connection)) fail(`Wire "${id}" duplicates an existing connection.`);
    connections.add(connection);
    const wire = { id, from, to, width };
    if (own(item, 'points')) {
      if (!Array.isArray(item.points) || item.points.length > 100)
        fail(`Wire "${id}" must contain at most 100 route points.`);
      wire.points = item.points.map((point) => {
        record(point, `Route point of ${id}`);
        return { x: finite(point.x, `Route X of ${id}`), y: finite(point.y, `Route Y of ${id}`) };
      });
    }
    return wire;
  });
  const result = { version: 1, name, nodes, wires };
  if (own(value, 'exampleId')) result.exampleId = identifier(value.exampleId, 'Example ID');
  if (own(value, 'wireStyle')) {
    if (!['orthogonal', 'bezier'].includes(value.wireStyle))
      fail('Wire style must be orthogonal or bezier.');
    result.wireStyle = value.wireStyle;
  }
  if (own(value, 'viewport')) {
    record(value.viewport, 'Viewport');
    const zoom = finite(value.viewport.zoom, 'Zoom', 4);
    if (zoom < 0.2) fail('Zoom must be between 0.2 and 4.');
    result.viewport = {
      x: finite(value.viewport.x, 'Viewport X'),
      y: finite(value.viewport.y, 'Viewport Y'),
      zoom,
    };
  }
  return result;
}

export function parseProject(source) {
  if (
    typeof source !== 'string' ||
    source.length > MAX_FILE_LENGTH ||
    new TextEncoder().encode(source).byteLength > MAX_FILE_BYTES
  )
    fail('Project file is too large or is not text.');
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    fail('This file is not valid JSON.');
  }
  return validateProject(value);
}

export function serializeProject(project) {
  const source = JSON.stringify(validateProject(project), null, 2);
  if (
    source.length > MAX_FILE_LENGTH ||
    new TextEncoder().encode(source).byteLength > MAX_FILE_BYTES
  )
    fail(
      'Project file is too large. Remove unused components or shorten annotations before exporting.',
    );
  return source;
}

export function loadProject() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored ? parseProject(stored) : null;
  } catch {
    return null;
  }
}

export function saveProject(project) {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(STORAGE_KEY, serializeProject(project));
    return true;
  } catch {
    return false;
  }
}

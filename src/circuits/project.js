import { getDefinition } from '../components/catalog/index.js';
import { MIN_ZOOM, MAX_ZOOM } from './viewport.js';
import { createProjectStorage } from './project-storage.js';

export { STORAGE_KEY, PROJECT_RECOVERY_KEY } from './project-storage.js';
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
  if (definition.type === 'servo' && (own(value, 'minDuty') || own(value, 'maxDuty')))
    fail(
      `${label}: obsolete servo duty-ratio settings. Use digital PWM with minPulse, centerPulse and maxPulse in microseconds; keep the original file for reference.`,
    );
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

// Convert saved grouped connections once; the editor and simulator use only
// individual contacts, and serialized projects always contain the expanded form.
function expandImportedLines(value) {
  if (!Array.isArray(value?.nodes) || !Array.isArray(value?.wires)) return value;
  const nodes = new Map(
    value.nodes.filter((node) => node && typeof node === 'object').map((node) => [node.id, node]),
  );
  const ids = new Set();
  for (const wire of value.wires) {
    record(wire, 'Wire');
    const id = identifier(wire.id, 'Wire ID');
    if (ids.has(id)) fail(`Duplicate wire ID "${id}".`);
    ids.add(id);
  }
  const lineId = (id, bit) => {
    let attempt = 0;
    while (true) {
      const suffix = `-b${bit}${attempt ? `-${attempt}` : ''}`;
      const candidate = id.slice(0, 100 - suffix.length) + suffix;
      if (!ids.has(candidate)) {
        ids.add(candidate);
        return candidate;
      }
      attempt++;
    }
  };
  const wires = value.wires.flatMap((wire) => {
    const source = getDefinition(nodes.get(wire.from?.node)?.type);
    const target = getDefinition(nodes.get(wire.to?.node)?.type);
    const output = source?.signals.outputs.find((port) => port.id === wire.from?.port);
    const input = target?.signals.inputs.find((port) => port.id === wire.to?.port);
    if (!output || !input || output.width === 1) return [wire];
    if (!input.acceptAny && !!output.analog !== !!input.analog)
      fail(`Wire "${wire.id}" connects incompatible analog and digital ports.`);
    if (!input.acceptAny && output.width !== input.width)
      fail(`Wire "${wire.id}" connects signals with different bit widths.`);
    if (own(wire, 'width') && wire.width !== output.width)
      fail(`Wire "${wire.id}" width must match its source signal (${output.width}).`);
    return Array.from({ length: input.acceptAny ? 1 : output.width }, (_, bit) => ({
      ...wire,
      id: lineId(wire.id, bit),
      from: { node: wire.from.node, port: `${output.id}${bit}` },
      to: { node: wire.to.node, port: input.width > 1 ? `${input.id}${bit}` : input.id },
      width: 1,
    }));
  });
  return { ...value, wires };
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
    if (own(item, 'width') && item.width !== 1)
      fail(`Wire "${id}" width must match a single signal line (1).`);
    const connection = JSON.stringify([from.node, from.port, to.node, to.port]);
    if (connections.has(connection)) fail(`Wire "${id}" duplicates an existing connection.`);
    connections.add(connection);
    const wire = { id, from, to, width: 1 };
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
    const zoom = finite(value.viewport.zoom, 'Zoom', MAX_ZOOM);
    if (zoom < MIN_ZOOM) fail(`Zoom must be between ${MIN_ZOOM} and ${MAX_ZOOM}.`);
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
  return validateProject(expandImportedLines(value));
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

const storage = createProjectStorage({ parse: parseProject, serialize: serializeProject });
export const loadProject = storage.load;
export const saveProject = storage.save;
export const loadProjectRecovery = storage.recovery;
export const acknowledgeProjectRecovery = storage.acknowledgeRecovery;

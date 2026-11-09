import { getDefinition } from '../../components/catalog/index.js';
import { compileCircuit } from '../../simulation/network.js';
import { memoryImage } from '../../simulation/memory.js';
import { addresses, control, choices } from '../../simulation/controls.js';

export const MEMORY_TYPES = new Set(['ram', 'rom', 'eeprom', 'register_file']);
export const BYTE_TYPES = new Set(['bus_input', 'register', 'shift_register', 'counter', 'hc595']);
const known = (value) => value === 0 || value === 1;
const symbol = (value) => (known(value) ? String(value) : value === 'Z' ? 'Z' : 'X');
const packed = (bits) =>
  bits.every(known)
    ? bits.reduce((value, bit, index) => value | (bit << index), 0)
    : bits.every((value) => value === 'Z')
      ? 'Z'
      : 'X';

export function byteFormats(bits) {
  const nibble = (part) => {
    const value = packed(part);
    return typeof value === 'number' ? value.toString(16).toUpperCase() : value;
  };
  return {
    bin: [...bits].reverse().map(symbol).join(''),
    hex: `0x${nibble(bits.slice(4))}${nibble(bits.slice(0, 4))}`,
    dec: String(packed(bits)),
  };
}

export function inspectByte(node, runtime) {
  const state = runtime.state[node.id];
  const stored = node.type !== 'bus_input';
  const bits = stored
    ? [...(state?.qBits || Array(8).fill('X'))]
    : Array.from({ length: 8 }, (_, bit) => runtime.outputs[node.id]?.[`out${bit}`] ?? 'Z');
  return {
    bits,
    formats: byteFormats(bits),
    stored,
    enabled: node.enabled !== false,
    labels: getDefinition(node.type)
      .outputs.filter((pin) => pin.group === 'out')
      .map((pin) => pin.label),
    change: (node.type === 'shift_register' ? state?.lastShift : state?.lastByteChange) || null,
    ...(node.type === 'hc595'
      ? {
          shift: byteFormats(state?.shiftBits || Array(8).fill('X')),
          serial: runtime.outputs[node.id]?.serial ?? 'Z',
          parallel: runtime.signals.outputs[node.id]?.out ?? 'Z',
        }
      : {}),
  };
}

export function inspectMemory(node, project, runtime) {
  const inputs = runtime.inputs[node.id] || {};
  const { incoming } = compileCircuit(project);
  const parameters = { ...getDefinition(node.type).defaults, ...node.params };
  const registerFile = node.type === 'register_file';
  const cs = registerFile ? 1 : control(node, 'cs', inputs, incoming, 1);
  const oe = registerFile ? 1 : control(node, 'oe', inputs, incoming, 1);
  const we = node.type === 'rom' ? 0 : control(node, 'we', inputs, incoming);
  const readOptions = new Set(
    choices(cs).flatMap((c) =>
      choices(oe).flatMap((o) => choices(we).map((w) => Number(c && o && (registerFile || !w)))),
    ),
  );
  const writeOptions = new Set(choices(cs).flatMap((c) => choices(we).map((w) => Number(c && w))));
  const read = addresses(inputs, registerFile ? 'read' : 'address', registerFile ? 3 : 4);
  const write =
    node.type === 'rom'
      ? []
      : addresses(inputs, registerFile ? 'write' : 'address', registerFile ? 3 : 4);
  const lastWrite = runtime.state[node.id]?.lastWrite || null;
  const enabled = node.enabled !== false;
  return {
    enabled,
    cs,
    oe,
    we,
    read,
    write,
    lastWrite,
    readActive: enabled && readOptions.has(1),
    readCertain: enabled && readOptions.size === 1 && readOptions.has(1),
    writeActive: enabled && writeOptions.has(1),
    writeCertain: enabled && writeOptions.size === 1 && writeOptions.has(1),
    rows: memoryImage(node, runtime.state[node.id], parameters).map((bits, address) => ({
      address,
      bits,
      formats: byteFormats(bits),
      changed: lastWrite?.cells.find((cell) => cell.address === address)?.changed || [],
      lastWritten: !!lastWrite?.addresses.includes(address),
    })),
  };
}

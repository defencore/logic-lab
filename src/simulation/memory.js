import { control, choices, consensus, bitInputs, addresses, mergeBits } from './controls.js';
import { number, packBits } from './signals.js';

export function readMemoryBits(node, inputs, incoming, state, parameters) {
  const registerFile = node.type === 'register_file';
  const enabled = registerFile
    ? [1]
    : [
        ...new Set(
          choices(control(node, 'cs', inputs, incoming, 1)).flatMap((cs) =>
            choices(control(node, 'oe', inputs, incoming, 1)).flatMap((oe) =>
              choices(node.type === 'ram' ? control(node, 'we', inputs, incoming) : 0).map((we) =>
                Number(cs === 1 && oe === 1 && we === 0),
              ),
            ),
          ),
        ),
      ];
  if (!enabled.includes(1)) return Array(8).fill('Z');
  const locations = addresses(inputs, registerFile ? 'read' : 'address', registerFile ? 3 : 4);
  const rom =
    node.type === 'rom'
      ? String(parameters.data)
          .split(/[\s,;]+/)
          .filter(Boolean)
          .map((value) => number(value) & 255)
      : null;
  return Array.from({ length: 8 }, (_, bit) =>
    consensus([
      ...locations.map((address) =>
        rom ? ((rom[address] ?? 0) >> bit) & 1 : state.memoryBits[address][bit],
      ),
      ...(enabled.includes(0) ? ['Z'] : []),
    ]),
  );
}

/** A possible write merges old/new bits in every address the uncertain pins can select. */
export function writeMemory(node, state, inputs, incoming, edges) {
  const ram = node.type === 'ram';
  const permissions = [
    ...new Set(
      edges.flatMap((edge) =>
        choices(ram ? control(node, 'cs', inputs, incoming, 1) : 1).flatMap((cs) =>
          choices(control(node, 'we', inputs, incoming)).map((we) => Number(edge && cs && we)),
        ),
      ),
    ),
  ];
  if (!permissions.includes(1)) return state;
  const locations = addresses(inputs, ram ? 'address' : 'write', ram ? 4 : 3);
  const data = bitInputs(inputs, 'data');
  const next = { ...state, memory: [...state.memory], memoryBits: [...state.memoryBits] };
  for (const address of locations) {
    const definite = permissions.length === 1 && locations.length === 1;
    const bits = definite ? data : mergeBits(state.memoryBits[address], data);
    next.memoryBits[address] = bits;
    next.memory[address] = packBits(bits);
  }
  return next;
}

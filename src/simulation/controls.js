import { logic, unknown, packBits } from './signals.js';

/** A missing optional pin may use a default; a wired floating net is uncertain. */
export function control(node, port, inputs, incoming, fallback = 0) {
  return incoming.has(`${node.id}:${port}`) ? logic(inputs[port]) : fallback;
}
export const choices = (value) => (unknown(value) ? [0, 1] : [logic(value)]);
export const consensus = (values) =>
  values.every((value) => value === values[0]) ? values[0] : 'X';
export const bitInputs = (inputs, group, width = 8) =>
  Array.from({ length: width }, (_, bit) => logic(inputs[`${group}${bit}`]));
export const byteBits = (value) =>
  Array.from({ length: 8 }, (_, bit) => (unknown(value) ? 'X' : (value >> bit) & 1));
export const mergeBits = (...alternatives) =>
  alternatives[0].map((_, bit) => consensus(alternatives.map((values) => values[bit])));
export const equalBits = (a, b) =>
  a.length === b.length && a.every((value, bit) => value === b[bit]);
export const withBits = (state, bits) => ({ ...state, qBits: bits, q: packBits(bits) });

export function addresses(inputs, group, width) {
  let result = [0];
  for (let bit = 0; bit < width; bit++)
    result = result.flatMap((value) =>
      choices(inputs[`${group}${bit}`]).map((level) => value | (level << bit)),
    );
  return result;
}

/** Unknown transitions can contain an edge; an unchanged X does not invent another one. */
export function risingOptions(previous, current) {
  if (previous === current) return [0];
  return [
    ...new Set(
      choices(previous).flatMap((before) =>
        choices(current).map((after) => Number(before === 0 && after === 1)),
      ),
    ),
  ];
}

export function incrementBits(bits) {
  let carry = 1;
  return bits.map((bit) => {
    const result = consensus(choices(bit).flatMap((value) => choices(carry).map((c) => value ^ c)));
    carry = consensus(choices(bit).flatMap((value) => choices(carry).map((c) => value & c)));
    return result;
  });
}

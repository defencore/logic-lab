import { getDefinition } from '../../components/catalog/index.js';
import { SCENARIO_TYPES } from '../../scenes/models/scenarios/index.js';
export const GRID = 20;
export const snap = (value) => Math.round(value / GRID) * GRID;

export function pinOffset(pins, index) {
  let groups = 0;
  for (let i = 1; i <= index; i++)
    if (pins[i]?.group !== pins[i - 1]?.group && (pins[i]?.group || pins[i - 1]?.group)) groups++;
  return 58 + index * 25 + groups * 12;
}

export function dimensions(node) {
  const d = getDefinition(node.type);
  if (node.type === 'group')
    return {
      w: Math.max(100, Math.min(3000, Number(node.params.width) || 420)),
      h: Math.max(100, Math.min(3000, Number(node.params.height) || 260)),
    };
  if (node.type === 'note') return { w: 240, h: 130 };
  if (node.type === 'matrix') return { w: 260, h: 270 };
  if (node.type === 'keypad') return { w: 210, h: 260 };
  if (['active_buzzer', 'passive_buzzer'].includes(node.type)) return { w: 204, h: 158 };
  const byteWidgetHeight =
    node.type === 'shift_register'
      ? 190
      : ['bus_input', 'register', 'counter'].includes(node.type)
        ? 150
        : 0;
  return {
    w: SCENARIO_TYPES.includes(node.type)
      ? 284
      : ['scope', 'servo', 'am', 'fm', 'stepper'].includes(node.type) ||
          [...d.inputs, ...d.outputs].some((pin) => pin.group)
        ? 228
        : node.type === 'sevenseg'
          ? 164
          : 160,
    h: Math.max(
      100,
      byteWidgetHeight,
      ...[d.inputs, d.outputs].map((pins) => pinOffset(pins, pins.length - 1) + 21),
      SCENARIO_TYPES.includes(node.type) ||
        ['scope', 'servo', 'sevenseg', 'am', 'fm', 'stepper'].includes(node.type)
        ? 190
        : 0,
    ),
  };
}
export function pinPlacement(node, port, side) {
  const definition = getDefinition(node.type);
  const pins = side === 'out' ? definition.outputs : definition.inputs;
  const index = pins.findIndex((pin) => pin.id === port);
  const pin = pins[index];
  if (node.type === 'keypad')
    return side === 'in'
      ? { x: 0, y: 60 + index * 41, edge: 'left' }
      : { x: 55 + index * 50, y: dimensions(node).h, edge: 'bottom' };
  if (node.type === 'matrix' && pin?.group === 'rows')
    return { x: 0, y: 58 + pin.bit * 22, edge: 'left' };
  if (node.type === 'matrix' && pin?.group === 'cols')
    return { x: 70 + pin.bit * 22, y: dimensions(node).h, edge: 'bottom' };
  return {
    x: side === 'out' ? dimensions(node).w : 0,
    y: pinOffset(pins, index),
    edge: side === 'out' ? 'right' : 'left',
  };
}

export function portDirection(node, port, side) {
  const edge = pinPlacement(node, port, side).edge;
  return edge === 'bottom' ? { x: 0, y: 1 } : { x: edge === 'right' ? 1 : -1, y: 0 };
}

export function portPoint(node, port, side) {
  const point = pinPlacement(node, port, side);
  return { x: node.x + point.x, y: node.y + point.y };
}

import { getDefinition } from './catalog.js';
import { pinOffset } from './geometry.js';
import { esc } from './ui-utils.js';

export function componentPins(node, { label, inputLabel, outputLabel }) {
  const definition = getDefinition(node.type);
  return [
    ['in', definition.inputs, inputLabel],
    ['out', definition.outputs, outputLabel],
  ]
    .map(([side, pins, direction]) =>
      pins
        .map(
          (pin, index) =>
            `<button class="pin pin-${side} ${pin.analog ? 'analog-pin' : ''}" data-pin="${esc(pin.id)}" data-side="${side}" data-node="${esc(node.id)}" style="top:${pinOffset(pins, index)}px" title="${esc(pin.label || pin.id)} · ${esc(direction)}${pin.analog ? ' · analog' : ' · 1 bit'}" aria-label="${esc(label)} · ${esc(direction)} · ${esc(pin.label || pin.id)}"><i aria-hidden="true"></i><span>${esc(pin.label || pin.id)}</span></button>`,
        )
        .join(''),
    )
    .join('');
}

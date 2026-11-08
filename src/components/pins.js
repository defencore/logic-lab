import { getDefinition } from './catalog/index.js';
import { pinPlacement } from '../circuits/geometry/index.js';
import { esc } from '../shared/ui.js';

export function componentPins(node, { label, inputLabel, outputLabel }) {
  const definition = getDefinition(node.type);
  return [
    ['in', definition.inputs, inputLabel],
    ['out', definition.outputs, outputLabel],
  ]
    .map(([side, pins, direction]) =>
      pins
        .map((pin) => {
          const placement = pinPlacement(node, pin.id, side);
          const style = `top:${placement.y}px${placement.edge === 'bottom' ? `;left:${placement.x}px` : ''}`;
          const pinLabel = pin.label || pin.id;
          const displayLabel =
            node.type === 'matrix' ? `${pin.group === 'rows' ? 'R' : 'C'}${pin.bit}` : pinLabel;
          return `<button class="pin pin-${side} pin-edge-${placement.edge} ${pin.analog ? 'analog-pin' : ''}" data-pin="${esc(pin.id)}" data-side="${side}" data-node="${esc(node.id)}" style="${style}" title="${esc(pinLabel)} · ${esc(direction)}${pin.analog ? ' · analog' : ' · 1 bit'}" aria-label="${esc(label)} · ${esc(direction)} · ${esc(pinLabel)}"><i aria-hidden="true"></i><span>${esc(displayLabel)}</span></button>`;
        })
        .join(''),
    )
    .join('');
}

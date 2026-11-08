import { getDefinition } from './catalog/index.js';
import { pinPlacement } from '../circuits/geometry/index.js';
import { esc } from '../shared/ui.js';

export function componentPins(node, { label, inputLabel, outputLabel }) {
  const definition = getDefinition(node.type);
  return [
    ['in', definition.inputs, inputLabel],
    ['out', definition.outputs, outputLabel],
  ]
    .map(([side, pins, direction]) => {
      const placements = pins.map((pin) => pinPlacement(node, pin.id, side));
      return pins
        .map((pin, index) => {
          const placement = placements[index];
          const position = placement.edge === 'bottom' ? 'x' : 'y';
          const gap =
            Math.min(
              30,
              ...[index - 1, index + 1]
                .filter((neighbour) => placements[neighbour]?.edge === placement.edge)
                .map((neighbour) =>
                  Math.abs(placements[neighbour][position] - placement[position]),
                ),
            ) - 2;
          const style = `top:${placement.y}px${placement.edge === 'bottom' ? `;left:${placement.x}px` : ''}`;
          const pinLabel = pin.label || pin.id;
          const displayLabel =
            node.type === 'matrix' ? `${pin.group === 'rows' ? 'R' : 'C'}${pin.bit}` : pinLabel;
          return `<button class="pin pin-${side} pin-edge-${placement.edge} ${pin.analog ? 'analog-pin' : ''}" data-pin="${esc(pin.id)}" data-side="${side}" data-node="${esc(node.id)}" style="${style}" data-contact-gap="${gap}" title="${esc(pinLabel)} · ${esc(direction)}${pin.analog ? ' · analog' : ' · 1 bit'}" aria-label="${esc(label)} · ${esc(direction)} · ${esc(pinLabel)}"><i aria-hidden="true"></i><span>${esc(displayLabel)}</span></button>`;
        })
        .join('');
    })
    .join('');
}

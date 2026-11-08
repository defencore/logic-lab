import { hotkeyBindingError } from '../components/catalog/hotkey-bindings.js';

/** Imports use the same unique, portable bindings as interactive assignment. */
export function validateHotkeyNodes(nodes) {
  const bindings = new Set();
  for (const node of nodes) {
    if (node.type !== 'hotkey') continue;
    const { binding = '', mode = 'hold', value = 0 } = node.params;
    if (hotkeyBindingError(binding)) throw new Error(`Unsupported Hotkey binding on ${node.id}.`);
    if (!['hold', 'inverted', 'toggle'].includes(mode))
      throw new Error(`Invalid Hotkey mode on ${node.id}.`);
    if (value !== 0 && value !== 1) throw new Error(`Invalid Hotkey value on ${node.id}.`);
    if (binding && bindings.has(binding)) throw new Error(`Duplicate Hotkey binding: ${binding}.`);
    if (binding) bindings.add(binding);
  }
}

import { getDefinition } from '../components/catalog/index.js';
import { parameterLabel } from './component-parameters.js';
import { keypadModeCaption } from './keypad-node.js';

/** Patch dependent captions/visibility in place: native editors retain their focus and drafts. */
export function refreshParameterDependencies(container, node, language) {
  const parameters = { ...getDefinition(node.type).defaults, ...node.params };
  if (node.type === 'keypad') {
    const field = container.querySelector('[data-param="pulseDuration"]')?.closest('label');
    if (field) field.hidden = parameters.mode !== 'pulse';
    const caption = container.querySelector('.keypad-mode');
    if (caption) {
      const text = keypadModeCaption({ ...node, params: parameters }, language);
      if (caption.textContent !== text) caption.textContent = text;
      caption.title = text;
    }
  }
  if (node.type === 'position_sensor') {
    for (const key of ['threshold', 'tolerance']) {
      const label = container.querySelector(`[data-parameter-label="${key}"]`);
      const text = parameterLabel(key, node.type, language, parameters);
      if (label && label.textContent !== text) label.textContent = text;
    }
  }
}

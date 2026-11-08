import { getDefinition } from '../components/catalog/index.js';
import { getSceneEntries } from '../scenes/data/scenarios.js';
import { sceneName } from './scene-panel.js';

const patch = (element, value) => {
  if (element && element.textContent !== value) element.textContent = value;
};

/** Labels and bindings can change without rebuilding the renderer or active input controls. */
export function updateSceneMetadata(
  state,
  entry,
  t,
  title,
  panel = document.querySelector('#scene-panel'),
) {
  if (!panel) return;
  const name = (id) => {
    const node = state.project.nodes.find((node) => node.id === id);
    return node ? node.label || title(getDefinition(node.type)) : '';
  };
  patch(panel.querySelector('[data-scene-title]'), sceneName(state, entry, t, title));
  for (const heading of panel.querySelectorAll('[data-scene-group-label]'))
    patch(heading, name(heading.dataset.sceneGroupLabel));
  for (const label of panel.querySelectorAll('[data-scene-source-label]')) {
    const source = label.closest('[data-scene-source],[data-motion-switch]');
    const id = source?.dataset.sceneSource || source?.dataset.motionSwitch;
    patch(label, name(id));
    const node = state.project.nodes.find((node) => node.id === id);
    if (node?.type === 'hotkey') patch(source.querySelector('kbd'), node.params.binding || '—');
  }
  const entries = getSceneEntries(state.project);
  for (const option of panel.querySelectorAll('#scene-select option')) {
    const item = entries.find((entry) => entry.id === option.value);
    if (item) patch(option, sceneName(state, item, t, title));
  }
}

import { keypadFixture } from '../../application/fixtures/keypad.js';
import { getDefinition } from '../../../src/components/catalog/index.js';
import { parameterRule } from '../../../src/components/parameter-rules.js';
import { parameterLabel } from '../../../src/workbench/component-parameters.js';
import { bindInspectorParameters } from '../../../src/workbench/inspector-parameters.js';
import { keypadModeCaption, keypadNodeMarkup } from '../../../src/workbench/keypad-node.js';

export function inspectorParameterFixture(t, type = 'keypad', parameters = {}, language = 'ua') {
  const f = keypadFixture(t, 'pulse');
  const node = f.node();
  node.type = type;
  node.params = { ...getDefinition(type).defaults, ...parameters };
  const fields = new Map(),
    labels = new Map(),
    captions = new Map();
  const caption = {
    textContent: type === 'keypad' ? keypadModeCaption(node, language) : '',
    title: '',
  };
  for (const [key, value] of Object.entries(node.params)) {
    if (key === 'keys') continue;
    const rule = parameterRule(type, key);
    const attributes = new Map();
    const label = {
      hidden: type === 'keypad' && key === 'pulseDuration' && node.params.mode !== 'pulse',
    };
    const field = {
      dataset: { param: key, ...(rule.integer ? { integer: 'true' } : {}) },
      type: typeof value === 'number' ? 'number' : 'select-one',
      value: String(value),
      min: rule.min === undefined ? '' : String(rule.min),
      max: rule.max === undefined ? '' : String(rule.max),
      closest: () => label,
      setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: (name) => attributes.get(name),
      removeAttribute: (name) => attributes.delete(name),
      focus() {
        document.activeElement = field;
      },
    };
    fields.set(key, field);
    labels.set(key, label);
    captions.set(key, { textContent: parameterLabel(key, type, language, node.params) });
  }
  const draftLabel = { value: 'unfinished label', selectionStart: 6 };
  const container = {
    querySelector(selector) {
      if (selector === '.keypad-mode') return caption;
      const parameter = selector.match(/^\[data-param="([^"]+)"\]$/)?.[1];
      if (parameter) return fields.get(parameter) || null;
      const label = selector.match(/^\[data-parameter-label="([^"]+)"\]$/)?.[1];
      return label ? captions.get(label) || null : null;
    },
    querySelectorAll: () => [...fields.values()],
    set innerHTML(_) {
      throw new Error('Parameter edits must not rebuild the form');
    },
  };
  const state = { project: f.project, runtime: f.runtime, lang: language };
  const events = [],
    checkpoints = [];
  const actions = {
    checkpoint: () => checkpoints.push(structuredClone(node.params)),
    notify(message) {
      throw new Error(message);
    },
    reconcileKeypads: f.controller.reconcile,
    renderBoard() {
      if (type === 'keypad') events.push({ canvas: keypadNodeMarkup(node, language) });
    },
    updateSignals() {
      events.push({
        caption: caption.textContent,
        pulseHidden: labels.get('pulseDuration')?.hidden,
        threshold: captions.get('threshold')?.textContent,
      });
    },
    persist() {},
  };
  bindInspectorParameters(container, node, state, actions);
  function change(key, value, event = 'oninput') {
    const field = fields.get(key);
    field.value = String(value);
    field[event]();
  }
  return {
    ...f,
    node,
    state,
    fields,
    labels,
    captions,
    caption,
    draftLabel,
    container,
    events,
    checkpoints,
    change,
  };
}

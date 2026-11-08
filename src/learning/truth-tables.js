import { getDefinition } from '../components/catalog/index.js';
import { createRuntime, simulate } from '../simulation/index.js';
import { esc } from '../shared/ui.js';
import { hotkeyStateTableMarkup } from './hotkey-state-table.js';
import { audioStateTableMarkup } from './audio-state-table.js';

const supported = new Set([
  'and',
  'or',
  'not',
  'nand',
  'nor',
  'xor',
  'xnor',
  'half_adder',
  'full_adder',
]);
const cache = new Map();
const text = {
  en: {
    title: 'Truth table',
    inputs: 'Inputs',
    outputs: 'Outputs',
    explanation:
      '0 means LOW; 1 means HIGH. Read inputs on the left and the resulting outputs on the right. Each row is one possible input combination.',
    live: 'Change or connect the inputs to highlight the matching row.',
    reference: 'Compare one input combination at a time with its output.',
    carryIn: 'Carry in',
    sum: 'Sum',
    carry: 'Carry',
    carryOut: 'Carry out',
  },
  ua: {
    title: 'Таблиця істинності',
    inputs: 'Входи',
    outputs: 'Виходи',
    explanation:
      '0 означає НИЗЬКИЙ рівень; 1 — ВИСОКИЙ. Читайте входи ліворуч, а відповідні виходи — праворуч. Кожен рядок показує одну можливу комбінацію входів.',
    live: 'Змініть або під’єднайте входи, щоб виділити відповідний рядок.',
    reference: 'Порівнюйте кожну комбінацію входів з її результатом.',
    carryIn: 'Вхідний перенос',
    sum: 'Сума',
    carry: 'Перенос',
    carryOut: 'Вихідний перенос',
  },
};

function immutable(value) {
  for (const entry of Object.values(value)) {
    if (entry && typeof entry === 'object') immutable(entry);
  }
  return Object.freeze(value);
}

export function getTruthTable(type) {
  if (!supported.has(type)) return null;
  if (cache.has(type)) return cache.get(type);
  const definition = getDefinition(type);
  const inputs = definition.inputs.map((port) => ({ ...port }));
  const outputs = definition.outputs.map((port) => ({ ...port }));
  const rows = Array.from({ length: 2 ** inputs.length }, (_, combination) => {
    const values = inputs.map((port, index) => (combination >> (inputs.length - index - 1)) & 1);
    const sources = values.map((value, index) => ({
      id: `truth-input-${index}`,
      type: 'switch',
      enabled: true,
      params: { value },
    }));
    const circuit = {
      nodes: [...sources, { id: 'truth-target', type, enabled: true, params: {} }],
      wires: inputs.map((port, index) => ({
        id: `truth-wire-${index}`,
        from: { node: sources[index].id, port: 'out' },
        to: { node: 'truth-target', port: port.id },
        width: 1,
      })),
    };
    const runtime = createRuntime();
    simulate(circuit, runtime, 0);
    return {
      inputs: values,
      outputs: outputs.map((port) => runtime.outputs['truth-target'][port.id]),
    };
  });
  const model = immutable({ inputs, outputs, rows });
  cache.set(type, model);
  return model;
}

function portLabel(port, type, language) {
  const copy = text[language];
  if (port.id === 'cin') return `${copy.carryIn} (${port.label})`;
  if (port.id === 'sum') return `${copy.sum} (${port.label})`;
  if (port.id === 'carry')
    return `${type === 'full_adder' ? copy.carryOut : copy.carry} (${port.label})`;
  return port.label || port.id;
}

export function truthTableMarkup(type, language = 'en', nodeId = null) {
  if (type === 'hotkey') return hotkeyStateTableMarkup(language);
  if (type === 'active_buzzer' || type === 'passive_buzzer')
    return audioStateTableMarkup(type, language);
  const model = getTruthTable(type);
  if (!model) return '';
  language = language === 'ua' || language === 'uk' ? 'ua' : 'en';
  const copy = text[language];
  const definition = getDefinition(type);
  const name = language === 'ua' ? definition.ua : definition.label;
  const rule = language === 'ua' ? definition.descriptionUa : definition.description;
  const live = nodeId !== null && nodeId !== undefined;
  return `<section class="truth-reference truth-table-section property-section" data-truth-type="${esc(type)}"${live ? ` data-truth-node="${esc(nodeId)}"` : ''} aria-label="${esc(copy.title)}: ${esc(name)}">
    <h4 class="truth-table-heading">${copy.title}</h4><p class="truth-table-explanation">${copy.explanation}</p><p class="truth-table-rule">${esc(rule)}</p>
    <div class="truth-table-scroll"><table class="truth-table"><caption>${esc(name)} · ${copy.title}</caption><colgroup class="truth-input-columns" span="${model.inputs.length}"></colgroup><colgroup class="truth-output-columns" span="${model.outputs.length}"></colgroup>
      <thead><tr><th class="truth-input-heading" scope="colgroup" colspan="${model.inputs.length}">${copy.inputs}</th><th class="truth-output-heading" scope="colgroup" colspan="${model.outputs.length}">${copy.outputs}</th></tr><tr>${model.inputs.map((port) => `<th class="truth-input-heading" scope="col">${esc(portLabel(port, type, language))}</th>`).join('')}${model.outputs.map((port) => `<th class="truth-output-heading" scope="col">${esc(portLabel(port, type, language))}</th>`).join('')}</tr></thead>
      <tbody>${model.rows.map((row) => `<tr data-truth-inputs="${row.inputs.join('')}">${row.inputs.map((value) => `<td class="truth-input">${value}</td>`).join('')}${row.outputs.map((value, index) => `<td class="truth-output ${value === 1 ? 'high' : 'low'}" data-truth-output="${esc(model.outputs[index].id)}">${value}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div><p class="truth-table-status" data-truth-status role="status" aria-live="polite">${live ? copy.live : copy.reference}</p>
  </section>`;
}

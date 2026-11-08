import { $, $$, esc } from '../shared/ui.js';
import { getDefinition } from '../components/catalog/index.js';
import { probeId } from '../experiments/probes.js';
import { SEQUENCE_LIMITS } from '../experiments/actions.js';

const local = (language) => (ua, en) => (language === 'ua' ? ua : en);
export function probeCriteriaMessage(error, language = 'en') {
  const L = local(language);
  if (error?.code === 'teacher_probe_limit')
    return L(
      'Можна обрати щонайбільше 32 сигнали. Спочатку зніміть інший вибір.',
      'Choose at most 32 signals. Deselect another signal first.',
    );
  if (error?.code === 'teacher_probe_invalid')
    return L(
      'Некоректний набір сигналів. Виправте відсутні, повторені чи пошкоджені записи; вибір не було скорочено.',
      'The signal selection is invalid. Fix missing, duplicate or malformed entries; the selection was not truncated.',
    );
  return error?.message || String(error);
}
export function observationCoverageMarkup(language = 'en') {
  const L = local(language);
  return `<p class="classroom-hint probe-coverage">${L('Перевіряються лише обрані логічні або числові сигнали в контрольні моменти сценарію. Дії на джерелах записуються окремо. EN зумера перевіряє лише дозвіл: він не підтверджує звук, частоту, гучність або текст «880 Hz» у назві. Для цих властивостей потрібне окреме завдання та пояснення; необрані сигнали не оцінюються.', 'Only selected logical or numeric signals are checked at scenario checkpoints. Source actions are recorded separately. A buzzer EN signal checks its enable only; it does not verify sound, frequency, volume or “880 Hz” in a label. Assess those properties separately through the task and explanation; unselected signals are not graded.')}</p>`;
}

export function describeProbeChoices(project, probes, language = 'en') {
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  return probes.map((probe) => {
    const node = nodes.get(probe.node),
      definition = getDefinition(node?.type);
    const port = definition?.signals[probe.side || 'outputs'].find(
      (item) => item.id === probe.port,
    );
    const nodeLabel =
      node?.label || (language === 'ua' ? definition?.ua : definition?.label) || probe.node;
    const typeLabel = language === 'ua' ? definition?.ua : definition?.label;
    return { ...probe, nodeLabel, typeLabel, label: `${nodeLabel} · ${port?.label || probe.port}` };
  });
}

export function teacherProbeIds(state, choices) {
  if (state.teacherForm.probes !== null && state.teacherForm.probes !== undefined)
    return state.teacherForm.probes;
  const allowed = new Set(choices.map(probeId));
  const recorded = (state.sequence?.probes || []).map(probeId).filter((id) => allowed.has(id));
  return recorded.length ? recorded : choices.slice(0, 8).map(probeId);
}

/** One selection owner keeps hidden rows selected and rejects the 33rd change atomically. */
export function createProbeSelection(choices, selected = []) {
  const allowed = new Set(choices.map(probeId));
  const ids = new Set(selected);
  if (
    ids.size !== selected.length ||
    ids.size > SEQUENCE_LIMITS.probes ||
    [...ids].some((id) => !allowed.has(id))
  )
    throw Object.assign(new Error('Invalid observed signal selection.'), {
      code: ids.size > SEQUENCE_LIMITS.probes ? 'teacher_probe_limit' : 'teacher_probe_invalid',
    });
  return {
    ids: () => [...ids],
    has: (id) => ids.has(id),
    change(id, checked) {
      if (!allowed.has(id)) return false;
      if (checked && !ids.has(id) && ids.size >= SEQUENCE_LIMITS.probes) return false;
      checked ? ids.add(id) : ids.delete(id);
      return true;
    },
  };
}

export function probePickerMarkup({
  choices,
  selected = [],
  language = 'en',
  prefix = 'task',
  marked = [],
  markedLabel,
  locked = false,
}) {
  const L = local(language),
    chosen = new Set(selected),
    highlighted = new Set(marked);
  const groups = new Map();
  choices.forEach((probe, index) => {
    if (!groups.has(probe.node)) groups.set(probe.node, []);
    groups.get(probe.node).push({ ...probe, index });
  });
  return `<fieldset class="classroom-probes probe-picker" data-probe-picker="${prefix}"><legend>${L('Сигнали спостереження', 'Observed signals')} · ≤${SEQUENCE_LIMITS.probes}</legend><label class="probe-picker-search">${L('Знайти елемент або контакт', 'Find a component or signal')}<input type="search" id="${prefix}-probe-search" data-probe-search="${prefix}" autocomplete="off" ${locked ? 'disabled' : ''}></label><p id="${prefix}-probe-count" class="probe-picker-count" role="status"></p><p id="${prefix}-probe-feedback" class="probe-picker-feedback" role="status" aria-live="polite"></p><div class="probe-picker-groups">${[
    ...groups,
  ]
    .map(
      ([id, probes]) =>
        `<fieldset class="probe-group" data-probe-group="${prefix}"><legend>${esc(probes[0].nodeLabel || id)}${probes[0].typeLabel ? ` <small>${esc(probes[0].typeLabel)}</small>` : ''} · ${probes.length}</legend>${probes
          .map((probe) => {
            const key = probeId(probe),
              label = probe.label || `${probe.node} · ${probe.port}`;
            const search =
              `${label} ${probe.node} ${probe.port} ${probe.typeLabel || ''} ${probe.side}`.toLowerCase();
            return `<label data-probe-row="${prefix}" data-probe-search-text="${esc(search)}"><input type="checkbox" data-${prefix}-probe="${probe.index}" ${chosen.has(key) ? 'checked' : ''} ${locked ? 'disabled' : ''}>${esc(label)}${probe.missing ? ` <strong>${L('(відсутній)', '(missing)')}</strong>` : ''}${highlighted.has(key) ? ` <strong>${esc(markedLabel || L('(рекомендовано)', '(recommended)'))}</strong>` : ''}</label>`;
          })
          .join('')}</fieldset>`,
    )
    .join(
      '',
    )}</div><p id="${prefix}-probe-empty" hidden>${L('Немає сигналів за цим пошуком. Приховані вибрані сигнали збережені.', 'No signals match. Hidden selected signals remain selected.')}</p></fieldset>`;
}

export function bindProbePicker({
  choices,
  selected = [],
  language = 'en',
  prefix = 'task',
  onChange = () => {},
  onCount = () => {},
  canChange = () => true,
}) {
  const L = local(language),
    selection = createProbeSelection(choices, selected);
  const inputs = $$(`[data-${prefix}-probe]`);
  const count = () => {
    const number = selection.ids().length;
    const message = `${L('Обрано', 'Selected')}: ${number}/${SEQUENCE_LIMITS.probes} · ${L('Залишилось', 'Remaining')}: ${SEQUENCE_LIMITS.probes - number} · ${L('Усього сигналів', 'Available signals')}: ${choices.length}`;
    if ($(`#${prefix}-probe-count`)) $(`#${prefix}-probe-count`).textContent = message;
    onCount(number);
  };
  const feedback = (text) => {
    if ($(`#${prefix}-probe-feedback`)) $(`#${prefix}-probe-feedback`).textContent = text;
  };
  inputs.forEach((input) => {
    input.onchange = () => {
      const probe = choices[Number(input.dataset[`${prefix}Probe`])],
        key = probe && probeId(probe);
      if (!canChange()) {
        input.checked = selection.has(key);
        return;
      }
      const checked = inputs.filter((item) => item.checked);
      if (!probe || checked.length > SEQUENCE_LIMITS.probes) {
        for (const other of inputs) {
          const item = choices[Number(other.dataset[`${prefix}Probe`])];
          other.checked = !!item && selection.has(probeId(item));
        }
        feedback(probeCriteriaMessage({ code: 'teacher_probe_limit' }, language));
      } else {
        // Remove before adding so a valid batch replacement works even at the limit.
        for (const other of inputs) {
          const item = choices[Number(other.dataset[`${prefix}Probe`])];
          if (item && !other.checked) selection.change(probeId(item), false);
        }
        for (const other of checked) {
          const item = choices[Number(other.dataset[`${prefix}Probe`])];
          if (item) selection.change(probeId(item), true);
        }
        feedback('');
        onChange(selection.ids());
      }
      count();
    };
  });
  const search = $(`#${prefix}-probe-search`);
  if (search)
    search.oninput = () => {
      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const row of $$(`[data-probe-row="${prefix}"]`)) {
        row.hidden = !terms.every((term) => row.dataset.probeSearchText.includes(term));
        visible += Number(!row.hidden);
      }
      for (const group of $$(`[data-probe-group="${prefix}"]`))
        group.hidden = [...group.querySelectorAll('[data-probe-row]')].every((row) => row.hidden);
      if ($(`#${prefix}-probe-empty`)) $(`#${prefix}-probe-empty`).hidden = visible !== 0;
    };
  count();
  return {
    ids: selection.ids,
    probes() {
      const selected = inputs
        .filter((input) => input.checked)
        .map((input) => choices[Number(input.dataset[`${prefix}Probe`])]);
      if (
        !selected.length ||
        selected.length > SEQUENCE_LIMITS.probes ||
        selected.some((probe) => !probe || probe.missing)
      )
        throw new Error(
          L(
            'Оберіть від 1 до 32 наявних сигналів. Відсутні контакти потрібно відновити або прибрати з вибору.',
            'Choose 1–32 available signals. Restore missing contacts or deselect them.',
          ),
        );
      return selected.map(({ node, port, side }) => ({ node, port, side }));
    },
  };
}

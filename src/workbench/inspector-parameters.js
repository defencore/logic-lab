import { decodeEepromData } from '../components/eeprom.js';
import { isKeypad } from '../components/keypad.js';
import { getDefinition } from '../components/catalog/index.js';
import { simulate } from '../simulation/index.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { memoryBytes } from './component-parameters.js';
import { refreshParameterDependencies } from './inspector-parameter-dependencies.js';

/** Bind live property edits once; dependent fields are patched without rebuilding their editors. */
export function bindInspectorParameters(container, n, state, actions) {
  const d = getDefinition(n.type);
  const { checkpoint, notify, renderBoard, updateSignals, persist } = actions;
  [...container.querySelectorAll('[data-param],[data-slider]')].forEach((input) => {
    let editing = false;
    const commit = () => {
      const key = input.dataset.param || input.dataset.slider;
      if (input.type === 'number' && input.value === '') return;
      let value =
        input.type === 'checkbox'
          ? input.checked
          : ['number', 'range'].includes(input.type)
            ? Number(input.value)
            : input.value;
      if (input.dataset.memoryBytes) {
        try {
          if (n.type === 'eeprom' && !decodeEepromData(value)) throw new Error();
          value = memoryBytes(n.type === 'eeprom' ? value.replaceAll(';', ',') : value);
          input.removeAttribute('aria-invalid');
        } catch {
          input.setAttribute('aria-invalid', 'true');
          return;
        }
      }
      if (input.dataset.array) {
        try {
          value = JSON.parse(input.value);
          if (!Array.isArray(value) || value.some((v) => !Number.isFinite(v))) throw Error();
        } catch {
          return;
        }
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return;
        if (input.min !== '') value = Math.max(Number(input.min), value);
        if (input.max !== '') value = Math.min(Number(input.max), value);
        if (input.dataset.integer === 'true' && !Number.isInteger(value)) {
          input.setAttribute('aria-invalid', 'true');
          return;
        }
        input.removeAttribute('aria-invalid');
      }
      if (n.params[key] === value) return;
      if (state.classroom?.isLocked()) {
        if (!state.classroom.allowInput()) return;
        if (!SOURCE_PARAMETERS[n.type]?.[key] && !state.classroom.allowEdit()) return;
        const rule = SOURCE_PARAMETERS[n.type]?.[key];
        if (
          rule &&
          (typeof value !== 'number' ||
            value < rule[0] ||
            value > rule[1] ||
            (rule[2] && !Number.isInteger(value)))
        ) {
          notify(
            state.lang === 'ua'
              ? `Для запису задайте значення від ${rule[0]} до ${rule[1]}.`
              : `For recording, enter a value between ${rule[0]} and ${rule[1]}.`,
          );
          input.value = n.params[key];
          return;
        }
      }
      if (!editing) {
        checkpoint();
        editing = true;
      }
      n.params[key] = value;
      refreshParameterDependencies(container, n, state.lang);
      if (isKeypad(n.type) && key === 'mode') actions.reconcileKeypads?.();
      if (n.type === 'contact_switch' && key === 'mode') {
        n.params.value = 0;
        actions.reconcileButtons?.();
      }
      if (key === 'initial' || SCENARIO_TYPES.includes(n.type)) delete state.runtime.state[n.id];
      const companion = container.querySelector(
        `[data-${input.dataset.slider ? 'param' : 'slider'}="${key}"]`,
      );
      if (companion) companion.value = value;
      simulate(state.project, state.runtime, 0);
      renderBoard();
      updateSignals();
      if (SOURCE_PARAMETERS[n.type]?.[key]) state.classroom?.inputChanged(n.id, key, value);
      state.classroom?.observeEdit();
      persist();
    };
    input.oninput = commit;
    input.onchange = commit;
    input.onblur = () => {
      editing = false;
      const key = input.dataset.param || input.dataset.slider;
      const value = n.params[key] ?? d.defaults[key];
      if (input.type === 'number') {
        if (input.getAttribute('aria-invalid') === 'true')
          notify(
            state.lang === 'ua'
              ? 'Для цього параметра потрібне ціле значення.'
              : 'This parameter requires a whole number.',
          );
        input.value = value;
        input.removeAttribute('aria-invalid');
      }
      if (input.dataset.memoryBytes) {
        if (input.getAttribute('aria-invalid') === 'true')
          notify(
            n.type === 'eeprom'
              ? state.lang === 'ua'
                ? 'Введіть до 16 байтів від 0 до 255, розділених комами.'
                : 'Enter up to 16 bytes from 0 to 255, separated by commas.'
              : state.lang === 'ua'
                ? 'Введіть байти від 0 до 255, розділені комами.'
                : 'Enter bytes from 0 to 255, separated by commas.',
          );
        input.value = Array.isArray(value) ? value.join(', ') : value;
        input.removeAttribute('aria-invalid');
      }
    };
  });
}

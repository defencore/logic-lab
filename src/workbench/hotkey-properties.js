import { $, esc } from '../shared/ui.js';
import {
  bindingFromEvent,
  displayHotkeyBinding,
  hotkeyBindingError,
  findHotkeyConflict,
} from '../components/catalog/hotkey-bindings.js';

export function hotkeyPropertiesMarkup(node, language) {
  if (node.type !== 'hotkey') return '';
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const binding = node.params.binding || '';
  return `<div class="property-section hotkey-properties" data-hotkey-properties="${esc(node.id)}"><h4>${L('Керування клавішею', 'Keyboard control')}</h4><p class="hotkey-binding"><span>${L('Призначено', 'Assigned')}</span><output data-hotkey-binding>${esc(displayHotkeyBinding(binding, language))}</output></p><div class="hotkey-binding-actions"><button type="button" class="soft-btn" data-hotkey-record aria-pressed="false">${L('Призначити клавішу', 'Assign a key')}</button><button type="button" class="text-btn" data-hotkey-clear>${L('Очистити', 'Clear')}</button><button type="button" class="soft-btn" data-hotkey-cancel hidden>${L('Скасувати · Esc', 'Cancel · Esc')}</button></div><p class="hotkey-help">${L('Натисніть одну клавішу або Shift + клавішу. Призначення відповідає фізичній клавіші та не змінюється разом із мовою клавіатури. Ctrl, Alt, Meta й системні скорочення недоступні.', 'Press one key or Shift + a key. The binding follows the physical key and stays the same when the keyboard layout changes. Ctrl, Alt, Meta and system shortcuts are unavailable.')}</p><p class="hotkey-status" data-hotkey-status role="status"></p><label>${L('Режим роботи', 'Behavior')}<select data-hotkey-mode>${[
    ['hold', L('Поки утримується: 1 при натисканні', 'Hold: 1 while pressed')],
    ['inverted', L('Інверсний: 0 при натисканні', 'Inverted: 0 while pressed')],
    ['toggle', L('Перемикати після кожного натискання', 'Toggle after each press')],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === (node.params.mode || 'hold') ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select></label><p class="hotkey-output"><span>${L('Сигнал на виході', 'Output signal')}</span><output data-hotkey-value>—</output></p></div>`;
}

export function createHotkeyProperties(state, { checkpoint, changed, beginHotkeyCapture }) {
  let active = null;
  const L = (ua, en) => (state.lang === 'ua' ? ua : en);
  const root = () => $('[data-hotkey-properties]');
  function current(node) {
    return (
      state.project.nodes.includes(node) &&
      state.selected.size === 1 &&
      state.selected.has(node.id) &&
      state.inspectorTab === 'properties'
    );
  }
  function editable(node) {
    return current(node) && (!state.classroom || state.classroom.allowEdit());
  }
  function status(message) {
    const panel = root();
    const element = panel && $('[data-hotkey-status]', panel);
    if (element) element.textContent = message;
  }
  function finish(message) {
    const capture = active;
    active = null;
    capture?.cancel?.();
    if (message) status(message);
    update();
  }
  function cancel() {
    if (!active) return;
    finish(
      L(
        'Призначення скасовано. Попередню клавішу збережено.',
        'Assignment cancelled. The previous key is preserved.',
      ),
    );
  }
  function commit(node, patch) {
    if (!editable(node)) return false;
    if (Object.entries(patch).every(([key, value]) => node.params[key] === value)) return true;
    checkpoint();
    Object.assign(node.params, patch, { value: 0 });
    changed();
    return true;
  }
  function start(node) {
    if (!editable(node)) return;
    cancel();
    const capture = { node, project: state.project, cancel: null };
    active = capture;
    status(
      L(
        'Натисніть клавішу. Можна утримувати Shift; Esc скасовує.',
        'Press a key. You may hold Shift; Esc cancels.',
      ),
    );
    capture.cancel = beginHotkeyCapture({
      nodeId: node.id,
      onCancel: () => {
        if (active === capture) cancel();
      },
      onKey(event) {
        if (active !== capture) return 'cancel';
        if (event.code === 'Escape' || event.key === 'Escape') {
          cancel();
          return 'cancel';
        }
        if (!current(node) || state.project !== capture.project || state.classroom?.isLocked()) {
          cancel();
          return 'cancel';
        }
        if (event.repeat || event.isComposing) return 'retry';
        const binding = bindingFromEvent(event);
        if (
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          hotkeyBindingError(binding) === 'reserved'
        ) {
          status(
            L(
              'Це системне або браузерне скорочення. Виберіть одну клавішу або Shift + клавішу.',
              'This is a system or browser shortcut. Choose one key or Shift + a key.',
            ),
          );
          return 'retry';
        }
        if (!binding || hotkeyBindingError(binding)) {
          status(
            L(
              'Додайте основну клавішу; сам Shift не призначається.',
              'Add a main key; Shift alone cannot be assigned.',
            ),
          );
          return 'retry';
        }
        const conflict = findHotkeyConflict(state.project, binding, node.id);
        if (conflict) {
          status(
            L(
              `Цю клавішу вже використовує «${conflict.label || conflict.id}». Спершу змініть або очистіть його призначення.`,
              `This key is already assigned to “${conflict.label || conflict.id}”. Change or clear that assignment first.`,
            ),
          );
          return 'retry';
        }
        finish();
        return commit(node, { binding }) ? 'accepted' : 'cancel';
      },
    });
    update();
  }
  function bind(node) {
    const panel = root();
    if (!panel || node.type !== 'hotkey') return;
    $('[data-hotkey-record]', panel).onclick = () => start(node);
    $('[data-hotkey-cancel]', panel).onclick = cancel;
    $('[data-hotkey-clear]', panel).onclick = () => {
      cancel();
      commit(node, { binding: '' });
    };
    $('[data-hotkey-mode]', panel).onchange = (event) => {
      cancel();
      const mode = event.target.value;
      if (!['hold', 'inverted', 'toggle'].includes(mode) || !commit(node, { mode })) update();
    };
    update();
  }
  function update() {
    const panel = root();
    if (!panel) return;
    const node = state.project.nodes.find((item) => item.id === panel.dataset.hotkeyProperties);
    if (!node) {
      cancel();
      return;
    }
    if (active && (!current(active.node) || state.classroom?.isLocked())) {
      cancel();
      return;
    }
    const capturing = !!active;
    const locked = !!state.classroom?.isLocked();
    const record = $('[data-hotkey-record]', panel);
    record.disabled = locked || capturing;
    record.setAttribute('aria-pressed', String(capturing));
    $('[data-hotkey-clear]', panel).disabled = locked || capturing || !node.params.binding;
    $('[data-hotkey-cancel]', panel).hidden = !capturing;
    const mode = $('[data-hotkey-mode]', panel);
    mode.disabled = locked || capturing;
    mode.value = node.params.mode || 'hold';
    const binding = $('[data-hotkey-binding]', panel),
      label = displayHotkeyBinding(node.params.binding || '', state.lang);
    if (binding.textContent !== label) binding.textContent = label;
    const value = state.runtime.outputs?.[node.id]?.out;
    const output = $('[data-hotkey-value]', panel);
    const text = value === 0 || value === 1 ? String(value) : 'X';
    if (output.textContent !== text) output.textContent = text;
  }
  return { bind, update, cancel };
}

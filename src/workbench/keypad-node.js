import { KEYPAD_KEYS, KEYPAD_DEFAULTS } from '../components/keypad.js';
import { esc } from '../shared/ui.js';
import { bindMomentaryButton } from './momentary-button.js';

export function keypadModeCaption(node, lang) {
  const parameters = { ...KEYPAD_DEFAULTS, ...node.params };
  const hold = parameters.mode !== 'toggle';
  return parameters.mode === 'pulse'
    ? lang === 'ua'
      ? `Імпульс ≥ ${parameters.pulseDuration} с симуляції`
      : `Pulse ≥ ${parameters.pulseDuration} simulation s`
    : lang === 'ua'
      ? hold
        ? 'Утримання · 1 лише під час натискання'
        : 'Фіксація · натисніть ще раз для відпускання'
      : hold
        ? 'Hold · active while pressed'
        : 'Latch · press again to release';
}

export function keypadNodeMarkup(node, lang, { compact = false } = {}) {
  const caption = keypadModeCaption(node, lang);
  return `<div class="keypad-widget ${compact ? 'compact-keypad' : ''}" data-keypad="${esc(node.id)}" data-language="${lang}" role="group" aria-label="${esc(node.label || (lang === 'ua' ? 'Матрична клавіатура' : 'Matrix keypad'))}"><div class="keypad-grid">${KEYPAD_KEYS.map(({ index, label, row, column }) => `<button type="button" data-keypad-key="${index}" aria-label="${esc(label)} · R${row + 1} C${column + 1}" aria-pressed="false">${esc(label)}</button>`).join('')}</div><p class="keypad-mode" title="${esc(caption)}">${caption}</p><p data-keypad-notice class="keypad-notice" role="status" hidden></p></div>`;
}

export function bindKeypadControls(root, node, setKeypadKey) {
  const buttons = [...root.querySelectorAll('[data-keypad-key]')];
  const disposers = buttons.map((button) => {
    const index = Number(button.dataset.keypadKey);
    const dispose = bindMomentaryButton(button, {
      press: () => setKeypadKey(node.id, index, 1),
      release: () => setKeypadKey(node.id, index, 0),
      allowSecondaryPointers: true,
      retainPointerOnBlur: (event) =>
        event.relatedTarget?.closest?.('[data-keypad]') === button.closest('[data-keypad]'),
    });
    const navigate = (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const row = Math.floor(index / 3),
        col = index % 3;
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? 11
            : event.key === 'ArrowLeft'
              ? row * 3 + Math.max(0, col - 1)
              : event.key === 'ArrowRight'
                ? row * 3 + Math.min(2, col + 1)
                : event.key === 'ArrowUp'
                  ? Math.max(0, row - 1) * 3 + col
                  : Math.min(3, row + 1) * 3 + col;
      buttons[next]?.focus({ preventScroll: true });
    };
    button.addEventListener('keydown', navigate);
    return () => {
      dispose();
      button.removeEventListener('keydown', navigate);
    };
  });
  return () => disposers.forEach((dispose) => dispose());
}

export function updateKeypadControls(
  root,
  node,
  locked,
  { running = true, pending = 0, active = false } = {},
) {
  if (node?.type !== 'keypad' || !root) return;
  for (const button of root.querySelectorAll('[data-keypad-key]')) {
    const active = !!((node.params.keys || 0) & KEYPAD_KEYS[Number(button.dataset.keypadKey)].mask);
    button.disabled = locked || node.enabled === false;
    button.setAttribute('aria-pressed', String(active));
  }
  const widget = root.querySelector?.('[data-keypad]');
  const notice = widget?.querySelector('[data-keypad-notice]');
  if (notice) {
    const ua = widget.dataset.language === 'ua';
    const count = pending + Number(active);
    const text = !running
      ? ua
        ? `Пауза: натисніть «Запуск».${count ? ` У черзі: ${count}.` : ''}`
        : `Paused: press Run.${count ? ` Pending: ${count}.` : ''}`
      : count
        ? ua
          ? `Виконується ввід · залишилось ${count}`
          : `Entering keys · ${count} remaining`
        : '';
    notice.hidden = !text;
    notice.textContent = text;
    notice.title = text;
  }
}

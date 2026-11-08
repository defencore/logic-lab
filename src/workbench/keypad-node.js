import { KEYPAD_KEYS } from '../components/keypad.js';
import { esc } from '../shared/ui.js';
import { bindMomentaryButton } from './momentary-button.js';

export function keypadNodeMarkup(node, lang) {
  const hold = node.params.mode !== 'toggle';
  const caption =
    lang === 'ua'
      ? hold
        ? 'Утримання · 1 лише під час натискання'
        : 'Фіксація · натисніть ще раз для відпускання'
      : hold
        ? 'Hold · active while pressed'
        : 'Latch · press again to release';
  return `<div class="keypad-widget" data-keypad="${esc(node.id)}" role="group" aria-label="${esc(node.label || (lang === 'ua' ? 'Матрична клавіатура' : 'Matrix keypad'))}"><div class="keypad-grid">${KEYPAD_KEYS.map(({ index, label, row, column }) => `<button type="button" data-keypad-key="${index}" aria-label="${esc(label)} · R${row + 1} C${column + 1}" aria-pressed="false">${esc(label)}</button>`).join('')}</div><p class="keypad-mode">${caption}</p></div>`;
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

export function updateKeypadControls(root, node, locked) {
  if (node?.type !== 'keypad' || !root) return;
  for (const button of root.querySelectorAll('[data-keypad-key]')) {
    const active = !!((node.params.keys || 0) & KEYPAD_KEYS[Number(button.dataset.keypadKey)].mask);
    button.disabled = locked || node.enabled === false;
    button.setAttribute('aria-pressed', String(active));
  }
}

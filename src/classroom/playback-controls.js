import { $ } from '../shared/ui.js';
import { icon } from '../shared/icons.js';

/** Global transport follows the active action player; a simulation step keeps its own meaning. */
export function syncPlaybackControls(state, language) {
  const player = state.player,
    preview = state.preview;
  const active = !!player || !!preview;
  const L = (ua, en) => (language === 'ua' ? ua : en);
  for (const selector of ['#step', '#reset', '#motion-reset']) {
    const element = $(selector);
    if (element) element.disabled = active;
  }
  if (!active) {
    for (const selector of ['#run', '#motion-run']) {
      const button = $(selector);
      if (button) {
        button.disabled = false;
        button.title = L('Запуск / пауза · R', 'Run / pause · R');
      }
    }
    return;
  }
  const label = preview
    ? L('Перегляд еталона / роботи', 'Circuit preview')
    : player.done
      ? L('Запис завершено', 'Replay complete')
      : state.playbackRunning
        ? L('Пауза запису', 'Pause replay')
        : L('Продовжити запис', 'Resume replay');
  for (const selector of ['#run', '#motion-run']) {
    const button = $(selector);
    if (!button) continue;
    button.disabled = !!preview || !!player?.done || !!state.busy;
    button.title =
      preview || player?.done
        ? L(
            'Завершіть перегляд, щоб повернутися до симуляції.',
            'End preview to return to simulation.',
          )
        : label;
    const html = icon(state.playbackRunning ? 'pause' : 'play', 14) + `<span>${label}</span>`;
    if (button.textContent !== label) button.innerHTML = html;
    button.classList.toggle('running', !!state.playbackRunning);
  }
}

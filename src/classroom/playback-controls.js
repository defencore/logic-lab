import { $ } from '../shared/ui.js';
import { icon } from '../shared/icons.js';

/** Global transport follows the active action player; a simulation step keeps its own meaning. */
export function syncPlaybackControls(state, language) {
  const player = state.player,
    preview = state.preview;
  const active = !!player || !!preview;
  const demo = $('#example-demo');
  if (demo) demo.disabled = active || state.recording || state.busy;
  const speed = $('.global-speed');
  if (speed) speed.hidden = state.reviewMode === 'demo';
  const badge = $('#simulation-badge');
  if (badge) badge.hidden = state.reviewMode === 'demo';
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
    ? L('Перегляд', 'Preview')
    : player.done
      ? L('Завершено', 'Complete')
      : state.playbackRunning
        ? L('Пауза', 'Pause')
        : L('Продовжити', 'Resume');
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
        : state.playbackRunning
          ? L('Пауза запису', 'Pause replay')
          : L('Продовжити запис', 'Resume replay');
    const html = icon(state.playbackRunning ? 'pause' : 'play', 14) + `<span>${label}</span>`;
    if (button.textContent !== label) button.innerHTML = html;
    button.classList.toggle('running', !!state.playbackRunning);
  }
}

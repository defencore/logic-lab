import { $ } from '../shared/ui.js';

export function createDockController({ adapter, state, session, L, views, safe, open, controls }) {
  let lastDockState = '';
  const { startRecording, stopRecording, replay, nextAction } = controls;
  function mount() {
    const header = $('#classroom');
    if (header) {
      header.innerHTML = `<span aria-hidden="true">▤</span><span>${L('Завдання та здача', 'Assignments & submission')}</span>`;
      header.onclick = () => open();
    }
    updateDock(true);
  }
  function updateDock(force = false) {
    const root = $('#classroom-dock');
    if (!root) return;
    const studentWorkflowActive =
      state.mode === 'student' && !!state.assignment && !state.reviewMode;
    root.hidden =
      studentWorkflowActive ||
      (!state.dockOpen && !state.recording && !state.player && !state.preview);
    const key = [
      state.preview?.name,
      state.reviewMode,
      state.recording,
      !!state.sequence,
      !!state.player,
      state.playbackRunning,
      state.player?.done,
      state.busy,
      adapter.getLanguage(),
    ].join(':');
    if (key !== lastDockState || force) {
      lastDockState = key;
      root.innerHTML = views().dockMarkup();
      $('#classroom-open').onclick = () => open(state.reviewMode ? 'teacher' : 'sequence');
      $('#action-record').onclick = safe(() =>
        state.recording ? stopRecording() : startRecording(),
      );
      $('#action-replay').onclick = safe(replay);
      $('#action-next').onclick = safe(nextAction);
      $('#action-pause').onclick = session.pausePlayback;
      $('#action-stop').onclick = session.stopPlayback;
      $('#action-hide').onclick = () => {
        state.dockOpen = false;
        updateDock();
      };
    }
    const status = state.preview
      ? `${L('Перегляд роботи', 'Reviewing work')}: ${state.preview.name} · ${L('Зупинити — повернутися до своєї схеми', 'Stop to return to your circuit')}`
      : state.recording
        ? `${state.simulationRunning ? L('Запис', 'Recording') : L('Запис на паузі', 'Recording paused')} · ${state.sequence.actions.length} ${L('дій', 'actions')} · ${adapter.getRuntime().time.toFixed(3)} s`
        : state.player
          ? `${state.player.done ? L('Сценарій завершено', 'Replay complete') : state.playbackRunning ? L('Відтворення', 'Replay') : L('Відтворення на паузі', 'Replay paused')} · ${state.player.cursor}/${state.sequence.actions.length} · ${state.player.runtime.time.toFixed(3)} s`
          : state.sequence
            ? `${state.sequence.actions.length} ${L('дій', 'actions')} · ${state.sequence.duration.toFixed(3)} s`
            : L('Ще немає запису', 'No sequence yet');
    if ($('#action-status').textContent !== status) $('#action-status').textContent = status;
    root.classList.toggle('is-recording', state.recording);
  }
  return { mount, updateDock };
}

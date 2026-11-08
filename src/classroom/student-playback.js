import { previousVersionMessage } from './sequence-version.js';
import { $, $$ } from '../shared/ui.js';

export function studentPlaybackActive(state) {
  return state.mode === 'student' && !!state.assignment && !!state.attempt && !state.reviewMode;
}
export function studentPlaybackState(state, language, recordingTime = 0, work = null) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const count = state.sequence?.actions.length || 0;
  const duration = state.sequence?.duration || 0;
  const player = state.player;
  const version = state.sequenceVersion;
  const previous = !!version?.previous && !state.recording;
  const current = player?.runtime.time || (state.recording ? recordingTime : 0);
  const cursor = player?.cursor || 0;
  const disabled = state.busy || state.recording || !!state.preview;
  const status = state.busy
    ? L('Обчислення запису…', 'Processing recording…')
    : state.recording
      ? state.simulationRunning
        ? L('Запис дій', 'Recording actions')
        : L('Запис на паузі', 'Recording paused')
      : player?.done
        ? L('Відтворення завершено', 'Replay complete')
        : player
          ? state.playbackRunning
            ? L('Відтворення триває', 'Replaying')
            : L('Пауза відтворення', 'Replay paused')
          : previous
            ? L('Запис попередньої версії', 'Previous-version recording')
            : work?.requiresVerification && !work.verified
              ? L('Запис потребує перевірки обсягу', 'Recording requires a processing check')
              : work && !work.supported
                ? L('Запис перевищує межу перевірки', 'Recording exceeds the processing limit')
                : L('Запис перевірки готовий', 'Recorded test ready');
  return {
    visible: studentPlaybackActive(state) && !!state.sequence,
    previous,
    versionMessage: previousVersionMessage(version, language),
    summary: `${previous ? L('Попередня версія · ', 'Previous version · ') : ''}${count} ${L('дій', 'actions')} · ${(state.recording ? recordingTime : duration).toFixed(3)} ${L('с', 's')}`,
    status: player
      ? `${status} · ${cursor}/${count} · ${current.toFixed(3)} / ${duration.toFixed(3)} ${L('с', 's')}`
      : status,
    replayDisabled: disabled || !state.sequence || (!!player && !player.done),
    pauseDisabled: disabled || !player || player.done,
    nextDisabled: disabled || !state.sequence || state.playbackRunning || !!player?.done,
    stopDisabled: !!state.busy || !player,
    trimDisabled: disabled || !!player || !state.sequence,
    replayLabel: previous
      ? L('Переглянути попередній запис', 'View previous recording')
      : player?.done
        ? L('Відтворити ще раз', 'Replay again')
        : L('Відтворити', 'Replay'),
    pauseLabel: state.playbackRunning ? L('Пауза', 'Pause') : L('Продовжити', 'Resume'),
  };
}
export function studentPlaybackMarkup(language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  return `<section class="student-playback" data-student-playback aria-label="${L('Перевірка записаного досліду', 'Inspect the recorded experiment')}" hidden><div class="student-playback-heading"><strong data-student-playback-summary></strong><span data-student-playback-status role="status" aria-live="off"></span></div><p data-student-playback-version class="student-playback-version" role="note" hidden></p><div class="student-playback-controls"><button type="button" class="soft-btn" data-student-playback-action="replay">${L('Відтворити', 'Replay')}</button><button type="button" class="soft-btn" data-student-playback-action="pause">${L('Продовжити', 'Resume')}</button><button type="button" class="soft-btn" data-student-playback-action="next" aria-label="${L('Наступна записана дія', 'Next recorded action')}" title="${L('Наступна записана дія', 'Next recorded action')}">${L('Наступна дія →', 'Next action →')}</button><button type="button" class="soft-btn" data-student-playback-action="stop">${L('Зупинити', 'Stop')}</button><button type="button" class="soft-btn" data-student-playback-action="trim">${L('Скоротити запис', 'Shorten recording')}</button></div></section>`;
}
export function createStudentPlayback({ state, adapter, session, controls, safe }) {
  function bind(root) {
    $$('[data-student-playback-action]', root).forEach((button) => {
      button.onclick = safe(() => {
        const action = button.dataset.studentPlaybackAction;
        if (action === 'replay') return controls.replay();
        if (action === 'pause') return session.pausePlayback();
        if (action === 'next') return controls.nextAction();
        if (action === 'stop') return session.stopPlayback();
        if (action === 'trim') return controls.trimRecording();
      });
    });
  }
  function update(root, work = null) {
    const panel = $('[data-student-playback]', root);
    if (!panel) return;
    const value = studentPlaybackState(
      state,
      adapter.getLanguage(),
      adapter.getRuntime?.().time,
      work,
    );
    panel.hidden = !value.visible;
    if (panel.hidden) return;
    panel.classList?.toggle('is-previous-version', value.previous);
    const marker = $('[data-student-playback-version]', panel);
    if (marker) {
      marker.hidden = !value.previous;
      marker.textContent = value.versionMessage;
    }
    $('[data-student-playback-summary]', panel).textContent = value.summary;
    $('[data-student-playback-status]', panel).textContent = value.status;
    for (const action of ['replay', 'pause', 'next', 'stop', 'trim']) {
      const button = $(`[data-student-playback-action="${action}"]`, panel);
      button.disabled = !!value[`${action}Disabled`];
      if (value[`${action}Label`] && button.textContent !== value[`${action}Label`])
        button.textContent = value[`${action}Label`];
    }
  }
  return { bind, update };
}

import { createAudioEngine } from '../audio/engine.js';
import { isAudioNode } from '../workbench/audio-node.js';
import { icon } from '../shared/icons.js';

export function createAudioController({ state, services, actions }, engine = createAudioEngine()) {
  const L = (ua, en) => (state.lang === 'ua' ? ua : en);
  let pending = false;
  let renderedButton = null,
    renderedLabel = '';
  function updateButton() {
    const button = document.querySelector('#sound-toggle');
    if (!button) return;
    const status = engine.status();
    button.hidden = !state.project.nodes.some(isAudioNode);
    button.disabled = pending || !status.available;
    button.setAttribute('aria-pressed', String(status.enabled));
    button.dataset.contextState = status.contextState;
    button.dataset.voices = String(status.voices);
    button.dataset.scheduledEvents = String(status.scheduledEvents);
    const label = status.enabled
      ? L('Звук увімкнено', 'Sound on')
      : L('Увімкнути звук', 'Enable sound');
    if (button !== renderedButton || label !== renderedLabel) {
      button.innerHTML = `${icon(status.enabled ? 'speaker' : 'speaker-off', 16)}<span>${label}</span>`;
      renderedButton = button;
      renderedLabel = label;
    }
    button.setAttribute('aria-label', label);
    button.title = !status.available
      ? L(
          'Цей браузер не підтримує відтворення звуку.',
          'This browser does not support audio playback.',
        )
      : status.enabled
        ? L(
            'Вимкнути звук. Пауза симуляції також зупиняє звук.',
            'Mute sound. Pausing the simulation also stops audio.',
          )
        : L(
            'Дозволити звук бузерів у цій вкладці. Для звучання запустіть симуляцію.',
            'Enable buzzers in this tab. Run the simulation to hear them.',
          );
    if (status.skippedVoices > 0)
      button.title += L(
        ` Не озвучено джерел через ліміт одночасного звуку: ${status.skippedVoices}. Вимкніть зайві зумери.`,
        ` Sources beyond the simultaneous audio limit: ${status.skippedVoices}. Disable unused buzzers.`,
      );
  }
  function sync() {
    engine.sync({
      project: state.project,
      runtime: state.runtime,
      running:
        !document.hidden &&
        (services.classroom?.isPlaying() ? services.classroom.isPlaybackRunning() : state.running),
      completed: !document.hidden && !!services.classroom?.isPlaybackComplete(),
      rate: state.simulationRate,
    });
    updateButton();
  }
  async function toggle() {
    if (pending) return;
    if (engine.status().enabled) engine.disable();
    else {
      pending = true;
      const enabled = await engine.enable();
      pending = false;
      if (!enabled)
        actions.notify(
          L(
            'Браузер не увімкнув звук. Спробуйте натиснути кнопку ще раз.',
            'The browser did not enable audio. Try clicking the button again.',
          ),
        );
    }
    sync();
  }
  function mount() {
    const button = document.querySelector('#sound-toggle');
    if (button) button.onclick = toggle;
    sync();
  }
  return {
    mount,
    sync,
    suspend: () => {
      engine.suspend();
      updateButton();
    },
    status: engine.status,
  };
}

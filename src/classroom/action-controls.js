import { createRecordingSetup } from './recording-setup.js';
import { createSequenceTrim } from './sequence-trim-controller.js';
import { workLimitMessage } from '../experiments/replay-work-policy.js';
export function createActionControls({ adapter, state, session, L, guardIdle, operations }) {
  const trimRecording = createSequenceTrim({ adapter, state, session, L, guardIdle, operations });
  function beginRecording(probes) {
    guardIdle();
    session.startRecording({ probes });
    adapter.closeModal();
    adapter.notify(
      L(
        'Початок з початкового стану. Перемикайте входи; схема під час запису зафіксована.',
        'Started from initial state. Change inputs; circuit editing is locked while recording.',
      ),
    );
  }
  const startRecording = createRecordingSetup({
    adapter,
    state,
    session,
    L,
    begin: beginRecording,
    guardIdle,
  });
  function stopRecording() {
    session.stopRecording();
  }
  async function verifyRecording() {
    guardIdle();
    adapter.closeModal();
    adapter.notify(
      L(
        'Перевіряється можливість обробки запису…',
        'Checking whether the recording can be processed…',
      ),
    );
    try {
      const report = await operations.run(() => session.verifyRecording());
      adapter.notify(
        report.supported
          ? L(
              'Запис перевірено. Можна продовжити підготовку роботи.',
              'Recording verified. Continue preparing your work.',
            )
          : workLimitMessage(report, adapter.getLanguage()),
      );
    } catch (error) {
      if (error.code === 'replay_work_limit')
        adapter.notify(workLimitMessage(error.work, adapter.getLanguage()));
      else throw error;
    }
  }
  function replay() {
    guardIdle();
    session.replay();
    adapter.closeModal();
  }
  function nextAction() {
    guardIdle();
    const result = session.nextAction();
    adapter.closeModal();
    if (!result.actionApplied && !result.done)
      adapter.notify(
        L(
          'Обчислюється пауза перед дією. Натисніть ще раз.',
          'Computing the interval before the action. Press again to continue.',
        ),
      );
  }
  function tick(dt) {
    try {
      const result = session.tick(dt);
      if (result.completed && state.reviewMode !== 'demo')
        adapter.notify(
          L(
            'Сценарій відтворено. Натисніть «Зупинити», щоб повернутися до своєї схеми.',
            'Replay complete. Stop replay to return to your own circuit.',
          ),
        );
      if (result.limitReached)
        adapter.notify(
          L(
            `Запис завершено на межі ${session.recordingLimit().maxDuration.toFixed(3)} с для цієї схеми. Можна скоротити запис або зберегти результат.`,
            `Recording reached this circuit’s ${session.recordingLimit().maxDuration.toFixed(3)} s limit. Shorten the recording or save the result.`,
          ),
        );
      return result.playing;
    } catch (error) {
      session.stopPlayback();
      adapter.notify(error.message);
      return false;
    }
  }
  function inputChanged(node, key, value) {
    try {
      session.inputChanged(node, key, value);
    } catch (error) {
      session.stopRecording();
      adapter.notify(error.message);
    }
  }
  function isLocked() {
    return session.isLocked() || state.busy;
  }
  function allowEdit() {
    if (!isLocked()) return true;
    adapter.notify(
      state.busy
        ? L(
            'Дочекайтеся завершення поточної операції.',
            'Wait for the current classroom operation to finish.',
          )
        : L(
            'Завершіть запис або зупиніть відтворення, щоб змінювати схему.',
            'Finish recording or stop replay before editing the circuit.',
          ),
    );
    return false;
  }
  function allowInput() {
    if (!state.player && !state.preview && !state.busy) return true;
    adapter.notify(
      state.busy
        ? L(
            'Дочекайтеся завершення поточної операції.',
            'Wait for the current classroom operation to finish.',
          )
        : L(
            'Під час відтворення входами керує сценарій. Натисніть «Зупинити» для ручного керування.',
            'The sequence controls inputs during replay. Stop replay to control them manually.',
          ),
    );
    return false;
  }
  return {
    startRecording,
    stopRecording,
    replay,
    nextAction,
    trimRecording,
    verifyRecording,
    tick,
    inputChanged,
    isLocked,
    allowEdit,
    allowInput,
  };
}

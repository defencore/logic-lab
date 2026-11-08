export function createActionControls({ adapter, state, session, L, guardIdle }) {
  function startRecording() {
    guardIdle();
    session.startRecording();
    adapter.closeModal();
    adapter.notify(
      L(
        'Початок з початкового стану. Перемикайте входи; схема під час запису зафіксована.',
        'Started from initial state. Change inputs; circuit editing is locked while recording.',
      ),
    );
  }
  function stopRecording() {
    session.stopRecording();
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
      if (result.completed)
        adapter.notify(
          L(
            'Сценарій відтворено. Натисніть «Зупинити», щоб повернутися до своєї схеми.',
            'Replay complete. Stop replay to return to your own circuit.',
          ),
        );
      if (result.limitReached)
        adapter.notify(
          L(
            'Запис завершено на межі 120 секунд. Збережіть сценарій або почніть новий.',
            'Recording completed at the 120-second limit. Save the sequence or start another.',
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
    if (!state.player && !state.busy) return true;
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
    tick,
    inputChanged,
    isLocked,
    allowEdit,
    allowInput,
  };
}

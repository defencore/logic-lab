import { parseClassroomImport } from './import-file.js';
import { $ } from '../shared/ui.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  validateSequence,
  serializeSequence,
} from '../experiments/actions.js';
import { cleanName, downloadFile, readClassroomFile } from './files.js';

export function createSequenceController({
  adapter,
  state,
  session,
  safe,
  bindFile,
  guardEditableSession,
  refreshVisible,
  controls,
}) {
  const { startRecording, stopRecording, replay, nextAction } = controls;
  function bindSequence() {
    $('#class-record').onclick = safe(() =>
      state.recording ? (stopRecording(), refreshVisible()) : startRecording(),
    );
    $('#class-replay').onclick = safe(replay);
    $('#class-next').onclick = safe(nextAction);
    bindFile('#class-sequence-import', async (files) =>
      session.setSequence(
        parseClassroomImport(await readClassroomFile(files[0]), 'sequence', validateSequence),
      ),
    );
    $('#class-sequence-export').onclick = safe(() =>
      downloadFile(
        serializeSequence(state.sequence),
        `${cleanName(state.sequence.initialProject.name)}.actions.json`,
      ),
    );
    if ($('#class-preset'))
      $('#class-preset').onclick = safe(() => {
        guardEditableSession();
        const example = adapter.getExample();
        const sequence = createSequence(example.create(), { probes: example.actionProbes });
        for (const action of example.actionPreset) appendAction(sequence, action);
        finishSequence(
          sequence,
          Math.max(0, ...example.actionPreset.map((action) => action.at)) + 0.1,
        );
        session.setSequence(sequence);
        refreshVisible();
      });
  }
  return { bindSequence };
}

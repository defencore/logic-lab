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

function exampleSequence(example) {
  const sequence = createSequence(example.create(), { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  return finishSequence(
    sequence,
    Math.max(0, ...example.actionPreset.map((action) => action.at)) + 0.1,
  );
}

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
    $('#class-sequence-trim').onclick = safe(controls.trimRecording);
    if ($('#class-sequence-verify'))
      $('#class-sequence-verify').onclick = safe(controls.verifyRecording);
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
    const preset = $('#class-preset');
    if (preset) {
      const example = adapter.getExample();
      preset.onclick = example.demoLabel
        ? () => playExample(example)
        : safe(() => {
            guardEditableSession();
            session.setSequence(exampleSequence(example));
            refreshVisible();
          });
    }
  }
  const playExample = safe((example) => {
    guardEditableSession();
    const sequence = exampleSequence(example);
    session.reviewWork(sequence.initialProject, sequence, { kind: 'demo' });
    adapter.closeModal();
    adapter.showDemoCanvas(example.demoFocus);
  });
  return { bindSequence, playExample };
}

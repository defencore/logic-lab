import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createClassroomView } from '../../src/classroom/view.js';
import { studentPlaybackState } from '../../src/classroom/student-playback.js';
import { sequenceFor } from './fixtures/classroom-session.js';

function fixture(overrides = {}, language = 'en') {
  const project = createExample('shift-register-sequence');
  const state = {
    mode: 'teacher',
    sequence: sequenceFor(project),
    observations: [],
    recording: false,
    player: null,
    playbackRunning: false,
    busy: false,
    ...overrides,
  };
  const view = createClassroomView({ state, language, project, example: null });
  return { state, dock: view.dockMarkup(), panel: view.mainMarkup('sequence') };
}

function control(markup, id) {
  const match = markup.match(new RegExp(`<button\\b([^>]*\\bid="${id}"[^>]*)>([^<]*)</button>`));
  assert.ok(match, `Missing control ${id}`);
  return { disabled: /\bdisabled\b/.test(match[1]), label: match[2] };
}

const player = (done = false, cursor = 1) => ({ done, cursor, runtime: { time: done ? 0.1 : 0 } });

test('generic dock and sequence panel disable Next at completion and expose explicit restart in both languages', () => {
  for (const language of ['ua', 'en']) {
    for (const phase of [
      { name: 'idle', state: {}, next: false, replay: false },
      {
        name: 'playing',
        state: { player: player(), playbackRunning: true },
        next: true,
        replay: true,
      },
      { name: 'paused', state: { player: player() }, next: false, replay: true },
      { name: 'completed', state: { player: player(true) }, next: true, replay: false },
      { name: 'busy', state: { player: player(true), busy: true }, next: true, replay: true },
      { name: 'recording', state: { recording: true }, next: true, replay: true },
      { name: 'empty', state: { sequence: null }, next: true, replay: true },
    ]) {
      const { dock, panel } = fixture(phase.state, language);
      for (const [markup, nextId, replayId] of [
        [dock, 'action-next', 'action-replay'],
        [panel, 'class-next', 'class-replay'],
      ]) {
        assert.equal(control(markup, nextId).disabled, phase.next, `${language} ${phase.name}`);
        assert.equal(control(markup, replayId).disabled, phase.replay, `${language} ${phase.name}`);
        if (phase.name === 'completed')
          assert.equal(
            control(markup, replayId).label,
            language === 'ua' ? 'Почати запис спочатку' : 'Restart recording',
          );
      }
    }
  }
});

test('reference checks and student reviews restart explicitly only after completion while all Next controls stay disabled', () => {
  for (const language of ['ua', 'en']) {
    for (const reviewMode of ['check', 'replay']) {
      for (const phase of [
        { state: { player: player(), playbackRunning: true }, next: true, restart: true },
        { state: { player: player() }, next: false, restart: true },
        { state: { player: player(true) }, next: true, restart: false },
        { state: { player: player(true), busy: true }, next: true, restart: true },
      ]) {
        const { dock, panel } = fixture(
          {
            reviewMode,
            reviewCheck: { label: 'Student', checkpoint: { after: 0, at: 0 } },
            ...phase.state,
          },
          language,
        );
        assert.equal(control(dock, 'action-next').disabled, phase.next);
        assert.equal(control(panel, 'class-next').disabled, phase.next);
        assert.equal(control(dock, 'action-replay').disabled, phase.restart);
        if (phase.state.player.done) {
          const expected =
            reviewMode === 'check'
              ? language === 'ua'
                ? 'Почати перевірку спочатку'
                : 'Restart reference check'
              : language === 'ua'
                ? 'Почати запис спочатку'
                : 'Restart student recording';
          assert.equal(control(dock, 'action-replay').label, expected);
          assert.equal(control(panel, 'class-replay').label, expected);
        }
      }
    }
  }
});

test('static circuit and key reference previews never acquire replay or Next controls', () => {
  for (const reviewMode of ['circuit', 'reference']) {
    const { dock, panel } = fixture({
      reviewMode,
      preview: { label: 'Reference', name: 'Reference' },
    });
    assert.equal(control(dock, 'action-next').disabled, true);
    assert.equal(control(dock, 'action-replay').disabled, true);
    assert.equal(control(panel, 'class-next').disabled, true);
    assert.equal(control(panel, 'class-replay').disabled, true);
  }
});

test('Next remains available for a final simulation interval after all actions until playback is actually done', () => {
  for (const reviewMode of [null, 'check', 'replay']) {
    const { dock, panel } = fixture({
      reviewMode,
      player: player(false, 2),
      reviewCheck: { label: 'Student', checkpoint: { after: 1, at: 0 } },
    });
    assert.equal(control(dock, 'action-next').disabled, false);
    assert.equal(control(panel, 'class-next').disabled, false);
    assert.equal(control(dock, 'action-replay').disabled, true);
  }
});

test('completed previous-version sequences retain the warning and an explicit previous-recording restart label', () => {
  for (const language of ['ua', 'en']) {
    const { dock, panel } = fixture(
      {
        player: player(true),
        sequenceVersion: { previous: true, recordedNodes: 6, currentNodes: 7 },
      },
      language,
    );
    const expected =
      language === 'ua' ? 'Почати попередній запис спочатку' : 'Restart previous recording';
    assert.equal(control(dock, 'action-replay').label, expected);
    assert.equal(control(panel, 'class-replay').label, expected);
    assert.match(panel, /previous-recording-warning/);
    assert.match(
      panel,
      language === 'ua' ? /Запис попередньої версії/ : /Previous-version recording/,
    );
    assert.equal(control(panel, 'class-next').disabled, true);
  }
});

test('student workflow retains separate replay-again and completed Next states', () => {
  for (const language of ['ua', 'en']) {
    const { state } = fixture(
      { mode: 'student', assignment: {}, attempt: {}, player: player(true) },
      language,
    );
    const controls = studentPlaybackState(state, language);
    assert.equal(controls.nextDisabled, true);
    assert.equal(controls.replayDisabled, false);
    assert.equal(controls.replayLabel, language === 'ua' ? 'Відтворити ще раз' : 'Replay again');
  }
});

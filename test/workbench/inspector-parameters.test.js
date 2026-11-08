import test from 'node:test';
import assert from 'node:assert/strict';
import { parameterField } from '../../src/workbench/component-parameters.js';
import { inspectorParameterFixture } from './fixtures/inspector-parameters.js';
import elevatorGuide from '../../src/learning/guides/scenes/elevator.js';

test('changing keypad mode patches dependent fields and caption immediately while canceling actual queued pulses', (t) => {
  const f = inspectorParameterFixture(t, 'keypad', { pulseDuration: 0.08 });
  const mode = f.fields.get('mode'),
    duration = f.fields.get('pulseDuration');
  mode.focus();
  assert.equal(f.controller.press('pad', 1), true);
  assert.equal(f.controller.press('pad', 4), true);
  assert.deepEqual(f.controller.status('pad'), { active: true, pending: 1 });
  f.change('mode', 'hold');
  assert.equal(f.node.params.keys, 0);
  assert.deepEqual(f.controller.status('pad'), { active: false, pending: 0 });
  assert.equal(f.labels.get('pulseDuration').hidden, true);
  assert.match(f.caption.textContent, /Утримання/);
  assert.equal(document.activeElement, mode);
  assert.equal(f.fields.get('mode'), mode);
  assert.equal(f.fields.get('pulseDuration'), duration);
  assert.equal(duration.value, '0.08');
  assert.equal(f.events.at(-1).pulseHidden, true);
  assert.match(f.events.at(-1).caption, /Утримання/);
  assert.match(f.events.at(-2).canvas, /Утримання/);
  assert.equal(f.controller.press('pad', 4), true);
  assert.equal(f.node.params.keys, 16);
  f.change('mode', 'pulse', 'onchange');
  assert.equal(f.node.params.keys, 0, 'a previous hold cannot leak into the new pulse mode');
  assert.equal(f.labels.get('pulseDuration').hidden, false);
  assert.equal(f.fields.get('pulseDuration'), duration);
  assert.equal(document.activeElement, mode);
  assert.match(f.caption.textContent, /Імпульс ≥ 0.08/);
  assert.equal(f.draftLabel.value, 'unfinished label');
  assert.equal(f.draftLabel.selectionStart, 6);
});

test('pulse duration edits refresh the existing inspector caption and canvas before signal updates without stealing focus', (t) => {
  const f = inspectorParameterFixture(t);
  const duration = f.fields.get('pulseDuration');
  duration.focus();
  f.change('pulseDuration', 0.12);
  f.change('pulseDuration', 0.15);
  assert.equal(f.node.params.pulseDuration, 0.15);
  assert.match(f.caption.textContent, /Імпульс ≥ 0.15/);
  assert.match(f.events.at(-2).canvas, /Імпульс ≥ 0.15/);
  assert.match(f.events.at(-1).caption, /Імпульс ≥ 0.15/);
  assert.equal(document.activeElement, duration);
  assert.equal(f.checkpoints.length, 1, 'one continuous edit has one undo boundary');
  assert.equal(f.fields.get('pulseDuration'), duration);
});

test('position unit changes relabel both existing numeric inputs without conversion, draft loss or focus changes', async (t) => {
  for (const language of ['en', 'ua'])
    await t.test(language, (t) => {
      const f = inspectorParameterFixture(
        t,
        'position_sensor',
        { unit: 'floor', threshold: 5, tolerance: 0.015 },
        language,
      );
      const unit = f.fields.get('unit'),
        threshold = f.fields.get('threshold'),
        tolerance = f.fields.get('tolerance');
      unit.focus();
      f.change('unit', 'mm');
      assert.match(f.captions.get('threshold').textContent, /\(mm\)|\(мм\)/);
      assert.match(f.captions.get('tolerance').textContent, /\(mm\)|\(мм\)/);
      f.change('unit', 'floor', 'onchange');
      assert.match(
        f.captions.get('threshold').textContent,
        language === 'ua' ? /поверхи/ : /floors/,
      );
      assert.match(
        f.captions.get('tolerance').textContent,
        language === 'ua' ? /поверхи/ : /floors/,
      );
      assert.equal(f.events.at(-1).threshold, f.captions.get('threshold').textContent);
      assert.equal(f.node.params.threshold, 5);
      assert.equal(f.node.params.tolerance, 0.015);
      assert.equal(threshold.value, '5');
      assert.equal(tolerance.value, '0.015');
      assert.equal(f.fields.get('threshold'), threshold);
      assert.equal(f.fields.get('tolerance'), tolerance);
      assert.equal(document.activeElement, unit);
      document.activeElement = f.draftLabel;
      f.change('unit', 'mm');
      assert.equal(document.activeElement, f.draftLabel);
      assert.deepEqual(f.draftLabel, { value: 'unfinished label', selectionStart: 6 });
    });
});

test('initial property markup uses the actual position unit and keeps the keypad pulse field ready but hidden outside pulse mode', () => {
  for (const language of ['en', 'ua']) {
    const floor = parameterField('threshold', 5, 'position_sensor', language, (key) => key, {
      unit: 'floor',
    });
    assert.match(floor, language === 'ua' ? /поверхи/ : /floors/);
    assert.doesNotMatch(floor, /\(mm\)|\(мм\)/);
    assert.match(
      parameterField('tolerance', 0.015, 'position_sensor', language, (key) => key),
      /\(mm\)|\(мм\)/,
    );
    assert.match(
      parameterField('pulseDuration', 0.04, 'keypad', language, (key) => key, { mode: 'hold' }),
      /<label[^>]+hidden/,
    );
    assert.doesNotMatch(
      parameterField('pulseDuration', 0.04, 'keypad', language, (key) => key, { mode: 'pulse' }),
      /<label[^>]+hidden/,
    );
  }
  assert.match(elevatorGuide.steps[2][0], /near F2/);
  assert.match(elevatorGuide.steps[2][1], /Біля F2/);
});

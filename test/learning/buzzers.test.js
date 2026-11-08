import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { getGuide } from '../../src/learning/guides/index.js';
import { guideMarkup, filterExamples } from '../../src/learning/views/guides.js';
import { renderLibraryItems, renderLibraryCategories } from '../../src/learning/views/catalog.js';
import { getTruthTable, truthTableMarkup } from '../../src/learning/truth-tables.js';
import { EXAMPLES } from '../../examples/index.js';

test('the Sound category exposes both buzzers with bilingual manuals and the actual contact labels', () => {
  for (const language of ['en', 'ua']) {
    const catalog = renderLibraryItems({ category: 'audio', language });
    assert.equal(catalog.count, 2);
    assert.match(catalog.html, /data-component="active_buzzer"/);
    assert.match(catalog.html, /data-component="passive_buzzer"/);
    assert.match(
      renderLibraryCategories('audio', language),
      /data-category="audio" aria-pressed="true"/,
    );
    for (const [type, label] of [
      ['active_buzzer', 'EN'],
      ['passive_buzzer', 'SIGNAL'],
    ]) {
      const definition = getDefinition(type);
      const guide = getGuide(type, language);
      assert.deepEqual(
        definition.inputs.map(({ id, label }) => [id, label]),
        [['in', label]],
      );
      assert.deepEqual(definition.outputs, []);
      assert.deepEqual(Object.keys(guide.inputs), ['in']);
      assert.deepEqual(guide.outputs, {});
      assert.match(guide.inputs.in, new RegExp(label));
      assert.match(guide.inputs.in, /\(in\)/);
      assert.match(guideMarkup(type, language), /Buzzer state table|Таблиця станів зумера/);
      assert.ok(guide.examples.every((id) => EXAMPLES.some((example) => example.id === id)));
    }
  }
});

test('buzzer state references distinguish a high enable from a full periodic waveform', () => {
  for (const language of ['en', 'ua']) {
    const active = truthTableMarkup('active_buzzer', language, 'node-a');
    const passive = truthTableMarkup('passive_buzzer', language, 'node-b');
    assert.equal((active.match(/<tr>/g) || []).length, 4);
    assert.equal((passive.match(/<tr>/g) || []).length, 5);
    assert.match(active, /<td>1<\/td><td>[^<]*880/);
    assert.match(passive, /Constant 0|Стала 0/);
    assert.match(passive, /Constant 1|Стала 1/);
    assert.match(passive, /f = 1 \/ \(T1 \+ T0\)/);
    assert.match(passive, /440/);
    assert.match(passive, /X \/ Z/);
    assert.doesNotMatch(active + passive, /data-truth-node|data-truth-inputs/);
    assert.equal(getTruthTable('active_buzzer'), null);
    assert.equal(getTruthTable('passive_buzzer'), null);
  }
  assert.equal(truthTableMarkup('passive_buzzer', 'uk'), truthTableMarkup('passive_buzzer', 'ua'));
});

test('manuals teach timing units, explicit audio permission, source recording and speed differences', () => {
  for (const language of ['en', 'ua']) {
    const active = getGuide('active_buzzer', language);
    const passive = getGuide('passive_buzzer', language);
    const allText = (guide) =>
      [guide.purpose, ...guide.steps, guide.expected, ...guide.pitfalls].join(' ');
    assert.match(allText(active), /880/);
    assert.match(allText(active), /0\.15/);
    assert.match(allText(active), /frequency/);
    assert.match(allText(active), /volume/);
    for (const guide of [active, passive]) {
      assert.match(allText(guide), /Enable sound|Увімкнути звук/);
      assert.match(allText(guide), /reload|перезавантаження/);
    }
    for (const figure of ['2.272727', '2272.727', '1.136364', '1136.364'])
      assert.ok(allText(passive).includes(figure));
    assert.match(allText(passive), /1,000,000|1 000 000/);
    assert.match(allText(passive), /clock\.frequency/);
    assert.match(allText(passive), /1000/);
    assert.match(allText(passive), /1×/);
    assert.match(allText(passive), /propagation delay|затримки поширення/);
  }
});

test('the three sound laboratories can be found by their component types and translated topics', () => {
  const ids = ['active-buzzer-alarm', 'passive-buzzer-melody', 'buzzer-clock-divider'];
  assert.deepEqual(
    filterExamples(EXAMPLES, { query: 'buzzer' })
      .map(({ id }) => id)
      .sort(),
    [...ids].sort(),
  );
  for (const query of ['зумер', 'buzzer']) {
    const matches = filterExamples(EXAMPLES, { query });
    assert.ok(ids.every((id) => matches.some((example) => example.id === id)));
  }
  assert.deepEqual(
    filterExamples(EXAMPLES, { query: 'active_buzzer' }).map(({ id }) => id),
    ['active-buzzer-alarm'],
  );
  assert.deepEqual(
    filterExamples(EXAMPLES, { query: 'passive_buzzer' }).map(({ id }) => id),
    ['passive-buzzer-melody', 'buzzer-clock-divider'],
  );
});

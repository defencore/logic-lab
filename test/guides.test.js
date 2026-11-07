import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS } from '../src/catalog.js';
import { EXAMPLES } from '../src/examples.js';
import { GUIDES, getGuide } from '../src/guides.js';

test('the beginner guide catalog covers every component without stale entries', () => {
  assert.deepEqual(Object.keys(GUIDES).sort(), COMPONENTS.map(({ type }) => type).sort());
});

test('both languages explain every pin and every configurable parameter', () => {
  for (const definition of COMPONENTS) {
    for (const language of ['en', 'ua']) {
      const guide = getGuide(definition.type, language);
      const context = `${definition.type}/${language}`;
      assert.ok(guide && typeof guide === 'object', context);
      for (const field of ['purpose', 'experiment', 'expected'])
        assert.ok(
          typeof guide[field] === 'string' && guide[field].length >= 30,
          `${context}/${field}`,
        );
      assert.ok(Array.isArray(guide.steps) && guide.steps.length >= 3, `${context}/steps`);
      assert.ok(
        guide.steps.every((step) => typeof step === 'string' && step.length >= 25),
        `${context}/steps text`,
      );
      assert.ok(Array.isArray(guide.pitfalls) && guide.pitfalls.length >= 1, `${context}/pitfalls`);
      assert.ok(
        guide.pitfalls.every((pitfall) => typeof pitfall === 'string' && pitfall.length >= 35),
        `${context}/pitfalls text`,
      );
      for (const direction of ['inputs', 'outputs']) {
        assert.deepEqual(
          Object.keys(guide[direction]).sort(),
          definition[direction].map(({ id }) => id).sort(),
          `${context}/${direction}`,
        );
        assert.ok(
          Object.values(guide[direction]).every(
            (text) => typeof text === 'string' && text.length >= 12,
          ),
          `${context}/${direction} explanations`,
        );
      }
      const instructionText = [
        guide.purpose,
        ...guide.steps,
        guide.experiment,
        guide.expected,
        ...guide.pitfalls,
        ...Object.values(guide.inputs),
        ...Object.values(guide.outputs),
      ]
        .join(' ')
        .toLowerCase();
      for (const parameter of Object.keys(definition.defaults))
        assert.ok(
          instructionText.includes(parameter.toLowerCase()),
          `${context} does not teach ${parameter}`,
        );
    }
  }
});

test('every guide links to existing learning examples', () => {
  const ids = new Set(EXAMPLES.map(({ id }) => id));
  for (const definition of COMPONENTS) {
    for (const language of ['en', 'ua']) {
      const guide = getGuide(definition.type, language);
      assert.ok(
        Array.isArray(guide.examples) && guide.examples.length,
        `${definition.type}/${language}`,
      );
      assert.equal(
        new Set(guide.examples).size,
        guide.examples.length,
        `${definition.type} duplicate example`,
      );
      for (const id of guide.examples)
        assert.ok(ids.has(id), `${definition.type}: unknown example ${id}`);
    }
  }
});

test('component instructions and translations are distinct rather than generic placeholders', () => {
  for (const language of ['en', 'ua']) {
    for (const field of ['purpose', 'experiment', 'expected']) {
      const values = COMPONENTS.map(({ type }) => getGuide(type, language)[field]);
      assert.equal(
        new Set(values).size,
        values.length,
        `${language}/${field} contains reused generic text`,
      );
    }
  }
  for (const { type } of COMPONENTS)
    for (const field of ['purpose', 'experiment', 'expected'])
      assert.notEqual(
        getGuide(type, 'en')[field],
        getGuide(type, 'ua')[field],
        `${type}/${field} lacks translation`,
      );
});

test('guide lookup handles language aliases, default language and unknown components', () => {
  assert.equal(getGuide('and'), GUIDES.and.en);
  assert.equal(getGuide('and', 'ua'), GUIDES.and.ua);
  assert.equal(getGuide('and', 'uk'), GUIDES.and.ua);
  assert.equal(getGuide('and', 'unrecognized'), GUIDES.and.en);
  assert.equal(getGuide('missing'), undefined);
  assert.equal(getGuide('toString'), undefined);
  assert.equal(getGuide('__proto__'), undefined);
});

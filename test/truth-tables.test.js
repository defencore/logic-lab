import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { getTruthTable, truthTableMarkup } from '../src/truth-tables.js';

const expected = {
  and: [[0], [0], [0], [1]],
  or: [[0], [1], [1], [1]],
  not: [[1], [0]],
  nand: [[1], [1], [1], [0]],
  nor: [[1], [0], [0], [0]],
  xor: [[0], [1], [1], [0]],
  xnor: [[1], [0], [0], [1]],
  half_adder: [
    [0, 0],
    [1, 0],
    [1, 0],
    [0, 1],
  ],
  full_adder: [
    [0, 0],
    [1, 0],
    [1, 0],
    [0, 1],
    [1, 0],
    [0, 1],
    [0, 1],
    [1, 1],
  ],
};

test('truth models match independently specified gate and adder output vectors', () => {
  for (const [type, outputs] of Object.entries(expected)) {
    const table = getTruthTable(type);
    assert.deepEqual(
      table.rows.map((row) => row.outputs),
      outputs,
      type,
    );
    assert.deepEqual(
      table.inputs.map((port) => port.id),
      getDefinition(type).inputs.map((port) => port.id),
    );
    assert.deepEqual(
      table.outputs.map((port) => port.id),
      getDefinition(type).outputs.map((port) => port.id),
    );
  }
  assert.deepEqual(
    getTruthTable('not').rows.map((row) => row.inputs),
    [[0], [1]],
  );
  assert.deepEqual(
    getTruthTable('and').rows.map((row) => row.inputs),
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  );
  assert.deepEqual(
    getTruthTable('full_adder').rows.map((row) => row.inputs),
    [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ],
  );
});

test('cached models are deeply immutable and never expose mutable catalog objects', () => {
  const table = getTruthTable('and');
  assert.equal(table, getTruthTable('and'));
  assert.notEqual(table.inputs, getDefinition('and').inputs);
  assert.notEqual(table.inputs[0], getDefinition('and').inputs[0]);
  assert.ok(Object.isFrozen(table));
  assert.ok(Object.isFrozen(table.inputs));
  assert.ok(Object.isFrozen(table.inputs[0]));
  assert.ok(Object.isFrozen(table.rows));
  assert.ok(Object.isFrozen(table.rows[0]));
  assert.ok(Object.isFrozen(table.rows[0].inputs));
  assert.ok(Object.isFrozen(table.rows[0].outputs));
  assert.throws(() => {
    table.rows[0].outputs[0] = 1;
  }, TypeError);
  assert.throws(() => {
    table.inputs[0].id = 'changed';
  }, TypeError);
  assert.deepEqual(getTruthTable('and').rows[0].outputs, [0]);
});

test('bilingual tables expose accessible headers, every row and live integration hooks', () => {
  for (const language of ['en', 'ua']) {
    for (const type of Object.keys(expected)) {
      const table = getTruthTable(type);
      const html = truthTableMarkup(type, language, 'sample-node');
      assert.ok(html.includes('class="truth-reference '));
      assert.ok(html.includes(`data-truth-type="${type}"`));
      assert.ok(html.includes('data-truth-node="sample-node"'));
      assert.ok(html.includes('<caption>'));
      assert.equal((html.match(/scope="colgroup"/g) || []).length, 2);
      assert.equal(
        (html.match(/scope="col"/g) || []).length,
        table.inputs.length + table.outputs.length,
      );
      assert.equal((html.match(/data-truth-inputs=/g) || []).length, table.rows.length);
      assert.equal(
        (html.match(/data-truth-output=/g) || []).length,
        table.rows.length * table.outputs.length,
      );
      for (const row of table.rows)
        assert.ok(html.includes(`data-truth-inputs="${row.inputs.join('')}"`));
      assert.ok(html.includes('data-truth-status role="status" aria-live="polite"'));
      assert.ok(html.includes(language === 'ua' ? 'Входи' : 'Inputs'));
      assert.ok(html.includes(language === 'ua' ? 'Виходи' : 'Outputs'));
      assert.ok(html.includes(language === 'ua' ? 'НИЗЬКИЙ' : 'LOW'));
      assert.ok(html.includes(language === 'ua' ? 'ВИСОКИЙ' : 'HIGH'));
      const highCount = table.rows
        .flatMap((row) => row.outputs)
        .filter((value) => value === 1).length;
      assert.equal((html.match(/class="truth-output high"/g) || []).length, highCount);
    }
  }
  assert.ok(truthTableMarkup('full_adder', 'en').includes('Carry in (Ci)'));
  assert.ok(truthTableMarkup('full_adder', 'ua').includes('Вихідний перенос (Co)'));
});

test('reference tables escape node attributes, remain stable after rendering and omit unsupported types', () => {
  const before = getTruthTable('xor');
  const html = truthTableMarkup('xor', 'en', '"><img src=x onerror=alert(1)>');
  assert.ok(html.includes('data-truth-node="&quot;&gt;&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.equal(getTruthTable('xor'), before);
  assert.ok(!truthTableMarkup('and', 'en').includes('data-truth-node='));
  assert.ok(truthTableMarkup('and', 'uk').includes('Таблиця істинності'));
  for (const type of ['counter', 'scope', 'constructor', '__proto__', '', null, undefined]) {
    assert.equal(getTruthTable(type), null);
    assert.equal(truthTableMarkup(type, 'en'), '');
  }
});

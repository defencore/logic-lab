import test from 'node:test';
import assert from 'node:assert/strict';
import {
  byteWidgetMarkup,
  memoryMapMarkup,
  inspectionMarkup,
} from '../../src/workbench/state-inspection/markup.js';
import { updateStateInspection } from '../../src/workbench/state-inspection/update.js';
import { memoryFixture, byteFixture } from '../simulation/fixtures/state-inspection.js';

function readonlySummary(kind, fields) {
  const values = new Map(fields.map((field) => [`[data-${kind}-${field}]`, { textContent: '' }]));
  const summary = {
    dataset: { inspectionCompact: 'true' },
    querySelector: (selector) => values.get(selector) || null,
    querySelectorAll: () => [],
    set innerHTML(_) {
      throw new Error('Live summaries must retain their readonly DOM');
    },
  };
  return {
    values,
    container: {
      querySelector: (selector) => (selector === `[data-${kind}-view]` ? summary : null),
    },
  };
}

test('canvas memory previews preserve every location and bit with exactly three columns and one status line', () => {
  for (const type of ['rom', 'ram', 'register_file']) {
    for (const language of ['en', 'ua']) {
      const rows = type === 'register_file' ? 8 : 16;
      const compact = memoryMapMarkup({ type }, language, { compact: true });
      assert.equal((compact.match(/data-memory-address=/g) || []).length, rows);
      assert.equal((compact.match(/data-memory-bit=/g) || []).length, rows * 8);
      assert.equal((compact.match(/<th scope="col">/g) || []).length, 3);
      assert.equal((compact.match(/<p /g) || []).length, 1);
      assert.match(compact, /data-memory-compact/);
      assert.match(compact, /BIN · 7…0/);
      assert.doesNotMatch(
        compact,
        /data-memory-dec|data-memory-read|data-memory-write|data-memory-last|inspection-legend/,
      );
      const inspector = inspectionMarkup({ type }, language);
      assert.equal((inspector.match(/data-memory-dec/g) || []).length, rows);
      assert.match(inspector, /data-memory-read/);
      assert.match(inspector, /data-memory-write/);
      assert.match(inspector, /data-memory-last/);
      assert.match(inspector, /inspection-legend/);
      assert.doesNotMatch(inspector, /class="memory-inspection compact-memory"/);
    }
  }
});

test('compact byte previews retain bits, formats and before/after while detailed teaching text stays in the inspector', () => {
  for (const type of ['bus_input', 'register', 'shift_register', 'counter']) {
    for (const language of ['en', 'ua']) {
      const compact = byteWidgetMarkup({ type }, language, { compact: true });
      assert.match(compact, /compact-byte/);
      assert.equal((compact.match(/data-byte-bit=/g) || []).length, 8);
      for (const format of ['bin', 'hex', 'dec'])
        assert.match(compact, new RegExp(`data-byte-${format}`));
      assert.doesNotMatch(compact, /<p |data-byte-change-legend|Q7 ← …/);
      if (type !== 'bus_input') {
        assert.match(compact, /data-byte-event/);
        assert.match(compact, /data-byte-before/);
        assert.match(compact, /data-byte-after/);
      }
      const inspector = inspectionMarkup({ type }, language);
      assert.match(inspector, /<p data-byte-status/);
      assert.doesNotMatch(inspector, /class="byte-widget compact-byte"/);
      if (type === 'shift_register') assert.match(inspector, /Q7 ← … ← Q1 ← Q0 ← SER/);
    }
  }
});

test('compact memory status distinguishes current read/write and actual last write without verbose paragraphs', () => {
  const f = memoryFixture();
  const dom = readonlySummary('memory', ['compact']);
  const update = () => updateStateInspection(dom.container, f.node, f.project, f.runtime, 'ua');
  update();
  assert.equal(dom.values.get('[data-memory-compact]').textContent, 'R— · W0x2');
  f.pulse();
  f.set('we', 0);
  update();
  assert.equal(dom.values.get('[data-memory-compact]').textContent, 'R0x2 · W— · ★0x2');
  f.set('oe', 0);
  update();
  assert.equal(dom.values.get('[data-memory-compact]').textContent, 'R— · W— · ★0x2');
  const rom = memoryFixture('rom');
  updateStateInspection(dom.container, rom.node, rom.project, rom.runtime, 'en');
  assert.equal(dom.values.get('[data-memory-compact]').textContent, 'R0x2');
});

test('compact shift events stay concise, preserve before/after and expose disabled outputs without changing stored bits', () => {
  const f = byteFixture('shift_register');
  const dom = readonlySummary('byte', ['bin', 'hex', 'dec', 'status', 'event', 'before', 'after']);
  const update = () => updateStateInspection(dom.container, f.node, f.project, f.runtime, 'en');
  update();
  assert.equal(dom.values.get('[data-byte-event]').textContent, '—');
  f.pulse();
  update();
  assert.equal(dom.values.get('[data-byte-event]').textContent, 'Shift #1 · SER=1');
  assert.equal(dom.values.get('[data-byte-before]').textContent, 'Before: 00000000');
  assert.equal(dom.values.get('[data-byte-after]').textContent, 'After: 00000001');
  assert.equal(dom.values.get('[data-byte-status]').textContent, '');
  f.node.enabled = false;
  update();
  assert.equal(dom.values.get('[data-byte-status]').textContent, 'OUT Z');
  assert.equal(dom.values.get('[data-byte-bin]').textContent, '00000001');
});

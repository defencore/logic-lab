import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryFixture, byteFixture } from '../simulation/fixtures/state-inspection.js';
import { updateStateInspection } from '../../src/workbench/state-inspection/update.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';

function textCell() {
  let value = '',
    writes = 0;
  return {
    get textContent() {
      return value;
    },
    set textContent(next) {
      value = next;
      writes++;
    },
    get writes() {
      return writes;
    },
  };
}
function readonlyElement(dataset = {}, fields = new Map(), children = []) {
  const classes = new Set();
  return {
    dataset,
    fields,
    children,
    classes,
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    querySelector: (selector) => fields.get(selector) || null,
    querySelectorAll: () => children,
    set innerHTML(_) {
      throw new Error('Readonly inspection must patch existing cells');
    },
  };
}
function bit(kind, index) {
  return readonlyElement(
    { [kind]: String(index) },
    new Map([
      ['[data-bit-value]', textCell()],
      ['[data-bit-label]', textCell()],
    ]),
  );
}
function memoryDom(size = 16) {
  const rows = Array.from({ length: size }, (_, address) =>
    readonlyElement(
      { memoryAddress: String(address) },
      new Map(['marker', 'hex', 'dec'].map((key) => [`[data-memory-${key}]`, textCell()])),
      Array.from({ length: 8 }, (_, index) => bit('memoryBit', 7 - index)),
    ),
  );
  const memory = readonlyElement(
    {},
    new Map(['read', 'write', 'last'].map((key) => [`[data-memory-${key}]`, textCell()])),
    rows,
  );
  const editor = { value: 'unfinished parameter edit', selectionStart: 5 };
  const container = readonlyElement({}, new Map([['[data-memory-view]', memory]]));
  container.editor = editor;
  return { container, rows, memory, editor };
}

test('memory updates patch existing readonly cells and preserve focused property editors and stable last-write marks', () => {
  const f = memoryFixture(),
    dom = memoryDom();
  f.pulse();
  f.set('we', 0);
  f.set('oe', 0);
  const update = () => updateStateInspection(dom.container, f.node, f.project, f.runtime, 'en');
  update();
  const row = dom.rows[2];
  assert.equal(row.fields.get('[data-memory-hex]').textContent, '0x25');
  assert.equal(row.fields.get('[data-memory-dec]').textContent, '37');
  assert.equal(row.fields.get('[data-memory-marker]').textContent, ' R ★');
  assert.equal(row.classes.has('memory-read-disabled'), true);
  assert.equal(row.classes.has('memory-possible'), false);
  assert.equal(row.classes.has('memory-writing'), false);
  assert.match(dom.memory.fields.get('[data-memory-read]').textContent, /Read output disabled/);
  for (const cell of row.children)
    assert.equal(
      cell.classes.has('bit-changed'),
      [0, 2, 5].includes(Number(cell.dataset.memoryBit)),
    );
  const writes = row.fields.get('[data-memory-hex]').writes;
  update();
  assert.equal(row.fields.get('[data-memory-hex]').writes, writes);
  assert.equal(dom.container.editor, dom.editor);
  assert.equal(dom.editor.value, 'unfinished parameter edit');
  assert.equal(dom.editor.selectionStart, 5);
  f.pulse();
  update();
  assert.match(dom.memory.fields.get('[data-memory-last]').textContent, /Last write #1/);
});

test('byte updates use stored per-bit state and real physical labels while disabled outputs stay explicitly distinct', () => {
  const node = { id: 'register', type: 'register', enabled: false, params: { initial: 165 } };
  const project = { nodes: [node], wires: [] },
    runtime = createRuntime();
  simulate(project, runtime, 0);
  const cells = Array.from({ length: 8 }, (_, index) => bit('byteBit', 7 - index));
  const fields = new Map(
    ['bin', 'hex', 'dec', 'status'].map((key) => [`[data-byte-${key}]`, textCell()]),
  );
  const byte = readonlyElement({}, fields, cells);
  const container = readonlyElement({}, new Map([['[data-byte-view]', byte]]));
  updateStateInspection(container, node, project, runtime, 'en');
  assert.equal(fields.get('[data-byte-bin]').textContent, '10100101');
  assert.equal(fields.get('[data-byte-hex]').textContent, '0xA5');
  assert.equal(fields.get('[data-byte-dec]').textContent, '165');
  assert.match(fields.get('[data-byte-status]').textContent, /State retained; outputs disabled/);
  assert.equal(cells[0].fields.get('[data-bit-label]').textContent, 'Q7');
  assert.equal(cells[7].fields.get('[data-bit-label]').textContent, 'Q0');
  assert.equal(runtime.outputs.register.out0, 'Z');
  runtime.state.register.qBits[0] = 'X';
  updateStateInspection(container, node, project, runtime, 'ua');
  assert.equal(fields.get('[data-byte-bin]').textContent, '1010010X');
  assert.equal(fields.get('[data-byte-hex]').textContent, '0xAX');
  assert.equal(fields.get('[data-byte-dec]').textContent, 'X');
  assert.equal(cells[7].classes.has('bit-unknown'), true);
});

test('register and counter widgets persist explicit last-event highlights and remove them on reset', () => {
  for (const type of ['register', 'counter']) {
    const f = byteFixture(type, type === 'counter' ? 3 : 0);
    const cells = Array.from({ length: 8 }, (_, index) => bit('byteBit', 7 - index));
    const fields = new Map(
      ['bin', 'hex', 'dec', 'status', 'event', 'before', 'after', 'change-legend'].map((key) => [
        `[data-byte-${key}]`,
        textCell(),
      ]),
    );
    const byte = readonlyElement({}, fields, cells);
    const container = readonlyElement({}, new Map([['[data-byte-view]', byte]]));
    const update = () => updateStateInspection(container, f.node, f.project, f.runtime, 'en');
    f.pulse();
    update();
    const changed = type === 'counter' ? [0, 1, 2] : [0, 2, 5];
    for (const cell of cells)
      assert.equal(cell.classes.has('bit-changed'), changed.includes(Number(cell.dataset.byteBit)));
    assert.match(
      fields.get('[data-byte-event]').textContent,
      type === 'counter' ? /Last count #1/ : /Last capture #1/,
    );
    assert.match(
      fields.get('[data-byte-change-legend]').textContent,
      type === 'counter' ? /last count/ : /last capture/,
    );
    assert.match(
      fields.get('[data-byte-before]').textContent,
      type === 'counter' ? /00000011/ : /00000000/,
    );
    assert.match(
      fields.get('[data-byte-after]').textContent,
      type === 'counter' ? /00000100/ : /00100101/,
    );
    f.set('clk', 0);
    update();
    assert.equal(
      cells.some((cell) => cell.classes.has('bit-changed')),
      true,
      'legend describes the last event, not a per-frame flash',
    );
    f.set('reset', 1);
    update();
    assert.equal(
      cells.some((cell) => cell.classes.has('bit-changed')),
      false,
    );
    assert.match(fields.get('[data-byte-event]').textContent, /No event since initialization/);
    assert.equal(fields.get('[data-byte-before]').textContent, '');
    assert.equal(fields.get('[data-byte-after]').textContent, '');
  }
});

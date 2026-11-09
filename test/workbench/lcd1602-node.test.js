import test from 'node:test';
import assert from 'node:assert/strict';
import { lcd1602NodeMarkup, updateLcd1602Node } from '../../src/workbench/lcd1602-node.js';
import { initialLcd1602State } from '../../src/simulation/lcd1602.js';

test('the LCD canvas renders 32 text cells, the active cursor and an accessible description', () => {
  const markup = lcd1602NodeMarkup();
  assert.equal((markup.match(/data-lcd-cell/g) || []).length, 32);
  const cells = Array.from({ length: 32 }, () => {
    const classes = new Set();
    return {
      textContent: '',
      classes,
      classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    };
  });
  const display = {
    dataset: {},
    querySelectorAll: () => cells,
    setAttribute(name, value) {
      this[name] = value;
    },
  };
  const status = { textContent: '' },
    fault = { textContent: '' };
  const fields = new Map([
    ['[data-lcd-display]', display],
    ['[data-lcd-status]', status],
    ['[data-lcd-fault]', fault],
  ]);
  const element = { querySelector: (selector) => fields.get(selector) };
  const node = { id: 'lcd', enabled: true };
  const runtime = { state: {} };
  updateLcd1602Node(element, node, runtime, 'en');
  assert.match(display['aria-label'], /display off/);
  const state = {
    ...initialLcd1602State(),
    displayOn: true,
    twoLines: true,
    cursorOn: true,
    address: 0x41,
  };
  state.ram[0] = '<'.charCodeAt(0);
  state.ram[40] = 'Z'.charCodeAt(0);
  runtime.state.lcd = state;
  updateLcd1602Node(element, node, runtime, 'en');
  assert.equal(cells[0].textContent, '<');
  assert.equal(cells[16].textContent, 'Z');
  assert.ok(cells[17].classes.has('lcd1602-cursor'));
  assert.match(display['aria-label'], /Row 1: <.*Row 2: Z/);
  assert.match(status.textContent, /8-bit.*2 lines.*0x41/);
  runtime.state.lcd = { ...state, fault: 'read' };
  updateLcd1602Node(element, node, runtime, 'ua');
  assert.match(fault.textContent, /R\/W.*0/);
  node.enabled = false;
  updateLcd1602Node(element, node, runtime, 'ua');
  assert.equal(display.dataset.displayOn, 'false');
  assert.equal(cells.map((cell) => cell.textContent).join(''), ' '.repeat(32));
  assert.ok(cells.every((cell) => !cell.classes.has('lcd1602-cursor')));
  assert.match(status.textContent, /вимкнено/);
});

import { open, value, output, input } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('gate and arithmetic lessons reproduce all stated switch combinations', () => {
  const gates = open('logic-gates');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(gates, 'a', a);
      value(gates, 'b', b);
      const expected = {
        and: a & b,
        or: a | b,
        xor: a ^ b,
        nand: 1 - (a & b),
        nor: 1 - (a | b),
        xnor: 1 - (a ^ b),
        not: 1 - a,
      };
      for (const [type, result] of Object.entries(expected))
        assert.equal(input(gates, `${type}-led`), result);
    }
  const half = open('half-adder');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(half, 'a', a);
      value(half, 'b', b);
      assert.equal(input(half, 'sum-led') + 2 * input(half, 'carry-led'), a + b);
    }
  const full = open('full-adder');
  for (const a of [0, 1])
    for (const b of [0, 1])
      for (const carry of [0, 1]) {
        value(full, 'a', a);
        value(full, 'b', b);
        value(full, 'cin', carry);
        assert.equal(input(full, 'sum') + 2 * input(full, 'carry'), a + b + carry);
      }
});

test('BCD lesson displays every decimal digit and blanks non-BCD codes', () => {
  const context = open('bcd-display');
  const masks = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
  for (let digit = 0; digit < 10; digit++) {
    value(context, 'digit', digit);
    assert.equal(input(context, 'display'), masks[digit]);
  }
  value(context, 'digit', 10);
  assert.equal(input(context, 'display'), 0);
});

test('individual routing lines preserve bytes and switch destination', () => {
  const context = open('bus-mux');
  assert.equal(output(context, 'mux'), 42);
  assert.equal(output(context, 'merger'), 42);
  assert.equal(output(context, 'demux', 'a'), 42);
  assert.equal(output(context, 'demux', 'b'), 0);
  value(context, 'select', 1);
  assert.equal(output(context, 'mux'), 165);
  assert.equal(output(context, 'merger'), 165);
  assert.equal(output(context, 'demux', 'a'), 0);
  assert.equal(output(context, 'demux', 'b'), 165);
});

test('ALU lesson operation codes and overflow flags match its instructions', () => {
  const context = open('alu');
  assert.equal(output(context, 'alu'), 8);
  value(context, 'op', 2);
  assert.equal(output(context, 'alu'), 1);
  value(context, 'op', 4);
  assert.equal(output(context, 'alu'), 6);
  value(context, 'op', 1);
  assert.equal(output(context, 'alu'), 2);
  value(context, 'a', 255);
  value(context, 'b', 1);
  value(context, 'op', 0);
  assert.equal(output(context, 'alu'), 0);
  assert.equal(input(context, 'carry'), 1);
  assert.equal(input(context, 'zero'), 1);
});

import { component } from '../definition.js';
import { bit, word } from '../pins.js';

const shiftAndStore = component(
  'hc595',
  '74HC595 · Shift and latch',
  '74HC595 · Зсув і фіксація',
  'sequential',
  'HC595',
  [bit('ser', 'SER'), bit('srclk', 'SRCLK'), bit('rclk', 'RCLK'), bit('mr', 'MR̅'), bit('oe', 'OE̅')],
  [word('out', 'Q'), bit('serial', 'QH′')],
  {},
  'Shift on SRCLK, latch on RCLK. Active-low MR clears the shift register; OE releases QA–QH.',
  'Зсув за SRCLK, фіксація за RCLK. MR̅ очищує регістр зсуву, OE̅ відпускає QA–QH.',
);

export const MEMORY_CHIPS = [
  {
    ...shiftAndStore,
    outputs: shiftAndStore.outputs.map((pin) =>
      pin.group === 'out' ? { ...pin, label: `Q${'ABCDEFGH'[pin.bit]}` } : pin,
    ),
  },
  component(
    'eeprom',
    'EEPROM · 16×8',
    'EEPROM · 16×8',
    'sequential',
    'EEPROM',
    [
      word('address', 'ADDR', 4),
      word('data', 'DATA'),
      bit('clk', 'CLK'),
      bit('cs', 'CS'),
      bit('oe', 'OE'),
      bit('we', 'WE'),
    ],
    [word('out', 'Q')],
    { data: '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15' },
    'Educational clocked EEPROM. Edit the saved 16-byte image and observe writes in live memory.',
    'Навчальна EEPROM із тактовим записом. Задайте збережений образ на 16 байтів і спостерігайте записи у вмісті пам’яті.',
  ),
];

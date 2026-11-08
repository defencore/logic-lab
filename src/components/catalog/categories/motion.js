import { component } from '../definition.js';
import { bit, analog } from '../pins.js';

export const MOTION = [
  component(
    'stepper',
    'Stepper motor / linear axis',
    'Кроковий двигун / лінійна вісь',
    'motion',
    'STEP',
    [bit('step', 'STEP'), bit('dir', 'DIR'), bit('enable', 'EN'), bit('reset', 'RST')],
    [
      { ...analog('position', 'POS'), unit: 'mm' },
      { ...analog('angle', 'ANGLE'), unit: '°' },
      bit('moving', 'MOVE'),
    ],
    { stepsPerRevolution: 200, microsteps: 1, lead: 8, initial: 0, min: 0, max: 200 },
    'STEP/DIR-controlled mechanical axis. Rising edges move by lead / (steps per revolution × microsteps) millimeters.',
    'Механічна вісь STEP/DIR. Додатний фронт рухає на lead / (кроки за оберт × мікрокроки) міліметрів.',
  ),
  component(
    'limit_switch',
    'Limit switch / endstop',
    'Кінцевий вимикач',
    'motion',
    'LIMIT',
    [{ ...analog('position', 'POS'), unit: 'mm' }],
    [bit('out', 'Q')],
    { threshold: 0, mode: 'below', normallyClosed: false },
    'A position-operated endstop. Below/above selects the trigger side; normally closed inverts the contact signal.',
    'Кінцевик за положенням. Below/above обирає бік спрацювання; нормально замкнений контакт інвертує сигнал.',
  ),
  component(
    'position_sensor',
    'Position sensor / target detector',
    'Датчик положення / детектор цілі',
    'motion',
    'POS',
    [
      { ...analog('position', 'POS'), unit: 'mm' },
      { ...analog('target', 'TARGET'), unit: 'mm' },
    ],
    [{ ...analog('position', 'POS'), unit: 'mm' }, bit('out', 'Q')],
    { threshold: 100, tolerance: 0.5, mode: 'window', unit: 'mm' },
    'Measures position and detects below, above or a tolerance window around a target. An unwired TARGET uses Threshold.',
    'Вимірює положення та визначає зону нижче, вище або в межах допуску цілі. Без TARGET діє Threshold.',
  ),
];

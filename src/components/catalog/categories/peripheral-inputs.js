import { component } from '../definition.js';
import { analog, bit } from '../pins.js';
import { CONTACT_SWITCH_DEFAULTS, POTENTIOMETER_DEFAULTS } from '../../peripheral-inputs.js';

export const PERIPHERAL_INPUTS = [
  component(
    'contact_switch',
    'Contact button / toggle switch',
    'Контактна кнопка / перемикач',
    'io',
    'CONTACT',
    [bit('in', 'A')],
    [bit('out', 'B')],
    CONTACT_SWITCH_DEFAULTS,
    'An ideal contact that joins two terminals when closed. Use momentary or latching operation and a pull-up or pull-down to define the open level.',
    'Ідеальний контакт, що з’єднує два виводи при замиканні. Оберіть утримання чи фіксацію й підключіть підтяжку для рівня розімкненого кола.',
  ),
  component(
    'potentiometer',
    'Potentiometer · 0–5 V',
    'Потенціометр · 0–5 В',
    'io',
    'POT',
    [],
    [{ ...analog('out', 'V'), unit: 'V' }],
    POTENTIOMETER_DEFAULTS,
    'An adjustable analog voltage source. Move its slider to supply 0–5 V to an ADC, analog threshold or PWM control.',
    'Регульоване джерело аналогової напруги. Рухайте повзунок, щоб подати 0–5 В на АЦП, аналоговий поріг або керування ШІМ.',
  ),
];

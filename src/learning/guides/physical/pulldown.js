// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A pull-down defines an idle net as a weak zero while allowing an active strong source to drive it high.',
    'Підтяжка до землі задає вільній мережі слабкий нуль, дозволяючи активному сильному джерелу підняти її до одиниці.',
  ],
  steps: [
    [
      'Connect a pull-down output to an LED input and observe the default zero.',
      'Підключіть вихід підтяжки до землі до світлодіода та перевірте типовий нуль.',
    ],
    [
      'Connect a switch output to the same LED input as a strong driver.',
      'Підключіть вихід перемикача до того самого входу світлодіода як сильне джерело.',
    ],
    [
      'Toggle the switch and then disable the switch component to release its output.',
      'Перемикайте вхід, потім вимкніть компонент перемикача, щоб відпустити вихід.',
    ],
  ],
  experiment: [
    'Compare the idle LED input with and without the pull-down enabled after disabling the strong source.',
    'Після вимкнення сильного джерела порівняйте вхід світлодіода з увімкненою та вимкненою підтяжкою.',
  ],
  expected: [
    'A strong 1 overrides the weak 0. When the strong source releases, the pull-down restores 0 instead of Z.',
    'Сильна 1 переважає слабкий 0. Коли сильне джерело відпускає вихід, підтяжка відновлює 0 замість Z.',
  ],
  pitfalls: [
    [
      'A disabled switch produces Z, whereas a switch set to 0 actively drives zero; these are different conditions.',
      'Вимкнений компонент перемикача дає Z, а перемикач у стані 0 активно задає нуль; це різні випадки.',
    ],
    [
      'This is a one-bit weak source, not a pull resistor for all eight lines at once.',
      'Це однобітне слабке джерело, а не підтягування всіх восьми ліній одночасно.',
    ],
  ],
  outputs: {
    out: [
      '0w: weak 0, overridden by any active strong driver.',
      '0w: слабкий 0, який переважає будь-яке активне сильне джерело.',
    ],
  },
  examples: ['wired-and', 'logic-gates'],
};

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A pull-up gives an otherwise released digital net a weak default high level.',
    'Підтяжка до живлення задає відпущеній цифровій мережі слабкий високий рівень.',
  ],
  steps: [
    [
      'Build a switch-controlled open-drain output connected to an LED.',
      'Побудуйте відкритий стік із перемикачем, підключений до світлодіода.',
    ],
    [
      'Connect the pull-up output to the same LED input, creating one shared net.',
      'Підключіть вихід підтяжки до того самого входу світлодіода, утворивши спільну мережу.',
    ],
    [
      'Set the open-drain input to 1 to release it, then to 0 to sink the line.',
      'Задайте входу відкритого стоку 1 для відпускання, потім 0 для стягування лінії.',
    ],
  ],
  experiment: [
    'Disable the pull-up while every open-drain driver is released; inspect the net value.',
    'Вимкніть підтяжку, коли всі відкриті стоки відпущено, та перевірте значення мережі.',
  ],
  expected: [
    'With the pull-up enabled, a released net reads 1 and a strong low overrides it. Without any drive it reads Z.',
    'З увімкненою підтяжкою відпущена мережа має 1, а сильний нуль переважає. Без жодного джерела маємо Z.',
  ],
  pitfalls: [
    [
      'The resistor is a weak logic source, not a tunable resistance or an RC rise-time simulation.',
      'Резистор є слабким логічним джерелом, а не регульованим опором чи моделлю часу наростання RC.',
    ],
    [
      'Opposing pull-up and pull-down sources without a strong driver are ambiguous and resolve to X.',
      'Протилежні підтяжки до живлення та землі без сильного джерела неоднозначні й дають X.',
    ],
  ],
  outputs: {
    out: [
      '1w: weak 1, considered only when no strong driver is active on its net.',
      '1w: слабка 1, що діє лише за відсутності активного сильного джерела в мережі.',
    ],
  },
  examples: ['wired-and'],
};

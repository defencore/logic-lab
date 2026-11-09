export default {
  purpose: [
    'An ideal two-terminal contact joins A and B when closed. Add a pull resistor to give the released circuit a known level.',
    'Ідеальний двовивідний контакт з’єднує A і B при замиканні. Додайте підтяжку, щоб розімкнене коло мало визначений рівень.',
  ],
  steps: [
    [
      'Connect Ground to A, then connect B and the pull-up output to the same LED input. This makes a normally high input.',
      'З’єднайте землю з A, а B і вихід підтяжки до живлення підключіть до одного входу світлодіода. У спокої він матиме 1.',
    ],
    [
      'Choose the mode. Momentary closes while held and opens on release. Toggle retains the contact position after release until the next press.',
      'Оберіть mode. Утримання замикає контакт до відпускання. Фіксація зберігає положення до наступного натискання.',
    ],
    [
      'Start an action recording and activate the contact. The recorded value is 0 for open and 1 for closed. Observe B or the LED to see the actual level.',
      'Почніть запис дій і натисніть контакт. Записане value — 0 для розімкненого, 1 для замкненого. Спостерігайте рівень на B чи світлодіоді.',
    ],
  ],
  experiment: [
    'Hold the contact with the pull-up circuit. Then replace Ground with Power and the pull-up with a pull-down. Compare released and held levels.',
    'Утримайте контакт у схемі з підтяжкою до живлення. Потім замініть землю на живлення, а підтяжку до живлення — на підтяжку до землі. Порівняйте рівні до й під час натискання.',
  ],
  expected: [
    'Pull-up plus Ground reads 1 open and 0 closed. Pull-down plus Power reads 0 open and 1 closed. Without a pull or another source an open terminal can float at Z.',
    'Підтяжка до живлення й земля дають 1 при розімкненні та 0 при замиканні. Підтяжка до землі й живлення дають 0 та 1 відповідно. Без підтяжки чи іншого джерела розімкнений вивід може мати Z.',
  ],
  pitfalls: [
    [
      'A closed contact passes the existing electrical level. Its recorded value is a contact position, so value=1 can produce logic 0 with the pull-up circuit.',
      'Замкнений контакт передає наявний електричний рівень. Записане value є положенням контакту, тому value=1 може давати логічний 0 у схемі з підтяжкою до живлення.',
    ],
    [
      'Closing between opposing strong outputs creates X. The model is an ideal digital contact and omits contact bounce, resistance and current.',
      'Замикання між протилежними сильними виходами створює X. Це ідеальний цифровий контакт без моделювання брязкоту, опору чи струму.',
    ],
  ],
  inputs: { in: ['A: first terminal of the contact.', 'A: перший вивід контакту.'] },
  outputs: {
    out: [
      'B: second terminal. Its level comes from the connected circuit.',
      'B: другий вивід. Рівень визначає підключене коло.',
    ],
  },
  examples: ['wired-and', 'd-memory'],
};

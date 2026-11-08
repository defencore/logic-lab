// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A 1:2 demultiplexer sends one byte to either of two destinations.',
    'Демультиплексор 1:2 спрямовує один байт до одного з двох приймачів.',
  ],
  steps: [
    [
      'Wire Byte value outputs D0…D7 separately to the matching D0…D7 inputs.',
      'Окремо з’єднайте виходи D0…D7 джерела байта з відповідними входами D0…D7.',
    ],
    [
      'Use a switch for S and connect individual lines of output groups Y0 and Y1 to separate LEDs.',
      'Подайте перемикач на S та підключіть окремі лінії груп Y0 і Y1 до світлодіодів.',
    ],
    ['Set D=37 and toggle the select switch.', 'Задайте D=37 та перемикайте сигнал вибору.'],
  ],
  experiment: [
    'Watch both outputs while changing S; check the numeric value of the inactive output.',
    'Спостерігайте обидва виходи при зміні S; перевірте числове значення неактивного виходу.',
  ],
  expected: [
    'S=0 gives Y0=37,Y1=0; S=1 gives Y0=0,Y1=37.',
    'S=0 дає Y0=37,Y1=0; S=1 дає Y0=0,Y1=37.',
  ],
  pitfalls: [
    [
      'The unselected output is driven to zero, not released to Z. Use tri-state buffers for shared data lines.',
      'Необраний вихід примусово має нуль, а не Z. Для спільних ліній даних використовуйте буфери з трьома станами.',
    ],
    [
      'A floating or unknown S makes both destinations uncertain.',
      'Непідключений або невідомий S робить обидва виходи невизначеними.',
    ],
  ],
  inputs: {
    in: ['D: the 8-bit source byte.', 'D: початковий 8-бітний байт.'],
    sel: ['S: selects destination Y0 at 0 or Y1 at 1.', 'S: обирає Y0 при 0 або Y1 при 1.'],
  },
  outputs: {
    a: ['Y0: D when S=0, otherwise zero.', 'Y0: D при S=0, інакше нуль.'],
    b: ['Y1: D when S=1, otherwise zero.', 'Y1: D при S=1, інакше нуль.'],
  },
  examples: ['bus-mux'],
};

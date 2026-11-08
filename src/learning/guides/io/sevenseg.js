// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The display shows an eight-bit segment mask, not a number decoder by itself.',
    'Індикатор відображає восьмибітну маску сегментів і самостійно не декодує число.',
  ],
  steps: [
    [
      'Wire source lines D0…D7 to display contacts a,b,c,d,e,f,g,dp in that order.',
      'Окремо з’єднайте лінії D0…D7 джерела з контактами a,b,c,d,e,f,g,dp індикатора.',
    ],
    [
      'For decimal digits, put BCD → 7-segment between Byte value BCD and the display.',
      'Для десяткових цифр поставте BCD → 7 сегментів між BCD джерела байта та індикатором.',
    ],
    [
      'Alternatively set the raw mask to 63 for digit 0 or 127 for digit 8.',
      'Або задайте необроблену маску 63 для цифри 0 чи 127 для цифри 8.',
    ],
  ],
  experiment: [
    'Set a direct mask to 1,2,4,8,16,32,64,128 to locate every segment and the decimal point.',
    'Змінюйте пряму маску на 1,2,4,8,16,32,64,128, щоб знайти кожен сегмент і крапку.',
  ],
  expected: [
    'Bits 0–6 control a,b,c,d,e,f,g in order; bit 7 controls the decimal point.',
    'Біти 0–6 по черзі керують a,b,c,d,e,f,g; біт 7 керує десятковою крапкою.',
  ],
  pitfalls: [
    [
      'Direct byte 5 lights segments a and c; it does not draw the decimal digit 5. Use the decoder.',
      'Прямий байт 5 вмикає сегменти a і c, а не малює цифру 5. Використовуйте декодер.',
    ],
  ],
  inputs: {
    in: [
      'ABCDEFG·DP: raw 8-bit segment mask, active-high.',
      'ABCDEFG·DP: пряма 8-бітна маска сегментів, активна одиницею.',
    ],
  },
  examples: ['bcd-display'],
};

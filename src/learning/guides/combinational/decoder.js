// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The BCD decoder turns a four-bit decimal digit into the segment mask needed to draw it.',
    'BCD-декодер перетворює чотирибітну десяткову цифру на маску сегментів для її зображення.',
  ],
  steps: [
    [
      'Wire the four BCD lines separately to BCD0…BCD3.',
      'Окремо підключіть чотири лінії BCD джерела байта до BCD0…BCD3.',
    ],
    [
      'Wire SEG0…SEG7 to display contacts a,b,c,d,e,f,g,dp in order.',
      'Окремо з’єднайте SEG0…SEG7 із контактами a,b,c,d,e,f,g,dp семисегментного індикатора.',
    ],
    ['Set the source Value to a digit from 0 to 9.', 'Задайте джерелу Value від 0 до 9.'],
  ],
  experiment: [
    'Try digits 1,5,8, then set 10 to see how an invalid BCD digit is handled.',
    'Спробуйте цифри 1,5,8, потім 10, щоб перевірити обробку недійсної BCD-цифри.',
  ],
  expected: [
    'Valid inputs draw their digits; input 5 gives mask 109 (0x6D). Inputs 10–15 produce a blank mask.',
    'Коректні входи відображають цифри; 5 дає маску 109 (0x6D). Значення 10–15 дають порожню маску.',
  ],
  pitfalls: [
    [
      'BCD is one decimal digit encoded in four bits. This block does not split an 8-bit number into tens and units.',
      'BCD — одна десяткова цифра в чотирьох бітах. Блок не розділяє 8-бітне число на десятки й одиниці.',
    ],
    [
      'SEG bit 7 stays low: the decoder does not turn on the decimal point.',
      'Біт 7 виходу SEG залишається нульовим: декодер не вмикає десяткову крапку.',
    ],
  ],
  inputs: {
    in: [
      'BCD: a four-bit digit, valid decimal range 0–9.',
      'BCD: чотирибітна цифра, дійсний десятковий діапазон 0–9.',
    ],
  },
  outputs: {
    out: [
      'SEG: eight-bit active-high a–g segment mask; decimal point off.',
      'SEG: восьмибітна маска a–g, активна одиницею; крапку вимкнено.',
    ],
  },
  examples: ['bcd-display'],
};

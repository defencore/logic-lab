export default {
  purpose: [
    'The 74HC595 shifts serial bits into one byte and copies them into a separate storage register. The parallel outputs can hold a complete byte while the next one shifts in.',
    '74HC595 приймає послідовні біти в регістр зсуву й копіює їх в окремий регістр зберігання. Паралельні виходи показують готовий байт, поки надходить наступний.',
  ],
  steps: [
    [
      'Connect SER to a data switch and SRCLK and RCLK to separate manual clocks. Start both clocks at 0, MR̅ at 1 and OE̅ at 0.',
      'Під’єднайте SER до перемикача даних, а SRCLK та RCLK — до окремих ручних тактів. Почніть з обох тактів у 0, MR̅=1 та OE̅=0.',
    ],
    [
      'Set SER before each SRCLK 0→1 transition. Observe the shift register, then raise RCLK to copy the byte to QA–QH.',
      'Задавайте SER перед кожним переходом SRCLK 0→1. Стежте за регістром зсуву, потім подайте фронт RCLK, щоб скопіювати байт на QA–QH.',
    ],
    [
      'For two chips, connect QH′ of the first to SER of the second. Share SRCLK and share RCLK across both chips.',
      'Для двох мікросхем під’єднайте QH′ першої до SER другої. Подайте спільний SRCLK і спільний RCLK на обидві.',
    ],
  ],
  experiment: [
    'Shift in 1,0,1,1. Latch the byte with RCLK, release QA–QH with OE̅=1, and clear the shift register with MR̅=0. Enable the outputs again before sending another RCLK edge.',
    'Введіть 1,0,1,1. Зафіксуйте байт фронтом RCLK, відпустіть QA–QH через OE̅=1 і очистьте регістр зсуву через MR̅=0. Знову увімкніть виходи перед наступним фронтом RCLK.',
  ],
  expected: [
    'The shift byte becomes 11 while the storage byte remains 0. RCLK copies 11 to storage. After clear and output re-enable, QA–QH still show 11 until the next RCLK copies 0.',
    'Байт зсуву стає 11, а байт зберігання лишається 0. RCLK копіює 11 у регістр зберігання. Після очищення й увімкнення виходів QA–QH показують 11, доки наступний RCLK не скопіює 0.',
  ],
  pitfalls: [
    [
      'A simultaneous rising edge on SRCLK and RCLK copies the shift byte from before the edge. Use a later RCLK edge to latch the new byte.',
      'Одночасні додатні фронти SRCLK і RCLK копіюють байт зсуву до фронту. Для фіксації нового байта подайте RCLK пізніше.',
    ],
    [
      'Unwired MR̅ defaults high and OE̅ defaults low in this simulator. Wire both controls to known levels when working with a physical chip.',
      'У симуляторі непідключений MR̅ має високий рівень, а OE̅ — низький. Для фізичної мікросхеми задайте визначені рівні на обох входах.',
    ],
    [
      'Simulation reset initializes both bytes to zero. MR̅ clears only the shift register during operation.',
      'Скидання симуляції задає нуль в обох регістрах. Вхід MR̅ під час роботи очищує лише регістр зсуву.',
    ],
  ],
  inputs: {
    ser: [
      'Serial bit entering QA on SRCLK↑.',
      'Послідовний біт, що входить у позицію QA за SRCLK↑.',
    ],
    srclk: ['Rising edge shifts toward QH.', 'Додатний фронт зсуває біти до QH.'],
    rclk: [
      'Rising edge copies the shift byte to storage.',
      'Додатний фронт копіює байт зсуву в регістр зберігання.',
    ],
    mr: [
      'Active-low asynchronous shift clear (SRCLR̅).',
      'Асинхронне очищення регістра зсуву низьким рівнем (SRCLR̅).',
    ],
    oe: [
      '0 drives QA–QH; 1 makes them high-impedance Z.',
      '0 вмикає QA–QH; 1 переводить їх у високий імпеданс Z.',
    ],
  },
  outputs: {
    out: ['Parallel bits from the storage register.', 'Паралельні біти регістра зберігання.'],
    serial: [
      'Bit 7 of the shift register, independent of OE̅.',
      'Біт 7 регістра зсуву, незалежний від OE̅.',
    ],
  },
  examples: ['hc595-shift-latch', 'shift-register-sequence'],
};

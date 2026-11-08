// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A tri-state buffer lets one device drive eight shared data lines or disconnect itself electrically.',
    'Буфер із трьома станами дозволяє пристрою керувати вісьмома спільними лініями даних або електрично від’єднатися.',
  ],
  steps: [
    [
      'Wire D0…D7 of a Byte value source to D0…D7 and a switch to EN.',
      'Окремо з’єднайте D0…D7 джерела байта з D0…D7, а перемикач — із EN.',
    ],
    [
      'Connect Q0…Q7 to separate receiver inputs; EN=1 drives all lines and EN=0 releases them.',
      'Підключіть Q0…Q7 до окремих входів приймача; EN=1 передає дані, EN=0 відпускає лінії.',
    ],
    [
      'For shared data lines, connect each Q bit of a second buffer to the matching receiver input, with its own EN.',
      'Для спільних ліній даних підключіть кожен біт Q другого буфера до відповідного входу приймача з власним EN.',
    ],
  ],
  experiment: [
    'Use data bytes 12 and 200. Enable only the first buffer, then only the second, then both.',
    'Використайте байти 12 і 200. Дозвольте лише перший буфер, потім другий, потім обидва.',
  ],
  expected: [
    'A single enabled driver supplies its byte. Both disabled give Z; disagreeing enabled drivers give X only on the conflicting bit lines.',
    'Один дозволений вихід задає свій байт. Обидва вимкнені дають Z; різні дозволені дані дають X лише на лініях із конфліктом бітів.',
  ],
  pitfalls: [
    [
      'Z means no active drive, not the numeric value zero. Use a controlled source rather than relying on floating data.',
      'Z означає відсутність активного керування, а не числовий нуль. Використовуйте кероване джерело замість непідключених даних.',
    ],
    [
      'Wire crossings do not automatically join nets; outputs share a net when connected through the same pins.',
      'Перетини дротів автоматично не об’єднують мережі; виходи спільні, коли з’єднані через ті самі контакти.',
    ],
  ],
  inputs: {
    in: [
      'D: eight-bit data to drive when enabled.',
      'D: восьмибітні дані для передавання при дозволі.',
    ],
    enable: [
      'EN: 1 drives D, 0 produces high-impedance Z.',
      'EN: 1 передає D, 0 задає високий імпеданс Z.',
    ],
  },
  outputs: {
    out: [
      'Q: eight enabled data lines or released Z lines.',
      'Q: вісім дозволених ліній даних або відпущені лінії Z.',
    ],
  },
  examples: ['bus-mux', 'wired-and'],
};

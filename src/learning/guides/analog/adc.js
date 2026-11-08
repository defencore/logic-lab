// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An analog-to-digital converter quantizes an input voltage into an unsigned eight-bit code.',
    'Аналого-цифровий перетворювач квантує вхідну напругу в беззнаковий восьмибітний код.',
  ],
  steps: [
    [
      'Use a DAC or analog generator as the voltage source and connect it to V.',
      'Використайте ЦАП або аналоговий генератор як джерело напруги та підключіть його до V.',
    ],
    [
      'Set a positive Vcc reference, for example 5 V, matching the source range.',
      'Задайте додатну опорну напругу Vcc, наприклад 5 В, відповідно до діапазону джерела.',
    ],
    [
      'Connect D0…D7 to individual LEDs or the eight inputs of another DAC.',
      'Підключіть D0…D7 до окремих світлодіодів або восьми входів іншого ЦАП.',
    ],
  ],
  experiment: [
    'Build D → DAC → ADC with the same Vcc for both converters and vary D.',
    'Побудуйте D → ЦАП → АЦП з однаковим Vcc обох перетворювачів та змінюйте D.',
  ],
  expected: [
    'D=round(clamp(V/Vcc,0,1)×255). Equal references recover the original byte; voltages outside the range saturate.',
    'D=round(clamp(V/Vcc,0,1)×255). Однакові опори відновлюють початковий байт; напруги поза діапазоном насичуються.',
  ],
  pitfalls: [
    [
      'Use the analog V contact for voltage and the separate digital D0…D7 contacts for the converted code.',
      'Для напруги використовуйте аналоговий контакт V, а для цифрового коду — окремі контакти D0…D7.',
    ],
    [
      'This ADC samples every simulation step and has no conversion clock, latency or noise model.',
      'Цей АЦП зчитує кожен крок симуляції та не має окремого такту, затримки чи моделі шуму.',
    ],
  ],
  inputs: {
    in: [
      'V: analog voltage; zero maps to 0 and Vcc maps to 255.',
      'V: аналогова напруга; нуль дає 0, Vcc дає 255.',
    ],
  },
  outputs: {
    out: [
      'D: the rounded and saturated unsigned eight-bit conversion result.',
      'D: округлений і насичений беззнаковий восьмибітний результат перетворення.',
    ],
  },
  examples: ['adc-dac'],
};

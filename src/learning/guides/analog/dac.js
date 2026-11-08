// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A digital-to-analog converter turns an unsigned byte into a voltage, bridging separate digital lines and analog blocks.',
    'Цифро-аналоговий перетворювач перетворює беззнаковий байт на напругу та з’єднує окремі цифрові лінії з аналоговими блоками.',
  ],
  steps: [
    [
      'Wire D0…D7 of the Byte value source to DAC inputs D0…D7 and set Vcc=5.',
      'Окремо підключіть D0…D7 джерела байта до входів ЦАП D0…D7 та задайте Vcc=5.',
    ],
    ['Connect V to an oscilloscope with Range=5.', 'Підключіть V до осцилографа з Range=5.'],
    ['Change the source byte through 0,128,255.', 'Змінюйте байт джерела на 0,128,255.'],
  ],
  experiment: [
    'Connect a binary counter to D to create a rising staircase waveform.',
    'Підключіть двійковий лічильник до D, щоб утворити зростаючий сходинковий сигнал.',
  ],
  expected: [
    'V=byte/255×Vcc. At Vcc=5, bytes 0,128,255 produce 0 V, approximately 2.51 V and 5 V.',
    'V=байт/255×Vcc. При Vcc=5 байти 0,128,255 дають 0 В, приблизно 2.51 В та 5 В.',
  ],
  pitfalls: [
    [
      'The conversion uses 255 as the full-scale denominator; one code step is Vcc/255.',
      'Повний масштаб має знаменник 255; один крок коду дорівнює Vcc/255.',
    ],
    [
      'The output is an ideal sampled voltage with no settling time, loading or reconstruction filter.',
      'Вихід — ідеальна дискретна напруга без часу встановлення, навантаження та відновлювального фільтра.',
    ],
  ],
  inputs: { in: ['D: unsigned eight-bit code 0–255.', 'D: беззнаковий восьмибітний код 0–255.'] },
  outputs: {
    out: [
      'V: analog voltage from zero to the configured Vcc.',
      'V: аналогова напруга від нуля до заданого Vcc.',
    ],
  },
  examples: ['adc-dac', 'mixed-signals', 'schmitt'],
};

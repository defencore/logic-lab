// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An AM generator changes a carrier’s envelope according to a slower modulation signal.',
    'АМ-генератор змінює обвідну несучої відповідно до повільнішого модулювального сигналу.',
  ],
  steps: [
    [
      'Connect V to a scope and set Carrier=8 Hz, Frequency=1 Hz, Depth=0.6, Amplitude=5 V.',
      'Підключіть V до осцилографа й задайте Carrier=8 Гц, Frequency=1 Гц, Depth=0.6, Amplitude=5 В.',
    ],
    [
      'Leave MOD unwired first to use the internal sine modulation.',
      'Спочатку залиште MOD непідключеним для внутрішньої синусоїдальної модуляції.',
    ],
    [
      'Then connect a switch, one digital data line or a DAC output to MOD for external modulation.',
      'Потім підключіть перемикач, одну цифрову лінію або вихід ЦАП до MOD для зовнішньої модуляції.',
    ],
  ],
  experiment: [
    'Compare Depth=0 with Depth=0.8; with a switch on MOD, compare its 0 and 1 positions.',
    'Порівняйте Depth=0 і Depth=0.8; з перемикачем на MOD порівняйте його стани 0 та 1.',
  ],
  expected: [
    'Depth=0 keeps a constant envelope. Increasing depth changes the envelope more strongly while the carrier spacing stays fixed.',
    'Depth=0 зберігає сталу обвідну. Зі збільшенням глибини обвідна змінюється сильніше, а інтервали несучої сталі.',
  ],
  pitfalls: [
    [
      'Amplitude is the upper voltage range: output is centered at Amplitude/2, not a bipolar ±Amplitude signal.',
      'Amplitude задає верхню межу напруги: центр виходу Amplitude/2, а не двополярний сигнал ±Amplitude.',
    ],
    [
      'Digital bits map 0/1 to modulation −1/+1; analog 0…Amplitude spans that same range. Frequency controls the internal modulator only.',
      'Цифрові 0/1 дають модуляцію −1/+1; аналогові 0…Amplitude охоплюють той самий діапазон. Frequency керує лише внутрішнім модулятором.',
    ],
    [
      'Physics adapts to the carrier and modulation frequencies. The displayed trace still needs a short enough time window to resolve the fastest oscillation; heed the sampling warning.',
      'Фізика підлаштовується під частоти несучої й модуляції. Для відображення найшвидших коливань потрібне достатньо коротке часове вікно; звертайте увагу на попередження про дискретизацію.',
    ],
  ],
  inputs: {
    mod: [
      'MOD: optional analog voltage or digital bit. An unwired input selects the internal sine.',
      'MOD: необов’язкова аналогова напруга або цифровий біт. Без дроту обрано внутрішню синусоїду.',
    ],
  },
  outputs: {
    out: [
      'V: the amplitude-modulated waveform, bounded between 0 and Amplitude.',
      'V: амплітудно-модульований сигнал у межах від 0 до Amplitude.',
    ],
  },
  examples: ['mixed-signals'],
};

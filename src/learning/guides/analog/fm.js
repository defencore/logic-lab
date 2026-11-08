// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An FM generator changes the carrier’s instantaneous frequency while keeping its voltage amplitude constant.',
    'ЧМ-генератор змінює миттєву частоту несучої, зберігаючи сталу амплітуду напруги.',
  ],
  steps: [
    [
      'Connect V to a scope and use Carrier=8 Hz, Frequency=1 Hz, Depth=0.6 and Amplitude=5 V.',
      'Підключіть V до осцилографа та задайте Carrier=8 Гц, Frequency=1 Гц, Depth=0.6 і Amplitude=5 В.',
    ],
    [
      'Observe the internal modulator with MOD unwired, then feed MOD from a switch or DAC.',
      'Спостерігайте внутрішню модуляцію без дроту MOD, потім подайте на MOD перемикач або ЦАП.',
    ],
    [
      'Compare the spacing of peaks rather than their height.',
      'Порівнюйте відстань між піками, а не їхню висоту.',
    ],
  ],
  experiment: [
    'Drive MOD with a digital switch and hold each state long enough to compare the two carrier frequencies.',
    'Керуйте MOD цифровим перемикачем та утримуйте кожен стан достатньо довго для порівняння двох частот.',
  ],
  expected: [
    'For digital modulation, instantaneous frequency is Carrier×(1−Depth) at 0 and Carrier×(1+Depth) at 1.',
    'Для цифрової модуляції миттєва частота дорівнює Carrier×(1−Depth) при 0 та Carrier×(1+Depth) при 1.',
  ],
  pitfalls: [
    [
      'Frequency is the internal modulation rate, not the carrier frequency. External MOD replaces that internal waveform.',
      'Frequency — частота внутрішньої модуляції, а не несучої. Зовнішній MOD замінює внутрішню хвилю.',
    ],
    [
      'The waveform is centered at Amplitude/2. Physics resolves the highest deviated frequency; the displayed trace also needs a short time window. Heed the sampling warning instead of treating an aliased trace as a constant voltage.',
      'Сигнал має центр Amplitude/2. Фізика розрізняє найбільшу частоту девіації; для її відображення також потрібне коротке вікно. Зважайте на попередження про дискретизацію, щоб не прийняти спотворену осцилограму за сталу напругу.',
    ],
  ],
  inputs: {
    mod: [
      'MOD: optional voltage or bit normalized to modulation −1…+1; unwired uses an internal sine.',
      'MOD: необов’язкова напруга або біт, нормовані до −1…+1; без дроту використовується синусоїда.',
    ],
  },
  outputs: {
    out: [
      'V: frequency-modulated voltage between zero and Amplitude.',
      'V: частотно-модульована напруга від нуля до Amplitude.',
    ],
  },
  examples: ['mixed-signals'],
};

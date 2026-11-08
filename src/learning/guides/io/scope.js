// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The oscilloscope records recent samples so a changing signal can be inspected over simulated time.',
    'Осцилограф записує останні відліки для спостереження змін сигналу в модельному часі.',
  ],
  steps: [
    [
      'Branch one signal line into SIGNAL; the scope accepts one digital bit or one analog voltage.',
      'Розгалузьте одну лінію сигналу до SIGNAL; осцилограф приймає один цифровий біт або аналогову напругу.',
    ],
    [
      'Set Range to a useful vertical scale, for example 1 for logic or 5 for a 5 V waveform.',
      'Задайте Range для зручної вертикальної шкали: наприклад 1 для логіки або 5 для сигналу 5 В.',
    ],
    [
      'Run the simulation to collect up to 256 samples; pausing leaves the captured trace visible.',
      'Запустіть симуляцію для збору до 256 відліків; пауза залишає записану осцилограму видимою.',
    ],
  ],
  experiment: [
    'Probe a clock and an AM generator separately; compare a rectangular trace with a modulated wave.',
    'Окремо підключіть тактовий генератор та АМ-генератор; порівняйте прямокутний сигнал із модульованою хвилею.',
  ],
  expected: [
    'A digital line alternates between 0 and 1; analog traces display voltage. Read a full byte on its source component.',
    'Цифрова лінія змінюється між 0 і 1; аналогова осцилограма показує напругу. Цілий байт читайте на компоненті джерела.',
  ],
  pitfalls: [
    [
      'A sampled trace can alias: use frequencies low enough that several time steps fit inside the shortest pulse.',
      'Дискретна осцилограма може давати аліасинг: у найкоротшому імпульсі мають міститися кілька кроків часу.',
    ],
    [
      'Z and X are unknown samples, not valid zero volts; verify pin values and Diagnostics before interpreting the trace.',
      'Z та X — невідомі відліки, а не достовірні нуль вольт; перевірте контакти й діагностику перед аналізом.',
    ],
  ],
  inputs: {
    in: [
      'SIGNAL: a non-driving observation input for one digital line or one analog voltage.',
      'SIGNAL: спостережний вхід однієї цифрової лінії або аналогової напруги, який не керує лінією.',
    ],
  },
  examples: ['mixed-signals', 'pwm-servos', 'adc-dac'],
};

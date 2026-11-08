// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'PWM represents a control value by the fraction of each repeating period spent high.',
    'ШІМ представляє керувальне значення часткою кожного періоду, протягом якої сигнал має одиницю.',
  ],
  steps: [
    [
      'Set Frequency=105 Hz and Duty=0.5; leave CTRL unwired to use the Duty setting.',
      'Задайте Frequency=105 Гц та Duty=0.5; залиште CTRL без дроту для використання налаштування Duty.',
    ],
    [
      'Connect PWM to a scope with Range=1 and DUTY to a servo input.',
      'Підключіть PWM до осцилографа з Range=1, а DUTY — до входу сервопривода.',
    ],
    [
      'Change Duty between 0.18 and 0.82 to move the control surface.',
      'Змінюйте Duty між 0.18 і 0.82 для руху кермової поверхні.',
    ],
  ],
  experiment: [
    'At 105 Hz compare duty 0.25 and 0.75. Both have a period of about 9.52 ms, with different high times.',
    'При 105 Гц порівняйте duty 0.25 і 0.75. Обидва мають період близько 9.52 мс, але різну тривалість одиниці.',
  ],
  expected: [
    'PWM is a digital pulse train; DUTY is its continuous 0–1 ratio. Frequency changes pulse rate without changing the commanded duty.',
    'PWM — цифрові імпульси; DUTY — їхня неперервна частка 0–1. Frequency змінює частоту імпульсів, не команду заповнення.',
  ],
  pitfalls: [
    [
      'Duty is a fraction, so 0.5 means 50%. A wired CTRL overrides the property and is clamped to 0–1.',
      'Duty — частка, тому 0.5 означає 50%. Підключений CTRL замінює властивість і обмежується 0–1.',
    ],
    [
      'Short digital pulses can be missed by sampling. DUTY gives the servo an exact command without pulse-width quantization.',
      'Короткі цифрові імпульси можуть пропускатися. DUTY задає сервоприводу точну команду без квантування ширини імпульсу.',
    ],
  ],
  inputs: {
    control: [
      'CTRL: optional analog duty ratio 0–1; when unwired, the Duty property is used.',
      'CTRL: необов’язкова аналогова частка заповнення 0–1; без дроту діє властивість Duty.',
    ],
  },
  outputs: {
    out: ['PWM: repeating one-bit pulses.', 'PWM: повторювані однобітні імпульси.'],
    duty: [
      'DUTY: the effective analog ratio from 0 to 1.',
      'DUTY: фактична аналогова частка від 0 до 1.',
    ],
  },
  examples: ['pwm-servos'],
};

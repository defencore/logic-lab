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
      'Connect PWM to a scope with Range=1. An RC servo also requires this digital PWM output; DUTY is an analog ratio for arithmetic/control blocks.',
      'Підключіть PWM до осцилографа з Range=1. RC-серво також потребує цього цифрового виходу PWM; DUTY є аналоговою часткою для арифметики й керування.',
    ],
    [
      'Compare Duty=0.25 and 0.75 on the scope. For an RC servo, switch to 50 Hz and use Duty=0.05…0.1 for 1000…2000 µs control pulses.',
      'Порівняйте Duty=0.25 і 0.75 на осцилографі. Для RC-серво задайте 50 Гц і Duty=0.05…0.1 для керувальних імпульсів 1000…2000 мкс.',
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
      'RC servos decode pulse width, not duty alone. At 50 Hz, duty 0.075 makes a 1500 µs center pulse; changing frequency requires recalculating duty. Use a short trace window to display narrow pulses.',
      'RC-серво декодує ширину імпульсу, а не лише заповнення. При 50 Гц duty 0.075 дає центральний імпульс 1500 мкс; зміна частоти потребує перерахунку duty. Для вузьких імпульсів оберіть коротке вікно осцилограми.',
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

export default {
  purpose: [
    'The potentiometer models an adjustable 0–5 V analog source with internal supply rails and a single wiper output.',
    'Потенціометр моделює регульоване аналогове джерело 0–5 В із внутрішнім живленням та одним виходом повзунка.',
  ],
  steps: [
    [
      'Wire V to an analog input such as ADC, Schmitt trigger, oscilloscope or PWM CONTROL.',
      'Підключіть V до аналогового входу АЦП, тригера Шмітта, осцилографа або CONTROL генератора ШІМ.',
    ],
    [
      'Move the slider with the pointer or arrow keys. Properties also lets you enter an exact value in volts.',
      'Рухайте повзунок вказівником або стрілками. Точне value у вольтах можна ввести у властивостях.',
    ],
    [
      'Record the input actions while changing voltage. Playback applies the recorded analog values in order, at their recorded times.',
      'Запишіть дії під час зміни напруги. Відтворення застосує аналогові значення у записаному порядку й у записаний час.',
    ],
  ],
  experiment: [
    'Connect the potentiometer to an ADC with a 5 V reference. Try 0 V, 2.5 V and 5 V, and then sweep the slider to see the individual bit outputs change.',
    'З’єднайте потенціометр з АЦП з опорною напругою 5 В. Спробуйте 0 В, 2,5 В і 5 В, а потім плавно рухайте повзунок і стежте за окремими бітами.',
  ],
  expected: [
    'The ADC reports 0, 128 and 255 at those voltages. The potentiometer itself provides the analog value without byte quantization.',
    'АЦП видає 0, 128 і 255 за цих напруг. Сам потенціометр подає аналогове значення без квантування до байта.',
  ],
  pitfalls: [
    [
      'For PWM CONTROL use the numerical interval 0–1: 0.25 sets 25% duty. Higher inputs cap at 100%.',
      'Для CONTROL генератора ШІМ використовуйте числовий інтервал 0–1: 0,25 задає заповнення 25%. Вище значення обмежується 100%.',
    ],
    [
      'The output is analog. Use a Schmitt trigger for a digital threshold or an ADC for a byte comparator. This source does not simulate resistive loading.',
      'Вихід аналоговий. Для цифрового порога використовуйте тригер Шмітта, а для байтового компаратора — АЦП. Джерело не моделює вплив навантаження.',
    ],
  ],
  outputs: {
    out: [
      'V: adjustable analog wiper voltage, 0–5 V.',
      'V: регульована аналогова напруга повзунка, 0–5 В.',
    ],
  },
  examples: ['adc-dac', 'schmitt', 'pwm-servos'],
};

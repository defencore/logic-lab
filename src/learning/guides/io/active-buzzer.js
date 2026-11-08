// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An active buzzer is a sound indicator with its own oscillator: a steady digital 1 enables one continuous tone, while 0 disables it.',
    'Активний зумер — звуковий індикатор із власним генератором: стала цифрова 1 вмикає один безперервний тон, а 0 вимикає його.',
  ],
  steps: [
    [
      'Connect a switch or gate output to EN (in). The buzzer has one digital input and no electrical output; branch the same line to an LED to see its command.',
      'Підключіть вихід перемикача або логічного елемента до EN (in). Зумер має один цифровий вхід і не має електричного виходу; під’єднайте до тієї самої лінії світлодіод для спостереження команди.',
    ],
    [
      'In Properties choose the internal frequency (20–20000 Hz) and volume. Defaults are 880 Hz and volume 0.15; volume is a fraction from 0 to 1, and 0 mutes this buzzer.',
      'У властивостях задайте внутрішню частоту frequency (20–20000 Гц) та гучність volume. Типово це 880 Гц і гучність 0.15; гучність — частка від 0 до 1, а 0 вимикає звук цього зумера.',
    ],
    [
      'Run the simulation, press Enable sound, and set EN to 1. Sound starts only after this explicit browser action. Press Sound on again to mute all buzzers.',
      'Запустіть симуляцію, натисніть «Увімкнути звук» і подайте 1 на EN. Звук починається лише після цієї явної дії в браузері. Повторне натискання «Звук увімкнено» вимикає всі зумери.',
    ],
    [
      'Set EN to 0 and compare the silence with the LED. Feed a slow clock to EN to make beeps: it controls when the internal tone plays, not its pitch.',
      'Подайте 0 на EN і порівняйте тишу зі світлодіодом. Повільний тактовий генератор на EN створить гудки: він задає моменти звучання внутрішнього тону, а не його висоту.',
    ],
  ],
  experiment: [
    'Open Active buzzer alarm, arm it and open the door. Compare a door alarm, the test button and disarming while an alarm request remains high. Record the switches and replay the same logic.',
    'Відкрийте «Активний зумер: логічна сигналізація», увімкніть охорону та відчиніть двері. Порівняйте тривогу від дверей, тест і вимкнення охорони при активному запиті. Запишіть перемикання та повторіть ту саму логіку.',
  ],
  expected: [
    'EN=1 produces the configured 880 Hz tone by default; EN=0 is silent. The alarm sounds exactly when ARM AND (DOOR OR TEST) is 1. Simulation speed changes beep timing, while the internal active-buzzer pitch stays fixed.',
    'EN=1 типово дає налаштований тон 880 Гц; EN=0 означає тишу. Сигналізація звучить саме при ARM AND (DOOR OR TEST)=1. Швидкість симуляції змінює тривалість гудків, а внутрішня висота активного зумера залишається сталою.',
  ],
  pitfalls: [
    [
      'A muted browser session, volume 0 or a paused simulation can be silent even when the input indicator shows 1. Audio permission starts disabled after a page reload.',
      'Вимкнений звук сеансу, гучність 0 або пауза симуляції можуть давати тишу навіть при індикаторі входу 1. Після перезавантаження сторінки дозвіл звуку знову вимкнено.',
    ],
    [
      'X, Z, a disconnected input and a disabled component do not enable a valid alarm tone. Check the input value and Diagnostics rather than interpreting silence as logic 0.',
      'X, Z, від’єднаний вхід і вимкнений елемент не вмикають коректний тон тривоги. Перевіряйте значення входу й діагностику, а не вважайте тишу доказом логічного 0.',
    ],
    [
      'Use a passive buzzer when the incoming binary period should set the pitch. An active buzzer already contains its own oscillator.',
      'Використовуйте пасивний зумер, якщо висоту має задавати період вхідного двійкового сигналу. Активний зумер уже містить власний генератор.',
    ],
    [
      'Choose buzzer frequency and volume before starting an action recording. Switch and clock source changes are recordable; buzzer configuration is part of the initial circuit.',
      'Задайте частоту й гучність зумера до початку запису дій. Зміни джерел — перемикача й тактового генератора — записуються; конфігурація зумера є частиною початкової схеми.',
    ],
  ],
  inputs: {
    in: [
      'EN (in): one digital enable bit. A definite 1 enables the internal oscillator; 0, X or Z do not produce a sustained tone.',
      'EN (in): один цифровий біт дозволу. Визначена 1 вмикає внутрішній генератор; 0, X або Z не створюють сталого тону.',
    ],
  },
  examples: ['active-buzzer-alarm', 'passive-buzzer-melody'],
};

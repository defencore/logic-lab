// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A passive buzzer converts a repeating binary input into sound. Its pitch comes from complete high-plus-low periods of that signal rather than an internal tone setting.',
    'Пасивний зумер перетворює повторюваний двійковий вхід на звук. Його висота визначається повними періодами високого й низького рівнів сигналу, а не налаштуванням внутрішнього тону.',
  ],
  steps: [
    [
      'Connect a Clock output directly to SIGNAL (in) and branch it to an oscilloscope. The buzzer accepts one digital bit and has no electrical output.',
      'Підключіть вихід тактового генератора безпосередньо до SIGNAL (in) та розгалузьте його до осцилографа. Зумер приймає один цифровий біт і не має електричного виходу.',
    ],
    [
      'Set Clock frequency to 440 Hz and duty to 0.5, leave buzzer volume at its default 0.15, and use simulation speed 1× for the corresponding audible A4 pitch.',
      'Задайте тактовому генератору частоту 440 Гц і duty=0.5, залиште типову гучність зумера volume=0.15 та швидкість симуляції 1× для відповідного звучання ноти ля A4.',
    ],
    [
      'Run the simulation and press Enable sound. Select a short waveform window, such as 10 ms, to inspect several complete periods instead of a blurred long trace.',
      'Запустіть симуляцію й натисніть «Увімкнути звук». Для кількох повних періодів оберіть коротке вікно осцилограми, наприклад 10 мс, замість нерозбірливої довгої траси.',
    ],
    [
      'Measure T1 and T0 in seconds and calculate f=1/(T1+T0). At 440 Hz, T=2.272727 ms=2272.727 µs; with duty 0.5, each half is 1.136364 ms=1136.364 µs.',
      'Виміряйте T1 і T0 у секундах та обчисліть f=1/(T1+T0). При 440 Гц T=2.272727 мс=2272.727 мкс; при duty=0.5 кожна половина становить 1.136364 мс=1136.364 мкс.',
    ],
  ],
  experiment: [
    'Change clock.frequency from 440 to 880 Hz, then set duty to 0 and 1. Restore 440 Hz and duty 0.5. Record frequency changes for a melody, or use a T flip-flop to divide an 880 Hz clock into a 440 Hz note.',
    'Змініть clock.frequency з 440 на 880 Гц, потім установіть duty у 0 та 1. Поверніть 440 Гц і duty=0.5. Запишіть зміни частоти для мелодії або поділіть такт 880 Гц T-тригером, щоб отримати ноту 440 Гц.',
  ],
  expected: [
    'At 1×, 880 Hz sounds one octave above 440 Hz. Constant 0 and constant 1 have no repeating periods and produce no sustained tone. Changing duty alters the high/low split; changing the full period changes the fundamental frequency.',
    'При 1× тон 880 Гц звучить на октаву вище 440 Гц. Сталі 0 і 1 не мають повторюваних періодів і не створюють сталого тону. Зміна duty змінює співвідношення високого й низького рівнів; зміна повного періоду змінює основну частоту.',
  ],
  pitfalls: [
    [
      'The formula uses a full 0→1→0 cycle, not one edge or one half-period. Convert milliseconds by dividing by 1000 and microseconds by dividing by 1,000,000 before taking the reciprocal.',
      'Формула використовує повний цикл 0→1→0, а не один фронт або півперіоду. Перед обчисленням оберненої величини поділіть мілісекунди на 1000, а мікросекунди на 1 000 000.',
    ],
    [
      'A DC change can make a brief click, but a steady high level is not a tone. X, Z, a disconnected input, volume 0 and a disabled component are not valid periodic sound sources.',
      'Зміна постійного рівня може дати короткий клац, але стала 1 не є тоном. X, Z, від’єднаний вхід, гучність 0 та вимкнений елемент не є коректними джерелами періодичного звуку.',
    ],
    [
      'Passive sound follows edge timing in real time: changing simulation speed changes the heard pitch and duration. Use 1× to compare heard notes with the configured simulated hertz; active-buzzer internal pitch stays fixed.',
      'Пасивний звук повторює час фронтів у реальному часі: зміна швидкості симуляції змінює висоту й тривалість звучання. Для порівняння нот із модельними герцами використовуйте 1×; внутрішня висота активного зумера стала.',
    ],
    [
      'Sound starts only after Enable sound and starts disabled again after a page reload. Choose volume before recording; clock.frequency (0–1000 Hz), clock.duty and source switch values can be recorded and replayed.',
      'Звук починається лише після «Увімкнути звук», а після перезавантаження знову вимкнений. Задайте гучність до запису; clock.frequency (0–1000 Гц), clock.duty та значення перемикачів можна записати й відтворити.',
    ],
    [
      'Ideal logic gates have no modeled propagation delay. A combinational feedback loop is not an audio oscillator; use a clock, a defined pulse source or clocked memory to construct repeatable periods.',
      'Ідеальні логічні елементи не мають модельованої затримки поширення. Комбінаційний зворотний зв’язок не є звуковим генератором; створюйте повторювані періоди тактовим генератором, визначеним джерелом імпульсів або тактованою пам’яттю.',
    ],
  ],
  inputs: {
    in: [
      'SIGNAL (in): one digital waveform. Repeating definite 0/1 transitions determine the tone period; neither DC level is a sustained sound.',
      'SIGNAL (in): один цифровий сигнал. Повторювані визначені переходи 0/1 задають період тону; жоден постійний рівень не є сталим звуком.',
    ],
  },
  examples: ['passive-buzzer-melody', 'buzzer-clock-divider', 'active-buzzer-alarm'],
};

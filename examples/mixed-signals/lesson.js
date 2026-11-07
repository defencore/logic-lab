export default {
  id: 'mixed-signals',
  label: 'Compare AM and FM',
  ua: 'Порівняння АМ і ЧМ',
  category: 'mixed',
  level: 'intermediate',
  description: 'Feed the same changing voltage to AM and FM carriers and compare their scopes.',
  descriptionUa: 'Подайте одну змінну напругу на АМ та ЧМ і порівняйте осцилограми.',
  lesson: {
    en: {
      goal: 'See that AM changes amplitude while FM changes instantaneous frequency.',
      steps: [
        {
          title: 'Start a modulation ramp',
          text: 'Keep the simulation running; press Run only if paused. The counter starts at 128 and advances eight codes per simulated second. The DAC converts it into a rising 0–5 V staircase.',
          nodes: ['clock', 'counter', 'dac', 'ramp-scope'],
        },
        {
          title: 'Compare the two carriers',
          text: 'Both carriers start at 8 Hz and receive the same modulation. AM changes the waveform height; FM changes the spacing between cycles. Select each generator to inspect its parameters.',
          nodes: ['am', 'fm', 'mod-scope', 'fm-scope'],
        },
        {
          title: 'Hold the modulation, then remove its effect',
          text: 'Set Enable=0 to hold the DAC voltage while both carriers keep running. Set Modulation depth=0 on AM and FM: each becomes an unmodulated carrier. Reset=1 returns the ramp to 0.',
          nodes: ['enable', 'reset', 'am', 'fm'],
        },
      ],
      expected:
        'Amplitude and frequency respond differently to one source. Use scopes and live numeric values together to compare them.',
    },
    ua: {
      goal: 'Побачте, як АМ змінює амплітуду, а ЧМ — миттєву частоту.',
      steps: [
        {
          title: 'Запустіть сигнал модуляції',
          text: 'Залиште симуляцію активною; натисніть Запуск лише після паузи. Лічильник починає з 128 і додає вісім кодів за секунду. ЦАП перетворює їх на сходинкову напругу 0–5 В.',
          nodes: ['clock', 'counter', 'dac', 'ramp-scope'],
        },
        {
          title: 'Порівняйте несучі',
          text: 'Обидві несучі починають з 8 Гц і отримують одну модуляцію. АМ змінює висоту хвилі, ЧМ — відстань між періодами. Оберіть генератори та перегляньте параметри.',
          nodes: ['am', 'fm', 'mod-scope', 'fm-scope'],
        },
        {
          title: 'Зафіксуйте й усуньте модуляцію',
          text: 'Enable=0 утримує напругу ЦАП, поки обидві несучі працюють. Задайте Глибина модуляції=0 в АМ та ЧМ: обидва стануть немодульованими. Reset=1 повертає сигнал до 0.',
          nodes: ['enable', 'reset', 'am', 'fm'],
        },
      ],
      expected:
        'Амплітуда й частота по-різному реагують на одне джерело. Порівнюйте осцилограми та поточні числові значення разом.',
    },
  },
  circuitPath: 'examples/mixed-signals/circuit.json',
  labPath: 'examples/mixed-signals/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'See that AM changes amplitude while FM changes instantaneous frequency.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Побачте, як АМ змінює амплітуду, а ЧМ — миттєву частоту.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Keep the simulation running; press Run only if paused. The counter starts at 128 and advances eight codes per simulated second. The DAC converts it into a rising 0–5 V staircase.',
        'Both carriers start at 8 Hz and receive the same modulation. AM changes the waveform height; FM changes the spacing between cycles. Select each generator to inspect its parameters.',
        'Set Enable=0 to hold the DAC voltage while both carriers keep running. Set Modulation depth=0 on AM and FM: each becomes an unmodulated carrier. Reset=1 returns the ramp to 0.',
      ],
      ua: [
        'Залиште симуляцію активною; натисніть Запуск лише після паузи. Лічильник починає з 128 і додає вісім кодів за секунду. ЦАП перетворює їх на сходинкову напругу 0–5 В.',
        'Обидві несучі починають з 8 Гц і отримують одну модуляцію. АМ змінює висоту хвилі, ЧМ — відстань між періодами. Оберіть генератори та перегляньте параметри.',
        'Enable=0 утримує напругу ЦАП, поки обидві несучі працюють. Задайте Глибина модуляції=0 в АМ та ЧМ: обидва стануть немодульованими. Reset=1 повертає сигнал до 0.',
      ],
    },
    questions: {
      en: [
        'Which waveform property changes under AM and under FM?',
        'What continues running when the ramp Enable is low?',
        'What remains when modulation depth is zero?',
      ],
      ua: [
        'Яка властивість хвилі змінюється при АМ та ЧМ?',
        'Що продовжує працювати при Enable=0 сигналу модуляції?',
        'Що лишається при нульовій глибині модуляції?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'AM and FM traces at nonzero and zero depth, with a short explanation of the differences.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Осцилограми АМ і ЧМ з ненульовою та нульовою глибиною і коротке пояснення різниці.',
      ],
    },
  },
};

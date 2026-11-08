export default {
  purpose: [
    'A momentary button outputs 1 only while you hold its control. Releasing it returns Q to 0.',
    'Кнопка без фіксації видає 1 лише під час утримання. Після відпускання Q повертається в 0.',
  ],
  steps: [
    [
      'Connect its single Q output to a gate, SR set input, manual clock input or LED D.',
      'Підключіть окремий вихід Q до вентиля, входу S защіпки, ручного такту або D світлодіода.',
    ],
    [
      'Hold the control with a mouse or touch, then release. With keyboard focus on the control, hold Space or Enter; autorepeat does not create new presses.',
      'Натисніть і тримайте мишею або дотиком, потім відпустіть. На кнопці у фокусі можна утримувати Пробіл або Enter; автоповтор не створює нових натискань.',
    ],
    [
      'Start recording an action sequence and press/release the button. Both value changes are saved and replayed, including a short pulse at one timestamp.',
      'Почніть запис сценарію дій та натисніть/відпустіть кнопку. Обидві зміни value зберігаються й відтворюються, включно з коротким імпульсом в один момент часу.',
    ],
  ],
  experiment: [
    'Connect Q to SR.S, pulse the button and release it. The button returns to 0 while the latch keeps Q=1 until its separate reset is activated.',
    'Підключіть Q до SR.S, коротко натисніть і відпустіть кнопку. Кнопка повернеться в 0, а защіпка зберігатиме Q=1 до окремого скидання.',
  ],
  expected: [
    'Released → Q=0; held → Q=1. Focus loss, canceled touch, a hidden page, disabling or replacing the circuit releases a live hold. Recorded playback remains read-only.',
    'Відпущено → Q=0; утримується → Q=1. Втрата фокуса, скасований дотик, прихована сторінка, вимкнення чи заміна схеми відпускають живе натискання. Відтворення запису захищене від ручних змін.',
  ],
  pitfalls: [
    [
      'A momentary button does not remember a call. Add an SR latch for request memory; use a toggle switch when you need a persistent manual level.',
      'Кнопка не пам’ятає заявку. Додайте SR-защіпку для пам’яті виклику; для сталого ручного рівня використайте перемикач.',
    ],
    [
      'Holding Q=1 creates one rising edge, rather than a repeated clock. Release before the next press. Imported live controls return to their released state; replay uses the recorded values.',
      'Утримання Q=1 створює один додатний фронт, а не повторюваний такт. Перед наступним натисканням відпустіть кнопку. Імпортовані живі кнопки повертаються у відпущений стан; повтор використовує записані значення.',
    ],
  ],
  outputs: { out: ['Q: 1 while held, otherwise 0.', 'Q: 1 під час утримання, інакше 0.'] },
  examples: ['elevator-logic', 'd-memory'],
};

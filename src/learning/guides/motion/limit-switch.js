// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An endstop turns a mechanical boundary into a digital contact signal, allowing homing and travel-limit logic.',
    'Кінцевик перетворює механічну межу на цифровий контактний сигнал для базування та обмеження ходу.',
  ],
  steps: [
    [
      'Connect a stepper POS output to the endstop POS input; both carry millimeters.',
      'Підключіть вихід POS крокового двигуна до входу POS кінцевика; обидва передають міліметри.',
    ],
    [
      'For a minimum endstop set Threshold=0, Mode=below and NormallyClosed=false. Use Mode=above for a maximum endstop.',
      'Для мінімального кінцевика задайте Threshold=0, Mode=below та NormallyClosed=false. Для максимального використовуйте Mode=above.',
    ],
    [
      'Connect Q to an LED and through a NOT gate to the motor EN for a simple homing stop. Keep the clock connected directly to STEP.',
      'Підключіть Q до світлодіода та через НЕ до EN двигуна для простого зупинення базування. Такт залиште безпосередньо підключеним до STEP.',
    ],
  ],
  experiment: [
    'Start above zero and move with DIR=0 until Q activates. Add OR(DIR,NOT Q) on EN so DIR=1 can move away from the minimum endstop.',
    'Почніть вище нуля та рухайтеся з DIR=0 до спрацювання Q. Подайте OR(DIR,NOT Q) на EN, щоб DIR=1 дозволяв відійти від мінімального кінцевика.',
  ],
  expected: [
    'Below mode activates at position≤Threshold; above mode activates at position≥Threshold. NormallyClosed=true inverts the known contact result.',
    'Режим below спрацьовує при position≤Threshold; above — при position≥Threshold. NormallyClosed=true інвертує визначений стан контакту.',
  ],
  pitfalls: [
    [
      'The sensor does not stop a motor by itself: wire its signal into enable or control logic. A simple NOT Q enable also blocks moving away unless direction is considered.',
      'Датчик сам не зупиняє двигун: підключіть сигнал до дозволу чи керувальної логіки. Простий EN=NOT Q також блокує відхід, якщо не врахувати напрямок.',
    ],
    [
      'Normally closed describes contact polarity, not a simulated safety circuit. An unconnected or conflicting position is X even with NormallyClosed enabled.',
      'Нормально замкнений означає полярність контакту, а не модель захисного кола. Непідключене чи конфліктне положення дає X навіть при NormallyClosed.',
    ],
  ],
  inputs: {
    position: [
      'POS: measured carriage position in millimeters, usually from a stepper motor.',
      'POS: виміряне положення каретки в міліметрах, зазвичай від крокового двигуна.',
    ],
  },
  outputs: {
    out: [
      'Q: active contact bit. With normally-open polarity, 1 means the configured boundary is reached.',
      'Q: активний біт контакту. Для нормально розімкненої полярності 1 означає досягнуту межу.',
    ],
  },
  examples: ['printer-homing', 'stepper-basics'],
};

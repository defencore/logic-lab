import { KEYPAD_ROWS, KEYPAD_COLUMNS } from '../../../components/keypad.js';

export default {
  purpose: [
    'A 3×4 keypad exposes a real row/column scan interface: four row inputs and three separate column outputs. Keys are arranged 1 2 3 / 4 5 6 / 7 8 9 / * 0 #.',
    'Клавіатура 3×4 має інтерфейс сканування: чотири входи рядків і три окремі виходи стовпців. Розкладка: 1 2 3 / 4 5 6 / 7 8 9 / * 0 #.',
  ],
  steps: [
    [
      'Connect R1…R4 to four individual digital drivers. Drive exactly one row high at a time; hold the other three low. Connect C1…C3 to LEDs or the logic that reads a scan.',
      'Підключіть R1…R4 до чотирьох окремих цифрових джерел. Подавайте 1 лише на один рядок, а на інші три — 0. З’єднайте C1…C3 зі світлодіодами або логікою читання.',
    ],
    [
      'Set R2=1 and the other rows to 0. Press 5: C2 becomes 1. Press 2 instead: every column stays 0 because its first row is not selected.',
      'Задайте R2=1, а решті рядків — 0. Натисніть 5: C2 стане 1. Натомість натисніть 2: усі стовпці залишаться 0, бо перший рядок не вибрано.',
    ],
    [
      'Choose Hold for a contact that closes only while pressed, or Toggle to latch each key until its next activation. Several keys can be active together. Choose the mode before recording.',
      'Оберіть режим mode: «Поки утримується», щоб контакт замикався лише під час натискання, або «Перемикати», щоб кожна клавіша фіксувалася до наступного натискання. Можна активувати декілька клавіш. Обирайте режим до запису.',
    ],
    [
      'Use a counter and gates to select R1, R2, R3 and R4 in sequence. Decode the selected row and the high column externally. Record presses and releases to repeat the same experiment.',
      'Лічильником і логічними елементами почергово вибирайте R1, R2, R3 та R4. Розшифровуйте вибраний рядок і активний стовпець зовнішньою схемою. Записуйте натискання та відпускання для повторення досліду.',
    ],
  ],
  experiment: [
    'Open the keypad code-lock laboratory. Trace the row scan, the ROM that maps a row/column to a key, and the separate ROM holding the secret. Enter a wrong digit, clear with *, then enter the correct code and confirm with #.',
    'Відкрийте лабораторну кодового замка. Простежте сканування рядків, ROM перетворення рядка/стовпця на клавішу та окрему ROM із секретом. Введіть неправильну цифру, очистіть введення через *, потім введіть правильний код і підтвердьте через #.',
  ],
  expected: [
    'No pressed key gives C1=C2=C3=0. A pressed key copies its selected row to its column. If several pressed keys share a column, any driven 1 makes that column 1; otherwise an unknown/floating pressed row makes it X. Other columns stay independent.',
    'Без натиснутих клавіш C1=C2=C3=0. Натиснута клавіша передає вибраний рядок на свій стовпець. Якщо декілька натиснутих клавіш мають спільний стовпець, будь-яка подана 1 дає 1; інакше невизначений або плаваючий натиснутий рядок дає X. Інші стовпці незалежні.',
  ],
  pitfalls: [
    [
      'This teaching model has ideal per-key diode isolation and column pull-downs. It does not model passive membrane-keypad ghosting, contact bounce or bidirectional row/column wiring. The row contacts are inputs, not outputs.',
      'Навчальна модель має ідеальну діодну ізоляцію кожної клавіші та підтяжки стовпців до 0. Вона не моделює фантомні натискання пасивної мембранної клавіатури, брязкіт контактів або двобічні лінії. Контакти рядків є входами, не виходами.',
    ],
    [
      'Do not leave selected rows floating: Z is not a known scan level. With every row high, columns identify only the column, so keys 1, 4, 7 and * cannot be distinguished without scanning.',
      'Не залишайте вибрані рядки плаваючими: Z не є відомим рівнем сканування. Якщо всі рядки мають 1, виходи визначають лише стовпець: без сканування неможливо відрізнити 1, 4, 7 і *.',
    ],
    [
      'The keys action value is a 12-bit contact mask, not a digit or ASCII code: bit 0 is 1, bit 1 is 2, …, bit 9 is *, bit 10 is 0, bit 11 is #. The component does not store a password or create an entry pulse. Add scan timing and one-event-per-press logic to your circuit.',
      'Значення дії keys є 12-бітною маскою контактів, не цифрою й не ASCII: біт 0 — 1, біт 1 — 2, …, біт 9 — *, біт 10 — 0, біт 11 — #. Елемент не зберігає пароль і не формує імпульс введення. Додайте сканування та логіку однієї події на натискання у власну схему.',
    ],
  ],
  inputs: Object.fromEntries(
    Array.from({ length: KEYPAD_ROWS }, (_, row) => [
      `row${row}`,
      [
        `R${row + 1}: active-high scan level for row ${row + 1}; use a known 0 or 1.`,
        `R${row + 1}: активний високий рівень сканування рядка ${row + 1}; подавайте відомий 0 або 1.`,
      ],
    ]),
  ),
  outputs: Object.fromEntries(
    Array.from({ length: KEYPAD_COLUMNS }, (_, column) => [
      `col${column}`,
      [
        `C${column + 1}: OR of row levels connected by pressed keys in column ${column + 1}; idle 0.`,
        `C${column + 1}: АБО рівнів рядків, з’єднаних натиснутими клавішами стовпця ${column + 1}; без натискань 0.`,
      ],
    ]),
  ),
  examples: ['keypad-code-lock'],
};

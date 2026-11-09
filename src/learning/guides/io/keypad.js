import { KEYPAD_ROWS, keypadLayout } from '../../../components/keypad.js';

function guide(type) {
  const { columns } = keypadLayout(type);
  const expanded = columns === 4;
  return {
    purpose: expanded
      ? [
          'Scan four rows and four columns, with A, B, C and D in column 4. The 16 keys share the same pulse, hold and latch modes as the 3×4 keypad.',
          'Скануйте чотири рядки й чотири стовпці. Клавіші A, B, C і D займають четвертий стовпець. Усі 16 клавіш підтримують імпульс, утримання та фіксацію.',
        ]
      : [
          'A 3×4 keypad exposes a real row/column scan interface: four row inputs and three separate column outputs. Keys are arranged 1 2 3 / 4 5 6 / 7 8 9 / * 0 #.',
          'Клавіатура 3×4 має інтерфейс сканування: чотири входи рядків і три окремі виходи стовпців. Розкладка: 1 2 3 / 4 5 6 / 7 8 9 / * 0 #.',
        ],
    steps: [
      [
        'Connect R1…R4 to four individual digital drivers. Drive exactly one row high at a time; hold the other three low. Connect the column outputs to LEDs or the logic that reads a scan.',
        'Підключіть R1…R4 до чотирьох окремих цифрових джерел. Подавайте 1 лише на один рядок, а на інші три — 0. З’єднайте виходи стовпців зі світлодіодами або логікою читання.',
      ],
      [
        'Set R2=1 and the other rows to 0. Press 5: C2 becomes 1. Press 2 instead: every column stays 0 because its first row is not selected.',
        'Задайте R2=1, а решті рядків — 0. Натисніть 5: C2 стане 1. Натомість натисніть 2: усі стовпці залишаться 0, бо перший рядок не вибрано.',
      ],
      [
        'The default Pulse mode queues each tap as a contact lasting at least 0.04 simulated seconds, followed by at least 0.01 seconds released. Edges apply on simulation updates; recordings preserve their actual times. Rapid taps play in order. Set pulseDuration from 0.02 to 10 seconds; use at least one full four-row scan cycle. Run the simulation to process the queue.',
        'Типовий режим «Імпульс» ставить натискання в чергу: контакт активний щонайменше 0.04 модельної секунди, потім відпущений щонайменше 0.01 секунди. Фронти застосовуються при оновленні симуляції; запис зберігає їхній фактичний час. Швидкі натискання виконуються по черзі. Задайте pulseDuration від 0.02 до 10 секунд, не менше повного циклу чотирьох рядків. Запустіть симуляцію для виконання черги.',
      ],
      [
        'Choose Hold for exact physical contact duration and simultaneous chords, or Toggle to latch each key until its next activation. Pulse mode accepts one queued key at a time. Choose the mode before recording.',
        'Оберіть режим (mode) «Поки утримується» для точної тривалості фізичного контакту й одночасних клавіш або «Перемикати» для фіксації до наступного натискання. «Імпульс» виконує по одній клавіші з черги. Обирайте режим до запису.',
      ],
      [
        'Use a counter and gates to select R1, R2, R3 and R4 in sequence. Decode the selected row and the high column externally. Record presses and releases to repeat the same experiment.',
        'Лічильником і логічними елементами почергово вибирайте R1, R2, R3 та R4. Розшифровуйте вибраний рядок і активний стовпець зовнішньою схемою. Записуйте натискання та відпускання для повторення досліду.',
      ],
    ],
    experiment: expanded
      ? [
          'Set R4 high and R1–R3 low. Press D to make C4 high, then press # to make C3 high. With Hold mode you can press both to observe two active columns.',
          'Задайте R4=1 і R1–R3=0. Натисніть D, щоб підняти C4, а потім #, щоб підняти C3. У режимі утримання можна натиснути обидві клавіші одночасно.',
        ]
      : [
          'Open the keypad code-lock laboratory. Trace the row scan, the ROM that maps a row/column to a key, and the separate ROM holding the secret. Enter a wrong digit, clear with *, then enter the correct code and confirm with #.',
          'Відкрийте лабораторну кодового замка. Простежте сканування рядків, ROM перетворення рядка/стовпця на клавішу та окрему ROM із секретом. Введіть неправильну цифру, очистіть введення через *, потім введіть правильний код і підтвердьте через #.',
        ],
    expected: expanded
      ? [
          'With R4 high, D maps to C4 and # maps to C3. Each of the four outputs is independent and idle at 0.',
          'За R4=1 клавіша D активує C4, а # активує C3. Чотири виходи незалежні й мають 0 без натискань.',
        ]
      : [
          'Unpressed columns are 0. A pressed key copies its selected row to its column. If several pressed keys share a column, any driven 1 makes that column 1; otherwise an unknown/floating pressed row makes it X. Other columns stay independent.',
          'Без натиснутих клавіш усі стовпці мають 0. Натиснута клавіша передає вибраний рядок на свій стовпець. Якщо декілька натиснутих клавіш мають спільний стовпець, будь-яка подана 1 дає 1; інакше невизначений або плаваючий натиснутий рядок дає X. Інші стовпці незалежні.',
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
        'The keys action stores a contact mask in row order, with the first key in bit 0. Pulse mode times only virtual contacts; the circuit still owns scanning, digit decoding, one-event-per-press logic and passwords.',
        'Дія keys зберігає маску контактів по рядках, починаючи з біта 0 для першої клавіші. Режим «Імпульс» задає лише час віртуальних контактів; сканування, розпізнавання цифр, одна подія на натискання й пароль залишаються у вашій схемі.',
      ],
      [
        'Pulse time follows simulated time: pausing keeps the active contact and queue visibly pending; slow motion takes longer in real time. No clock advances secretly. A hidden page, window blur, disabling, mode changes, replacement or explicit cancellation clears live queued inputs. The queue holds at most 128 outstanding keys.',
        'Імпульси відлічують модельний час: на паузі активний контакт і черга залишаються видимими та очікують; уповільнення збільшує реальний час очікування. Прихованого руху часу немає. Прихована сторінка, втрата фокуса вікна, вимкнення, зміна режиму, заміна схеми або явне скасування очищують живу чергу. У ній може бути не більше 128 невиконаних натискань.',
      ],
      [
        'Recording saves the actual keys mask when a queued contact starts and ends, including its applied timestamp. Replay uses those saved electrical changes directly; it does not queue or stretch them again.',
        'Запис зберігає фактичну маску keys на початку й наприкінці контакту з часом застосування. Повтор використовує ці збережені електричні зміни напряму, без повторної черги або розтягування.',
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
      Array.from({ length: columns }, (_, column) => [
        `col${column}`,
        [
          `C${column + 1}: OR of row levels connected by pressed keys in column ${column + 1}; idle 0.`,
          `C${column + 1}: АБО рівнів рядків, з’єднаних натиснутими клавішами стовпця ${column + 1}; без натискань 0.`,
        ],
      ]),
    ),
    examples: ['keypad-code-lock'],
  };
}
export default guide('keypad');
export const keypad4x4Guide = guide('keypad_4x4');

export default {
  purpose: [
    'The LCD stores character bytes in display data RAM (DDRAM) and shows a 16-character window on each of two rows. Write commands and character bytes through individual parallel contacts.',
    'LCD зберігає байти символів у пам’яті DDRAM та показує вікно з 16 символів у кожному з двох рядків. Команди й дані надходять через окремі паралельні контакти.',
  ],
  steps: [
    [
      'For 8-bit mode, wire a Byte value source D0…D7 to the same numbered LCD contacts. Connect R/W to Ground, RS to a switch, and E to a momentary button.',
      'Для 8-бітного режиму з’єднайте D0…D7 джерела «Значення байта» з однойменними контактами LCD. Під’єднайте R/W до землі, RS до перемикача, а E до кнопки без фіксації.',
    ],
    [
      'Keep E low while setting RS and the byte. Then press and release E. The display accepts one transfer on the falling edge. With RS=0 send 0x38, 0x08, 0x01, 0x06, 0x0C (decimal 56, 8, 1, 6, 12).',
      'Тримайте E=0, поки задаєте RS і байт. Потім натисніть і відпустіть E. Дисплей приймає одну передачу на спадному фронті. З RS=0 надішліть 0x38, 0x08, 0x01, 0x06, 0x0C (десяткові 56, 8, 1, 6, 12).',
    ],
    [
      'Send command 0x80 for row 1 or 0xC0 for row 2. Set RS=1 and send one ASCII code per character, for example 72 for H and 73 for I. The address advances after each write.',
      'Надішліть команду 0x80 для першого рядка або 0xC0 для другого. Задайте RS=1 і надсилайте по одному коду ASCII на символ, наприклад 72 для H та 73 для I. Після кожного запису адреса змінюється.',
    ],
    [
      'For 4-bit wiring, use D4…D7 and leave D0…D3 open. With RS=0, pulse the upper nibble values 3, 3, 3, 2. Then send complete bytes 0x28, 0x08, 0x01, 0x06 and 0x0C. Each byte now uses two E pulses, high nibble first. Keep RS fixed across the pair.',
      'Для 4-бітного підключення використайте D4…D7, залишивши D0…D3 вільними. З RS=0 подайте півбайти 3, 3, 3, 2. Далі надішліть повні байти 0x28, 0x08, 0x01, 0x06 і 0x0C. Кожний байт тепер потребує двох імпульсів E, починаючи зі старшого півбайта. Між імпульсами RS має бути сталим.',
    ],
  ],
  experiment: [
    'Write text in both rows, send 0x08 to hide it, then 0x0C to show it again. Compare return home (0x02), clear (0x01), and decrement mode (0x04). Use 0x0E to reveal the cursor or 0x0F to blink it.',
    'Запишіть текст в обидва рядки, приховайте його командою 0x08, а потім поверніть через 0x0C. Порівняйте повернення на початок (0x02), очищення (0x01) та спадання адреси (0x04). Команда 0x0E показує курсор, а 0x0F вмикає блимання.',
  ],
  expected: [
    'Display off preserves DDRAM. Home restores the address and view while preserving text; clear replaces every stored character with a space. Command 0x04 makes each new character move the next write one address backward.',
    'Вимкнений дисплей зберігає DDRAM. Повернення на початок відновлює адресу й положення вікна, зберігаючи текст, а очищення замінює всі символи пробілами. Команда 0x04 після кожного символу зменшує адресу наступного запису.',
  ],
  pitfalls: [
    [
      'At reset, the LCD expects 8-bit transfers and its display is off. Enable it with 0x0C after choosing the interface and two-row mode.',
      'Після скидання LCD очікує 8-бітні передачі, а екран вимкнений. Увімкніть його командою 0x0C після вибору інтерфейсу й дворядкового режиму.',
    ],
    [
      'Moving past the 16th column reaches hidden DDRAM, not the start of the next visible row. Use the 0xC0 address command to write at the start of row 2.',
      'Після 16-го стовпця адреса переходить у приховану частину DDRAM. Щоб почати запис на другому видимому рядку, задайте адресу командою 0xC0.',
    ],
    [
      'The teaching model accepts writes with R/W=0 and displays printable ASCII. It omits readback, the busy flag, CGRAM, electrical timing, power, contrast and backlight pins. Keep the data and RS stable through each E pulse.',
      'Навчальна модель приймає запис із R/W=0 та показує друковані символи ASCII. Читання, прапорець зайнятості, CGRAM, апаратні затримки, живлення, контраст і підсвічування не моделюються. Зберігайте сталі дані та RS протягом імпульсу E.',
    ],
  ],
  inputs: {
    rs: [
      'Register select: 0 for a command, 1 for character data.',
      'Вибір регістра: 0 для команди, 1 для коду символу.',
    ],
    rw: [
      'Write permission: connect to logic 0. Reads are outside this teaching model.',
      'Дозвіл запису: під’єднайте до логічного 0. Читання не моделюється.',
    ],
    e: [
      'Enable strobe: a definite transition from 1 to 0 accepts one transfer.',
      'Строб дозволу: визначений перехід з 1 на 0 приймає одну передачу.',
    ],
    d: [
      'Parallel command or character data. In 4-bit mode only D4…D7 are used.',
      'Паралельні біти команди або символу. У 4-бітному режимі використовуються лише D4…D7.',
    ],
  },
  examples: ['lcd1602-parallel'],
};

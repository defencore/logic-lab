import { clockPin } from '../pin-descriptions.js';

export default {
  purpose: [
    'This educational EEPROM starts with a saved 16-byte image and accepts writes while the circuit runs. The memory map shows the current bytes and the last write.',
    'Навчальна EEPROM завантажує збережений образ із 16 байтів і приймає записи під час роботи схеми. Карта пам’яті показує поточні байти й останній запис.',
  ],
  steps: [
    [
      'Set the saved image (data) to up to 16 comma-separated bytes, such as 12,0xA5,0. Unspecified addresses start at zero.',
      'Задайте збережений образ (data) — до 16 байтів через кому, наприклад 12,0xA5,0. Решта адрес починають з нуля.',
    ],
    [
      'Connect separate address and data bits. Use a manual CLK and set CS=OE=1, WE=0 to read.',
      'Під’єднайте окремі біти адреси й даних. Використайте ручний CLK і задайте CS=OE=1, WE=0 для читання.',
    ],
    [
      'Choose the address and DATA, set WE=1, then pulse CLK 0→1. Return WE to 0 to read the new byte.',
      'Оберіть адресу й DATA, задайте WE=1, потім подайте імпульс CLK 0→1. Поверніть WE у 0, щоб прочитати новий байт.',
    ],
  ],
  experiment: [
    'Preload address 1 with 0xA5, write 0x3C there, then turn OE off and on. Compare the live memory map with the saved image after simulation reset.',
    'Задайте 0xA5 за адресою 1, запишіть туди 0x3C, потім вимкніть і знову ввімкніть OE. Після скидання симуляції порівняйте карту пам’яті зі збереженим образом.',
  ],
  expected: [
    'The map retains 0x3C while outputs are Z. Reset reloads 0xA5 from the saved image.',
    'Карта зберігає 0x3C, поки виходи мають Z. Скидання відновлює 0xA5 зі збереженого образу.',
  ],
  pitfalls: [
    [
      'The saved image belongs to the project. Clocked writes change only the current run, so experiments can be repeated from the same bytes after reset.',
      'Збережений образ належить проєкту. Тактові записи змінюють лише поточний запуск, тому після скидання дослід повторюється з тими самими байтами.',
    ],
    [
      'This clocked model uses active-high controls. Physical EEPROM devices have part-specific write pulses and write-cycle timing.',
      'Ця тактова модель використовує керування високим рівнем. Реальні EEPROM мають визначені для конкретної мікросхеми імпульси й тривалість циклу запису.',
    ],
    [
      'Unwired CS and OE default to 1; unwired WE defaults to 0. During a write, Q0–Q7 are high-impedance.',
      'Непідключені CS та OE мають типово 1, WE — 0. Під час запису Q0–Q7 мають високий імпеданс.',
    ],
  ],
  inputs: {
    address: ['Four-bit byte address 0–15.', 'Чотирибітна адреса байта 0–15.'],
    data: ['Eight-bit byte to write.', 'Восьмибітний байт для запису.'],
    clk: clockPin,
    cs: [
      '1 selects the device for reads and writes.',
      '1 вибирає мікросхему для читання й запису.',
    ],
    oe: [
      '1 enables read outputs when selected and WE=0.',
      '1 вмикає виходи читання при вибраній мікросхемі та WE=0.',
    ],
    we: [
      '1 enables writes on CLK↑ when selected.',
      '1 дозволяє запис за CLK↑ при вибраній мікросхемі.',
    ],
  },
  outputs: {
    out: [
      'Addressed byte when reading, otherwise Z.',
      'Адресований байт під час читання, інакше Z.',
    ],
  },
  examples: ['ram', 'rom-lookup'],
};

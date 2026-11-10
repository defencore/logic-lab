# LCD 1602: write a message

**Time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **LCD 1602: write a message** in **Learning examples**, or import [circuit.json](./circuit.json). The LCD starts with its screen off. [lesson.js](./lesson.js) contains the bilingual worksheet and demo.

The byte source connects D0…D7 separately. RS is a toggle, E is a momentary button and R/W is grounded.

## Objectives

- Send commands and character bytes through the same eight data contacts.
- Place text on the first and second visible rows using DDRAM addresses.

## Procedure

1. In the LCD panel, choose **Prepare LCD**. With RS=0, it sends `0x38` to select 8-bit transfers and two rows, `0x06` to advance the address after each character, and `0x0C` to turn on the display. It preserves the stored text. If the display was shifted, it also sends `0x02` to restore the display position.
2. Select the first row, type `HI` and choose **Write row**. Select the second row, type `OK` and choose **Write row** again. Each write accepts 1–16 printable ASCII characters, including Latin letters, digits and spaces. The panel reports an error for 17 characters. Shorter text overwrites its own cells. To erase leftover characters, write spaces over them or choose **Clear** to erase both rows.
3. Before writing, inspect the upcoming bytes. **Write row** sends `0x80` or `0xC0` with RS=0, setting the DDRAM address to `0x00` or `0x40`. Then it sends one ASCII byte per character with RS=1. For example, `H` sends `0x48`. R/W stays at 0. The LCD accepts each byte on E's falling edge, when E goes from 1 to 0. After each character, the address advances to the next cell. The panel shows the next write location.

Open **Manual byte transfer** to send one byte at a time. The row shortcuts position the write address. Select **Character** to send a letter or **Command** to send a decimal byte or a hexadecimal byte such as `0x08`. After the 16th character, a manual write continues into the same row's hidden DDRAM cells. Select the second row explicitly to write there.

### Trace the physical inputs

Choose **Reset simulation** to clear the LCD and restore its initial 8-bit mode with the display off. Set RS=0 and leave E released. Select **BYTE**, then edit its decimal value in **Properties → Parameters → Value**. Set the value while E=0, then return to the circuit and press and release E once to send that byte. The release is the falling edge, which accepts the transfer.

| RS  | Byte in hex | Decimal | Action                                     |
| --- | ----------- | ------- | ------------------------------------------ |
| 0   | `38`        | 56      | Select the 8-bit interface and two rows    |
| 0   | `08`        | 8       | Hide the display during setup              |
| 0   | `01`        | 1       | Clear DDRAM and restore address 0          |
| 0   | `06`        | 6       | Increment the address after each character |
| 0   | `0C`        | 12      | Show the display                           |
| 0   | `80`        | 128     | Select the first row's first cell          |
| 1   | `48`, `49`  | 72, 73  | Write `HI`                                 |
| 0   | `C0`        | 192     | Select the second row's first cell         |
| 1   | `4F`, `4B`  | 79, 75  | Write `OK`                                 |

The table starts from a freshly reset simulator. After writing, send `08` then `0C` with RS=0. Observe the text disappear and return. Send `02` to return home and `01` to clear. Repeat with different messages.

Choose **Run LCD demo** in the catalog or above the circuit to watch the same process. Choose **Pause demo**, then **Next demo action** to follow RS, R/W, E and the assembled byte one change at a time. The demo writes `LOGIC LAB` and `PARALLEL LCD`. Choose **Return to my circuit** to resume your work.

### Four-bit extension

Remove the connections to D0…D3, keep D4…D7 and reset the simulator. With RS=0, send upper nibbles `3`, `3`, `3`, `2` using byte values 48, 48, 48 and 32 on the source. Then send `28`, `08`, `01`, `06`, `0C` as complete bytes, each with two pulses for its high nibble and low nibble. For example, send `28` using source values 32 and 128. Keep RS unchanged between both pulses of each byte.

This is a write-only teaching model with printable ASCII, address movement and display shifting. Keep R/W low. Hardware busy and power-up delays, readback, CGRAM glyphs, power, contrast and backlight are outside the simulation. The command encodings and initialization follow the [Hitachi HD44780U datasheet](https://cdn-shop.adafruit.com/datasheets/HD44780.pdf).

## Expected result

Manual transfers show `HI` and `OK`. The replay writes `LOGIC LAB` and `PARALLEL LCD`. Display off preserves DDRAM, and clear replaces the stored text with spaces.

## Review questions

- Why does changing the source byte without pulsing E leave the display unchanged?
- Why do 16 visible columns not imply the second row starts at address 16?

## Deliverables

- Your message and a recording of its source actions.
- A short command table for initialization, row selection, display off and clear.

## Українською

Відкрийте **«LCD 1602: запис повідомлення»** в навчальних прикладах або імпортуйте схему.

1. Натисніть **«Підготувати LCD»**. З RS=0 панель надсилає `0x38` для 8-бітного режиму й двох рядків, `0x06` для переходу до наступної клітинки після запису символу та `0x0C` для ввімкнення екрана. Підготовка зберігає текст у пам’яті. Якщо зображення було зсунуте, команда `0x02` поверне його у вихідне положення.
2. У полі **«Куди записати»** оберіть перший рядок, введіть `HI` в поле **«Текст (1–16 символів ASCII)»** і натисніть **«Записати рядок»**. Повторіть з `OK` для другого рядка. Вводьте латинські літери, цифри, пробіли або інші друковані символи ASCII. Якщо ввести 17 символів, панель покаже помилку. Коротший текст замінює лише свої клітинки. Щоб стерти залишок, допишіть пробіли або натисніть **«Очистити»**, щоб стерти обидва рядки.
3. Перед записом подивіться, які байти надішле панель. Спершу вона передає `0x80` або `0xC0` із RS=0, щоб вибрати адресу початку рядка `0x00` або `0x40`. Далі йде один байт ASCII на кожен символ із RS=1. Наприклад, `H` передається як `0x48`. R/W залишається 0. LCD приймає байт, коли E переходить з 1 до 0, а після символу адреса просувається на одну клітинку. Панель показує наступну позицію запису.

У розділі **«Ручна передача байтів»** можна надсилати байти по одному. Кнопки рядків задають адресу запису. Режим **«Символ»** передає літеру, а **«Команда»** приймає десяткове або шістнадцяткове число на кшталт `0x08`. Після 16-го символу ручний запис продовжується у прихованих клітинках цього ж рядка. Для запису в другий рядок виберіть його адресу окремо.

Щоб простежити електричні сигнали, оберіть **«Запустити демо LCD»**, потім **«Пауза демо»** і **«Наступна дія демо»**. Стежте за RS, E та байтом на D7…D0. Демо записує `LOGIC LAB` та `PARALLEL LCD`. Кнопка **«Повернутися до своєї схеми»** повертає вашу роботу.

Для запису без панелі натисніть **«Скинути симуляцію»**, задайте RS=0 і залиште E відпущеною. Оберіть **BYTE** та відкрийте **«Властивості → Параметри → Значення»**. Задайте кожне число з таблиці при E=0, потім натисніть і відпустіть E на схемі. Земля тримає R/W=0. Змінюйте RS згідно з таблицею.

Для 4-бітного досліду від’єднайте D0…D3, скиньте симуляцію та надішліть через D4…D7 півбайти 3, 3, 3, 2. Далі кожен байт потребує двох імпульсів E, старший півбайт перший. Почніть з повних команд `0x28`, `0x08`, `0x01`, `0x06`, `0x0C`.

Поясніть, коли LCD приймає байт, чому адреса другого рядка дорівнює `0x40`, та як вимкнення екрана відрізняється від очищення пам’яті. Здайте свою схему, запис дій і коротку таблицю команд. Модель показує друковані символи ASCII та приймає лише запис.

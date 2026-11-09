# LCD 1602: write a message

**Time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **LCD 1602: write a message** in **Learning examples**, or import [circuit.json](./circuit.json). Click **Run LCD demo** on the catalog card or above the circuit. The LCD starts with its display off, then the demonstration initializes it and writes `LOGIC LAB` and `PARALLEL LCD`. Wait for both lines, then click **Return to my circuit**. [lesson.js](./lesson.js) supplies the bilingual worksheet and runnable sequence.

The byte source connects D0…D7 separately. RS is a toggle, E is a momentary button and R/W is grounded.

## Objectives

- Send commands and character bytes through the same eight data contacts.
- Place text on the first and second visible rows using DDRAM addresses.

## Procedure

Choose **Reset simulation** to clear the LCD and restore its initial 8-bit mode with the display off. Set RS=0 and leave E released. Select **BYTE**, then edit its decimal value in **Properties → Parameters → Value**. Set the value while E=0, then return to the circuit and press and release E once to send that byte. The release is the falling edge, which accepts the transfer.

| RS  | Byte in hex | Decimal | Action                                     |
| --- | ----------- | ------- | ------------------------------------------ |
| 0   | `38`        | 56      | Select the 8-bit interface and two rows    |
| 0   | `08`        | 8       | Hide the display during setup              |
| 0   | `01`        | 1       | Clear DDRAM and restore address 0          |
| 0   | `06`        | 6       | Increment the address after each character |
| 0   | `0C`        | 12      | Show the display                           |
| 1   | `48`, `49`  | 72, 73  | Write `HI`                                 |
| 0   | `C0`        | 192     | Select the second row's first cell         |
| 1   | `4F`, `4B`  | 79, 75  | Write `OK`                                 |

The table starts from a freshly reset simulator. After writing, send `08` then `0C` with RS=0. Observe the text disappear and return. Send `02` to return home and `01` to clear. Repeat with different messages.

To inspect the supplied demonstration one action at a time, load **Example action sequence** in **Assignments & submission → Action sequence** and choose **Next recorded action**. The probes observe RS, R/W, E and the assembled byte. Watch the characters on the LCD to verify the message itself.

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

Відкрийте **«LCD 1602: запис повідомлення»** або імпортуйте схему. В інструкції натисніть **«Запустити демо LCD»**. Готовий сценарій увімкне екран і запише `LOGIC LAB` та `PARALLEL LCD`. Дочекайтеся обох рядків і натисніть **«Повернутися до своєї схеми»** на панелі сценарію, щоб повернутися до редагування.

Для ручного запису натисніть **«Скинути симуляцію»**, задайте RS=0 і залиште E відпущеною. Оберіть **BYTE** та відкрийте **«Властивості → Параметри → Значення»**. Вводьте число при E=0. Після кожного числа поверніться до схеми, натисніть і відпустіть E. Земля тримає R/W=0, а RS вибирає команду чи символ.

1. Із RS=0 послідовно надішліть десяткові 56, 8, 1, 6, 12. Це налаштує 8 біт і два рядки, очистить пам’ять та увімкне екран.
2. Із RS=1 надішліть 72 і 73, щоб записати `HI`. Для початку другого рядка поверніть RS=0 та надішліть 192 (`0xC0`), потім із RS=1 надішліть 79 і 75 для `OK`.
3. Порівняйте команди `0x08` (приховати), `0x0C` (показати), `0x02` (повернути адресу й вікно на початок) і `0x01` (очистити). Запишіть власний дослід або відтворіть готовий сценарій із повідомленнями `LOGIC LAB` і `PARALLEL LCD`.
4. Для 4-бітного досліду від’єднайте D0…D3, скиньте симуляцію та надішліть через D4…D7 півбайти 3, 3, 3, 2. Далі кожен байт потребує двох імпульсів E, старший півбайт перший. Почніть з повних команд `0x28`, `0x08`, `0x01`, `0x06`, `0x0C`.

Поясніть, коли LCD приймає байт, чому адреса другого рядка дорівнює `0x40`, та як вимкнення екрана відрізняється від очищення пам’яті. Здайте свою схему, запис дій і коротку таблицю команд. Модель показує друковані символи ASCII та приймає лише запис.

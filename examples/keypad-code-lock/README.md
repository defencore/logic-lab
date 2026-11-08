# Matrix keypad: ROM code lock

**Time:** 40 minutes. **Level:** intermediate. Build a four-digit lock from a scanned 3×4 keypad, two ROMs, comparators and visible state elements.

## Starting circuit

Open **Matrix keypad: ROM code lock** in **Learning examples**, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains bilingual instructions, worksheet metadata and a ten-action input preset. The initial code is **2580**; the keypad starts in **hold** mode with all keys released. Progress=0, UNLOCK=0, Error=0.

The keypad exposes **R1…R4 row inputs and C1…C3 column outputs**. A pressed key connects its row to its column through the model's isolated digital matrix; it does not encode digits internally. All seven contacts are separate one-bit lines. This 62-component circuit implements scanning, decoding and authentication externally.

## Objectives

- Decode physical matrix contacts through a visible row scanner and lookup table.
- Read an editable secret from addressed memory.
- Separate key detection, captured comparison, progress and confirmation.
- Record repeatable correct, invalid and cleared attempts.

## Procedure

1. Run the simulation. A 200 Hz clock advances the scan counter; its low two bits and six gates select one row at a time. Hold one key for at least **0.02 simulated seconds** to cover all four rows. A detected column stops the scanner on that row until release, preventing held-key repetition.
2. Inspect **KEY MAP**, the first ROM. Its address is `row × 4 + column`, with zero-based row/column numbers. Columns are encoded as 00,01,10; 11 is unused. Its data is `1,2,3,255,4,5,6,255,7,8,9,255,10,0,11,255`. Codes 10 and 11 mean **\*** and **#**, while 255 marks unused addresses. The row and column contacts remain individually wired throughout.
3. Inspect **SECRET**, the second ROM. Addresses **0,1,2,3** contain **2,5,8,0**. Progress selects the next expected address. Its contents are visible in the read-only memory map; change the **Data** property to edit the configuration before recording. KEY MAP describes the keyboard; SECRET defines the lock code.
4. Press and release **2,5,8,0** one at a time. Expect Progress **1,2,3,4**. Ready lights after the fourth digit, while UNLOCK remains 0. Press and release **#**: UNLOCK becomes 1 and stays latched.
5. Follow the two-stage capture. Match captures `entered digit = SECRET[index] AND index < 4`. Seen marks a settled key event. Their gates increment Progress only after this decision is captured, so changing the address cannot reject the same press or count it repeatedly. The last-key register preserves the most recently detected code.
6. Press **\*** to clear, then enter **2,9**. The wrong second digit resets Progress to 0 and latches Error. Also test **#** before completion and a fifth digit after 2580: both invalidate the attempt. Multiple active columns in one selected row are rejected. Enter one key at a time; this scanner does not implement complete multi-key rollover across different rows.
7. Press **\*** again. It clears progress, unlock, error and last-key; the separate **RESET** button also restarts the row scanner. Holding a digit for several scan cycles still counts only once; releasing it prepares the next event.
8. Press RESET and edit only SECRET addresses 0…3 to **1,3,7,9**. Test **1379#**, then prove **2580#** fails. The code length stays four digits because the progress comparator uses constant 4. Restore SECRET to 2580 before using the supplied preset.
9. Open **Assignments & submission → Action sequence**, load **Example action sequence**, then replay. Its ten `keypad.keys` mask changes press/release **2,5,8,0,#**, finishing with Progress=4, UNLOCK=1 and Error=0. Make your own recording with both successful and failed attempts; include releases and export the result. Stop restores your editable circuit.

## Expected result

| Input                         | Progress | UNLOCK | Error |
| ----------------------------- | -------- | ------ | ----- |
| Reset / \*                    | 0        | 0      | 0     |
| 2                             | 1        | 0      | 0     |
| 25                            | 2        | 0      | 0     |
| 258                           | 3        | 0      | 0     |
| 2580                          | 4        | 0      | 0     |
| 2580#                         | 4        | 1      | 0     |
| 29, early # or an extra digit | 0        | 0      | 1     |

Mask bits follow **1,2,3 / 4,5,6 / 7,8,9 / \*,0,#**, with bit index `row×3+column`. Thus 2,5,8,0,# use masks **2,16,128,1024,2048**; \* is 512. A release sets the mask to 0. The action log records these real source changes, while the circuit creates scan edges, reads ROM and remembers progress. No hidden code-checking controller is involved. UNLOCK is a digital command that can be connected to another mechanism in a later exercise.

## Review questions

1. Why does a held key stop scanning without repeating the digit?
2. Which ROM changes the secret, and which maps the physical keyboard?
3. Why must Match be captured before the address counter changes?
4. Why is # required after four correct digits, and why is a fifth digit rejected?

## Deliverables

- Your circuit and recordings of correct, incorrect and cleared attempts.
- A matrix-address table, expected SECRET addresses and an explanation of the Match/Seen capture stages.

## Extension

Choose another four-digit secret and predict all comparisons before testing. Connect UNLOCK to a visible external gate mechanism, or drive an active buzzer from Error. Explain the extra state required for a five-digit code or a different multi-key policy before modifying the circuit.

## Українська лабораторна робота

**Мета:** просканувати матрицю 3×4, прочитати секрет із пам’яті, зафіксувати порівняння й побудувати явну логіку підтвердження та скидання.

1. Відкрийте **«Матрична клавіатура: кодовий замок із ПЗП»** або імпортуйте JSON. Код — **2580**; режим клавіатури — **hold**, усі клавіші відпущені. Початкові Progress, UNLOCK та Error дорівнюють 0. Клавіатура має окремі входи R1…R4 і виходи C1…C3 та не кодує цифри приховано.
2. Генератор **200 Гц**, лічильник і вентилі по черзі вмикають рядки. Утримуйте одну клавішу щонайменше **0.02 модельної секунди**, щоб повний цикл її побачив. Виявлений стовпець зупиняє сканування до відпускання; утримання не створює повторів.
3. ПЗП **KEY MAP** перетворює адресу `рядок×4+стовпець` на цифри, **\*=10** та **#=11**; невикористані адреси мають 255. ПЗП **SECRET** окремо зберігає **0→2, 1→5, 2→8, 3→0**. Progress задає адресу очікуваної цифри. Карту пам’яті можна переглядати, а секрет змінюйте через властивість **Data** до початку запису; KEY MAP лишайте без змін.
4. Натискайте й відпускайте **2,5,8,0**. Progress має стати **1,2,3,4**, Ready — засвітитися, UNLOCK — залишитися 0 до **#**. Після # відкриття фіксується в 1. Match зберігає збіг до зміни адреси, Seen дозволяє використати вже зафіксоване рішення; last-key утримує останній код.
5. Очистіть через **\*** й введіть **2,9**: хибна цифра скидає прогрес і вмикає Error. Перевірте ранній #, п’яту цифру та кілька стовпців одного рядка. Перед іншою клавішею відпускайте попередню: повного багатоклавішного декодера різних рядків тут немає. \* очищає стан спроби, а окрема кнопка RESET також скидає сканування.
6. Після RESET задайте в SECRET за адресами 0…3 **1,3,7,9**. Перевірте **1379#** та доведіть, що **2580#** тепер хибний. Довжина — чотири цифри через константу 4 компаратора. Перед готовим сценарієм поверніть 2580.
7. У **«Завдання та здача → Сценарій дій»** завантажте **«Навчальний сценарій прикладу»**. Десять змін маски `keypad.keys` натискають/відпускають 2,5,8,0,# та дають Progress=4, UNLOCK=1, Error=0. Маски — **2,16,128,1024,2048**, а \* — **512**; відпускання має маску 0. Запишіть власні правильні й хибні спроби та експортуйте їх. Зупинка повертає редаговану схему.

**Здайте:** власну схему, записи правильної/хибної/очищеної спроби, таблицю адрес матриці та SECRET і пояснення двох тригерів фіксації. Додатково змініть секрет або під’єднайте UNLOCK до зовнішнього механізму, а Error — до зумера.

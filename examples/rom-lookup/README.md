# ROM: address-to-display lookup table

Use ROM addresses as hexadecimal character codes and read the stored segment masks directly on a seven-segment display.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **ROM: address-to-display lookup table** in the Examples catalog, or import [circuit.json](./circuit.json). The circuit uses a separate contact and wire for every bit. Read complete byte values on the memory component; each scope traces only bit 0. The [lesson metadata](./lesson.js) also includes a ready action preset for repeatable practice.

Pause the simulation for individual manual edges. A clock click from 0 to 1 is one rising edge; changing data while CLK stays high does not generate another edge. Use the action recorder to capture your own input changes and replay them from the initial circuit state.

## Objectives

- Map a four-bit address to an eight-bit stored output.
- Interpret individual segment bits and distinguish ROM contents from read controls.

## Procedure

1. **Read a hexadecimal glyph.** The initial address is decimal 10 (binary 1010, hexadecimal A). With CS=OE=1, ROM reads 119 and the display shows A. Address bits choose a stored byte; they are not the segment mask itself.

2. **Walk through the complete table.** Set Address successively to 0,1,…,15. Expect 0–9 followed by A,b,C,d,E,F. At addresses 0,1,10 and 15 the stored masks are 63,6,119 and 113. Record the eight individual output bits as well as the glyph.

3. **Change table contents deliberately.** Select ROM and edit its Data list in the inspector. Replace the byte at index 1 with 63, then select address 1: the display now shows 0. Restore that table entry to 6. No clock or runtime write input is involved.

4. **Release and restore outputs.** Turn OE off, inspect the Z states, and observe the blank display. Restore OE=1, then test CS=0 separately. Re-enabling both restores the same addressed glyph; disabling an output did not erase the table.

## Expected result

Four address bits select one of 16 fixed segment masks. Table editing changes the function; CS or OE low releases outputs without changing stored entries.

## Review questions

1. Why does address 10 produce byte 119 rather than 10?
2. Which table entry must change to alter only the glyph at address 1?
3. Why does disabling OE preserve the lookup table?

## Deliverables

- Submit the complete address/segment-mask table with your recorded address sweep.
- Submit an edited ROM project plus an explanation of one intentionally changed glyph.

## Independent extension

Choose new data values and addresses before performing the experiment. Predict the observed byte after every operation and explain each difference. A correct screenshot alone is insufficient evidence of understanding.

---

# ПЗП: таблиця відповідності адреси й індикатора

Використайте адреси ПЗП як коди шістнадцяткових символів і прочитайте збережені маски сегментів на індикаторі.

**Орієнтовний час:** 30 хв.

## Початкова схема

Відкрийте лабораторну в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). Кожен біт має окремий контакт і дріт. Повні значення байтів читайте на компонентах пам’яті; осцилограф показує лише біт 0. У метаданих є готова послідовність дій для повторюваного досліду.

Для ручних фронтів зручно призупинити симуляцію. Перехід CLK із 0 в 1 — один додатний фронт; зміна даних при постійному CLK=1 не створює нового фронту. Запишіть власні зміни входів і відтворіть їх від початкового стану схеми.

## Мета

- Зіставте чотирибітну адресу з восьмибітним збереженим виходом.
- Розшифруйте біти сегментів і відрізніть вміст ПЗП від керування читанням.

## Порядок роботи

1. **Прочитайте шістнадцятковий символ.** Початкова адреса — десяткове 10 (двійкове 1010, шістнадцяткове A). При CS=OE=1 ПЗП читає 119, а індикатор показує A. Адресні біти обирають збережений байт, а не є самою маскою сегментів.

2. **Перегляньте всю таблицю.** По черзі задайте Address=0,1,…,15. Очікуйте 0–9, а потім A,b,C,d,E,F. За адресами 0,1,10 і 15 маски дорівнюють 63,6,119 та 113. Запишіть вісім окремих вихідних бітів разом із символом.

3. **Свідомо змініть вміст таблиці.** Оберіть ПЗП та відредагуйте список Data в інспекторі. Замініть байт з індексом 1 на 63 і задайте адресу 1: індикатор покаже 0. Відновіть значення 6. Такт або вхід запису під час роботи для цього не потрібні.

4. **Відпустіть і відновіть виходи.** Вимкніть OE, перевірте стани Z та погаслий індикатор. Поверніть OE=1 і окремо перевірте CS=0. Увімкнення обох відновлює той самий адресований символ: вимкнення виходу не стерло таблицю.

## Очікуваний результат

Чотири адресні біти обирають одну з 16 сталих масок сегментів. Редагування таблиці змінює функцію; CS або OE=0 відпускає виходи без зміни вмісту.

## Контрольні запитання

1. Чому адреса 10 дає байт 119, а не 10?
2. Який елемент таблиці треба змінити лише для символу за адресою 1?
3. Чому вимкнення OE зберігає таблицю відповідностей?

## Що здати

- Здайте повну таблицю адрес/масок сегментів із записом перебору адрес.
- Здайте проєкт зі зміненою ПЗП та поясненням одного свідомо зміненого символу.

## Самостійне продовження

Оберіть інші дані й адреси перед дослідом. Спрогнозуйте байт після кожної операції та поясніть відмінності. Самого правильного знімка екрана недостатньо для підтвердження розуміння.

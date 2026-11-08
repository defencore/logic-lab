# Shift register: serial loading and replay

Load an eight-bit pattern through SER and manual CLK edges, observe each stored bit, then reset and replay the experiment.

**Estimated time:** 25 minutes. **Level:** beginner.

## Starting circuit

Open **Shift register: serial loading and replay** in the Examples catalog, or import [circuit.json](./circuit.json). The circuit uses a separate contact and wire for every bit. Read complete byte values on the memory component; each scope traces only bit 0. The [lesson metadata](./lesson.js) also includes a ready action preset for repeatable practice.

Pause the simulation for individual manual edges. A clock click from 0 to 1 is one rising edge; changing data while CLK stays high does not generate another edge. Use the action recorder to capture your own input changes and replay them from the initial circuit state.

## Objectives

- Distinguish a clock level from a rising-edge event.
- Trace bit position, serial order and asynchronous reset.

## Procedure

1. **Establish the initial state.** Set CLK=0, then set RST=1 and return RST to 0. All Q lamps go low immediately. RST is asynchronous: it does not need a clock edge. Keep SER=0 for now.

2. **Capture and hold one bit.** Set SER=1 and switch CLK from 0 to 1. Q0 lights and the stored byte is 1. While CLK remains 1, set SER=0: the byte stays 1. Return CLK to 0 before the next capture.

3. **Load a complete pattern.** Reset again and enter SER bits 1,0,1,0,0,1,0,1 in that order, giving each bit its own CLK 0→1→0 pulse. The byte values after rising edges are 1,2,5,10,20,41,82,165. Read Q7…Q0 as 10100101. SOUT shows the current Q7, not a separate remembered discarded bit.

4. **Record, replay and explain.** Start a fresh action recording, repeat the initial reset and eight pulses, then stop and replay. Compare the chronological input log and all eight output bits. Finally test RST=1 with CLK held high and explain why the byte still clears.

## Expected result

Eight MSB-first serial bits 10100101 produce decimal 165. Data changes without a rising edge do not shift; active RST clears immediately.

## Review questions

1. Why must CLK return to 0 between two captures?
2. What byte appears after the fourth bit, and why?
3. What does SOUT mean when the final byte is 165?

## Deliverables

- Submit your circuit and the recorded input sequence with replayed results.
- Provide a table of SER, CLK, RST and Q7…Q0 after every rising edge, plus your explanation.

## Independent extension

Choose new data values and addresses before performing the experiment. Predict the observed byte after every operation and explain each difference. A correct screenshot alone is insufficient evidence of understanding.

---

# Регістр зсуву: послідовне завантаження й повтор

Завантажте восьмибітний шаблон через SER і ручні фронти CLK, простежте кожен біт, а потім скиньте та повторіть дослід.

**Орієнтовний час:** 25 хв.

## Початкова схема

Відкрийте лабораторну в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). Кожен біт має окремий контакт і дріт. Повні значення байтів читайте на компонентах пам’яті; осцилограф показує лише біт 0. У метаданих є готова послідовність дій для повторюваного досліду.

Для ручних фронтів зручно призупинити симуляцію. Перехід CLK із 0 в 1 — один додатний фронт; зміна даних при постійному CLK=1 не створює нового фронту. Запишіть власні зміни входів і відтворіть їх від початкового стану схеми.

## Мета

- Відрізніть рівень такту від події додатного фронту.
- Простежте позиції бітів, порядок передавання й асинхронне скидання.

## Порядок роботи

1. **Підготуйте початковий стан.** Задайте CLK=0, увімкніть RST=1 і поверніть RST у 0. Усі лампи Q негайно згаснуть. RST асинхронний: тактовий фронт для скидання не потрібен. Поки залиште SER=0.

2. **Запишіть і втримайте один біт.** Установіть SER=1 і перемкніть CLK із 0 в 1. Засвітиться Q0, збережений байт дорівнює 1. Не змінюючи CLK=1, задайте SER=0: байт залишиться 1. Перед наступним записом поверніть CLK у 0.

3. **Завантажте повний шаблон.** Знову скиньте регістр і по черзі подайте SER: 1,0,1,0,0,1,0,1, роблячи для кожного біта імпульс CLK 0→1→0. Після фронтів байт має значення 1,2,5,10,20,41,82,165. Q7…Q0 — 10100101. SOUT показує поточний Q7, а не окремо збережений витіснений біт.

4. **Запишіть, відтворіть і поясніть.** Почніть новий запис дій, повторіть початкове скидання й вісім імпульсів, зупиніть та відтворіть. Порівняйте послідовність входів і всі вісім вихідних бітів. Окремо перевірте RST=1 при постійному CLK=1 та поясніть, чому байт очищається.

## Очікуваний результат

Вісім послідовних бітів 10100101 від старшого до молодшого дають число 165. Зміна даних без фронту не зсуває регістр; активний RST негайно очищає його.

## Контрольні запитання

1. Чому між двома записами CLK треба повертати у 0?
2. Який байт буде після четвертого біта й чому?
3. Що означає SOUT при кінцевому байті 165?

## Що здати

- Здайте схему та записану послідовність входів із результатами повтору.
- Додайте таблицю SER, CLK, RST і Q7…Q0 після кожного фронту та власне пояснення.

## Самостійне продовження

Оберіть інші дані й адреси перед дослідом. Спрогнозуйте байт після кожної операції та поясніть відмінності. Самого правильного знімка екрана недостатньо для підтвердження розуміння.

# Memory map: two RAM banks selected by A4

Build a 32-byte memory map from two 16-byte RAMs, decode the high address bit and share eight individually connected read lines.

**Estimated time:** 40 minutes. **Level:** intermediate.

## Starting circuit

Open **Memory map: two RAM banks selected by A4** in the Examples catalog, or import [circuit.json](./circuit.json). The circuit uses a separate contact and wire for every bit. Read complete byte values on the memory component; each scope traces only bit 0. The [lesson metadata](./lesson.js) also includes a ready action preset for repeatable practice.

Pause the simulation for individual manual edges. A clock click from 0 to 1 is one rising edge; changing data while CLK stays high does not generate another edge. Use the action recorder to capture your own input changes and replay them from the initial circuit state.

## Objectives

- Split a global memory address into bank selection and local offset.
- Explain high-impedance outputs and mutually exclusive chip selection.

## Procedure

1. **Decode the global address.** The five-bit global address initially equals 3. A3…A0 select local address 3 in both RAMs. A4=0 enables Bank 0 through NOT A4 and disables Bank 1; the selected-bank lamps show exactly one active bank.

2. **Write a byte in each bank.** At global address 3, write 42 with WE=1 and a CLK 0→1→0 pulse, then restore WE=0. Change global address to 19 (10011), data to 165 and repeat. Both writes use local address 3, but different CS inputs permit different RAMs.

3. **Read the shared signal lines.** With WE=0 and OE=1, alternate global addresses 3 and 19. Shared read byte displays 42 and 165. The deselected RAM outputs Z, so only the selected chip drives each shared bit line. Inspect one connection to follow both output branches.

4. **Predict address and output changes.** Visit global addresses 2 and 18: both are still 0. Set OE=0 and confirm that the shared output becomes Z without erasing either bank. Restore OE and explain how A4 differs from the four local address lines; copying the low four bits alone would alias addresses 3 and 19.

## Expected result

Global addresses 0–15 select Bank 0 and 16–31 select Bank 1. Addresses 3 and 19 retain different bytes at the same local offset; the inactive chip releases all eight read lines.

## Review questions

1. Which bank and local offset correspond to global address 19?
2. Why can two RAM outputs share a bit line in this circuit?
3. What would happen if both chip-select inputs were high with different stored bits?

## Deliverables

- Submit your circuit and a recorded write/read sequence spanning both banks.
- Include a 32-address memory map and an explanation of CS and high-impedance behavior.

## Independent extension

Choose new data values and addresses before performing the experiment. Predict the observed byte after every operation and explain each difference. A correct screenshot alone is insufficient evidence of understanding.

---

# Карта пам’яті: вибір двох банків ОЗП бітом A4

Побудуйте карту на 32 байти з двох ОЗП по 16 байтів, дешифруйте старший адресний біт і об’єднайте вісім окремих ліній читання.

**Орієнтовний час:** 40 хв.

## Початкова схема

Відкрийте лабораторну в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). Кожен біт має окремий контакт і дріт. Повні значення байтів читайте на компонентах пам’яті; осцилограф показує лише біт 0. У метаданих є готова послідовність дій для повторюваного досліду.

Для ручних фронтів зручно призупинити симуляцію. Перехід CLK із 0 в 1 — один додатний фронт; зміна даних при постійному CLK=1 не створює нового фронту. Запишіть власні зміни входів і відтворіть їх від початкового стану схеми.

## Мета

- Розділіть глобальну адресу пам’яті на вибір банку й локальне зміщення.
- Поясніть високоімпедансні виходи та взаємовиключний вибір мікросхем.

## Порядок роботи

1. **Дешифруйте глобальну адресу.** П’ятибітна глобальна адреса спочатку дорівнює 3. A3…A0 обирають локальну адресу 3 в обох ОЗП. A4=0 дозволяє Bank 0 через NOT A4 та вимикає Bank 1; лампи вибору показують рівно один активний банк.

2. **Запишіть байт у кожен банк.** За глобальною адресою 3 запишіть 42 при WE=1 імпульсом CLK 0→1→0, потім поверніть WE=0. Змініть глобальну адресу на 19 (10011), дані на 165 та повторіть. Обидва записи мають локальну адресу 3, але різні CS дозволяють різні ОЗП.

3. **Прочитайте спільні сигнальні лінії.** При WE=0 та OE=1 чергуйте глобальні адреси 3 та 19. Shared read byte показує 42 та 165. Невибрана ОЗП має Z на виходах, тому кожен спільний біт веде лише вибрана мікросхема. Перевірте одне з’єднання, простеживши обидві вихідні гілки.

4. **Спрогнозуйте зміни адрес і виходів.** Перейдіть до глобальних адрес 2 та 18: обидві все ще містять 0. Задайте OE=0 та перевірте Z на спільному виході без стирання банків. Поверніть OE й поясніть відмінність A4 від чотирьох локальних ліній; лише молодші чотири біти зробили б адреси 3 і 19 нерозрізненними.

## Очікуваний результат

Глобальні адреси 0–15 обирають Bank 0, а 16–31 — Bank 1. Адреси 3 та 19 зберігають різні байти за однаковим локальним зміщенням; невибрана мікросхема відпускає всі вісім ліній читання.

## Контрольні запитання

1. Який банк і локальне зміщення відповідають глобальній адресі 19?
2. Чому виходи двох ОЗП можуть мати спільну бітову лінію в цій схемі?
3. Що відбудеться при двох активних CS і різних збережених бітах?

## Що здати

- Здайте схему й запис послідовності запису/читання обох банків.
- Додайте карту 32 адрес та пояснення роботи CS і високоімпедансних виходів.

## Самостійне продовження

Оберіть інші дані й адреси перед дослідом. Спрогнозуйте байт після кожної операції та поясніть відмінності. Самого правильного знімка екрана недостатньо для підтвердження розуміння.

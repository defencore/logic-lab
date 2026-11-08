# Register file: independent read and write addresses

Write one register while reading another, then verify both values and the distinct RA and WA signal groups.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **Register file: independent read and write addresses** in the Examples catalog, or import [circuit.json](./circuit.json). The circuit uses a separate contact and wire for every bit. Read complete byte values on the memory component; each scope traces only bit 0. The [lesson metadata](./lesson.js) also includes a ready action preset for repeatable practice.

Pause the simulation for individual manual edges. A clock click from 0 to 1 is one rising edge; changing data while CLK stays high does not generate another edge. Use the action recorder to capture your own input changes and replay them from the initial circuit state.

## Objectives

- Distinguish read address, write address and write data.
- Verify independent register retention and three-bit address aliasing.

## Procedure

1. **Identify two address ports.** Initially RA=2, WA=5 and Write data=85. Both registers are empty, so the output is 0. Trace RA0–RA2 to the read port and WA0–WA2 to the write port: changing one address does not change the other.

2. **Write without changing the read address.** With CLK=0, set WE=1 and pulse CLK 0→1→0, then return WE to 0. Register 5 now contains 85, but RA still selects register 2 and the visible output remains 0. Set RA=5 to read back 85.

3. **Update another register in parallel.** Keep RA=5, change WA=2 and data=170, and perform another enabled write pulse. The visible output stays 85 while register 2 is updated. Then alternate RA=2 and RA=5: expect 170 and 85.

4. **Test disabled writes and address width.** With WE=0, change data and give CLK a complete pulse: no register changes. Set RA=13; only three address bits are wired, so it selects register 5 (13 modulo 8). Explain why the byte source can display 13 while the actual address port carries 5.

## Expected result

Writing register 5 does not change a simultaneous read of register 2. Registers 2 and 5 retain 170 and 85; RA and WA independently use their lowest three bits.

## Review questions

1. Why does the output stay 0 after the first write to register 5?
2. What changes when RA and WA select the same register?
3. Why do address-source values 5 and 13 select the same register?

## Deliverables

- Submit a sequence that writes two registers while observing the other address.
- Include a table of RA, WA, WE, CLK, data and read output with your predictions.

## Independent extension

Choose new data values and addresses before performing the experiment. Predict the observed byte after every operation and explain each difference. A correct screenshot alone is insufficient evidence of understanding.

---

# Регістровий файл: незалежні адреси читання й запису

Записуйте один регістр, одночасно читаючи інший, і перевірте обидва значення та незалежні групи сигналів RA й WA.

**Орієнтовний час:** 35 хв.

## Початкова схема

Відкрийте лабораторну в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). Кожен біт має окремий контакт і дріт. Повні значення байтів читайте на компонентах пам’яті; осцилограф показує лише біт 0. У метаданих є готова послідовність дій для повторюваного досліду.

Для ручних фронтів зручно призупинити симуляцію. Перехід CLK із 0 в 1 — один додатний фронт; зміна даних при постійному CLK=1 не створює нового фронту. Запишіть власні зміни входів і відтворіть їх від початкового стану схеми.

## Мета

- Розрізніть адресу читання, адресу запису та дані запису.
- Перевірте незалежне зберігання регістрів і збіг адрес через трибітну ширину.

## Порядок роботи

1. **Розрізніть два адресні порти.** Спочатку RA=2, WA=5 та Write data=85. Обидва регістри порожні, тому вихід дорівнює 0. Простежте RA0–RA2 до порту читання та WA0–WA2 до порту запису: зміна однієї адреси не змінює іншу.

2. **Запишіть без зміни адреси читання.** При CLK=0 задайте WE=1, зробіть імпульс CLK 0→1→0 і поверніть WE у 0. Регістр 5 містить 85, але RA все ще обирає регістр 2 і видимий вихід залишається 0. Задайте RA=5, щоб прочитати 85.

3. **Оновіть інший регістр паралельно.** Залиште RA=5, задайте WA=2 та data=170 і виконайте ще один дозволений імпульс запису. Видимий вихід залишається 85, поки оновлюється регістр 2. Потім чергуйте RA=2 та RA=5: очікуйте 170 і 85.

4. **Перевірте заборону запису й ширину адреси.** При WE=0 змініть дані та дайте повний імпульс CLK: регістри не зміняться. Задайте RA=13; підключені лише три адресні біти, тому вибирається регістр 5 (13 за модулем 8). Поясніть, чому джерело показує 13, а адресний порт несе 5.

## Очікуваний результат

Запис до регістра 5 не змінює одночасне читання регістра 2. Регістри 2 та 5 зберігають 170 і 85; RA та WA незалежно використовують три молодші біти.

## Контрольні запитання

1. Чому після першого запису до регістра 5 вихід залишається 0?
2. Що змінюється, коли RA та WA обирають один регістр?
3. Чому значення джерела адреси 5 та 13 обирають той самий регістр?

## Що здати

- Здайте послідовність запису двох регістрів зі спостереженням іншої адреси.
- Додайте таблицю RA, WA, WE, CLK, даних і виходу читання з власними прогнозами.

## Самостійне продовження

Оберіть інші дані й адреси перед дослідом. Спрогнозуйте байт після кожної операції та поясніть відмінності. Самого правильного знімка екрана недостатньо для підтвердження розуміння.

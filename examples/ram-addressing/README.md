# RAM: address isolation and write protection

Write different bytes to two addresses, distinguish address selection from storage, and test CS, OE and WE independently.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **RAM: address isolation and write protection** in the Examples catalog, or import [circuit.json](./circuit.json). The circuit uses a separate contact and wire for every bit. Read complete byte values on the memory component; each scope traces only bit 0. The [lesson metadata](./lesson.js) also includes a ready action preset for repeatable practice.

Pause the simulation for individual manual edges. A clock click from 0 to 1 is one rising edge; changing data while CLK stays high does not generate another edge. Use the action recorder to capture your own input changes and replay them from the initial circuit state.

## Objectives

- Decode four address bits as a location from 0 through 15.
- Separate storage, write permission and output-enable behavior.

## Procedure

1. **Read an unwritten location.** The initial address is 2 and the input data is 42. CS=1 and OE=1 allow reading, WE=0 disables writes, and the RAM byte is 0. Changing data alone must not change the stored byte.

2. **Write address 2.** With CLK=0, set WE=1 and pulse CLK to 1, then back to 0. While WE=1 the read output is Z. Return WE to 0: address 2 now reads 42. A falling edge by itself does not write.

3. **Keep two independent bytes.** Set Address=9 and Write data=165, then repeat the permitted write pulse. With WE=0, alternate addresses 2 and 9: expect 42 and 165. Address 3 remains 0. Record address bits A3…A0 beside each observed byte.

4. **Test each control separately.** With CS=0, attempt a write of 255 to address 2, then restore CS=1 and WE=0: it still contains 42. With OE=0 the output is Z but storage is retained; OE does not prohibit an otherwise valid write. Restore OE=1 and explain the distinction.

## Expected result

Addresses 2 and 9 retain 42 and 165 independently. CS gates access, WE and a rising CLK permit writing, and OE controls output visibility only.

## Review questions

1. Which three conditions permit a RAM write?
2. Can OE=0 protect memory from being overwritten?
3. Why do addresses 2 and 9 preserve different values?

## Deliverables

- Submit a recorded write/read experiment and your editable circuit.
- Include an address/data table and separate evidence for CS, OE and WE tests.

## Independent extension

Choose new data values and addresses before performing the experiment. Predict the observed byte after every operation and explain each difference. A correct screenshot alone is insufficient evidence of understanding.

---

# ОЗП: незалежні адреси й захист запису

Запишіть різні байти за двома адресами, відрізніть вибір адреси від зберігання та незалежно перевірте CS, OE і WE.

**Орієнтовний час:** 35 хв.

## Початкова схема

Відкрийте лабораторну в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). Кожен біт має окремий контакт і дріт. Повні значення байтів читайте на компонентах пам’яті; осцилограф показує лише біт 0. У метаданих є готова послідовність дій для повторюваного досліду.

Для ручних фронтів зручно призупинити симуляцію. Перехід CLK із 0 в 1 — один додатний фронт; зміна даних при постійному CLK=1 не створює нового фронту. Запишіть власні зміни входів і відтворіть їх від початкового стану схеми.

## Мета

- Зіставте чотири адресні біти з коміркою від 0 до 15.
- Розділіть зберігання, дозвіл запису та керування виходом.

## Порядок роботи

1. **Прочитайте незаписану комірку.** Початкова адреса — 2, вхідні дані — 42. CS=1 та OE=1 дозволяють читання, WE=0 забороняє запис, байт ОЗП дорівнює 0. Сама зміна даних не має змінювати збережений байт.

2. **Запишіть адресу 2.** При CLK=0 задайте WE=1 і перемкніть CLK у 1, а потім назад у 0. При WE=1 вихід читання має Z. Поверніть WE у 0: адреса 2 тепер містить 42. Сам спадний фронт не записує.

3. **Збережіть два незалежні байти.** Задайте Address=9 та Write data=165 і повторіть дозволений імпульс запису. При WE=0 чергуйте адреси 2 і 9: очікуйте 42 та 165. Адреса 3 залишиться 0. Поруч зі спостереженим байтом записуйте біти адреси A3…A0.

4. **Окремо перевірте керувальні входи.** При CS=0 спробуйте записати 255 за адресою 2, потім поверніть CS=1 та WE=0: там залишиться 42. При OE=0 вихід має Z, але дані зберігаються; OE не забороняє інакше дозволений запис. Поверніть OE=1 і поясніть різницю.

## Очікуваний результат

Адреси 2 та 9 незалежно зберігають 42 і 165. CS дозволяє доступ, WE разом із фронтом CLK — запис, а OE керує лише видимістю виходу.

## Контрольні запитання

1. Які три умови дозволяють запис до ОЗП?
2. Чи захищає OE=0 пам’ять від перезапису?
3. Чому адреси 2 і 9 зберігають різні значення?

## Що здати

- Здайте запис досліду запису/читання та власну редаговану схему.
- Додайте таблицю адрес/даних і окремі результати перевірок CS, OE та WE.

## Самостійне продовження

Оберіть інші дані й адреси перед дослідом. Спрогнозуйте байт після кожної операції та поясніть відмінності. Самого правильного знімка екрана недостатньо для підтвердження розуміння.

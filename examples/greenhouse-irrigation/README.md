# Greenhouse: irrigation with memory

Use an SR latch to water from the dry sensor to the wet sensor, keeping a remembered request between thresholds.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **Greenhouse: irrigation with memory** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Use an SR latch to water from the dry sensor to the wet sensor, keeping a remembered request between thresholds.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Wait for the dry threshold.** Leave Unsafe pump always on=0. Moisture slowly falls until Dry=1 below 35%. Dry sets the SR latch and starts irrigation. Observe that the pump remains on even after Dry returns to 0, because the latch remembers the cycle.

2. **Measure the middle-band memory.** Wet=1 above 75% resets the latch. Compare the same middle-band moisture once while filling and once while drying; Dry=Wet=0 in both cases, but Pump differs. Reset process also clears the latch, while the NOT reset guard prevents S=R=1.

3. **Bypass the upper stop.** Turn Unsafe pump always on=1. It bypasses the wet stop; moisture can exceed the safe level and cause flooding and plant damage. Turn the override off before pulsing Reset process, then verify the original dry-to-wet cycle starts correctly.

## Expected result

The pump has memory between 35% and 75%, so it performs useful fill cycles instead of switching at one threshold. Forced pumping creates a measured flood and a visible health consequence.

## Review questions

1. Why does a direct Dry-to-Pump wire differ from an SR controller?
2. Why must reset inhibit the S request as well as set R?
3. At the same moisture value, what information can only the latch provide?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Теплиця: полив із пам’яттю

Через SR-защіпку поливайте від нижнього до верхнього датчика й зберігайте запит між порогами.

**Орієнтовний час:** 35 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Через SR-защіпку поливайте від нижнього до верхнього датчика й зберігайте запит між порогами.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Дочекайтеся нижнього порогу.** Лишіть Unsafe pump always on=0. Moisture спадає, поки нижче 35% не з’явиться Dry=1. Dry встановлює SR й починає полив. Насос лишається ввімкненим після Dry=0, бо пам’ять зберігає цикл.

2. **Виміряйте пам’ять посередині.** Wet=1 вище 75% скидає пам’ять. Порівняйте ту саму середню вологість під час поливу та висихання: в обох Dry=Wet=0, але Pump різний. Reset process також скидає SR, а NOT reset не допускає S=R=1.

3. **Обійдіть верхню зупинку.** Увімкніть Unsafe pump always on=1. Обхід ігнорує Wet: волога виходить за безпечну смугу, починається затоплення та шкода рослинам. Спершу вимкніть обхід, потім подайте Reset process і перевірте відновлення циклу Dry→Wet.

## Очікуваний результат

Насос має пам’ять між 35% та 75%, тому виконує цикли наповнення замість перемикань біля одного порогу. Примусовий полив створює вимірюване затоплення й видимі наслідки для здоров’я.

## Контрольні запитання

1. Чим прямий дріт Dry→Pump відрізняється від SR-керування?
2. Чому скидання має блокувати S та подавати R одночасно?
3. Яку інформацію при однаковій волозі дає лише пам’ять?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

# Smart home: comfort and energy

Combine temperature demand with a user permission and compare scheduled indoor lighting with motion-qualified outdoor lighting.

**Estimated time:** 30 minutes. **Level:** beginner.

## Starting circuit

Open **Smart home: comfort and energy** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Combine temperature demand with a user permission and compare scheduled indoor lighting with motion-qualified outdoor lighting.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Separate request and permission.** Keep Climate enabled=1 and Manual all lights=0. Cold below 19°C starts heat, while Hot above 25°C starts the fan. Set Climate enabled=0: a sensor may still request action, but AND prevents both climate actuators. Temperature then drifts toward ambientTemperature.

2. **Compare two lighting policies.** The home clock produces day/night and two motion windows each 60-second day. Indoor Light follows Dark; Outdoor Light requires Dark AND Motion. Record all four input combinations for the outdoor AND gate and compare visible windows and path lights.

3. **Measure the cost of an override.** Run one full day and record Energy. Reset process, set Manual all lights=1 and run the same duration. Compare Energy at equal simulated times, not equal camera views. Restore manual lights=0 and Climate enabled=1 after the experiment.

## Expected result

Temperature requests require permission. Outdoor lights operate only during dark motion, and a full-day indoor-light override consumes more modeled energy than the normal night schedule.

## Review questions

1. Why is an enabled climate system sometimes idle?
2. What distinguishes indoor OR logic from outdoor AND logic?
3. Why must energy trials start from reset and use equal durations?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Розумний будинок: комфорт та енергія

Поєднайте температурний запит із дозволом користувача та порівняйте нічне освітлення кімнат і світло подвір’я за рухом.

**Орієнтовний час:** 30 хвилин. **Рівень:** початковий.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Поєднайте температурний запит із дозволом користувача та порівняйте нічне освітлення кімнат і світло подвір’я за рухом.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Відокремте запит від дозволу.** Лишіть Climate enabled=1 і Manual all lights=0. Cold нижче 19°C запускає нагрів, Hot вище 25°C — вентилятор. Climate enabled=0 через І блокує механізми навіть за активного датчика. Температура наближається до ambientTemperature.

2. **Порівняйте дві політики освітлення.** Годинник будинку створює день/ніч і два вікна руху за 60-секундну добу. Світло кімнат повторює Dark, подвір’я вимагає Dark І Motion. Запишіть чотири комбінації входів І та порівняйте вікна й ліхтарі.

3. **Виміряйте ціну обходу.** Проженіть добу та запишіть Energy. Подайте Reset process, увімкніть Manual all lights=1 і повторіть таку саму тривалість. Порівнюйте Energy при однаковому модельному часі, а не ракурсі. Після досліду поверніть manual lights=0 та Climate enabled=1.

## Очікуваний результат

Температурні запити вимагають дозволу. Ліхтарі працюють лише за нічного руху, а постійне освітлення кімнат за повну добу витрачає більше модельної енергії, ніж звичайний нічний розклад.

## Контрольні запитання

1. Чому дозволене кліматичне керування іноді неактивне?
2. Чим відрізняються АБО для кімнат та І для подвір’я?
3. Чому енергодосліди потребують скидання й однакових тривалостей?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

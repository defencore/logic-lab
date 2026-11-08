# Aquarium: timed portions

Combine a clock, one-shot and hunger interlock so timed feeding cannot become continuous overfeeding.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Aquarium: timed portions** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Combine a clock, one-shot and hunger interlock so timed feeding cannot become continuous overfeeding.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Follow one portion.** Leave Unsafe continuous feeding=0. The 0.25 Hz clock triggers a one-second pulse every four seconds. Only Hungry AND portion pulse reaches Feed, so a scheduled pulse is denied when fish have enough food. Observe Food and the falling edges of the actual Feed command.

2. **Change timing while preserving the guard.** Change the meal clock to 0.125 Hz, then restore 0.25 Hz. The spacing doubles, while the one-shot still limits each requested portion to one second and Hungry can end it earlier. Compare the minimum food level and explain the required average supply.

3. **Observe overfeeding and reset.** Turn Unsafe continuous feeding=1. This OR bypasses hunger and pulse duration, so Food rises above its safe band and prolonged overfeeding harms fish. Turn the override off, restore the original clock and pulse Reset process before comparing another design.

## Expected result

Food is replenished in short, hunger-qualified portions. The original one-second/four-second schedule supplies enough food in this accelerated model; the unsafe override produces sustained excess instead of another timed portion.

## Review questions

1. Why is a clock alone insufficient protection against overfeeding?
2. Why can a one-second pulse produce less than one second of actual feeding?
3. What happens if the average pulse supply becomes lower than consumption?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Акваріум: порційне годування

Поєднайте генератор, одновібратор і захист за голодом, щоб порційне годування не перетворилося на безперервне.

**Орієнтовний час:** 30 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Поєднайте генератор, одновібратор і захист за голодом, щоб порційне годування не перетворилося на безперервне.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Прослідкуйте порцію.** Лишіть Unsafe continuous feeding=0. Такт 0.25 Гц запускає секундний імпульс кожні чотири секунди. Лише Hungry І portion pulse надходить на Feed, тому розклад не годує ситих рибок. Спостерігайте Food і спадання реальної команди Feed.

2. **Змініть розклад зі збереженням захисту.** Задайте такт 0.125 Гц, потім поверніть 0.25 Гц. Інтервал подвоюється, одновібратор і далі обмежує порцію секундою, а Hungry може завершити її раніше. Порівняйте мінімум Food і поясніть потрібне середнє подавання.

3. **Спостерігайте переїдання та скидання.** Увімкніть Unsafe continuous feeding=1. АБО обходить голод та тривалість імпульсу, тому Food виходить за безпечну смугу, а тривале переїдання шкодить рибкам. Вимкніть обхід, поверніть такт і подайте Reset process перед іншим дослідом.

## Очікуваний результат

Їжа додається короткими порціями лише за голодом. Початковий розклад секунда на чотири секунди дає достатньо їжі в прискореній моделі; небезпечний обхід створює тривалий надлишок замість нової порції.

## Контрольні запитання

1. Чому одного генератора недостатньо для захисту від переїдання?
2. Чому секундний імпульс може дати менше секунди справжнього годування?
3. Що буде, якщо середнє подавання стане меншим за споживання?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

# Aquarium: life-support interlocks

Keep fish alive with temperature, oxygen and water-quality feedback; compare a denied actuator with a stuck relay.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **Aquarium: life-support interlocks** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Keep fish alive with temperature, oxygen and water-quality feedback; compare a denied actuator with a stuck relay.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Observe independent feedback loops.** Leave Air pump permitted=1 and Unsafe stuck heater=0. Open the aquarium in 3D and observe Temperature, Oxygen, Cleanliness, Health and Alive across a full 60-second day. Cold starts heating, Hot starts cooling, Low oxygen requests air and Dirty requests filtration.

2. **Deny the oxygen request.** Set Air pump permitted=0. The AND gate prevents the pump even when Low oxygen=1. Watch oxygen fall first, then health. Restore permission before all fish die; surviving fish can recover, but dead fish stay belly-up with X eyes until Reset process.

3. **Compare a stuck heater and recover.** Pulse Reset process after restoring air. Turn Unsafe stuck heater=1: it forces heat and denies automatic cooling. Temperature must rise before health deteriorates. Turn the fault off, then pulse Reset process; confirm Alive returns to fishCount and Health to its initial value.

## Expected result

With feedback and permission enabled, all four fish survive repeated days. Denied air or forced heat changes a measured condition before harming fish; removing a fault cannot revive an already dead fish without reset.

## Review questions

1. Why can Low oxygen be high while the air pump is off?
2. How does a stuck relay differ from an incorrect sensor threshold?
3. Which measurements predict harm before Alive decreases?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Акваріум: життєзабезпечення

Підтримуйте життя рибок за температурою, киснем і чистотою; порівняйте відсутність дозволу та залипле реле.

**Орієнтовний час:** 35 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Підтримуйте життя рибок за температурою, киснем і чистотою; порівняйте відсутність дозволу та залипле реле.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Спостерігайте незалежні контури.** Лишіть Air pump permitted=1 і Unsafe stuck heater=0. У 3D спостерігайте Temperature, Oxygen, Cleanliness, Health та Alive протягом 60-секундної доби. Cold вмикає нагрів, Hot — охолодження, Low oxygen — повітря, Dirty — фільтр.

2. **Заблокуйте запит кисню.** Встановіть Air pump permitted=0. І блокує помпу навіть при Low oxygen=1. Спершу падає кисень, далі здоров’я. Поверніть дозвіл до загибелі всіх рибок; живі відновлюються, мертві лишаються догори черевом з X до Reset process.

3. **Порівняйте залиплий нагрівач і відновіть.** Після дозволу повітря подайте імпульс Reset process. Unsafe stuck heater=1 примусово гріє й вимикає автоматичне охолодження. До падіння здоров’я має зрости температура. Приберіть несправність, подайте Reset process і перевірте Alive=fishCount та початкове Health.

## Очікуваний результат

За правильного керування й дозволів усі чотири рибки переживають багато діб. Відсутність повітря чи примусовий нагрів спершу змінюють вимірювану умову; усунення несправності не оживляє загиблих без скидання.

## Контрольні запитання

1. Чому Low oxygen може бути 1 при вимкненій помпі?
2. Чим залипле реле відрізняється від неправильного порогу датчика?
3. Які вимірювання попереджають про шкоду до зменшення Alive?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

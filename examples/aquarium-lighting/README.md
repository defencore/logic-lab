# Aquarium: day/night lighting

Build and invert a daily light schedule with XOR, then test why a permanent override removes the resting interval.

**Estimated time:** 30 minutes. **Level:** beginner.

## Starting circuit

Open **Aquarium: day/night lighting** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Build and invert a daily light schedule with XOR, then test why a permanent override removes the resting interval.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Compare the four XOR states.** With Unsafe light always on=0, observe Day and the Light command. Invert light schedule=0 copies Day; setting it to 1 reverses Day. Across both halves of the 60-second day, record all four Day/Invert input pairs and the resulting light.

2. **Preserve other life-support loops.** Change only the lighting switches. Heating, cooling, air, food and filtration retain their sensor feedback. Compare a schedule change with a global pause: pause freezes fish, sensors and the day phase together, while XOR changes only the lamp command.

3. **Remove the resting interval.** Turn Unsafe light always on=1 and let the simulation run beyond 1.5 complete dayLength cycles of continuous light (90 seconds at the starting dayLength=60). Health then declines rather than fish dying instantly. Restore the override to 0 and observe survivors recover; pulse Reset process to start a fresh population.

## Expected result

XOR selects the normal or inverted day schedule without changing other actuators. Both alternating schedules provide a dark interval; forced continuous light eventually creates visible stress and can kill fish if left unchecked.

## Review questions

1. Which XOR input makes the schedule act like a wire, and which like NOT?
2. Why does forced light override both schedule choices?
3. Why should death remain recorded after a faulty command is corrected?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Акваріум: день і ніч

Побудуйте та інвертуйте добовий розклад через XOR і перевірте, чому постійний обхід забирає період відпочинку.

**Орієнтовний час:** 30 хвилин. **Рівень:** початковий.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Побудуйте та інвертуйте добовий розклад через XOR і перевірте, чому постійний обхід забирає період відпочинку.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Порівняйте чотири стани XOR.** При Unsafe light always on=0 спостерігайте Day та команду Light. Invert light schedule=0 повторює Day; значення 1 інвертує Day. За обидві половини 60-секундної доби запишіть чотири пари Day/Invert та світло.

2. **Збережіть інші контури життя.** Змінюйте лише перемикачі освітлення. Нагрів, охолодження, повітря, їжа та фільтрація зберігають свої датчики. Порівняйте зміну розкладу з паузою: пауза зупиняє рибок, датчики й добу разом, а XOR змінює тільки лампу.

3. **Приберіть відпочинок.** Увімкніть Unsafe light always on=1 довше ніж на 1,5 повного циклу dayLength безперервного світла (90 секунд при початковому dayLength=60). Далі Health зменшується, рибки не гинуть миттєво. Поверніть обхід у 0 для відновлення живих; Reset process починає нову популяцію.

## Очікуваний результат

XOR обирає звичайний чи інвертований розклад без зміни інших механізмів. Обидва черговані розклади дають темний інтервал; постійне світло згодом спричиняє видимий стрес і може вбити рибок.

## Контрольні запитання

1. Який вхід XOR перетворює розклад на дріт, а який — на НЕ?
2. Чому примусове світло обходить обидва розклади?
3. Чому смерть лишається зафіксованою після виправлення команди?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

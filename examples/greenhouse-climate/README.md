# Greenhouse: climate and growth

Maintain a plant-growing climate with mutually exclusive temperature requests and inspect delayed damage after a heater fault.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **Greenhouse: climate and growth** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Maintain a plant-growing climate with mutually exclusive temperature requests and inspect delayed damage after a heater fault.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Observe a full greenhouse day.** Open the greenhouse in 3D. Cold below 18°C requests heating; Hot above 28°C requests ventilation. Dry requests irrigation, while Dark turns on grow lights. Watch Temperature, Moisture, Growth and Health for a complete day instead of judging the plants from one frame.

2. **Explain the interlocks.** Keep Unsafe heater stuck on=0 and inspect Cold AND not hot. Write the conditions under which heat and ventilation can run. Follow the output wires back to the same greenhouse sensors and explain why a manual source alone cannot know the current temperature.

3. **Inspect gradual overheating.** Turn Unsafe heater stuck on=1. Heat remains commanded and ventilation is denied, so temperature rises before Health falls and plants wilt. Restore the switch to 0; surviving plants can recover. Pulse Reset process to compare another fault from the original temperature and moisture.

## Expected result

Feedback keeps temperature and moisture in useful bands while plants grow. A failed heat command changes temperature and then plant health; a correct heater request cannot be inferred from elapsed time alone.

## Review questions

1. Why are Cold and Hot allowed to be zero together?
2. How does daylight affect temperature and artificial lighting?
3. Which trace distinguishes an actuator fault from an insufficient light schedule?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Теплиця: клімат і ріст

Підтримуйте клімат росту взаємно узгодженими температурними запитами та дослідіть відкладену шкоду несправного нагрівача.

**Орієнтовний час:** 35 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Підтримуйте клімат росту взаємно узгодженими температурними запитами та дослідіть відкладену шкоду несправного нагрівача.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Спостерігайте повну добу.** Відкрийте теплицю в 3D. Cold нижче 18°C просить нагрів, Hot вище 28°C — вентиляцію. Dry просить полив, Dark вмикає лампи. Стежте за Temperature, Moisture, Growth та Health повну добу замість оцінки за одним кадром.

2. **Поясніть взаємні блокування.** Лишіть Unsafe heater stuck on=0 і перевірте Cold І not hot. Запишіть умови нагріву й вентиляції. Простежте дроти до датчиків тієї самої теплиці та поясніть, чому ручне джерело не знає поточної температури.

3. **Дослідіть поступовий перегрів.** Увімкніть Unsafe heater stuck on=1. Нагрів триває, вентиляція заблокована, тому спочатку росте температура, потім падає Health і рослини в’януть. Вимкніть несправність; живі рослини відновлюються. Reset process повертає початкові температуру й вологість для наступного досліду.

## Очікуваний результат

Зворотний зв’язок утримує корисні смуги температури й вологи, поки рослини ростуть. Залиплий нагрів спершу змінює температуру, далі здоров’я; правильну команду не можна визначити лише за часом.

## Контрольні запитання

1. Чому Cold і Hot можуть одночасно бути нулями?
2. Як день впливає на температуру та штучне світло?
3. Який графік відрізнить несправність механізму від недостатнього освітлення?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

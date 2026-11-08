# Smart yard: access, rain and water

Qualify gate access with authorization and protect irrigation against rain and an empty supply tank.

**Estimated time:** 40 minutes. **Level:** intermediate.

## Starting circuit

Open **Smart yard: access, rain and water** in Examples → Automation, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Qualify gate access with authorization and protect irrigation against rain and an empty supply tank.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Admit an authorized visitor.** Keep Visitor authorized=1. At the periodic Motion request, the AND gate opens the sliding gate over time; Gate open confirms the completed travel. Outdoor lights need Dark AND Motion. Authorization is a circuit switch, while Motion and Rain come from the simulated environment.

2. **Reject unauthorized motion.** Set Visitor authorized=0 before the next motion window. Gate is denied and NOT Authorized arms the alarm. Motion now raises Alarm while the gate is closed. Restore authorization and distinguish a current security alarm from a latched empty-tank fault.

3. **Protect water and test a bypass.** Irrigation requires permission AND NOT Rain AND NOT Tank low. Rain refills the supply tank while stopping guarded irrigation. To test a dry pump quickly, pause, set initialWater=0 in the home inspector, then resume and set Unsafe dry-pump bypass=1. The safe path stays off; the bypass latches a dry-pump alarm. Remove it, restore initialWater=70 and reset.

## Expected result

Authorized motion opens a real gate; unauthorized motion keeps it closed and triggers security. Guarded irrigation stops during rain or low water; a deliberate bypass can still run an empty pump and record a fault.

## Review questions

1. Why is Gate open feedback different from a Gate command?
2. Which input combinations deny irrigation even when permission=1?
3. Why should a manual pump bypass be placed before protection in a safer redesign?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Розумне подвір’я: доступ, дощ і вода

Дозволяйте ворота лише авторизованому відвідувачу й захищайте полив від дощу та порожнього бака.

**Орієнтовний час:** 40 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Дозволяйте ворота лише авторизованому відвідувачу й захищайте полив від дощу та порожнього бака.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Пропустіть дозволеного відвідувача.** Лишіть Visitor authorized=1. Періодичний Motion через І поступово відкриває ворота; Gate open підтверджує завершений хід. Ліхтарі потребують Dark І Motion. Дозвіл — перемикач схеми, Motion та Rain — модельне довкілля.

2. **Відхиліть недозволений рух.** Встановіть Visitor authorized=0 перед наступним вікном руху. Ворота заблоковано, NOT Authorized вмикає охорону. Motion піднімає Alarm при закритих воротах. Поверніть дозвіл та відрізніть поточну охоронну тривогу від запам’ятаної несправності порожнього бака.

3. **Захистіть воду та перевірте обхід.** Полив вимагає дозволу І NOT Rain І NOT Tank low. Дощ поповнює бак і блокує захищений полив. Для швидкого досліду паузою задайте initialWater=0 в інспекторі будинку, продовжте та ввімкніть Unsafe dry-pump bypass=1. Безпечний шлях вимкнений, обхід запам’ятовує тривогу сухого насоса. Приберіть обхід, поверніть initialWater=70 та скиньте.

## Очікуваний результат

Дозволений рух відкриває справжні ворота; недозволений лишає їх закритими та викликає охорону. Захищений полив зупиняється за дощу чи браку води; навмисний обхід може запустити сухий насос і зафіксувати несправність.

## Контрольні запитання

1. Чому підтвердження Gate open відрізняється від команди Gate?
2. Які входи блокують полив навіть при дозволі 1?
3. Чому безпечніше поставити ручний обхід перед захистом насоса?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

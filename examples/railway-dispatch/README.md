# Railway: switch and dispatch

Set two independent turnouts, close road access and dispatch one train at a time through a visibly selected route.

**Estimated time:** 40 minutes. **Level:** intermediate.

## Starting circuit

Open **Railway: switch and dispatch** in Examples → 3D scenes, or import [circuit.json](./circuit.json). The [bilingual lesson](./lesson.js) follows the same circuit. Open the scene in **3D**; its controls edit the source components on the canvas. Keep both application Run and Scene run active during timed trials.

This accelerated educational model demonstrates logic and feedback; its time, rates and thresholds are teaching parameters.

## Objectives

- Set two independent turnouts, close road access and dispatch one train at a time through a visibly selected route.
- Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.

## Procedure

1. **Set the route before permission.** Initially both requests and Close road gates are 0. Near turnout=0 connects siding A; Near=1 selects the near main line. Far turnout=0 selects the far main line; Far=1 connects siding B. Change these switches while trains wait, compare Points state and Exit points state, and watch the physical blades and selected routes.

2. **Dispatch A to the main exit.** Set Near=0 and Far=0, then Close road gates=1. Wait for Gate closed=1 and Clear=1 before Request train A=1. The logic also requires no B request and no occupied reservation. Once admitted, return Request A=0 and keep both turnouts fixed until the whole train clears. OCC keeps the road gates closed throughout the reservation.

3. **Dispatch B and restore road access.** After OCC returns to 0, set Near=1 and Far=1, then request only B. B enters its siding turnout and exits along the near main line. Wait until the full train clears, remove its request and set Close road gates=0 so cars move again. Requesting A and B together grants neither signal.

4. **Inspect an unsafe route separately.** Export the safe circuit first. With no train on a blade, Near=0 and Far=1 links the two sidings instead of the main exits. A train already waiting in the receiving siding can make that route unsafe. Changing an occupied turnout can instead cause derailment without vehicle contact. Keep these causes distinct, then restore the switches and reset before another trial.

## Expected result

The two point switches select actual connected trajectories. Main-exit dispatch passes A and B safely in turn; conflicting requests stay red, and occupied-route feedback holds gates until the train tail clears.

## Review questions

1. Which turnout is the entry switch for each train?
2. Why is a route to an occupied receiving siding unsafe despite a clear shared block?
3. Why must contact collision and moving-points derailment have different explanations?

## Deliverables

- An exported .logic.json project containing your tested circuit.
- A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.

## Extension

Change one control condition, predict the effect, and record the new sensor and actuator traces. Preserve a safe exported version before experimenting. Restore fault switches and pulse Reset process before the next trial.

---

# Залізниця: стрілки та диспетчер

Оберіть дві незалежні стрілки, закрийте дорогу й пропускайте поїзди по одному видимо обраним маршрутом.

**Орієнтовний час:** 40 хвилин. **Рівень:** середній.

## Початкова схема

Відкрийте цю лабораторну в каталозі **Приклади** або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить той самий двомовний розбір. Відкрийте відповідну сцену в **3D**: перемикачі змінюють джерела тієї самої схеми. Для часових дослідів активуйте запуск застосунку та Scene run.

Час, швидкості та пороги прискореної навчальної моделі призначені для вивчення логіки й зворотного зв’язку.

## Мета

- Оберіть дві незалежні стрілки, закрийте дорогу й пропускайте поїзди по одному видимо обраним маршрутом.
- Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.

## Порядок виконання

1. **Задайте маршрут до дозволу.** Спочатку обидва запити й Close road gates мають 0. Near turnout=0 підключає бічну A, Near=1 — ближню головну. Far turnout=0 обирає дальню головну, Far=1 — бічну B. Перемикайте під час очікування, порівнюйте Points state та Exit points state, дивіться на вістря й обрані шляхи.

2. **Пропустіть A на головний вихід.** Задайте Near=0 та Far=0, потім Close road gates=1. Дочекайтеся Gate closed=1 та Clear=1 і подайте Request train A=1. Логіка також вимагає відсутності B та зайнятого резервування. Після дозволу поверніть Request A=0 й утримуйте обидві стрілки до виходу всього поїзда. OCC тримає шлагбауми закритими під час резервування.

3. **Пропустіть B та відновіть дорогу.** Після OCC=0 задайте Near=1 та Far=1, потім запитайте лише B. B заходить через свою бічну стрілку та виходить ближньою головною. Дочекайтеся всього хвоста, приберіть запит і задайте Close road gates=0 для машин. Одночасні запити A та B не дають жодного зеленого.

4. **Окремо дослідіть небезпечний маршрут.** Спершу експортуйте безпечну схему. Коли вістря вільні, Near=0 та Far=1 з’єднують дві бічні колії замість головних виходів. Поїзд, що вже чекає на приймальній бічній, робить такий шлях небезпечним. Перемикання зайнятої стрілки спричиняє окреме сходження без контакту машин. Розрізняйте ці причини, поверніть стрілки та скиньте перед новим дослідом.

## Очікуваний результат

Два перемикачі обирають справжні з’єднані траєкторії. Диспетчеризація на головні виходи безпечно пропускає A та B по черзі; суперечливі запити лишаються червоними, а резервування тримає шлагбауми до виходу хвоста.

## Контрольні запитання

1. Яка стрілка є вхідною для кожного поїзда?
2. Чому маршрут на зайняту приймальну бічну небезпечний навіть при вільній спільній ділянці?
3. Чому контактне зіткнення та сходження через рух стрілки потребують різних пояснень?

## Що подати

- Експортований проєкт .logic.json із перевіреною схемою.
- Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.

## Додаткове завдання

Змініть одну умову керування, передбачте наслідок і запишіть нові сигнали датчиків та механізмів. Збережіть безпечний варіант перед експериментами. Приберіть несправності та подайте Reset process перед наступним дослідом.

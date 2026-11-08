# Buzzer: build a clock divider

**Time:** 25 minutes. **Level:** intermediate. Construct an audible note from an 880 Hz clock and a T flip-flop.

## Starting circuit

Open **Buzzer: build a clock divider** in **Learning examples**, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains bilingual instructions and a seven-action preset. The clock is 880 Hz with duty 0.5; the T input is 1, RST is 0, and initial Q is 0. Q drives a passive buzzer at `volume=0.15`; two scopes separately show CLK and Q.

Use simulation speed **1×**, run the simulation and press **Enable sound**. Audio permission starts disabled after each reload. At other speeds, passive pitch follows the changed real-time edge timing; waveform labels still use simulated time.

## Objectives

- Derive a divided frequency by counting real clock edges.
- Measure source and output periods with correct units.
- Distinguish a stored bit, asynchronous reset and a repeating note.

## Procedure

1. Before running, predict Q after each of eight rising CLK edges with T=1. A full Q cycle needs two rising CLK edges.
2. Run and listen at 1×. Q supplies **880/2=440 Hz**, an A4 note, rather than 880 Hz. Choose a **10 ms** waveform window to compare both scopes.
3. Measure full periods. The source has `T=1/880 s=1.136364 ms=1136.364 µs`; Q has `T=1/440 s=2.272727 ms=2272.727 µs`. Verify `f=1/(T1+T0)` using seconds.
4. Set T=0 while the clock runs. Q holds its current 0 or 1; the sustained passive note stops in both cases. A high stored bit is not an oscillator.
5. With T=0, set RST=1. Q clears to 0 without waiting for a clock edge. Return RST=0 and T=1 to restore division. A simulation reset restores the configured initial state.
6. Load **Example action sequence** in **Assignments & submission → Action sequence**. It holds Q, resets, resumes, changes the source to 660 Hz and back to 880 Hz, then holds Q. Predict **330 Hz** and **440 Hz** divided notes. Stop restores your editable circuit.
7. Record another experiment using a different source frequency within the **0–1000 Hz** supported recording range. Include hold and reset, predict the divided note, then verify it from both edge counts and periods.

## Expected result

| Condition              | Q behavior                  | Sustained passive note at 1× |
| ---------------------- | --------------------------- | ---------------------------- |
| T=1, RST=0, CLK=880 Hz | Toggles on each rising edge | 440 Hz                       |
| T=1, RST=0, CLK=660 Hz | Toggles on each rising edge | 330 Hz                       |
| T=0, RST=0             | Holds previous 0 or 1       | Silent                       |
| RST=1                  | Clears to 0 asynchronously  | Silent                       |

One rising edge causes one inversion, not a full cycle. Divide-by-two is therefore a consequence of clocked state. Changing source duty changes the edge location but, while valid repeating rising edges continue, Q still needs two source periods per full cycle. Constant input levels create no repeating note, although transitions can click. Browser mute, volume 0 and simulation pause also stop sound; inspect signals to distinguish these cases.

The simulator does not model gate propagation delays. Do not replace this design with an ideal inverter feedback loop and infer a physical frequency from its settling behavior. Use an explicit clock and memory so timing is defined and replayable. Recorded probes capture bits at action checkpoints; use the waveform monitor to measure periods.

## Review questions

1. Why does one Q cycle require two rising source edges?
2. Why can Q=1 be silent on a passive buzzer while an active buzzer would sound?
3. Which source frequency produces a 330 Hz output?
4. How does reset differ from setting T=0?

## Deliverables

- Your circuit and a recorded hold/reset/frequency experiment with observations.
- Edge-count predictions and measured source/Q periods in seconds, milliseconds and microseconds, with derived frequencies.

## Extension

Add a second T flip-flop with T=1 and RST driven by the same reset. Drive its CLK from the first Q and predict a total division by four: an 880 Hz source produces a 220 Hz final output. Route the buzzer to the second Q, measure the full period and explain why two stages divide by four rather than by three.

## Українська лабораторна робота

**Мета:** створити ноту поділом тактової частоти на два, довести результат кількістю фронтів і періодами та відрізнити пам’ять від генератора.

1. Відкрийте **«Зумер: побудуйте подільник частоти»** або імпортуйте JSON. Генератор видає 880 Гц при duty=0.5; T=1, RST=0, початковий Q=0. Два осцилографи окремо показують CLK і Q. Задайте **1×**, запустіть симуляцію та натисніть **«Увімкнути звук»**. Після перезавантаження дозвіл знову вимкнений.
2. Передбачте Q після восьми додатних фронтів CLK. Кожний фронт інвертує біт, тому повний цикл Q потребує двох фронтів. Пасивний зумер на Q звучить нотою **880/2=440 Гц**, ля A4.
3. У вікні осцилограм **10 мс** порівняйте періоди. Джерело має `T=1/880 с=1.136364 мс=1136.364 мкс`, а Q — `T=1/440 с=2.272727 мс=2272.727 мкс`. Перевірте `f=1/(T1+T0)`, підставляючи секунди. Мілісекунди діліть на 1000, мікросекунди — на 1 000 000.
4. Задайте T=0 при працюючому такті: Q утримає 0 або 1, але сталий пасивний тон припиниться. Стала 1 не має повторюваних періодів. Подайте RST=1: Q асинхронно очиститься без очікування фронту. Поверніть RST=0 і T=1.
5. У **«Завдання та здача → Сценарій дій»** завантажте **«Навчальний сценарій прикладу»** із семи дій. Він утримує Q, скидає, поновлює поділ, змінює джерело на 660 Гц і назад на 880 Гц, а потім утримує Q. Передбачте **330 Гц** і **440 Гц** на виході. Зупинка поверне редаговану схему.
6. Запишіть власний дослід з іншою частотою джерела в межах **0–1000 Гц**. Додайте утримання й скидання. Таблиця дій показує контрольні біти, а частоту перевіряйте кількістю фронтів і повними періодами. На іншій швидкості симуляції модельні герци ті самі, але реальна висота пасивного звуку змінюється.

**Очікування:** при T=1, RST=0 частота Q вдвічі менша за частоту джерела; T=0 зберігає біт, RST=1 очищає його. Утримувані 0 і 1 не створюють сталого пасивного тону; перехід може клацнути. Вимкнений звук, гучність 0 та пауза також дають тишу — перевіряйте сигнали.

Ідеальні вентилі не мають затримки поширення, тому нестійкий інверторний зворотний зв’язок не задає фізичну звукову частоту. Тут час визначає явний генератор, а поділ — тактована пам’ять.

**Питання:** чому потрібні два фронти на цикл Q? Чому стала 1 мовчить на пасивному зумері? Яке джерело дає 330 Гц? Чим скидання відрізняється від T=0?

**Здайте:** власну схему, запис досліду, таблицю передбачених фронтів і виміряні періоди CLK/Q у трьох одиницях із розрахованими частотами. Додатково створіть другий каскад T-тригера: передбачте й перевірте **880/4=220 Гц**.

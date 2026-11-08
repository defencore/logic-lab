# Active buzzer alarm

**Time:** 20 minutes. **Level:** beginner. Build `ALARM = ARM AND (DOOR OR TEST)` and compare its visible and audible results.

## Starting circuit

Open **Active buzzer alarm** in **Learning examples**, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains the bilingual instructions, worksheet metadata and six-action preset. All switches start at 0; an OR gate combines requests, an AND gate supplies permission, and its output drives an LED and active buzzer.

Run the simulation and press **Enable sound**. Audio starts disabled after each page reload. The buzzer defaults to `frequency=880` Hz and `volume=0.15`; choose these settings before recording. Set volume to 0 or press **Sound on** again to mute. No physical electronics are required.

## Objectives

- Translate a verbal alarm rule into OR and AND operations.
- Distinguish the enable bit from an active buzzer's internal oscillator.
- Record a repeatable experiment and justify every state.

## Procedure

1. Predict the table below before operating the circuit. Trace the OR request and the AND permission separately.
2. Set ARM=1, then DOOR=1. Compare the lit LED with the continuous 880 Hz tone. Close the door: both stop.
3. With ARM=1 and DOOR=0, set TEST=1. Keep TEST high and disarm: the alarm stops. TEST requests an alarm but still requires ARM.
4. Complete all eight switch combinations. Check the buzzer's **EN** value even when browser audio is muted.
5. Open **Assignments & submission → Action sequence**. Load **Example action sequence**, or record your own trials. The supplied preset demonstrates arm, door alarm, door closure, test, disarm and test release. The observation table compares permission, LED input and buzzer input; those three bits always agree. Stop replay to restore the editable circuit.
6. Choose another internal buzzer frequency before making a new recording. The switch actions remain the same: pitch is configuration, not the digital alarm command.

## Expected result

| ARM | DOOR | TEST | ALARM | Sound with audio enabled |
| --- | ---- | ---- | ----- | ------------------------ |
| 0   | 0    | 0    | 0     | Silent                   |
| 0   | 0    | 1    | 0     | Silent                   |
| 0   | 1    | 0    | 0     | Silent                   |
| 0   | 1    | 1    | 0     | Silent                   |
| 1   | 0    | 0    | 0     | Silent                   |
| 1   | 0    | 1    | 1     | Internal 880 Hz tone     |
| 1   | 1    | 0    | 1     | Internal 880 Hz tone     |
| 1   | 1    | 1    | 1     | Internal 880 Hz tone     |

A steady 1 enables an **active** buzzer's internal oscillator. A **passive** buzzer needs repeated 0/1 transitions and would not sustain a tone from the same constant 1. X/Z, disabled components and disconnected inputs do not provide a valid alarm command. A paused simulation, muted session or volume 0 also removes sound; silence alone does not establish logic 0. Changing simulation speed changes beep timing while the active buzzer's internal pitch remains fixed.

## Review questions

1. Why does TEST not sound the alarm while ARM=0?
2. How would replacing OR with AND change the alarm rule?
3. Why does constant 1 sound on the active buzzer but not on a passive one?
4. Which observations prove the logic even when sound is muted?

## Deliverables

- Your circuit and recorded input sequence with replayed observations.
- An eight-row truth table and an explanation of enable versus pitch.

## Extension

Add a second door switch. Decide whether either door or both doors should request an alarm, predict the new rule, then change the circuit and supply an experiment that distinguishes your rule from the original.

## Українська лабораторна робота

**Мета:** побудувати `ALARM = ARM AND (DOOR OR TEST)`, порівняти дозвіл активного зумера з його внутрішньою частотою та записати відтворюваний дослід.

1. Відкрийте **«Активний зумер: логічна сигналізація»** або імпортуйте JSON. Початкові перемикачі дорівнюють 0. Запустіть симуляцію й натисніть **«Увімкнути звук»**: після перезавантаження сторінки звук знову вимкнений. Типові налаштування — `frequency=880` Гц та `volume=0.15`; задавайте їх до запису.
2. Передбачте таблицю з восьми комбінацій вище. OR об’єднує запити DOOR і TEST, а AND пропускає їх лише при ARM=1.
3. Увімкніть ARM, потім DOOR: лампа світиться й звучить тон 880 Гц. Зачиніть двері — обидва вимкнуться. Перевірте TEST при зачинених дверях; залиште його активним і зніміть охорону — тривога зникне.
4. Перевірте всі комбінації, порівнюючи команду дозволу, вхід LED і вхід зумера. Навіть при вимкненому звуку ці три біти мають збігатися. Стала 1 вмикає внутрішній генератор активного зумера, але не створює сталий тон на пасивному.
5. Відкрийте **«Завдання та здача → Сценарій дій»**, завантажте **«Навчальний сценарій прикладу»** із шести дій або запишіть власну перевірку. Завершіть запис, повторіть його та збережіть спостереження. Зупинка повертає редаговану схему; повтор не надає дозвіл звуку автоматично.
6. До нового запису змініть внутрішню частоту й порівняйте: булева команда та таблиця істинності не зміняться. Додайте ще одні двері, оберіть правило «будь-які» чи «обидва» та перевірте відмінність.

**Очікування:** звук і лампа активні лише при ARM=1 та DOOR=1 або TEST=1. Пауза, гучність 0 чи вимкнений звук не доводять, що сигнал дорівнює 0; X/Z також не є коректним дозволом. Швидкість симуляції змінює тривалість гудків, але не внутрішню висоту активного зумера.

**Питання:** чому TEST не обходить ARM? Що змінить AND замість OR? Чому пасивному зумеру недостатньо сталої 1? Як перевірити логіку без звуку?

**Здайте:** власну схему, запис дій зі спостереженнями, таблицю восьми станів і пояснення різниці між дозволом та висотою тону.

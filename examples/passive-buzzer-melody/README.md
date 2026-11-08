# Passive buzzer: record a melody

**Time:** 25 minutes. **Level:** beginner. Drive a passive buzzer with a binary clock and record actual frequency changes.

## Starting circuit

Open **Passive buzzer: record a melody** in **Learning examples**, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) supplies bilingual instructions and a ten-action preset. The clock starts at `frequency=440` Hz and `duty=0.5`; an AND gate passes it only when PLAY=1. PLAY starts at 0, so the initial buzzer input is low. Its default `volume=0.15` belongs to the initial circuit.

Run at **1×** and press **Enable sound**. Audio is disabled initially after every page reload; pressing **Sound on** again mutes it. A passive buzzer follows real-time edge timing, so changing simulation speed changes the heard pitch and duration even though the configured simulated frequency is unchanged. Use 1× to compare notes with the frequencies below.

## Objectives

- Calculate frequency from a complete binary high-plus-low period.
- Convert seconds, milliseconds and microseconds correctly.
- Record a small melody and deliberately gate a silent pause.

## Procedure

1. Set PLAY=1. The clock reaches the buzzer and scope; at 1× the note is A4, 440 Hz.
2. Open the waveform monitor and choose a **10 ms** window. Measure rising edge to rising edge. A full period contains both the high interval T1 and low interval T0.
3. Calculate `f = 1 / (T1 + T0)` with times in **seconds**. At 440 Hz, `T = 1/440 s = 2.272727 ms = 2272.727 µs`. With duty 0.5, `T1=T0=1.136364 ms=1136.364 µs`.
4. In **Assignments & submission → Action sequence**, load **Example action sequence**. It plays A4–B4–C5–D5–E5, pauses, repeats A4, gates off at 3.5 s and stops the generator at 3.8 s. The silent ending lets the final note finish. The action log records `clock.frequency` and PLAY changes, not generated edges or a rendered audio file.
5. Stop replay, then make your own recording. The supported recorded clock frequency is **0–1000 Hz**, including fractional values. Set volume before starting. Pick other notes within this range, predict their periods, change the clock frequency while recording, and include a PLAY=0 pause. Replay and export the result.
6. Outside replay, set PLAY=1 and compare `duty=0` with `duty=1`. Both are constant inputs and have no sustained passive note; a transition may briefly click. Restore duty 0.5. Compare speed 1× with 0.5×, then return to 1×.

## Expected result

| Note | Clock frequency, Hz | Full period, ms (rounded) |
| ---- | ------------------- | ------------------------- |
| A4   | 440                 | 2.272727                  |
| B4   | 493.883             | 2.024771                  |
| C5   | 523.251             | 1.911129                  |
| D5   | 587.33              | 1.702620                  |
| E5   | 659.255             | 1.516864                  |

At duty 0.5, each high or low interval is half the full period. Taking the reciprocal of one half incorrectly doubles the frequency. Convert ms to seconds by dividing by 1000, or µs by 1,000,000. The note period comes from the binary waveform; a constant 0 or 1 is silent after any transition click. PLAY=0 forces 0 regardless of clock phase.

The observation table captures chosen bits at action checkpoints. It is not a frequency counter: verify pitches from clock settings and a sufficiently short waveform window. Abrupt frequency changes can create a transition transient. Replay reproduces the circuit inputs and timing; audio still requires permission and a running simulation. Pausing stops sound. Ideal gates have no modeled propagation delays, so an unsettled gate feedback loop is not a substitute oscillator.

## Review questions

1. Why does one high interval at duty 0.5 give the wrong period?
2. What full period corresponds to 880 Hz, and how does its note compare with 440 Hz?
3. Why do PLAY=0, duty 0 and duty 1 remove sustained sound?
4. Why must note comparisons specify simulation speed?

## Deliverables

- Your circuit and recorded melody with a silent pause and replayed observations.
- Five predicted frequencies/periods, one measured period, and an explanation of DC silence.

## Extension

Choose a melody using different allowed frequencies and durations. Predict which source change raises the note by one octave. Compare duty 0.25 and 0.5 while keeping the full period fixed; explain why a changed high/low split does not by itself change the fundamental frequency.

## Українська лабораторна робота

**Мета:** пов’язати частоту пасивного зумера з повним двійковим періодом, правильно перетворити одиниці й записати мелодію з паузою.

1. Відкрийте **«Пасивний зумер: запишіть мелодію»** або імпортуйте JSON. Генератор має 440 Гц, `duty=0.5`; PLAY спочатку 0. Залиште `volume=0.15`, запустіть симуляцію на **1×** та натисніть **«Увімкнути звук»**. Після перезавантаження дозвіл звуку знову вимкнений.
2. Задайте PLAY=1: при 1× звучить ля A4 440 Гц. Відкрийте осцилограми з вікном **10 мс**. Виміряйте час між двома додатними фронтами, включаючи T1 і T0.
3. Обчисліть `f=1/(T1+T0)` у секундах. При 440 Гц повний `T=2.272727 мс=2272.727 мкс`, а при duty=0.5 кожна половина — `1.136364 мс=1136.364 мкс`. Мілісекунди діліть на 1000, мікросекунди — на 1 000 000. Обернена величина одного півперіоду помилково подвоїть частоту.
4. У **«Завдання та здача → Сценарій дій»** завантажте **«Навчальний сценарій прикладу»**. Десять дій програють A4–B4–C5–D5–E5 із таблиці вище, створять паузу, повторять A4, закриють PLAY на 3.5 с і зупинять генератор на 3.8 с. Тихе завершення дозволяє останній ноті прозвучати. Журнал містить зміни `clock.frequency` та PLAY, а не окремі фронти чи звуковий файл.
5. Зупиніть повтор і запишіть власну мелодію. Записувана частота генератора — **0–1000 Гц**, зокрема дробові значення; гучність задавайте до запису. Оберіть інші ноти, передбачте їхні періоди й додайте паузу через PLAY=0. Таблиця спостережень показує біти в контрольні моменти, тому частоту перевіряйте налаштуванням і короткою осцилограмою.
6. При PLAY=1 порівняйте duty=0 та duty=1: сталі 0 і 1 не мають періодів та не дають сталого тону; можливий короткий клац переходу. Поверніть duty=0.5. Порівняйте швидкості 1× та 0.5×: модельні герци ті самі, а чутна пасивна нота вдвічі нижча. Для нот поверніть 1×. Пауза симуляції припиняє звук.

**Очікування:** висота визначається повним періодом, PLAY=0 дає тишу, а запис відтворює джерела та час. Різка зміна частоти може дати перехідний звук. Ідеальні вентилі не мають затримки поширення; їх нестійкий зворотний зв’язок не є генератором.

**Питання:** чому півперіод не підходить для формули? Який період має 880 Гц? Чому стала 1 мовчить? Чому потрібно зазначати швидкість симуляції?

**Здайте:** власну схему, запис мелодії з паузою, спостереження, таблицю п’яти частот і періодів та один виміряний період. Додатково порівняйте duty=0.25 й 0.5 при незмінному повному періоді.

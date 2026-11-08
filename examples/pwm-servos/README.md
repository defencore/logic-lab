# RC servo pulse control / RC-серво: керування імпульсами

Control four RC servos with actual digital pulses. Керуйте чотирма RC-серво справжніми цифровими імпульсами.

**Estimated time / Орієнтовний час:** 25 minutes / хвилин. **Level / Рівень:** intermediate / середній.

## Starting circuit / Початкова схема

Open this lab in the Examples catalog or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains the bilingual walkthrough and assessment metadata. Keep the starting circuit unchanged and export your completed experiment separately.

Відкрийте роботу в каталозі прикладів або імпортуйте [circuit.json](./circuit.json). [lesson.js](./lesson.js) містить двомовний розбір і навчальні метадані. Збережіть початкову схему, а завершений дослід експортуйте окремо.

## Objectives / Мета

- Distinguish pulse width, duty and repetition frequency. / Відрізніть ширину імпульсу, заповнення та частоту повторення.
- Decode position only from complete valid digital pulses. / Визначайте положення лише за повними правильними цифровими імпульсами.
- Detect missing or invalid commands. / Виявіть відсутні та некоректні команди.

## Procedure / Порядок роботи

1. Run for at least 50 ms. At 50 Hz, Course duty 0.0625 makes 1250 µs pulses and −45° on S1/S3; Height duty 0.0875 makes 1750 µs and +45° on S2/S4. Scopes and servos receive the same digital PWM wires. / Запустіть щонайменше на 50 мс. При 50 Гц Course duty 0.0625 дає 1250 мкс і −45° на S1/S3, Height duty 0.0875 — 1750 мкс і +45° на S2/S4. Осцилографи й серво отримують ті самі цифрові дроти PWM.
2. At 50 Hz, try duty 0.05, 0.0625, 0.075, 0.0875 and 0.1. Wait for a complete pulse after each change; record widths and angles. / При 50 Гц перевірте duty 0.05, 0.0625, 0.075, 0.0875 і 0.1. Після зміни дочекайтеся повного імпульсу; запишіть ширини та кути.
3. Compare 50 Hz/duty 0.075 with 100 Hz/duty 0.15. Both make a 1500 µs high pulse and center the servo. Changing frequency with fixed duty changes the width and command. / Порівняйте 50 Гц/duty 0.075 і 100 Гц/duty 0.15. Обидва дають високий імпульс 1500 мкс та нульовий кут. При сталому duty зміна частоти змінює ширину й команду.
4. Select a short waveform window to distinguish pulse width from the gaps between pulses. / Оберіть коротке часове вікно, щоб розрізнити ширину імпульсу та проміжки між імпульсами.
5. Disconnect S1: it shows X immediately. Reconnect and wait for a fresh complete pulse. Set duty to 0: the last valid angle expires after Signal timeout (default 0.1 s), then shows X. / Від’єднайте S1: одразу показано X. Підключіть знову й дочекайтеся нового повного імпульсу. Задайте duty 0: останній достовірний кут утримується до Signal timeout (типово 0.1 с), далі показано X.

## Expected result / Очікуваний результат

| High pulse / Високий імпульс | Duty at 50 Hz / Заповнення при 50 Гц | Angle / Кут |
| ---------------------------- | ------------------------------------ | ----------- |
| 1000 µs / мкс                | 0.05                                 | −90°        |
| 1250 µs / мкс                | 0.0625                               | −45°        |
| 1500 µs / мкс                | 0.075                                | 0°          |
| 1750 µs / мкс                | 0.0875                               | +45°        |
| 2000 µs / мкс                | 0.1                                  | +90°        |

Pulse width (µs) = Duty / Frequency × 1,000,000. The analog DUTY output cannot connect to the digital S inputs. The model validates pulse duration and signal timeout; it does not model torque, inertia or motor transit time.

Ширина (мкс) = Duty / Frequency × 1 000 000. Аналоговий вихід DUTY не підключається до цифрових входів S. Модель перевіряє тривалість імпульсу й втрату сигналу; момент, інерція та час руху двигуна не моделюються.

## Review questions / Контрольні запитання

1. Why does the servo require PWM rather than DUTY? / Чому серво потребує PWM, а не DUTY?
2. How do you preserve pulse width after changing frequency? / Як зберегти ширину імпульсу після зміни частоти?
3. Why does X not mean the servo is centered? / Чому X не означає нульового кута?

## Deliverables / Що здати

- An exported circuit and pulse-width/angle table. / Експортовану схему й таблицю ширини та кута.
- Traces for 1500 µs at 50/100 Hz and an explanation of a missing command. / Осцилограми 1500 мкс при 50/100 Гц та пояснення відсутньої команди.

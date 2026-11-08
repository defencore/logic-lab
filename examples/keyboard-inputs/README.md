# Keyboard inputs: hold, invert and toggle

Control three separate one-bit outputs with physical keys **A**, **S** and **D**. Compare momentary and latched behavior, record your observations, then replay the same experiment without a keyboard.

**Estimated time:** 20 minutes. **Level:** beginner. No physical electronics are required.

## Starting circuit

Open **Keyboard inputs: hold, invert and toggle** in the Examples catalog, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains the bilingual lesson, worksheet and portable action preset. The circuit starts with three distinct bindings: `KeyA`, `KeyS`, `KeyD`; these identify physical key positions even when the typing language changes.

Click the workspace before using the keys. Typing in a form does not operate the circuit. Each source has one Q contact connected to its own LED.

## Objectives

- Compare the press, hold and release response of all three modes.
- Distinguish the raw recorded `value` from the resulting Q output.
- Export a repeatable experiment and explain a rejected binding conflict.

## Procedure

1. Observe the initial outputs **0,1,0**: only S is lit.
2. Hold and release **A**. Its lamp follows the key. Hold and release **S**: its lamp behaves oppositely. Try holding both together.
3. Press **D**, keep holding it, then release it. The lamp changes once and stays on. A second separate press turns it off. Autorepeat does not create extra toggles.
4. Start a fresh recording in **Assignments & submission → Action sequence**. Demonstrate A, S and three separate D presses; finish recording, replay and compare the table of observed outputs. During replay, live keyboard input is blocked. Stop restores your circuit.
5. Alternatively load **Example action sequence** from the same panel. It contains seven portable raw-value changes and finishes with outputs **0,1,1**. Releases in toggle mode do not produce value changes.
6. Finish replay, select A and try changing its binding to `KeyS`. The duplicate is rejected and its old binding remains. Capture `Shift+KeyK`, test it, then restore `KeyA`. Ctrl, Alt and Meta chords stay reserved for browser or system commands.
7. Hold A or S and leave the workspace: momentary inputs release safely. The D toggle retains its latched state.

## Expected result

| Mode         | Released   | Pressed/held                                | After release |
| ------------ | ---------- | ------------------------------------------- | ------------- |
| A · hold     | 0          | 1                                           | 0             |
| S · inverted | 1          | 0                                           | 1             |
| D · toggle   | Previous Q | One new press flips Q; holding preserves it | New Q remains |

For hold/inverted, raw `value=1` means pressed. Inverted Q equals `1 − value`. For toggle, `value` is the saved latch state; only a new press changes it. The supplied preset ends at **Q(A)=0, Q(S)=1, Q(D)=1**.

## Review questions

1. Why does the S lamp start high while its raw value is zero?
2. Why are D release and autorepeat absent from a normal toggle change log?
3. How does physical key addressing behave when the typing language changes?
4. Which settings belong to the circuit configuration, and which values change during recording?

## Deliverables

- Your exported circuit and action recording with replayed observations.
- A table covering press, hold and release for every mode.
- An explanation of the duplicate-binding warning and your corrected binding.

## Українська лабораторна робота

**Мета:** порівняти утримання, інверсію та перемикання, записати відтворюваний дослід і навчитися усувати конфлікти прив’язок.

1. Відкрийте приклад **«Клавіатурні входи: утримання, інверсія та перемикання»**. Поверніть фокус на робочий простір. Початкові виходи — **0,1,0**.
2. Утримуйте та відпускайте **A** і **S**. A повторює натискання, S реагує навпаки. Клавіші прив’язані до фізичних позицій `KeyA` і `KeyS`, незалежно від мови введення.
3. Натисніть **D**, утримуйте, відпустіть і натисніть знову. Окреме натискання змінює стан один раз; утримання, автоповтор і відпускання його не перемикають.
4. Через **«Завдання та здача → Сценарій дій»** запишіть власний дослід, завершіть його й відтворіть. Або завантажте **«Навчальний сценарій прикладу»** із семи дій: він завершується виходами **0,1,1**. Під час повтору живі клавіші заблоковані, а «Зупинити» повертає вашу схему.
5. Завершіть перегляд, виберіть A та спробуйте прив’язати `KeyS`: дублювання буде відхилено. Призначте `Shift+KeyK`, перевірте комбінацію та поверніть `KeyA`. Комбінації з Ctrl, Alt і Meta залишаються для браузера й системи. Під час набору тексту клавіатурні входи не реагують.

**Контрольні питання:** чому S світиться при `value=0`? Чому відпускання D не додає зміни до журналу? Чим конфігураційні `binding`/`mode` відрізняються від поточного `value`?

**Здайте:** власну схему, запис дій, таблицю спостережень для натискання/утримання/відпускання та пояснення виправленого конфлікту прив’язок.

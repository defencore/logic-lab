# Nine-floor elevator: memory and interlocks

**Time:** 45 minutes. **Level:** intermediate. Control floors **1–9** with momentary buttons, visible request memories, priority gates and an external door timer.

## Starting circuit

Open **Nine-floor elevator: memory and interlocks** in **Learning examples**, or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains bilingual instructions, worksheet metadata and a nine-action preset. The cabin starts at floor **1**, doors closed, RUN=1 and UNSAFE UP=0. All CALL buttons and RESET are released.

Each **CALL 1…9** is a real momentary input: hold to produce Q=1 and release to return Q=0. The separate SR memory retains the request after release; its lamp shows the stored call. RESET is also a momentary button. RUN and UNSAFE UP remain maintained switches. The plant contains only cabin/door mechanics: request memory, dispatch, target encoding, stopping and door timing are visible outside it. The circuit has **140 components**, within the 200-component action-recording limit.

## Objectives

- Preserve nine independent released calls and clear only the served request.
- Explain shared lowest-numbered-floor priority and its difference from FIFO.
- Encode a selected floor as a four-bit numeric target.
- Verify timed doors, movement interlocks and recovery from a deliberate bypass fault.

## Procedure

1. Trace one request row: `CALL → AND NOT clear → SR.S`; `clear = RESET OR (floor sensor AND door pulse)` drives SR.R. NOT prevents S=R=1, including when a button is held during service.
2. Press and release **CALL 9**. Its source Q returns to 0, but Pending 9 remains lit. Movement requires `door_closed AND NOT door_pulse AND NOT fault AND RUN AND any_pending_request`. The plant passes unselected intermediate floors.
3. At floor 9, selected arrival with closed doors triggers the external monostable. Its pulse opens/holds the doors and clears request 9. NOT pulse commands closing; movement waits for full closure.
4. Reset with all buttons released. Press/release **9**, then **3** while still below floor 3. During the floor-3 door cycle, press/release **5**. Predict and observe **3 → 5 → 9**. During floor 9's door cycle, call **1** to return home.
5. Inspect the shared priority chain. `lowerN` is OR of requests 1…N. Target 1 is request 1; target N for N>1 is `requestN AND NOT lower(N−1)`. Exactly the lowest pending number wins. A new lower request can redirect/reverse travel; repeated low-floor calls can delay high floors. This is **priority, not FIFO**.
6. Follow the four OR trees into separate DAC contacts 0…3. Floor 9 is **1001**, floor 5 is **0101**, and floor 3 is **0011**. Upper contacts 4…7 are grounded. With `vcc=255`, the DAC preserves the byte's integer as a **numeric floor target**, rather than an elevator supply voltage. Below/Above target sensors compare this number with cabin position; their display unit is `floor`. When no call is pending, target **0 means idle**, and the pending-request gate blocks movement; there is no floor 0.
7. Measure door timing: lab `travelSpeed=2` floors/s, `doorSpeed=4` opening fractions/s. Opening takes **0.25 s**. External `duration=0.6 s` leaves about **0.35 s** fully open, then closing takes **0.25 s**. Each F1…F9 has a **±0.015-floor alignment zone**, so stops near 2.99 or 8.99 are expected.
8. At floor 1, press/release CALL 1 and let opening begin. Set **UNSAFE UP=1**. The OR bypasses the visible interlock; the plant latches `motion_with_open_door`, freezes and lights FAULT. Remove the bypass, release all calls, then press/release RESET. It clears plant state, door one-shot and all nine memories.
9. Under **Assignments & submission → Action sequence**, load **Example action sequence**. Nine changes press/release calls 9, 3, 5 and 1, then pause RUN at 12 s. Expect **3 → 5 → 9 → 1**, all requests clear, closed doors and fault=0. Stop replay before editing. Record a different call order and explain the priority decisions.

## Expected result

| Condition                          | Result                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| A CALL button is released          | Source Q returns to 0; its SR request stays pending                  |
| Several requests are pending       | Lowest-numbered pending floor is encoded as target                   |
| Selected arrival with closed doors | External pulse opens/holds doors and clears that request             |
| Door pulse ends                    | NOT closes doors; motion waits for door_closed                       |
| No requests remain                 | Encoded target 0; the pending-request interlock prevents motion      |
| Unsafe drive during opening        | Latched fault, no physical travel                                    |
| RESET is held                      | Configured starting floor/door, MOVING=0, memories and timer cleared |

Release each call before its service pulse ends: a held input can be captured again after clear falls. The plant only bounds travel to **1–9**; it does not dispatch or automatically stop at a called floor. Opposing drive commands, opposing door commands, OPEN between alignment zones and drive with open/opening doors latch a fault until RESET. RUN=0 freezes the plant while external timers still follow simulation time; global Pause freezes both. X commands freeze physical motion with uncertain MOVING/FAULT; Z uses documented defaults. Disabling the plant releases all outputs to Z.

## Review questions

1. Why does releasing a button clear its Q but leave a pending request?
2. How do prefix OR gates share work while selecting exactly one floor?
3. Why is 1001 decoded as numeric target 9 with this DAC setting?
4. Why must movement be blocked when target is 0?
5. Why does clearing a request not bypass open doors, and what determines the fully-open dwell?

## Deliverables

- Your exported circuit and recorded multi-request trip with replayed observations.
- A predicted/observed service order, binary codes for all floors 1–9, measured door timing and an explanation of the recovered bypass fault.

## Extension

Change the visible priority order and choose calls that distinguish it from the original. Add an active buzzer to FAULT, or add a visible direction memory for a different scheduling policy. Keep the same physical plant and identify the changed controller wires. Explain which policy could prevent repeated lower calls from starving floor 9.

## Українська лабораторна робота

**Мета:** зберегти дев’ять незалежних викликів, пояснити спільний пріоритет і двійкову ціль, задати час дверей та перевірити блокування руху.

1. Відкрийте **«Дев’ятиповерховий ліфт: пам’ять і блокування»** або імпортуйте JSON. Поверхи — **1–9**. Початок: кабіна на 1, двері зачинені, RUN=1, UNSAFE UP=0. Усі CALL і RESET — **кнопки без фіксації**: під час утримання Q=1, після відпускання Q=0. Лампи SR-пам’ятей окремо показують заявки. Схема містить 140 елементів і вкладається в ліміт запису 200.
2. Простежте рядок: `CALL → AND NOT clear → SR.S`, де `clear = RESET OR (датчик поверху AND імпульс дверей)` подається на SR.R. NOT запобігає S=R=1. Натисніть і відпустіть CALL 9: Q повернеться до 0, а заявка збережеться. Кабіна проїжджає необрані поверхи; пам’ять, пріоритет, зупинка й час дверей реалізовані зовні установки.
3. Скиньте при відпущених кнопках. Натисніть/відпустіть 9, потім 3, поки кабіна нижче 3; під час дверного циклу на 3 викличте 5. Очікуйте **3 → 5 → 9**. Під час циклу на 9 викличте 1. `lowerN` об’єднує заявки 1…N; ціль N>1 — `requestN AND NOT lower(N−1)`. Новий нижчий виклик може змінити напрямок. Це **пріоритет, не FIFO**; повторні нижні заявки можуть затримувати верхні.
4. Простежте окремі біти ЦАП 0…3: **9=1001**, **5=0101**, **3=0011**. Біти 4…7 заземлені. При `vcc=255` ЦАП зберігає ціле як **числову ціль в одиницях поверху**, а не живлення ліфта. Датчики Below/Above target мають одиницю `floor`. Ціль **0 — очікування**, а дозвіл any_pending_request забороняє рух; поверху 0 немає.
5. У прикладі `travelSpeed=2` поверхи/с та `doorSpeed=4` частки/с. Відкривання — **0.25 с**, зовнішній `duration=0.6 с` дає близько **0.35 с** повністю відкритих дверей, зачинення — **0.25 с**. F1…F9 мають зону **±0.015 поверху**, тому положення приблизно 2.99 або 8.99 очікуване. Виконання очищає тільки свою заявку; наступний рух чекає зачинення.
6. На 1 натисніть/відпустіть CALL 1. Під час відкривання задайте UNSAFE UP=1: OR обходить видимий дозвіл. FAULT фіксує `motion_with_open_door`, а кабіна стоїть. Вимкніть обхід, відпустіть усі виклики й натисніть/відпустіть RESET: він разом очищає установку, таймер і дев’ять пам’ятей. При утримуваному RESET рух має бути 0.
7. У **«Завдання та здача → Сценарій дій»** завантажте **«Навчальний сценарій прикладу»**. Дев’ять змін натискають/відпускають 9, 3, 5 і 1, потім вимикають RUN на 12 с. Очікуйте **3 → 5 → 9 → 1**, порожні заявки, зачинені двері та fault=0. Зупиніть повтор і запишіть власний дослід.

**Важливо:** відпускайте CALL до завершення обслуговування, інакше він може записатися знову. RUN=0 зупиняє установку, але зовнішні таймери продовжуються; загальна пауза зупиняє все. Небезпечні команди фіксують аварію до RESET. X зупиняє фізику з невизначеними MOVING/FAULT; Z використовує типові входи; вимкнений елемент відпускає виходи в Z.

**Питання:** чому Q кнопки й заявка після відпускання різні? Як префіксні OR забезпечують один пріоритет? Чому 1001 дає ціль 9? Навіщо блокувати рух при цілі 0? Як задається витримка дверей?

**Здайте:** власну схему й запис, прогноз/спостереження порядку, двійкові коди поверхів 1–9, час дверей та пояснення скинутої аварії. Додатково змініть пріоритет або додайте зумер FAULT, зберігши ту саму фізичну установку.

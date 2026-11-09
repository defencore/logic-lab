# 74HC595: shift and latch

**Time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **74HC595: shift and latch** in Learning examples or import [circuit.json](./circuit.json). [lesson.js](./lesson.js) contains the bilingual worksheet and replay. Each of QA–QH goes to its matching contact D0–D7 on the 8-bit monitor. An LED reads QH′ separately.

## Objectives

- Observe serial loading and parallel latching as separate events.
- Predict which states change when OE̅ releases the outputs or MR̅ clears the shift register.

## Procedure

1. Reset the simulation. Set SER to each bit of `10100101`, left to right. Give each bit an SRCLK `0→1→0` pulse. Compare the shift byte on the chip with the still-zero monitor.
2. Pulse RCLK to display `0xA5` (165). QH′ is high because the shift byte has a high bit 7.
3. Set OE̅ to 1. The monitor shows Z and QH′ stays high. Set MR̅ to 0. The shift byte and QH′ clear.
4. Set OE̅ to 0. The monitor shows `0xA5` again. Set MR̅ to 1 and pulse RCLK to copy zero to the monitor.

Load the example action sequence in **Assignments & submission → Action sequence**. Use the next-action button to compare the monitor and QH′. Record your own run with another bit pattern and explain when the shift and storage bytes change. The clock and control behavior follows the [TI SN74HC595 datasheet](https://www.ti.com/lit/ds/symlink/sn74hc595.pdf).

## Expected result

The monitor reads 0 → 165 → Z → 165 → 0. QH′ stays high when OE̅ releases the parallel outputs and goes low when MR̅ clears the shift register.

## Review questions

- Which clock copies the shift byte to QA–QH?
- Why does QH′ go low when MR̅ clears the shift register while the stored byte remains 165?

## Deliverables

- A recording of your own bit pattern and the control changes.
- A table of the shift byte, stored byte, bus value and QH′ after each stage.

## Українською

Відкрийте **«74HC595: зсув і фіксація»** або імпортуйте схему. Виходи QA–QH окремо під’єднані до D0–D7 індикатора, а світлодіод показує QH′.

1. Скиньте симуляцію. Задавайте SER у порядку `10100101`, по одному імпульсу SRCLK `0→1→0` на кожен біт. Порівняйте байт зсуву з нульовим значенням на індикаторі.
2. Подайте RCLK. Індикатор покаже `0xA5` (165). QH′ має рівень 1, бо біт 7 регістра зсуву дорівнює 1.
3. Задайте OE̅=1. Індикатор покаже Z, а QH′ лишиться високим. Задайте MR̅=0. Байт зсуву та QH′ обнуляться.
4. Поверніть OE̅ у 0. Індикатор знову покаже `0xA5`. Поверніть MR̅ у 1 і подайте RCLK, щоб скопіювати нуль у регістр зберігання.

Відтворіть готовий сценарій у **«Завдання та здача → Сценарій дій»**. Запишіть власний дослід з іншим шаблоном бітів і поясніть, коли змінюються обидва регістри.

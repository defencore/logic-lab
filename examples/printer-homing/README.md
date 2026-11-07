# Printer axis homing

Move toward an endstop, stop automatically at home, and reverse away from the switch.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Printer axis homing** from the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it. The JSON file is the canonical circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No hardware is required. This exercise models an ideal printer-style axis without inertia, backlash, missed steps, acceleration limits, current regulation or hardware feedback.

## Objectives

- Build an automatic homing interlock from a position endstop and logic gates.
- Measure the relationship between control signals and observed axis motion.

## Procedure

1. **Approach the minimum.** Keep the simulation running. Direction starts at 0, so the 100 Hz clock moves the axis from 5 mm toward 0 mm at 4 mm/s. Reset the simulation if it has already reached home before you inspect it.

2. **Trace the automatic stop.** At Position=0 the minimum endstop becomes 1, its NOT becomes 0, and Motion enable becomes 0 because Direction=0. The clock still pulses, but the axis stays at 0 and Home reached lights. STEP is never cut by the feedback loop.

3. **Reverse away from home.** Set Direction=1. The OR gate permits positive movement even while the endstop is pressed, so the next new STEP edges move the axis away. Then Direction=0 starts another homing approach.

4. **Restart the cycle.** Pause before measuring a repeat cycle. Set Reset=1 and then 0 to return to the 5 mm initial position, set Direction=0, and resume. Compare the approximately 1.25 s travel time with distance divided by speed.

## Expected result

Homing stops at 0 mm automatically; reverse direction releases the axis without bypassing the endstop manually. The interlock gates ENABLE, while STEP remains a clean clock.

## Review questions

1. Why is ENABLE gated instead of cutting STEP with the endstop signal?
2. Why does OR with DIR allow escape from a pressed minimum endstop?
3. What homing time follows from 5 mm, 100 Hz and 0.04 mm/step?

## Deliverables

- A saved homing circuit.
- A position trace showing approach, automatic stop, reverse escape and a repeated cycle.
- A short truth table for endstop, DIR and ENABLE.

## Extension

Predict and measure the effect of changing pulse frequency, lead, microsteps or target tolerance. Change one setting at a time, retain the original starting circuit, and export each tested variant separately.

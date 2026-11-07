# Stepper motor: STEP and DIR

Drive a lead-screw axis with pulses, reverse direction, and measure motion per step.

**Estimated time:** 25 minutes. **Level:** beginner.

## Starting circuit

Open **Stepper motor: STEP and DIR** from the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it. The JSON file is the canonical circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No hardware is required. This exercise models an ideal printer-style axis without inertia, backlash, missed steps, acceleration limits, current regulation or hardware feedback.

## Objectives

- Relate STEP edges, DIR and microstepping to travel in millimeters.
- Measure the relationship between control signals and observed axis motion.

## Procedure

1. **Observe positive motion.** Keep the simulation running; press Run only if paused. The axis starts at 10 mm. Each rising edge moves 8 / 200 = 0.04 mm; at 20 Hz the speed is 0.8 mm per simulated second. Select the axis to read Position.

2. **Reverse and disable.** Set Direction=0 to move toward smaller positions. Set Motion enable=0: pulses continue but position holds. Re-enable to resume on a new STEP edge. No step occurs merely because direction or enable changes.

3. **Compare microsteps.** Pause, set Reset=1 and then 0 to return to 10 mm, and set Direction=1. Select the axis and change Microsteps from 1 to 4. Run for one simulated second: travel becomes 0.2 mm. The start-position sensor only lights within 0.08 mm of 10 mm.

## Expected result

One accepted rising edge moves lead / (steps per revolution × microsteps). DIR=1 is positive, DIR=0 negative; disabled or reset axes do not travel.

## Review questions

1. What travel does one edge produce with 200 steps/revolution and an 8 mm lead?
2. Why does four-times microstepping reduce speed at the same clock frequency?
3. Does changing DIR while STEP is high create a step?

## Deliverables

- A saved .logic.json experiment.
- A position/time table for positive, negative, disabled and four-microstep motion.

## Extension

Predict and measure the effect of changing pulse frequency, lead, microsteps or target tolerance. Change one setting at a time, retain the original starting circuit, and export each tested variant separately.

# Closed-loop position control

Share one target between direction and arrival sensors to move an axis to a requested position.

**Estimated time:** 35 minutes. **Level:** intermediate.

## Starting circuit

Open **Closed-loop position control** from the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it. The JSON file is the canonical circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No hardware is required. This exercise models an ideal printer-style axis without inertia, backlash, missed steps, acceleration limits, current regulation or hardware feedback.

## Objectives

- Use measured position and a shared target to select direction and stop within a tolerance.
- Measure the relationship between control signals and observed axis motion.

## Procedure

1. **Move to the first target.** The target byte starts at 128, converted to 128 / 255 × 8 ≈ 4.016 mm. Keep the simulation running: the axis starts at 0 and moves toward that target at 2 mm/s. The target voltage is used as a numeric position signal in this teaching circuit.

2. **Watch direction and arrival.** The Below target sensor drives DIR=1 while position is below the target, otherwise DIR=0. The window sensor turns on within ±0.03 mm; NOT then disables the axis. Target reached lights and the clean STEP clock keeps running.

3. **Request a lower position.** Select Target byte and change Value to 64 (about 2.008 mm). Both sensors receive the new target together. The axis reverses and stops near 2 mm. Then try Value=192 (about 6.024 mm).

4. **Pause motion and inspect tolerance.** Set Motion enable=0 while changing the target: position holds. Set it back to 1 to resume on fresh STEP edges. The 0.03 mm tolerance is larger than half a 0.04 mm step, so the axis can reach the target window instead of oscillating across it.

## Expected result

The axis stops within 0.03 mm of each valid target and reverses automatically for a lower target. A common target signal keeps direction and arrival decisions consistent.

## Review questions

1. Why must the direction and arrival sensors use the same target?
2. Why is a target window needed when travel occurs in discrete steps?
3. What happens if the tolerance is smaller than half a full step?
4. How does Motion enable differ from changing the target?

## Deliverables

- A saved closed-loop position circuit.
- A target/settled-position/error table for target bytes 64, 128 and 192.
- A trace demonstrating reversal and a disabled-motion interval.

## Extension

Predict and measure the effect of changing pulse frequency, lead, microsteps or target tolerance. Change one setting at a time, retain the original starting circuit, and export each tested variant separately.

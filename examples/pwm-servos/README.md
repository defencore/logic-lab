# PWM & control surfaces

Adjust a 105 Hz duty cycle and move four control surfaces using the supplied radio-channel mapping.

**Estimated time:** 25 minutes. **Level:** intermediate.

## Starting circuit

Open **PWM & control surfaces** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Separate pulse frequency from duty ratio and turn that ratio into an angle.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Inspect the starting angles.** Course PWM duty=0.34 drives S1/S3 to −45°. Height PWM duty=0.66 drives S2/S4 to +45°. The DUTY wires carry a ratio; the scope wires carry actual pulses.

2. **Move one pair of surfaces.** Select Course PWM and set Duty cycle to 0.5: S1 and S3 center at 0°. Try 0.18 for −90° and 0.82 for +90°. The other pair is independent.

3. **Run and compare the pulses.** With the simulation running, both 105 Hz pulse trains draw automatically; press Run only if paused. Change frequency without changing duty: the pulse spacing changes while the duty-driven angles stay fixed. Reference mapping: duty = 0.5 − (command / 360) × 0.32.

## Expected result

Duty 0.18…0.82 maps to −90°…+90°. At the reference frequency, command ±360 arcmin maps through the supplied duty formula.

## Review questions

1. Which wire carries pulses and which carries a duty ratio?
2. Why can frequency change without changing a duty-driven servo angle?
3. What duty centers a surface?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A duty/angle table for 0.18, 0.34, 0.5, 0.66 and 0.82 and two PWM traces.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

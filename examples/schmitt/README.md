# Schmitt hysteresis

Move a voltage above and below two thresholds and watch the stored decision.

**Estimated time:** 25 minutes. **Level:** intermediate.

## Starting circuit

Open **Schmitt hysteresis** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Learn why two thresholds stop an output chattering near one voltage.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Start below the low threshold.** Voltage byte starts at 0, giving 0 V. The Schmitt output is 0. Select the DAC to read its voltage while changing the byte.

2. **Cross the high threshold.** Set Voltage byte Value=200: the DAC produces about 3.92 V, above 3.5 V, so the output turns on. Then set Value=128 (about 2.51 V); the output stays on.

3. **Cross the low threshold.** Set Value=50 (about 0.98 V): output turns off below 1.5 V. Set Value=128 again: the same 2.51 V now holds an off output. Do not reset between these changes.

## Expected result

Between 1.5 V and 3.5 V the output remembers its previous state; outside that band it switches deterministically.

## Review questions

1. How can the same 2.51 V input produce either output state?
2. Which byte values cross the 1.5 V and 3.5 V thresholds?
3. Why would a single threshold respond differently to noise?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A sequential voltage/output log for byte values 0 → 200 → 128 → 50 → 128.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

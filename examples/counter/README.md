# Binary counter

Watch eight real bit lamps count; pause, enable and reset the counter.

**Estimated time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **Binary counter** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Read a byte as eight weighted binary bits.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Start the clock.** Keep the simulation running; press Run only if paused. The 2 Hz clock creates two rising edges per simulated second. Select the counter to watch its numeric Q value.

2. **Read the lamps.** Bit 0 has weight 1, bit 1 weight 2, bit 2 weight 4. For count 5, only the lamps with weights 1 and 4 are on. The splitter exposes each bit.

3. **Hold and clear.** Set Enable=0: the clock keeps running but the stored count holds. Set Reset=1 to clear all bits; return Reset=0 and Enable=1 to resume.

## Expected result

The byte counts 0…255, then wraps to 0. The lamps show bit values, not seven-segment masks.

## Review questions

1. What decimal value is represented by lit weights 1, 4 and 8?
2. Why does the counter stop when Enable is low although the clock still runs?
3. What happens after 255?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- Observed lamp patterns for counts 0 through 7 and an explanation of Enable versus Reset.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

# Digital–analog round trip

Convert a byte into voltage and back, then compare the recovered number.

**Estimated time:** 25 minutes. **Level:** beginner.

## Starting circuit

Open **Digital–analog round trip** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Connect digital codes to analog voltage using matching converter ranges.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Inspect the round trip.** Original byte starts at 128. DAC produces about 2.51 V, ADC recovers 128, and Original = decoded is on.

2. **Try the endpoints.** Select Original byte and change Value to 0, then 255. The DAC spans 0–5 V; the ADC recovers the same byte. Try intermediate values too.

3. **Mismatch the voltage ranges.** Restore Value=128, then set the ADC Supply voltage to 2.5 V. Its output saturates at 255 and Original < decoded turns on. Restore ADC supply to 5 V.

## Expected result

Matching 5 V converters recover every byte. Different ranges change the code even though the measured voltage is unchanged.

## Review questions

1. What voltage represents code 128 with a 5 V DAC?
2. Why does the ADC saturate when its range is reduced to 2.5 V?
3. What does the equality comparator verify?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A conversion table for codes 0, 128 and 255, then the mismatched-range result.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

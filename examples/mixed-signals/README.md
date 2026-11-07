# Compare AM and FM

Feed the same changing voltage to AM and FM carriers and compare their scopes.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Compare AM and FM** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- See that AM changes amplitude while FM changes instantaneous frequency.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Start a modulation ramp.** Keep the simulation running; press Run only if paused. The counter starts at 128 and advances eight codes per simulated second. The DAC converts it into a rising 0–5 V staircase.

2. **Compare the two carriers.** Both carriers start at 8 Hz and receive the same modulation. AM changes the waveform height; FM changes the spacing between cycles. Select each generator to inspect its parameters.

3. **Hold the modulation, then remove its effect.** Set Enable=0 to hold the DAC voltage while both carriers keep running. Set Modulation depth=0 on AM and FM: each becomes an unmodulated carrier. Reset=1 returns the ramp to 0.

## Expected result

Amplitude and frequency respond differently to one source. Use scopes and live numeric values together to compare them.

## Review questions

1. Which waveform property changes under AM and under FM?
2. What continues running when the ramp Enable is low?
3. What remains when modulation depth is zero?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- AM and FM traces at nonzero and zero depth, with a short explanation of the differences.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

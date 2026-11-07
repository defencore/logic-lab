# Open-drain wired AND

Share a line safely using released outputs and a weak pull-up.

**Estimated time:** 25 minutes. **Level:** intermediate.

## Starting circuit

Open **Open-drain wired AND** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- See how a released output differs from actively driving a high level.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Release both drivers.** Release A and Release B start at 1. Both open drains output Z, so the weak pull-up alone makes Shared line high.

2. **Pull the shared line low.** Set Release A=0. Its driver actively pulls the line low and overrides the pull-up. Release B cannot force it high. Try both switch combinations.

3. **Remove the pull-up.** Return A=B=1. Select Weak pull-up and uncheck Enabled. Shared line becomes Z, not 1. Re-enable the resistor to restore a high line.

## Expected result

The shared line is high only when every open drain releases it and a pull-up exists: wired AND behavior.

## Review questions

1. How does a released Z output differ from an actively driven 1?
2. Why does a low driver override a pull-up?
3. Why does removing the pull-up make the released line float?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A four-row wired-AND table plus one observation with both drains released and the pull-up disabled.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

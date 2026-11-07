# Seven logic gates

The same two switches feed AND, OR, XOR and their inverted variants.

**Estimated time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **Seven logic gates** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Compare the seven basic logic functions using identical inputs.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Compare AND, OR and XOR.** With A=1 and B=0, AND is 0 while OR and XOR are 1. Set B=1: AND and OR become 1, but XOR becomes 0.

2. **Look for opposites.** NAND always inverts AND, NOR inverts OR, and XNOR inverts XOR. NOT uses only A and always gives its opposite.

3. **Try every input pair.** Click A and B to try 00, 01, 10 and 11. Select a gate header to read its explanation and Truth table in the inspector.

## Expected result

Every inverted pair has opposite lamps. XOR is high for exactly one high input.

## Review questions

1. Which gates are inverses of one another?
2. How do OR and XOR differ for inputs 11?
3. Why does changing B never change NOT?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A truth table for all seven outputs and a note identifying inverted pairs.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

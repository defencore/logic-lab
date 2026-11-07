# Full adder

Add A, B and an incoming carry; read a two-bit answer.

**Estimated time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **Full adder** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Learn why multi-bit addition needs a carry input.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Add two ones.** A and B start high and Carry in is low. The total is 2: Sum=0 and Carry out=1.

2. **Add the incoming carry.** Turn Carry in on. The total becomes 3, so both result lamps turn on: binary 11.

3. **Test an empty column.** Set A=B=0 and leave Carry in=1. Only Sum should stay high. Try the remaining combinations and compare the adder Truth table.

## Expected result

A + B + Carry in = Sum + 2 × Carry out for all eight combinations.

## Review questions

1. How is Carry in different from Carry out?
2. How can two output bits represent the sum of three input bits?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- An eight-row input/output table and the arithmetic identity checked for every row.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

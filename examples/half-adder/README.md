# Half adder

Build addition from XOR and AND, then test all four input combinations.

**Estimated time:** 15 minutes. **Level:** beginner.

## Starting circuit

Open **Half adder** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Discover how two bits produce a sum bit and a carry bit.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Start with 1 + 0.** A starts at 1 and B at 0. The Sum lamp is on; Carry is off. Click either switch to change its bit.

2. **Try 1 + 1.** Set both A and B to 1. Sum turns off and Carry turns on: binary 10 means decimal 2.

3. **Complete the truth table.** Try 00, 01, 10 and 11. Select XOR or AND and compare its Truth table with the lamps. Run is unnecessary for these gates.

## Expected result

Sum = A XOR B; Carry = A AND B. The pair Carry, Sum is the two-bit answer.

## Review questions

1. Why does 1 + 1 require a carry bit?
2. Which input pairs light Sum, and which light Carry?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A four-row truth table with A, B, Sum and Carry.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

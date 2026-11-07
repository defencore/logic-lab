# Arithmetic & logic unit

Choose addition, subtraction, logic or shifts and inspect result flags.

**Estimated time:** 25 minutes. **Level:** intermediate.

## Starting circuit

Open **Arithmetic & logic unit** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Use an operation code to select what the same hardware computes.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Add 5 and 3.** Operation Value=0 selects addition. Select the ALU: result Y is 8, Carry=0 and Zero=0. A scope input also shows the decimal result.

2. **Choose a logic operation.** Set Operation Value to 2 for bitwise AND: 5 AND 3 = 1. Set it to 4 for XOR: result 6. Value 1 subtracts B from A, giving 2.

3. **Cause an overflow.** Set A Value=255, B Value=1 and Operation Value=0. The eight-bit result wraps to 0; both Carry and Zero light up.

## Expected result

Operation codes: 0 add, 1 subtract, 2 AND, 3 OR, 4 XOR, 5 left shift, 6 right shift, 7 NOT A.

## Review questions

1. Why does 255 + 1 produce result 0?
2. How do Carry and Zero describe different properties of that result?
3. How does bitwise AND differ from addition?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A table of the prescribed addition, AND, XOR, subtraction and overflow results with flags.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

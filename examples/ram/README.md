# Read & write memory

Write a byte on a clock edge, change address, and compare RAM, ROM and registers.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Read & write memory** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Understand address, data and the controls that permit a memory write.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Inspect the starting address.** Address=2 and Write data=42. RAM and Register file initially read 0; the fixed ROM reads 20. Select their outputs or scopes to inspect them.

2. **Write one byte.** Turn Write enable on, then switch Write clock from 0 to 1. This writes 42 into RAM and the register file. RAM output is Z while Write enable=1. Turn Write enable off to read back 42.

3. **Visit another address.** Set Address Value to 3: RAM/registers read 0 and ROM reads 30. Set it back to 2: RAM/registers still contain 42. Register addresses use only the lowest three bits (0–7).

4. **Release the outputs.** Output enable=0 releases RAM and ROM to Z; Chip select=0 disables them. These controls do not gate the register file. Return both to 1. Before another write, return Write clock to 0.

## Expected result

Memory changes only on a permitted rising write edge. Changing data or address alone does not write a byte.

## Review questions

1. Which signals must be active when a rising edge writes RAM?
2. Why can RAM output Z while its stored byte remains unchanged?
3. How does the register-file address range differ from RAM?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A write/read log for addresses 2 and 3 comparing RAM, ROM and register-file outputs.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

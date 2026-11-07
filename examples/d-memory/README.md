# One-bit memory

Use a manual clock to store a bit and learn what a rising edge means.

**Estimated time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **One-bit memory** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Separate the current data input from a stored output.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Change data without a clock.** Leave Manual clock at 0 and set Data D to 1. Stored Q remains 0: changing data alone does not write the memory.

2. **Capture a rising edge.** Click Manual clock from 0 to 1. Q becomes 1 and Inverted Q becomes 0. Now set Data D back to 0; Q still remembers 1.

3. **Write again, then reset.** Set Manual clock to 0 and back to 1 to store the new 0. Reset=1 clears Q immediately, with no clock edge. Return Reset to 0 afterward.

## Expected result

Q changes on 0→1 clock transitions or an active reset; a steady high clock does not continuously copy D.

## Review questions

1. Does a steady high clock continuously copy D?
2. Which change can clear Q without a clock edge?
3. What happens when D changes between rising edges?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A chronological table of D, CLK, Reset and Q covering capture, hold and reset.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

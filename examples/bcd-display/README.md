# BCD display

Decode a four-bit decimal digit into a seven-segment pattern.

**Estimated time:** 15 minutes. **Level:** beginner.

## Starting circuit

Open **BCD display** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Distinguish a digit code from the wires that light its segments.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Read digit 5.** The input value starts at 5. The four BCD lines carry its code separately; the decoder produces the eight-bit segment mask that lights a 5.

2. **Choose another digit.** Select the Digit component header. In Parameters, change Value to 0, then 8, then 9. The display updates immediately without Run.

3. **Try an invalid BCD digit.** Set Value to 10. BCD only defines 0–9, so this decoder blanks the display. Restore a value from 0 to 9.

## Expected result

The decoder output is a segment mask, not the original number; digit 8 activates all seven segments.

## Review questions

1. Why does the display need a decoder rather than the digit byte directly?
2. What does the decoder do with input 10?
3. Which segment mask makes an 8?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A table of digit codes 0, 5, 8, 9 and 10 with decoded masks and observed display shapes.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

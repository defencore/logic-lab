# One trigger, one pulse

Trigger a 0.5-second pulse and see why holding the trigger does not extend it.

**Estimated time:** 20 minutes. **Level:** beginner.

## Starting circuit

Open **One trigger, one pulse** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Turn an input edge into a pulse of a known duration.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Start time, then trigger.** Keep the simulation running; press Run only if paused. Click Trigger from 0 to 1. Pulse output lights immediately for 0.5 seconds.

2. **Hold and re-arm.** Keep Trigger at 1: the pulse still ends. Return Trigger to 0 and then to 1 to create another pulse. Extra rising edges during an active pulse are ignored.

3. **Change duration and cancel.** Select the timer and set Pulse duration to 1 second, then trigger again. Reset=1 cancels an active pulse immediately; return Reset=0 before the next experiment.

## Expected result

One rising trigger produces one fixed-duration pulse. Pausing freezes time; Reset can end a pulse early.

## Review questions

1. Why does holding Trigger high not keep the pulse active?
2. What does a trigger edge during an active pulse do?
3. How does Pause differ from Reset?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- Pulse traces for durations 0.5 s and 1 s, including one reset-shortened pulse.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.

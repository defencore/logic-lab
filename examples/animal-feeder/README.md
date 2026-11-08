# Animal feeder with feedback

Use bowl and hopper sensors to maintain food automatically instead of dispensing continuously.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Animal feeder with feedback** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines all control wiring; [lesson.js](./lesson.js) stores the bilingual walkthrough and assessment metadata. Open **3D** and select the matching scene to observe the real circuit-driven simulation. Keep application Run and the Scene run switch active for timed experiments.

This is an educational discrete-time model. The lamps, vehicles, trains, food or water are driven by the circuit; faults are deliberate lab experiments and require the documented recovery. It is not a physical traffic, railway, animal-care or industrial control design.

## Objectives

- Use bowl and hopper sensors to maintain food automatically instead of dispensing continuously.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Observe a feeding cycle.** Open the feeder in 3D. A hungry bowl sets the SR latch and starts dispensing; Full resets it. The remembered request continues between thresholds, while the animal consumes food. Watch the bowl, hopper and portions-eaten count change.

2. **Refill the hopper manually.** The empty-hopper guard blocks automatic dispensing without food. Click Refill hopper from 0 to 1 once to fill the hopper to capacity, then return it to 0. Holding it high does not refill repeatedly, and refill does not directly fill the bowl.

3. **Bypass feedback and recover.** Turn Force dispensing on. It bypasses the full/empty guard; continued dispensing can overfill the bowl and latch Alarm. Turn Force dispensing off before pulsing Reset feeder. A refill alone does not clear a recorded alarm.

## Expected result

Feedback fills a hungry bowl only until Full, then waits for hunger again. Manual hopper refill is edge-triggered; an unsafe manual dispense can latch an alarm.

## Review questions

1. Why is a latch useful between Hungry and Full?
2. Why is Empty about the hopper rather than the bowl?
3. What changes on a refill edge, and what does it leave unchanged?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A bowl/hopper level trace for two automatic cycles, a refill observation and an alarm/recovery record.

## Extension

Change one timing, threshold or control connection, predict its effect, and record the observed signals and 3D outcome. Restore the starting circuit or reset after each fault so one recorded failure cannot hide the next experiment. Export tested variants under separate filenames.

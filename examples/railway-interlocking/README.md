# Railway block interlocking

Grant one train the shared track, retain turnout position while occupied and close the crossing before trains enter.

**Estimated time:** 40 minutes. **Level:** intermediate.

## Starting circuit

Open **Railway block interlocking** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines all control wiring; [lesson.js](./lesson.js) stores the bilingual walkthrough and assessment metadata. Open **3D** and select the matching scene to observe the real circuit-driven simulation. Keep application Run and the Scene run switch active for timed experiments.

This is an educational discrete-time model. The lamps, vehicles, trains, food or water are driven by the circuit; faults are deliberate lab experiments and require the documented recovery. It is not a physical traffic, railway, animal-care or industrial control design.

## Objectives

- Grant one train the shared track, retain turnout position while occupied and close the crossing before trains enter.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Follow automatic dispatch.** Open the railway scene in 3D. At Throttle=30 km/h the approach and occupied sensors admit one train at a time, with A priority when both request. The SR latch remembers the selected points route while a train occupies the block. The barrier closes for an approach or occupied track.

2. **Observe a collision.** Leave Force barrier open=0 and Throttle=30. Pulse Reset railway, then turn Unsafe both-signals override on. Both trains enter the single track from opposite ends and collide. The fault lamp stays on and involved trains stop. Disable the override before resetting.

3. **Test overspeed separately.** After a clean reset with both overrides off, set Throttle Value=120. It is an actual km/h command, not a percentage. Exceeding speedLimit=60 latches an overspeed fault; entering the turnout too fast can derail a train. Restore 30 before resetting.

4. **Open the crossing unsafely.** At safe speed and with the signal override off, turn Force barrier open on. The physical barrier stays raised despite the approach logic; a train reaching the crossing latches an open-barrier fault. Restore the barrier and reset to clear the fault record. Never change points while the block is occupied.

## Expected result

Interlocked dispatch moves trains safely and increments Passed. Collision, overspeed, an open crossing or moving occupied points produce visible latched faults.

## Review questions

1. Why must points retain their route after the approach request disappears?
2. What prevents simultaneous admission when both approaches request?
3. How do collision and other fault latches differ from a current sensor level?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A dispatch/occupancy trace plus separate collision, overspeed and open-barrier fault observations after clean resets.

## Extension

Change one timing, threshold or control connection, predict its effect, and record the observed signals and 3D outcome. Restore the starting circuit or reset after each fault so one recorded failure cannot hide the next experiment. Export tested variants under separate filenames.

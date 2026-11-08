# Four-phase traffic junction

Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Four-phase traffic junction** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines all control wiring; [lesson.js](./lesson.js) stores the bilingual walkthrough and assessment metadata. Open **3D** and select the matching scene to observe the real circuit-driven simulation. Keep application Run and the Scene run switch active for timed experiments.

This is an educational discrete-time model. The lamps, vehicles, trains, food or water are driven by the circuit; faults are deliberate lab experiments and require the documented recovery. It is not a physical traffic, railway, animal-care or industrial control design.

## Objectives

- Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Watch a complete traffic cycle.** Open the junction in 3D and keep both app Run and Scene run active. The two low counter bits select NS green, NS amber, EW green and EW amber. The 0.1 Hz clock advances phases every 10 seconds after the first 5-second half-cycle.

2. **Explain the clearance interval.** During each amber phase neither axis has a green light. Vehicles already crossing can clear before the other axis receives green. Observe queues, moving cars and the passed counter; inspect decoder gates to follow each phase.

3. **Bypass the safe sequence.** For a repeatable collision, set Unsafe east/west override=0, pulse Reset junction from 0 to 1 and back, then turn the override on immediately. Both directions now receive green at the initial phase. Cars physically collide and Crash latches; changing lamps afterward does not undo the collision.

4. **Recover and pause.** Turn the unsafe override off before pulsing Reset junction again. Scene run=0 freezes traffic and holds the phase counter, while the source clock can continue. Return Scene run=1 to resume the controlled cycle.

## Expected result

Safe phases service both axes without collision. The unsafe override produces a real collision and a latched Crash that requires reset.

## Review questions

1. Why are mutually exclusive greens alone insufficient without clearance time?
2. Which counter bits determine the four phases?
3. Why must the unsafe override be removed before reset?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A four-phase signal table, queue/passed observations and a collision/recovery screenshot pair.

## Extension

Change one timing, threshold or control connection, predict its effect, and record the observed signals and 3D outcome. Restore the starting circuit or reset after each fault so one recorded failure cannot hide the next experiment. Export tested variants under separate filenames.

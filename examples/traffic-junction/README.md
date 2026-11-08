# Four-phase traffic junction

Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Four-phase traffic junction** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines the actual control wiring; [lesson.js](./lesson.js) contains the bilingual lesson and assessment metadata. Open **3D** and keep application Run and Scene run active for timed observations.

Vehicles are finite bodies on shared road/track geometry. A red signal stops the front before its line; physical contact, rather than a signal combination or a decorative prop, determines a collision. Reset after correcting an intentionally unsafe experiment.

## Objectives

- Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Watch a complete traffic cycle.** Open the junction in 3D and keep both app Run and Scene run active. The two low counter bits select NS green, NS amber, EW green and EW amber. The 0.1 Hz clock advances phases every 10 seconds after the first 5-second half-cycle.

2. **Explain the clearance interval.** During each amber phase neither axis has green. A red or amber car stops with its complete nose before the zebra and stop line; following cars retain a body-length gap. Vehicles already beyond the line clear before the other axis receives green. Observe both queues and actual passed cars.

3. **Bypass the safe sequence.** For a repeatable collision, pause the app, turn Unsafe east/west override off, and click Reset simulation in the 3D panel to restart the clock at time zero. Turn the override on before resuming. Both directions now receive green during the initial phase; actual vehicle bodies collide and Crash latches. Changing lamps afterward does not undo the collision.

4. **Recover and pause.** Turn the unsafe override off before pulsing Reset junction again. Scene run=0 freezes traffic and holds the phase counter, while the source clock can continue. Return Scene run=1 to resume the controlled cycle.

## Expected result

Safe phases keep stopped vehicle noses before the zebra, preserve queue spacing and serve both directions. The unsafe override can cause contact between actual vehicle bodies and latch Crash; signals alone are not a collision.

## Review questions

1. Why are mutually exclusive greens alone insufficient without clearance time?
2. Which counter bits determine the four phases?
3. Why must the unsafe override be removed before reset?
4. Where is the front of a stopped car relative to the zebra, and what clearance remains between queued bodies?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A four-phase signal table, queue/passed observations and a collision/recovery screenshot pair.

## Extension

Change one timing or speed, predict vehicle clearance, and compare the full body positions with stop lines and conflicting paths. Preserve the original starting JSON and export each tested variant separately.

# A traffic light from three bits

Control red, amber and green lamps and distinguish a valid state from permission to proceed.

**Estimated time:** 15 minutes. **Level:** beginner.

## Starting circuit

Open **A traffic light from three bits** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines all control wiring; [lesson.js](./lesson.js) stores the bilingual walkthrough and assessment metadata. Open **3D** and select the matching scene to observe the real circuit-driven simulation. The lamps and validity outputs update immediately, even while the application is paused; this circuit has no Scene run switch or timing process.

This is an educational discrete-time model. The lamps, vehicles, trains, food or water are driven by the circuit; faults are deliberate lab experiments and require the documented recovery. It is not a physical traffic, railway, animal-care or industrial control design.

## Objectives

- Control red, amber and green lamps and distinguish a valid state from permission to proceed.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Open the traffic-light scene.** Click 3D and choose the traffic-light scene. Red starts on and the other lamps off. Valid is 1 but Go is 0: a valid stop signal is not permission to drive.

2. **Try amber, then green.** Turn Red off and Amber on: the middle lamp lights but Go stays 0. Turn Amber off and Green on: Go becomes 1. Exactly one lamp must be active.

3. **Create and fix an invalid state.** Leave Green on and also turn Red on. Both lamps visibly light, Valid becomes 0 and Go is withdrawn. All three lamps off is invalid too. Restore a single active lamp.

## Expected result

A valid state has exactly one active lamp. Go is 1 only for a valid green-only state.

## Review questions

1. Why can Valid=1 while Go=0?
2. What does this simplified model do with red and amber together?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A table of all eight lamp combinations with Valid and Go.

## Extension

Change one timing, threshold or control connection, predict its effect, and record the observed signals and 3D outcome. Restore the starting circuit or reset after each fault so one recorded failure cannot hide the next experiment. Export tested variants under separate filenames.

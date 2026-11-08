# Railway and road interlocking

Alternate road and rail windows, close the road gates, clear the crossing and reserve the complete train route.

**Estimated time:** 40 minutes. **Level:** intermediate.

## Starting circuit

Open **Railway and road interlocking** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines the actual control wiring; [lesson.js](./lesson.js) contains the bilingual lesson and assessment metadata. Open **3D** and keep application Run and Scene run active for timed observations.

Vehicles are finite bodies on shared road/track geometry. A red signal stops the front before its line; physical contact, rather than a signal combination or a decorative prop, determines a collision. Reset after correcting an intentionally unsafe experiment.

## Objectives

- Alternate road and rail windows, close the road gates, clear the crossing and reserve the complete train route.
- Verify complete-body route reservation and distinguish an unsafe command from a physical collision.

## Procedure

1. **Observe the first road window.** Open the railway scene in 3D and keep Scene run active. The 0.025 Hz clock starts with a 20-second road window: cars cross while the trains queue at red signals. It then grants a 20-second rail window. X-ray-style readouts expose the actual circuit signals, not an independent animation.

2. **Wait for gates and cars to clear.** A rail window with an approach request asks the road gates to close. Closing takes time, and vehicles already inside must drive completely out first. Gate ready requires both Gate closed=1 and Crossing clear=1; only then can a selected train receive green. Queued road vehicles stop before the crossing, not on it.

3. **Keep the route until the complete train clears.** The selected train reserves the converging, shared and divergent route after passing its red stop line. Occupied remains high until the entire rear of the train has left that protected corridor. The points latch must hold throughout; the other train stays red. A road window cannot reopen the gates while this reservation is still occupied.

4. **Bypass the guards and inspect real contact.** For an unsafe trial, remove all overrides, reset, then turn Unsafe both-signals override on. It bypasses the rail window, occupancy and gate-ready guards. Inspect the moving trains and road cars: collision is recorded only when their physical bodies contact, while a wrong turnout or excessive speed can derail a train separately. Restore safe controls before each reset; use Throttle=120 for a separate overspeed trial.

5. **Compare an open gate with a collision.** With the unsafe override off, Force barrier open=1 prevents Gate closed and the interlock keeps trains red while cars continue to cross. An empty road does not cause a crash merely because a gate is open. Combining an open gate with the unsafe signal override removes that protection; a crossing accident occurs only if a train actually contacts a road vehicle. Restore both overrides before reset.

## Expected result

Both trains and road cars make repeated safe passages. Trains wait for physically closed gates and a clear crossing; points and gates stay protected until the entire train clears. Unsafe bypasses can create real body collisions or derailments, not phantom crashes on an empty road.

## Review questions

1. Why do closed-gate commands differ from the Gate closed feedback bit?
2. Why must the complete rear of a train clear before handing over points?
3. How does a road window reopen traffic without interrupting a committed train?
4. Why can an open crossing remain collision-free when no road vehicle is present?

## Deliverables

- An exported .logic.json interlocking circuit.
- A three-minute observation showing nonzero train and road-vehicle passages, gate-ready signals and full-body reservation handovers.
- A safe forced-open observation and a separately reset unsafe physical collision or derailment record.

## Extension

Change one timing or speed, predict vehicle clearance, and compare the full body positions with stop lines and conflicting paths. Preserve the original starting JSON and export each tested variant separately.

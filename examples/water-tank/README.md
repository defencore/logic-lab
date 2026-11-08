# Tank level with hysteresis

Maintain water between low and high sensors using a remembered pump request, then test an unsafe override.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Tank level with hysteresis** in the laboratory catalog, or download [circuit.json](./circuit.json) and import it. The canonical JSON defines all control wiring; [lesson.js](./lesson.js) stores the bilingual walkthrough and assessment metadata. Open **3D** and select the matching scene to observe the real circuit-driven simulation. Keep application Run and the Scene run switch active for timed experiments.

This is an educational discrete-time model. The lamps, vehicles, trains, food or water are driven by the circuit; faults are deliberate lab experiments and require the documented recovery. It is not a physical traffic, railway, animal-care or industrial control design.

## Objectives

- Maintain water between low and high sensors using a remembered pump request, then test an unsafe override.
- Relate visible 3D behavior to the actual circuit signals and feedback.

## Procedure

1. **Watch a complete fill/drain cycle.** Open the tank in 3D with Drain outlet=1. The water drains until Low sets the SR latch, then the pump fills until High resets it. Between the two thresholds the latch remembers whether filling or draining is in progress.

2. **Compare sensors with the pump request.** Select the tank and inspect Low, High and Level. Both sensors can be 0 between 20% and 80%, while the pump may be either on or off depending on the preceding threshold. Drain outlet=0 closes the outlet; it does not force the pump on.

3. **Cause and clear an overflow.** Set Drain outlet=0 and Force pump on=1. The override bypasses the high-level stop, so the tank reaches capacity and spills; Overflow latches. Turn the override off, reopen the drain, and pulse Reset tank to return to a clean initial state.

## Expected result

Automatic feedback cycles between approximately 20% and 80% without spilling. A forced pump with a closed outlet reaches 100% and latches Overflow until reset.

## Review questions

1. Why can the pump be on or off at the same middle level?
2. How do pumpRate and drainRate combine while both are active?
3. Why does clearing the override not erase the overflow history?

## Deliverables

- An exported .logic.json project with the tested control circuit.
- A low/high/pump/level trace and an overflow demonstration followed by reset recovery.

## Extension

Change one timing, threshold or control connection, predict its effect, and record the observed signals and 3D outcome. Restore the starting circuit or reset after each fault so one recorded failure cannot hide the next experiment. Export tested variants under separate filenames.

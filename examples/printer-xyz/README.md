# Three-axis printer

Animate X, Y and Z together with independent controls, different screw leads and six endstops.

**Estimated time:** 30 minutes. **Level:** intermediate.

## Starting circuit

Open **Three-axis printer** from the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it. The JSON file is the canonical circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. Click the app header's **3D** button to see the X, Y and Z mechanics immediately. All six direction and enable controls and the shared clock setting are available inside that panel.

No hardware is required. This is an idealized printer mechanism without acceleration planning, inertia, missed steps, current control or backlash. Endstop sensors report position; the motor model itself clamps travel at configured hard limits. This laboratory does not wire an automatic homing interlock.

## Objectives

- Observe three simultaneous printer axes and separate pulse timing from per-axis mechanics and controls.
- Measure shared-clock travel ratios and verify independent direction, enable and limit behavior.

## Procedure

1. **Open the three-axis printer.** Click 3D in the app header to open the mechanical view. Keep the simulation running; press Run only if paused. All three motors share a 40 Hz STEP clock, but each has its own direction and enable switch in the 3D panel. The first three motors are displayed as X, Y and Z.

2. **Compare travel from the same pulses.** Use Reset simulation in the 3D panel to restore X=5, Y=10 and Z=3 mm. At 40 Hz, X and Y each travel 1.6 mm per simulated second because their lead is 8 mm/revolution. Z travels 0.4 mm/s because its lead is 2 mm/revolution. Compare live readouts and the rotating shafts.

3. **Reverse Y and hold X independently.** Set Y direction=0 in the 3D panel: Y reverses while X and Z continue positively. Set X enable=0: only X holds position while Y and Z keep moving. Re-enable X when ready. The shared clock never changes merely because one axis is disabled.

4. **Inspect endstops and camera views.** Restore all direction and enable switches to 1. Try Perspective, Front and Top camera buttons; drag to orbit, scroll to zoom and right-drag to pan. Increase the shared clock to 200 Hz to reach the 20 mm endpoints sooner. Each maximum endstop and lamp activates at 20 mm; hard limits clamp travel. Set a direction to 0 to reverse away and release its endstop. The minimum sensors activate at 0 mm.

## Expected result

All axes animate together. At 40 Hz, X/Y move 1.6 mm/s and Z 0.4 mm/s; direction and enable act independently, and six endstops report the 0/20 mm boundaries.

With 200 full steps per revolution and one microstep, each pulse moves X/Y by 8/200=0.04 mm and Z by 2/200=0.01 mm. Forty pulses therefore move X/Y by 1.6 mm and Z by 0.4 mm. Initial coordinates are X=5, Y=10 and Z=3 mm, and all rails span 0–20 mm.

## Review questions

1. Why do X and Y travel four times farther than Z for the same number of STEP pulses?
2. What happens to the other axes when X enable is off?
3. Does reaching a hard limit stop the shared clock?
4. How does a maximum endstop change when its axis reverses away?

## Deliverables

- An exported printer-xyz .logic.json experiment.
- A one-second displacement table for X, Y and Z at 40 Hz.
- Screenshots from two camera views plus observations of independent reversal, disabling and endstop activation.

## Extension

Change one axis's microsteps while retaining the shared clock, predict its new travel ratio, and compare the measured result. Then adapt the separate printer-homing laboratory's enable interlock to home one of these axes. Save each tested variant as a new exported project.

# Logic Lab laboratory collection

These 24 reusable laboratories accompany the browser workbench. Each laboratory has a separate directory so its starting circuit, teaching material and assessment tasks can be reviewed or reused independently. The interface lessons and worksheet metadata support English and Ukrainian; the Markdown lab sheets are in English.

## Open a laboratory

1. In Logic Lab, open **Examples**, search by component or topic, and select a laboratory.
2. Alternatively, download its `circuit.json` file from the table below and import the file in the app. The project retains its `exampleId`, so the matching lesson remains available.
3. Follow the live lesson, change the highlighted controls, and record the requested evidence. Timed experiments start running automatically; pause them for measurements when useful.
4. Export your completed circuit under a new filename and submit it with the laboratory's requested tables, traces and answers.

| Laboratory                                                     | Topic        | Level        | Time   | Starting circuit                            |
| -------------------------------------------------------------- | ------------ | ------------ | ------ | ------------------------------------------- |
| [Half adder](./half-adder/README.md)                           | basics       | beginner     | 15 min | [JSON](./half-adder/circuit.json)           |
| [Seven logic gates](./logic-gates/README.md)                   | basics       | beginner     | 20 min | [JSON](./logic-gates/circuit.json)          |
| [Full adder](./full-adder/README.md)                           | basics       | beginner     | 20 min | [JSON](./full-adder/circuit.json)           |
| [One-bit memory](./d-memory/README.md)                         | sequential   | beginner     | 20 min | [JSON](./d-memory/circuit.json)             |
| [Binary counter](./counter/README.md)                          | sequential   | beginner     | 20 min | [JSON](./counter/circuit.json)              |
| [BCD display](./bcd-display/README.md)                         | basics       | beginner     | 15 min | [JSON](./bcd-display/circuit.json)          |
| [Route an eight-bit bus](./bus-mux/README.md)                  | architecture | intermediate | 25 min | [JSON](./bus-mux/circuit.json)              |
| [Arithmetic & logic unit](./alu/README.md)                     | architecture | intermediate | 25 min | [JSON](./alu/circuit.json)                  |
| [Read & write memory](./ram/README.md)                         | architecture | intermediate | 30 min | [JSON](./ram/circuit.json)                  |
| [Open-drain wired AND](./wired-and/README.md)                  | physical     | intermediate | 25 min | [JSON](./wired-and/circuit.json)            |
| [Schmitt hysteresis](./schmitt/README.md)                      | physical     | intermediate | 25 min | [JSON](./schmitt/circuit.json)              |
| [One trigger, one pulse](./monostable/README.md)               | physical     | beginner     | 20 min | [JSON](./monostable/circuit.json)           |
| [Digital–analog round trip](./adc-dac/README.md)               | mixed        | beginner     | 25 min | [JSON](./adc-dac/circuit.json)              |
| [Compare AM and FM](./mixed-signals/README.md)                 | mixed        | intermediate | 30 min | [JSON](./mixed-signals/circuit.json)        |
| [PWM & control surfaces](./pwm-servos/README.md)               | mixed        | intermediate | 25 min | [JSON](./pwm-servos/circuit.json)           |
| [Stepper motor: STEP and DIR](./stepper-basics/README.md)      | motion       | beginner     | 25 min | [JSON](./stepper-basics/circuit.json)       |
| [Printer axis homing](./printer-homing/README.md)              | motion       | intermediate | 30 min | [JSON](./printer-homing/circuit.json)       |
| [Closed-loop position control](./position-control/README.md)   | motion       | intermediate | 35 min | [JSON](./position-control/circuit.json)     |
| [Three-axis printer](./printer-xyz/README.md)                  | motion       | intermediate | 30 min | [JSON](./printer-xyz/circuit.json)          |
| [A traffic light from three bits](./traffic-light/README.md)   | scenes       | beginner     | 15 min | [JSON](./traffic-light/circuit.json)        |
| [Four-phase traffic junction](./traffic-junction/README.md)    | scenes       | intermediate | 30 min | [JSON](./traffic-junction/circuit.json)     |
| [Railway block interlocking](./railway-interlocking/README.md) | scenes       | intermediate | 40 min | [JSON](./railway-interlocking/circuit.json) |
| [Animal feeder with feedback](./animal-feeder/README.md)       | scenes       | intermediate | 30 min | [JSON](./animal-feeder/circuit.json)        |
| [Tank level with hysteresis](./water-tank/README.md)           | scenes       | intermediate | 30 min | [JSON](./water-tank/circuit.json)           |

## Directory contract

Each laboratory contains:

- `circuit.json`: the canonical editable starting circuit, compatible with the app's project importer. Circuit nodes, wires and parameters are defined only here.
- `lesson.js`: bilingual catalog text, live lesson steps referencing circuit node IDs, and a `lab` record. That record contains an estimated duration in minutes and bilingual objectives, tasks, review questions and deliverables.
- `README.md`: an English lab sheet with objectives, procedure, expected results, review questions and deliverables.

The [registry](./index.js) imports these files and returns a fresh clone each time a laboratory opens. Editing a canvas does not change the original exercise. Every asset is included in the static distribution; opening laboratories requires no server API or account.

## Circuit-driven scenes

The scene laboratories connect ordinary gates, latches, counters and switches to a visible process. Traffic phases move actual vehicles; railway permissions govern shared-track trains; feeder and tank sensors close real feedback loops. Unsafe overrides produce observable collisions, derailments, empty-hopper alarms or overflow instead of a decorative animation. Recover with the documented reset procedure before the next trial.

## Reuse in a course

Assign the lab sheet and starting JSON together. Students can work locally or in the deployed browser app, then submit an exported project plus the requested evidence. Evaluate both the observed result and the explanation; screenshots alone do not establish why a circuit behaves as it does. The **Extension** section in each lab sheet proposes a controlled variation for independent work.

For motion labs, positions are millimeters and STEP is edge-triggered. The modeled printer axis is idealized: it has no inertia, backlash, missed steps, current regulation or acceleration planning. Homing and position-control exercises illustrate digital interlocks and feedback, rather than firmware or wiring instructions for a physical machine.

## Add a laboratory

Create a new directory with the three files above, register its JSON and lesson metadata in `index.js`, and give it a unique `exampleId`. Use existing component and pin IDs, provide both languages for all lesson metadata, and keep every step's `nodes` list aligned with the circuit. Validate the circuit, test its actual interaction sequence, and verify that its JSON and lab sheet are included in the static build.

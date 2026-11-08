# Logic Lab laboratory collection

These 43 reusable laboratories accompany the browser workbench. Each laboratory has a separate directory so its starting circuit, teaching material and assessment tasks can be reviewed or reused independently. The interface lessons and worksheet metadata support English and Ukrainian; the original Markdown lab sheets are in English, and the automation, dispatch, memory/addressing, keyboard, keypad lock, elevator and buzzer sheets include full English and Ukrainian procedures.

## Open a laboratory

1. In Logic Lab, open **Learning examples**, search by component or topic, and select a laboratory.
2. Alternatively, download its `circuit.json` file from the table below and import the file in the app. The project retains its `exampleId`, so the matching lesson remains available.
3. Follow the live lesson, change the highlighted controls, and record the requested evidence. Timed experiments start running automatically; pause them for measurements when useful.
4. Export your completed circuit under a new filename and submit it with the laboratory's requested tables, traces and answers.

| Laboratory                                                              | Topic        | Level        | Time   | Starting circuit                             |
| ----------------------------------------------------------------------- | ------------ | ------------ | ------ | -------------------------------------------- |
| [Half adder](./half-adder/README.md)                                    | basics       | beginner     | 15 min | [JSON](./half-adder/circuit.json)            |
| [Seven logic gates](./logic-gates/README.md)                            | basics       | beginner     | 20 min | [JSON](./logic-gates/circuit.json)           |
| [Full adder](./full-adder/README.md)                                    | basics       | beginner     | 20 min | [JSON](./full-adder/circuit.json)            |
| [Keyboard inputs](./keyboard-inputs/README.md)                          | basics       | beginner     | 20 min | [JSON](./keyboard-inputs/circuit.json)       |
| [Active buzzer alarm](./active-buzzer-alarm/README.md)                  | basics       | beginner     | 20 min | [JSON](./active-buzzer-alarm/circuit.json)   |
| [Passive buzzer: record a melody](./passive-buzzer-melody/README.md)    | mixed        | beginner     | 25 min | [JSON](./passive-buzzer-melody/circuit.json) |
| [Buzzer: build a clock divider](./buzzer-clock-divider/README.md)       | sequential   | intermediate | 25 min | [JSON](./buzzer-clock-divider/circuit.json)  |
| [One-bit memory](./d-memory/README.md)                                  | sequential   | beginner     | 20 min | [JSON](./d-memory/circuit.json)              |
| [Binary counter](./counter/README.md)                                   | sequential   | beginner     | 20 min | [JSON](./counter/circuit.json)               |
| [BCD display](./bcd-display/README.md)                                  | basics       | beginner     | 15 min | [JSON](./bcd-display/circuit.json)           |
| [Route eight separate data lines](./bus-mux/README.md)                  | architecture | intermediate | 25 min | [JSON](./bus-mux/circuit.json)               |
| [Arithmetic & logic unit](./alu/README.md)                              | architecture | intermediate | 25 min | [JSON](./alu/circuit.json)                   |
| [Read & write memory](./ram/README.md)                                  | architecture | intermediate | 30 min | [JSON](./ram/circuit.json)                   |
| [Open-drain wired AND](./wired-and/README.md)                           | physical     | intermediate | 25 min | [JSON](./wired-and/circuit.json)             |
| [Schmitt hysteresis](./schmitt/README.md)                               | physical     | intermediate | 25 min | [JSON](./schmitt/circuit.json)               |
| [One trigger, one pulse](./monostable/README.md)                        | physical     | beginner     | 20 min | [JSON](./monostable/circuit.json)            |
| [Digital–analog round trip](./adc-dac/README.md)                        | mixed        | beginner     | 25 min | [JSON](./adc-dac/circuit.json)               |
| [Compare AM and FM](./mixed-signals/README.md)                          | mixed        | intermediate | 30 min | [JSON](./mixed-signals/circuit.json)         |
| [PWM & control surfaces](./pwm-servos/README.md)                        | mixed        | intermediate | 25 min | [JSON](./pwm-servos/circuit.json)            |
| [Stepper motor: STEP and DIR](./stepper-basics/README.md)               | motion       | beginner     | 25 min | [JSON](./stepper-basics/circuit.json)        |
| [Printer axis homing](./printer-homing/README.md)                       | motion       | intermediate | 30 min | [JSON](./printer-homing/circuit.json)        |
| [Closed-loop position control](./position-control/README.md)            | motion       | intermediate | 35 min | [JSON](./position-control/circuit.json)      |
| [Three-axis printer](./printer-xyz/README.md)                           | motion       | intermediate | 30 min | [JSON](./printer-xyz/circuit.json)           |
| [A traffic light from three bits](./traffic-light/README.md)            | scenes       | beginner     | 15 min | [JSON](./traffic-light/circuit.json)         |
| [Four-phase traffic junction](./traffic-junction/README.md)             | scenes       | intermediate | 30 min | [JSON](./traffic-junction/circuit.json)      |
| [Railway and road interlocking](./railway-interlocking/README.md)       | scenes       | intermediate | 40 min | [JSON](./railway-interlocking/circuit.json)  |
| [Animal feeder with feedback](./animal-feeder/README.md)                | scenes       | intermediate | 30 min | [JSON](./animal-feeder/circuit.json)         |
| [Tank level with hysteresis](./water-tank/README.md)                    | scenes       | intermediate | 30 min | [JSON](./water-tank/circuit.json)            |
| [Aquarium: life-support interlocks](./aquarium-life-support/README.md)  | automation   | intermediate | 35 min | [JSON](./aquarium-life-support/circuit.json) |
| [Aquarium: timed portions](./aquarium-feeding/README.md)                | automation   | intermediate | 30 min | [JSON](./aquarium-feeding/circuit.json)      |
| [Aquarium: day/night lighting](./aquarium-lighting/README.md)           | automation   | beginner     | 30 min | [JSON](./aquarium-lighting/circuit.json)     |
| [Greenhouse: climate and growth](./greenhouse-climate/README.md)        | automation   | intermediate | 35 min | [JSON](./greenhouse-climate/circuit.json)    |
| [Greenhouse: irrigation with memory](./greenhouse-irrigation/README.md) | automation   | intermediate | 35 min | [JSON](./greenhouse-irrigation/circuit.json) |
| [Smart home: comfort and energy](./home-climate/README.md)              | automation   | beginner     | 30 min | [JSON](./home-climate/circuit.json)          |
| [Smart yard: access, rain and water](./yard-security/README.md)         | automation   | intermediate | 40 min | [JSON](./yard-security/circuit.json)         |
| [Railway: switch and dispatch](./railway-dispatch/README.md)            | scenes       | intermediate | 40 min | [JSON](./railway-dispatch/circuit.json)      |

| [Shift register: serial loading and replay](./shift-register-sequence/README.md) | sequential | beginner | 25 min | [JSON](./shift-register-sequence/circuit.json) |
| [RAM: address isolation and write protection](./ram-addressing/README.md) | architecture | intermediate | 35 min | [JSON](./ram-addressing/circuit.json) |
| [ROM: address-to-display lookup table](./rom-lookup/README.md) | architecture | intermediate | 30 min | [JSON](./rom-lookup/circuit.json) |
| [Register file: independent read and write addresses](./register-file-addressing/README.md) | architecture | intermediate | 35 min | [JSON](./register-file-addressing/circuit.json) |
| [Memory map: two RAM banks selected by A4](./memory-bank-select/README.md) | architecture | intermediate | 40 min | [JSON](./memory-bank-select/circuit.json) |

| [Nine-floor elevator: memory and interlocks](./elevator-logic/README.md) | scenes | intermediate | 45 min | [JSON](./elevator-logic/circuit.json) |

| [Matrix keypad: ROM code lock](./keypad-code-lock/README.md) | architecture | intermediate | 40 min | [JSON](./keypad-code-lock/circuit.json) |

## Directory contract

Each laboratory contains:

- `circuit.json`: the canonical editable starting circuit, compatible with the app's project importer. Circuit nodes, wires and parameters are defined only here.
- `lesson.js`: bilingual catalog text, live lesson steps referencing circuit node IDs, and a `lab` record. That record contains an estimated duration in minutes and bilingual objectives, tasks, review questions and deliverables.
- `README.md`: a lab sheet with objectives, procedure, expected results, review questions and deliverables; the new automation and manual-dispatch sheets include both English and Ukrainian.

The [registry](./index.js) imports these files and returns a fresh clone each time a laboratory opens. Editing a canvas does not change the original exercise. Every asset is included in the static distribution; opening laboratories requires no server API or account.

## Addressing and memory experiments

The five focused memory laboratories cover manual SER/CLK/RST serial loading, independent RAM locations and write protection, ROM lookup tables, separate register-file read/write addresses, and a 32-byte map built from two RAM banks. Their bilingual lessons include replayable action presets. Each lab exposes every bit as a separate physical contact and includes a deterministic input sequence, predictions, and independent-work prompts.

The [matrix keypad lock](./keypad-code-lock/README.md) combines a real four-row/three-column scan, external key-map ROM and editable SECRET ROM. Its 2580# experiment captures comparisons before advancing addresses, rejects wrong/extra digits and clears through \*. Every press/release is preserved in the supplied mask-action preset.

## Audible logic and timing

The three buzzer laboratories progress from a Boolean alarm to a recorded melody and a clocked frequency divider. An active buzzer produces its internal 880 Hz tone from a steady enable; a passive buzzer needs repeating binary periods, with `f=1/(T1+T0)` in seconds. At 440 Hz, a complete period is 2.272727 ms, or 2272.727 µs. The divider uses real T-flip-flop clock edges to turn 880 Hz into 440 Hz. Each folder includes an editable circuit, bilingual sheet and legal recorded source actions. Run and press **Enable sound**; use **1×** for passive-note comparisons. Constant 0/1 inputs do not sustain a passive tone, and ideal gate feedback has no modeled propagation delay.

## Circuit-driven scenes

The scene laboratories connect ordinary gates, latches, counters and switches to a visible process. Traffic phases move actual vehicles; railway permissions and independently switched turnouts govern actual train routes; feeder and tank sensors close feedback loops. The Automation topic contains seven tasks for aquarium life support, timed feeding, XOR lighting, greenhouse climate and irrigation memory, home energy, and yard access with rain protection. Measured hazards can cause body contact, derailments, fish death, plant damage, empty-hopper alarms or overflow. Plant growth, gate travel, water reserves and energy evolve from circuit commands. Recover with the documented reset procedure before the next trial.

## Visible elevator control

The [elevator laboratory](./elevator-logic/README.md) uses a physical nine-floor cabin numbered **1–9** with explicit UP/DOWN/OPEN/CLOSE commands. Nine momentary CALL buttons feed visible SR memories; shared lowest-floor priority gates, binary target encoding, direction sensors and an external door timer control every trip. A ready nine-action recording serves **3 → 5 → 9 → 1**. The bilingual worksheet asks learners to explain another call order and recover an interlock-bypass fault. Its 140-component circuit remains within the 200-component recording cap. The plant does not dispatch or time doors automatically.

## Reuse in a course

Assign the lab sheet and starting JSON together. Students can work locally or in the deployed browser app, then submit an exported project plus the requested evidence. Evaluate both the observed result and the explanation; screenshots alone do not establish why a circuit behaves as it does. The **Extension** section in each lab sheet proposes a controlled variation for independent work.

For motion labs, positions are millimeters and STEP is edge-triggered. The modeled printer axis is idealized: it has no inertia, backlash, missed steps, current regulation or acceleration planning. Homing and position-control exercises illustrate digital interlocks and feedback, rather than firmware or wiring instructions for a physical machine.

## Add a laboratory

Create a new directory with the three files above, register its JSON and lesson metadata in `index.js`, and give it a unique `exampleId`. Use existing component and pin IDs, provide both languages for all lesson metadata, and keep every step's `nodes` list aligned with the circuit. Validate the circuit, test its actual interaction sequence, and verify that its JSON and lab sheet are included in the static build.

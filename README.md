# Logic Lab

A browser-based digital and mixed-signal circuit playground, designed for [logic-lab.defencore.com](https://logic-lab.defencore.com) on GitHub Pages. The editor and simulator run entirely on the visitor's device. No account, application server, external font, or runtime service is required.

The interface supports English and Ukrainian. Source comments and project documentation are in English.

## Run locally

Use Node.js 22 or newer. Install the pinned dependencies before starting the local preview server.

```sh
npm ci
npm start
```

Open the local address printed by the server. To validate the application and prepare the static distribution:

```sh
npm ci
npm run check
npm run format:check
npm test
npm run build
```

The application is written as JavaScript modules. The build bundles Three.js and all application code into local static assets; there are no runtime CDN requests or application servers. The Node preview server serves the same `dist/` layout as GitHub Pages and watches source imports. Open the preview URL over HTTP rather than opening `index.html` as a local file.

## Build circuits

- Search or filter the component library and add a component to the canvas.
- Drag components to reposition them. The grid helps align the circuit.
- Click an output pin, then an input pin, to connect them. Choose orthogonal or curved routing. Bus connections show their bit width; use a splitter or merger to connect individual bits.
- Select a component to edit its label, parameters, and enabled state in the inspector. Disabled components release their outputs to high impedance.
- Toggle switches on the canvas, run or pause the simulation, and use a single step to inspect changes.
- Add notes and colored groups to explain parts of a circuit. Use the scope and signal indicators to inspect activity.
- Use the included examples as starting points, including arithmetic, a BCD display, sequential logic, mixed signals, and PWM servo control.

## Learn with guides and experiments

The library contains 54 components with guides in English and Ukrainian. Click the question-mark button beside a library component to read its guide without adding it to the circuit. For a selected component, switch between **Properties** and **Usage guide** in the inspector. Each guide explains the component's purpose, input and output pins, settings, a wiring procedure, an experiment, expected results, and common mistakes. Related examples open a complete circuit for further exploration.

The **Examples** catalog contains 19 editable laboratories. Search by name or topic and filter by topic or difficulty. Laboratories cover gates and arithmetic, clocked state, displays, buses, memory, mixed signals, physical signal behavior, PWM control surfaces, stepper motors, printer-style homing and position feedback.

After opening an example, a lesson panel appears above the canvas. Follow its steps with **Previous** and **Next**, watch the highlighted components and live pin values, and open the relevant component in the inspector. Change a switch, numeric value, or slider and compare the result with the lesson's expected behavior. Run the circuit to advance clocks and waveforms, or pause and use **Step** to examine changes in smaller increments.

Numeric settings, text fields, colors, and duty-cycle sliders update the circuit while you edit them. The selected lesson and step context remain available as you explore the circuit; exporting and importing the project preserves the example association so its lesson can be reopened.

The signal monitor prioritizes selected components and oscilloscope probes. Choose a 0.25, 1, or 5 second time window; use the shorter window for fast signals such as the 105 Hz PWM example. Changing this window clears the previous trace and starts sampling at the new rate.

Changes are saved automatically in browser local storage when available. Export a project to JSON for a portable backup or import a JSON project to continue editing. Browser storage belongs to this origin and browser profile; private browsing, browser settings, and clearing site data can remove it.

### Reusable laboratory files

The [laboratory collection](./examples/README.md) stores each exercise in its own `examples/<id>/` directory. Download a lab's `circuit.json` and import it directly, or open the same circuit from the in-app catalog. Each folder also contains bilingual `lesson.js` metadata and an English `README.md` lab sheet with an estimated duration, objectives, a procedure, review questions and deliverables. Export completed work as a separate project; the supplied starting circuit stays unchanged.

The motion sequence progresses from [STEP/DIR fundamentals](./examples/stepper-basics/README.md), through [automatic printer-axis homing](./examples/printer-homing/README.md), to [closed-loop position control](./examples/position-control/README.md). Homing uses a minimum endstop and an enable interlock that permits reversing away from home. Position control shares one target between direction and arrival sensors, then stops inside a tolerance window.

### Keyboard and navigation

| Action                      | Control                                                   |
| --------------------------- | --------------------------------------------------------- |
| Run or pause                | R                                                         |
| Delete selection            | Delete / Backspace                                        |
| Undo                        | Ctrl / Cmd + Z                                            |
| Redo                        | Ctrl / Cmd + Shift + Z                                    |
| Save project                | Ctrl / Cmd + S                                            |
| Fit circuit                 | F / Home                                                  |
| Cancel a pending connection | Escape                                                    |
| Zoom at the cursor          | Mouse wheel / trackpad pinch                              |
| Zoom at the center          | + / −                                                     |
| Reset zoom to 100%          | 0 / click the zoom percentage                             |
| Pan                         | Hold Space or Shift and drag; middle/right drag; Pan tool |
| Pan with the wheel          | Shift + wheel / Alt + wheel / horizontal scroll           |
| Select several components   | Ctrl / Cmd + click                                        |
| Select an area              | Drag an empty canvas area                                 |

Shortcuts are ignored while editing text or values. On narrow screens the inspector opens over the canvas when a component is selected; close it to return to the full canvas.

Canvas navigation follows WirePad: wheel zoom stays anchored at the cursor, temporary pan restores the chosen tool on release, and the zoom range is 1–400%. The component library exposes every category with a count and separate add/help actions. The laboratory catalog has a topic sidebar, search and difficulty filters, with separate circuit, worksheet and JSON actions.

## Component library

| Family                 | Components                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Logic gates            | AND, OR, NOT, NAND, NOR, XOR, XNOR                                                                      |
| Sources and indicators | GND, VCC, toggle switch, numeric bus input, clock, LED, LED matrix, seven-segment display, oscilloscope |
| Combinational          | Multiplexer, demultiplexer, half adder, full adder, comparator, encoder, decoder                        |
| Sequential             | SR latch, D / JK / T flip-flops, register, shift register, binary counter                               |
| Mixed signals          | ADC, DAC, AM / FM generators, PWM generator, servo bank                                                 |
| Architecture           | ALU, tri-state buffer, priority encoder, bus splitter and merger                                        |
| Memory                 | RAM, ROM, register file                                                                                 |
| Physical behavior      | Open-drain output, pull-up and pull-down, Schmitt trigger, monostable                                   |
| Annotation             | Text notes and colored groups                                                                           |

Bus pins have a fixed eight-bit width unless a component's pin explicitly indicates a different width, such as a four-bit memory address. The numeric bus input exposes eight-bit data, a four-bit nibble, and a three-bit address output. Use the inspector and pin labels to see the signal interface.

### Simulation model

This is an educational behavioral simulator, not a transistor-level or SPICE simulator. Combinational logic settles iteratively; stateful components update on simulation steps and clock edges. There are no modeled propagation delays, setup or hold constraints, metastability, drive-current limits, thermal effects, or transistor-level TTL/CMOS characteristics.

Signals carry numeric values, `Z` (high impedance), or `X` (unknown or contention). Disconnected and released outputs remain high impedance. Conflicting driven values produce an unknown state. Pull resistors are weak drivers, allowing an open-drain output to override a pull-up. Logic gates propagate unknown inputs according to their operation. A feedback loop that does not settle is reported through simulation diagnostics.

Analog generators and scopes show sampled values. ADC/DAC conversion, Schmitt hysteresis, monostable timing, PWM pulses, and servo motion are simplified discrete-time models. The editor subdivides time into steps no larger than 0.5 ms (the Step button advances 10 ms total). Digital PWM edge measurements are quantized to that interval; connect the PWM duty output to the servo for an exact duty-to-angle mapping. Frequencies should stay well below the 1 kHz physics sampling limit. Faster signals cannot be represented accurately. Trace histories use a separate sampling interval determined by the time window; long windows can alias fast waveforms without changing the circuit's clock-edge evaluation. Servo visualization is a teaching aid and does not represent a hardware motor controller.

RAM, ROM, and register-file sizes are intentionally bounded for interactive examples. Their contents are simulation state unless explicitly supplied through component parameters; JSON projects store circuit structure and parameters, not an instantaneous memory snapshot or scope trace.

## Architecture

- `index.html` and `style.css`: static editor shell and presentation.
- `src/catalog.js`: component definitions, pins, defaults, and bilingual descriptions.
- `src/simulator.js`: browser-independent signal evaluation and sequential state.
- `src/project.js`: validated project import/export and local persistence.
- `examples/index.js` and `examples/<id>/`: laboratory registry, canonical JSON circuits, bilingual lessons and English lab sheets.
- `src/guides.js`: bilingual component manuals, pin descriptions, experiments, and related examples.
- `src/geometry.js`: grid placement, component dimensions, pin positions, and wire routing.
- `src/ui-utils.js`: shared escaping, color validation, and signal formatting.
- `src/learning-ui.js`: component guide and example catalog rendering.
- `src/waveforms.js`: sampled signal plotting with gaps for unknown values.
- `src/app.js`: editor interactions, lesson navigation, and interface state.
- `test/`: Node.js built-in test runner checks for logic and project integrity.
- `scripts/`: esbuild configuration, local preview server, static distribution preparation, and syntax checks.

The canvas uses separate grid, wire, and component layers. The interaction model takes inspiration from [WirePad](https://github.com/defencore/WirePad): a searchable library, direct component manipulation, pin-to-pin wiring, and routed connections. Logic Lab owns its simulation models and project format.

Project files use `version: 1`, a name, component records, wire records, and optional viewport/routing metadata. The optional `exampleId` preserves the association with a bundled lesson; a custom circuit does not need one. Imports validate known types and pins, unique identifiers, finite positions, connection widths, parameter types, and bounded data sizes. Multiple sources on one input are permitted so contention and open-drain behavior can be explored. Projects allow up to 1,000 components, 5,000 wires, and 100 route points per wire. Invalid imports are rejected without replacing the current circuit, and a failed save preserves the last successfully saved project.

## GitHub Pages deployment

The [GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) in `.github/workflows/pages.yml` tests and builds commits on `main`, uploads `dist/`, and deploys the result to GitHub Pages. It can also be started manually in GitHub Actions.

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Configure the custom domain as `logic-lab.defencore.com`. The repository includes a matching `CNAME` file.
3. In DNS, point the `logic-lab` CNAME record to `defencore.github.io`.
4. Once GitHub validates the domain and provisions the certificate, enable **Enforce HTTPS**.

The build preserves `CNAME` and `.nojekyll`. Static assets use relative paths so the application also works under a GitHub project-site path. JavaScript and CSS filenames include content hashes, so a new deployment loads matching files instead of reusing a browser's cached application. Repository settings and DNS must be configured by an account with the relevant access; adding these files alone does not change those external settings.

## Motion and 3D mechanisms

The stepper component accepts rising STEP edges, DIR, enable, and reset. Its travel is derived from full steps per revolution, microsteps, and lead in millimeters per revolution. Mechanical limits constrain travel. Position sensors and normally open or normally closed limit switches feed the circuit so homing and target-position feedback remain logic operations.

Open **3D mechanisms** in the header or **Open 3D view** on a motor. The first three motors control the printer's X carriage, Y bed, and Z gantry. The separate view shows shaft and screw rotation, carriage travel, sensor trip markers, and live readouts. Its switches and pulse-clock controls edit the same source components as the circuit canvas. Camera presets and orbit controls affect only the view. Three.js requires WebGL 2; if graphics are unavailable, the circuit simulation still works.

The mechanical model is idealized: it does not simulate inertia, torque, missed steps, collisions, acceleration planning, or real electrical motor-driver behavior. STEP pulses must be sampled by the simulator; use frequencies comfortably below its sampling limit. Reset sets the configured initial position, while physical homing requires movement and a limit signal.

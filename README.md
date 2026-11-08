# Logic Lab

A browser-based digital and mixed-signal circuit playground, designed for [logic-lab.defencore.com](https://logic-lab.defencore.com) on GitHub Pages. The editor and simulator run entirely on the visitor's device. No account, application server, external font, or runtime service is required.

The interface supports English and Ukrainian. Source comments are in English; the automation, dispatch, and focused memory/addressing worksheets include English and Ukrainian.

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

The application is written as JavaScript modules. The build bundles Three.js and all application code into local static assets; there are no runtime CDN requests or application servers. The Node preview server watches source imports and writes its own `.cache/preview-<port>/` directory (for example, `.cache/preview-4173/`). `npm run build` writes the production distribution to `dist/`. Both outputs use the same static layout, but previews, tests, and release builds do not replace each other’s files. Open the preview URL over HTTP rather than opening `index.html` as a local file.

## Build circuits

A new browser starts with the **Half adder** experiment, its two input switches, and visible sum/carry outputs. Open **Examples** to explore another laboratory, or choose **New empty circuit** there to begin without a template. A valid saved local circuit takes precedence over this first-run example.

- Search or filter the component library and add a component to the canvas.
- Drag components to reposition them. The grid helps align the circuit.
- Click an output pin, then an input pin, to connect them. Choose orthogonal or curved routing. Each digital pin and wire carries one bit. Connect labeled lines such as A0…A7 individually and keep matching bit numbers together; bit 0 is the least significant bit.
- The LED matrix has its eight row contacts vertically down the left edge and eight column contacts horizontally along the bottom. Numbered contacts line up with the corresponding pixel rows and columns; each remains an independently connectable bit. This keeps the matrix compact without combining its contacts into buses.
- Select a component to edit its label, parameters, and enabled state in the inspector. Disabled components release their outputs to high impedance.
- Toggle switches on the canvas, run or pause the simulation, and use a single step to inspect changes.
- Add notes and colored groups to explain parts of a circuit. Use the scope and signal indicators to inspect activity.
- Use the included examples as starting points, including arithmetic, a BCD display, sequential logic, mixed signals, and PWM servo control.

### Edit wires and trace connections

Select a wire in **Select** mode to highlight its full electrical net and show route handles. Drag the line or a circular midpoint handle to slide a segment perpendicular to itself. Drag a diamond bend handle to reshape its corner. The source and destination stay attached. Handles keep a usable screen size while the circuit zoom changes.

Use **Add point**, then click the selected line to insert an inline marker or click away from it to create a detour. Select a bend and use arrow keys to nudge it (Shift makes larger steps), or Delete/Backspace to remove just that point. Selected segment handles also support arrow nudging. The wire inspector can restore automatic routing. Every completed edit is one Undo step; Escape, pointer cancellation, and losing focus discard an unfinished drag.

Drag an endpoint handle to a compatible pin, or click the endpoint and then choose a pin. Reconnection preserves the wire identity and validates direction, analog/digital type, and duplicate links. Dropping on an incompatible target leaves the original connection unchanged. Delete during a reconnect/add action cancels that action rather than removing the wire; the inspector has an explicit **Remove connection** action.

Hover a pin to preview its connections without changing the circuit. Choose **Trace connections** (T), then click a pin or wire for a persistent purple highlight. **Connected** opens the complete contact list in the inspector; click a contact to locate its component. Blank canvas, Escape, or the clear button removes the highlight. Shared output fan-out and multiple drivers joined at an input are one electrical net. Geometric crossings and a component's unrelated inputs/outputs are not joined; tracing does not propagate through gate logic.

## Learn with guides and experiments

The library contains 68 components with guides in English and Ukrainian. Use the category disclosure above the results to filter the library. Click the question-mark button beside a library component to read its guide without adding it to the circuit. For a selected component, switch between **Properties** and **Usage guide** in the inspector. Each guide explains the component's purpose, input and output pins, settings, a wiring procedure, an experiment, expected results, and common mistakes. Related examples open a complete circuit for further exploration.

All seven logic gates and both binary adders include truth tables in their guides and properties. Tables distinguish inputs from outputs and explain 0 and 1. When inspecting a component on the circuit, the matching row follows its current binary signals in real time. Floating or unknown signals and disabled components show an explanation instead of highlighting a misleading row.

The **Learning examples** catalog contains 43 editable laboratories. Search by name or topic and filter by topic or difficulty. Laboratories cover gates and arithmetic, clocked state, displays, parallel data lines, memory, audible alarms and melodies, mixed signals, physical signal behavior, PWM control surfaces, stepper motors, printer-style homing and position feedback, transport dispatch, aquarium life support, greenhouse control, smart-home energy and yard security.

On roomy screens, opening an example shows a lesson panel above the canvas. In compact workspaces, open the walkthrough from the toolbar when needed. Follow its steps with **Previous** and **Next**, watch the highlighted components and live pin values, and open the relevant component in the inspector. Change a switch, numeric value, or slider and compare the result with the lesson's expected behavior. Run the circuit to advance clocks and waveforms, or pause and use **Step** to examine changes in smaller increments.

Numeric settings, text fields, colors, and duty-cycle sliders update the circuit while you edit them. The selected lesson and step context remain available as you explore the circuit; exporting and importing the project preserves the example association so its lesson can be reopened.

The signal monitor prioritizes selected components and oscilloscope probes. Choose a time window from **1 ms to 60 s**; use a short window for fast generators. The global **Speed** control beside Run/Pause sets the flow of simulation time from **0.001× to 10×**, including both slow motion and acceleration, without changing configured generator frequencies. The time-window control stays with the waveform monitor. Speed and window settings are remembered in this browser. Changing the window clears the previous trace and starts sampling at the new rate. When the selected window cannot resolve the fastest source, the monitor explains the sampling limit and offers **Fit time window**. Live plots use actual sample timestamps.

Use **Record** to capture the displayed channels with simulation timestamps. Channels and the sampling window stay fixed during a recording; speed can still change. Pausing the simulation pauses capture, and **Step** can add individual increments. **Stop recording** retains the data; **CSV** downloads the entire capture, including numeric values and X/Z states. A recording holds up to 100,000 samples, independently of the live monitor's 256-sample buffer. Resetting or replacing the circuit stops capture and keeps it available to download. **New recording** replaces the previous capture. Recordings stay in memory until a new recording or page reload, so download CSV to keep them.

**PNG** saves the current displayed waveforms with channel labels and a simulation-time axis. On roomy screens the inspector sits beside the circuit and the monitor stays below. Compact screens use **Circuit**, **Inspector**, and **Waveforms** views so each task has usable space. Run/Pause remains available in every view, and recording continues while you switch views.

Changes are saved automatically in browser local storage when available. Export a project to JSON for a portable backup or import a JSON project to continue editing. Browser storage belongs to this origin and browser profile; private browsing, browser settings, and clearing site data can remove it.

### Reusable laboratory files

The [laboratory collection](./examples/README.md) stores each exercise in its own `examples/<id>/` directory. Download a lab's `circuit.json` and import it directly, or open the same circuit from the in-app catalog. Each folder also contains bilingual `lesson.js` metadata and a `README.md` lab sheet (the automation, dispatch, and five focused memory/addressing sheets include English and Ukrainian) with an estimated duration, objectives, a procedure, review questions and deliverables. Export completed work as a separate project; the supplied starting circuit stays unchanged.

Five focused exercises extend the memory progression: [manual shift-register loading and replay](./examples/shift-register-sequence/README.md), [RAM address isolation and write protection](./examples/ram-addressing/README.md), [ROM address-to-display lookup](./examples/rom-lookup/README.md), [independent register-file read/write addresses](./examples/register-file-addressing/README.md), and [two-bank memory mapping with A4 chip selection](./examples/memory-bank-select/README.md). Their lesson metadata includes ready input-action presets and observed byte outputs. A preset provides a repeatable experiment; the worksheet also asks learners to choose other data and addresses, predict results, and explain their own observations.

Three bilingual sound laboratories cover an [active-buzzer logic alarm](./examples/active-buzzer-alarm/README.md), a [recorded passive-buzzer melody](./examples/passive-buzzer-melody/README.md), and an [880 → 440 Hz T-flip-flop divider](./examples/buzzer-clock-divider/README.md). The **Sound** category contains active and passive buzzers, each with one digital input and no electrical outputs. Run the simulation and press **Enable sound**; pressing **Sound on** again mutes it, and reloading starts with audio disabled. Active buzzers default to an internal 880 Hz tone and volume 0.15: high enables the tone, low disables it. Passive buzzers reproduce binary edges at volume 0.15; a full period gives `f=1/(T1+T0)`, while constant 0 and 1 produce no sustained tone. At 440 Hz with duty 0.5, the full period is 2.272727 ms=2272.727 µs and each half is 1.136364 ms=1136.364 µs. Use **1×** for note comparisons: changing simulation speed changes passive pitch and duration, while the active buzzer's internal pitch stays fixed. Action recordings can reproduce clock frequency/duty and switch changes; choose buzzer parameters before recording. Recorded clock frequencies are bounded to 0–1000 Hz.

The [matrix keypad code-lock laboratory](./examples/keypad-code-lock/README.md) scans four row inputs and three column outputs with visible counter/gate logic. An external KEY MAP ROM decodes keys; a separate editable SECRET ROM stores **2580** at addresses 0–3. Captured comparisons advance progress, **#** confirms four correct digits, and **\*** clears. Wrong, extra or early-confirm entries reset progress and latch Error. Its portable ten-action mask preset includes every press and release.

The inspector includes **read-only memory maps** for 16×8 RAM/ROM and the 8×8 register file. Follow active read/write addresses and last-write/change markers while the circuit operates. Byte-state views show **Q7…Q0**, binary, hexadecimal and decimal values; shift-register before/after views make bit movement visible. These views observe the existing simulator state and do not supply another memory controller.

The motion sequence progresses from [STEP/DIR fundamentals](./examples/stepper-basics/README.md), through [automatic printer-axis homing](./examples/printer-homing/README.md), to [closed-loop position control](./examples/position-control/README.md). Homing uses a minimum endstop and an enable interlock that permits reversing away from home. Position control shares one target between direction and arrival sensors, then stops inside a tolerance window.

## Classroom: actions, student work, and instructor review

Open **Assignments & submission** in the header. Its **Student**, **Instructor**, and **Action sequence** tabs separate completing an exercise, preparing/reviewing assignments, and recording input operations. These are workspace modes on the same device, without accounts or authenticated roles.

### Record and replay input actions

1. Build the circuit and open **Assignments & submission → Action sequence**. Choose **Record actions**, review the observed-signal checklist, and confirm **Start recording actions**. Assignment outputs are recommended; all semantic outputs are available, including sum/carry and every comparator result. Confirmation captures current source values as the baseline and restarts the circuit's internal simulation state. Cancelling preserves the previous experiment. Recording locks circuit construction and component settings outside the supported input sources.
2. Toggle input switches or edit supported source parameters, such as a byte value or a clock frequency. For a shift register, change the switches connected to SER, CLK, and RST in the required order. A rising CLK edge is a separate action from returning CLK to 0. The source controls in the 3D view operate the same inputs.
3. Use the simulation's Run/Pause and Step controls when needed. Actions use simulation timestamps; changes made at the same paused time retain their recorded order. **Finish recording** retains the sequence and pauses the simulation.
4. Choose **Replay** for real-time playback, pause/resume it from the panel beside the student circuit or the global Run button / R shortcut, or use **Next recorded action** to inspect the ordered operations individually. Playback starts from the recorded baseline and recomputes the circuit rather than playing a picture of the earlier result. Circuit and manual input editing stay locked during playback. The panel shows action count, duration, current action and playback time. Ordinary simulation Step/Reset are disabled until playback stops.
5. Export the sequence as `.actions.json` to reuse it elsewhere. The file contains the starting circuit, source actions, duration, and observed signals. Importing it lets you inspect and replay that experiment. The memory laboratories also offer **Example action sequence** when an action preset is available.

Action sessions support at most **120 simulated seconds, 2,000 actions, 200 components, and 32 observed signals**. The recording dialog shows the circuit's actual time limit, based on its size and timing sources; dense or fast circuits may reach their processing budget sooner. Circuit-controlled PWM requires **Verify recording** before a student work is marked ready. Recording and submission share the same processing limits. Each imported or exported classroom JSON file is limited to **10 MB**. These are action-recording limits; ordinary editable projects retain their separate component and wire limits.

**Shorten recording** retains the beginning through a chosen time, including every action at that timestamp in its original order. Preview the remaining action count and save the original recording before applying. The shortened results are recalculated separately; the editable circuit, explanation, attempt identity and construction journal are preserved. Cancelling leaves the existing recording intact.

Observed signals are searchable and grouped by component without hiding contacts beyond the first 100. Recording recommends the assignment's checkpoints, or the learning example's checkpoints when no assignment is open. The 33rd selection is rejected with an explanation. Automatic assessment compares only selected logical/numeric signals at scenario checkpoints: a buzzer's EN input does not establish its audible frequency or volume, and text in an assignment is not automatically graded.

The waveform monitor's **Record signals / CSV / PNG** controls capture measured channels and traces. **Record actions** captures the operations that drive the circuit. A student work file combines the circuit and action sequence with recomputed observations and the student's explanation; waveform images and CSV captures can provide additional evidence.

### Prepare and distribute an assignment

1. In **Instructor** mode, build the reference solution and record a test sequence that exercises changing inputs, retained states, reset behavior, and any important address boundaries. Choose observed signals that demonstrate those requirements. A final static value alone is a weak criterion.
2. Enter the title and instructions, select the observed signals, and create the reference key. Choose either **Inputs and observed outputs only** or **All components without wiring** for the student's starter. Sources and observed components are retained so recordings and checks have stable interfaces. If you observe an internal memory or logic component directly, that component also remains in the starter; choose an external LED, scope, display, or matrix when the internal implementation should be left to the student.
3. Enter student identifiers, one per line, and generate individual variants. Download each `.assignment.json` file for its assigned student. The public assignment contains instructions, its issued variant, observed interfaces, and a starter without solution wiring; it does not contain the reference circuit or the instructor's test sequence.
4. Save the updated `.teacher-key.json` after issuing variants. It contains the reference solution, test sequence, and registry of issued variants. Keep this file with the instructor and distribute only the separate student assignment files. Generating more variants changes the key, so export it again afterward.

Individual variants bind work to the issued student identifier and vary supported input data. They still teach the same task and may legitimately have the same correct circuit structure. The private key supports recomputing reference results and checking issued variants; it is not an authentication service.

### Complete and submit student work

1. In **Student** mode, enter your name, student identifier, and optional group. Open your `.assignment.json` file and choose **Start attempt**. A variant assigned to another identifier cannot be started under your current identifier.
2. Build the requested circuit from the starter. Structural edits add to the construction journal; moving components, changing their labels, or bending wires does not count as new construction evidence. Leave the supplied input and observed interface identifiers intact.
3. Record an input sequence that tests your completed circuit, replay it, and explain why the observed result follows from the logic. If you change the circuit after recording, record the final version again. Include meaningful intermediate states rather than only the final output.
4. Use **Export work for instructor** to save a `.submission.json` file. It includes the issued assignment, student details, circuit, sequence, recomputed observations, explanation, and construction journal. Send that file to the instructor through the course's usual submission channel.

Browser storage restores the local classroom draft, student context, completed action sequence, and assignment form fields after a reload when storage is available. Instructor title/instructions, starter choice, and observed-signal choices also remain available when switching tabs. Importing an updated instructor key restores its issued student files for download and clears results from a previous key. It does not preserve an instantaneous RAM/register runtime or an in-progress simulation: replay the saved sequence to reconstruct the experiment. Download important work and the instructor key as portable backups; clearing site data or changing the browser profile can remove local drafts.

### Guided workflow and portable drafts

The persistent student panel shows **Task → Build → Record test → Explain → Save**, the current readiness, and the next action. Assignment instructions stay accessible while editing. After a first start, **Continue work** keeps the attempt; **Restart** offers a portable backup before resetting. **Save draft** works before the submission is complete. **Open my work** restores a draft or submission, including its assignment, identity, circuit, recorded actions, explanation, and existing attempt journal. Import does not invent construction evidence. Changing circuit structure or settings immediately flags an obsolete recording and offers a new test recording.

An obsolete recording is labelled **Recording of a previous version**, with a separate **View previous recording** action. Its version notice remains visible while playing, paused, or finished; stopping restores the current circuit. File-import errors identify an assignment, project, instructor key, or action sequence and point to the matching opening action. Damaged files and unsupported versions leave the current work intact.

Instructor preparation follows **Reference → Scenario → Probes → Starter → Variants → Issue**. Unapplied form changes block issuing variants until applied; a public preview shows the actual starter and warns when an observed internal component remains visible. Changed reference circuits, probes, or scenarios require a new key. The private key remains in memory, with an explicit reminder to download its latest issued registry. Group assignment ZIP files contain only public student tasks. The reference stored in the key and the current editor circuit are named and counted separately. **View key reference** temporarily opens the stored reference read-only; stopping restores the previous circuit, runtime, viewport and scenario. **Edit reference copy** offers an importable backup before replacing the editor with a separate reference copy and its test sequence. The existing key and issued registry remain intact. Leaving or reloading the page invokes the browser confirmation while a current or archived private key has not been downloaded.

Review cards show the student's explanation, circuit, recorded experiment, recomputed observations, and discrepancies. Opening a circuit or experiment is a temporary read-only review; **End preview** restores the instructor's circuit, viewport, and reference scenario. Filters and CSV reports support group review. Instructor hidden checks and student-recorded observations remain distinct.

Discrepancies, observation rows, observed signals, and meaningful similarity pairs have bounded pages with totals, first/last controls, and a direct page jump. Every result remains inspectable in the service; changing pages preserves card filters, expanded sections, and the other selected pages.

Discrepancies identify actions from the **instructor reference check**, separately from the student's own recording. **Replay this check** applies the issued variant's reference inputs to the submitted circuit and pauses at that exact initial state, action, or end observation. Actions sharing a timestamp retain their individual order. The preview remains read-only; its title identifies the reference check, and stopping restores the instructor's circuit, runtime, viewport, and own scenario. A key missing the issued variant asks for the copy saved after generating variants. Open the current key and choose **Retry selected submissions**; selected files stay in memory for that session, so they do not need to be selected again.

At the end of a recording or check, **Next recorded action** is disabled and leaves the final state intact. Use the separate **Restart reference check** or **Restart student recording** action to begin again; ending the preview still restores the instructor's original work.

Learning instructions include **Predict → Do → Compare → Explain** with captured live readings and local notes. **Start a new experiment** clears current answers for every step of that example while retaining the previous notes in local history. **Add observation to my work** appends the prediction, captured readings and explanation to the student explanation, so they travel with the portable draft and submission. These notes support reflection and do not claim automatic grading. Compact layouts keep component addition, instructions, first-action help, and save status visible. Contacts support compatible-target highlighting and **Enter/Space on output → Enter/Space on input**, with Escape cancelling the connection. Pointer contact selection preserves the chosen zoom and pan; keyboard contact navigation reveals small or off-screen contacts.

### Review a batch of work

In **Instructor** mode, open the matching updated instructor key and load up to **40 `.submission.json` files** at once. Each student's circuit is replayed with its submitted actions and with the instructor's reference checks. The review compares initial, intermediate, and final observed values instead of trusting values written into the file. It also checks the issued variant and assigned identifier. Save the batch outcome as `.review.json`.

Choose **Cancel checking** to stop a long batch. Work already checked remains visible and can still be exported, while unfinished similarity comparison is identified explicitly. A cancelled `.review.json` has `complete: false` and `comparisonComplete: false`; an unfinished comparison must not be interpreted as finding no matches. Keyboard navigation and closing the dialog remain available while a batch runs.

Functional correctness and work evidence are different review questions. A circuit can satisfy the reference checks while its construction journal, recorded experiment, or explanation still needs discussion. Look at both, and ensure that the reference checks actually exercise the intended behavior. Replaying a sequence and obtaining the expected final byte alone does not establish that the student understands the design.

Batch comparison ignores component positions, labels, ordering, identifiers, and wire bends when examining topology and component parameters. It also compares ordered input actions, timing, recorded results, and reused attempt or variant identifiers. Matching minimal solutions or a published practice sequence can be expected in the same exercise; similarity is a reason for individual review, not an automatic accusation of copying.

All processing stays in the browser. The modes do not authenticate identities, prevent file sharing, or provide cryptographic proof of authorship. SHA-256 checksums help detect changed files, but a knowledgeable person can edit a file and recompute its checksum. Recomputed tests catch incorrect circuit behavior and inconsistent claimed results; they cannot prove who performed the work. Use individual questions, a fresh input pattern or address variation, and the student's explanation to establish understanding.

### Короткий порядок роботи українською

Відкрийте **Завдання та здача** в заголовку. У вкладці **Сценарій дій** почніть **Записати дії**: поточні входи стають початковими значеннями, внутрішній стан схеми скидається, а редагування її будови блокується. Керуйте джерелами поточної схеми: наприклад, CALL, RUN і RESET у ліфті або SER, CLK і RST у регістрі зсуву. Зупиніть запис і виберіть **Відтворити** або **Наступна записана дія**. Дії мають час симуляції та зберігають порядок навіть при однаковому часі. Для перенесення досліду збережіть `.actions.json`. Загальні межі: 120 секунд симуляції, 2 000 дій, 200 елементів, 32 контрольовані сигнали та 10 МБ на файл. Фактичну межу часу для схеми видно перед записом; для ШІМ, керованої схемою, перед здачею потрібна дія **Перевірити запис**. **Скоротити запис** дозволяє залишити потрібний початок без повторення досліду, зберігши пояснення та журнал роботи.

У режимі **Викладач** підготуйте еталон, запишіть перевірочні дії та оберіть контрольовані сигнали. Якщо контролюється внутрішній регістр або пам’ять, цей компонент залишиться у студентській заготовці; зовнішній індикатор дозволяє залишити внутрішню реалізацію студенту. Створіть варіанти за ідентифікаторами студентів і передайте кожному його `.assignment.json`. Еталон і перевірочний сценарій є лише в `.teacher-key.json`: не передавайте цей ключ студентам і зберігайте його знову після видачі нових варіантів.

У режимі **Студент** заповніть ім’я й ідентифікатор, відкрийте свій варіант і почніть спробу. Побудуйте схему, запишіть змістовний дослід, повторіть його та додайте власне пояснення. Збережіть `.submission.json` для викладача. Пересування елементів і зміна підписів не додають свідчень побудови; після зміни схеми слід записати її остаточну версію заново. Чернетка й завершений сценарій можуть відновитися після перезавантаження, але миттєвий стан ОЗП — ні: для відновлення досліду відтворіть сценарій.

Викладач відкриває актуальний ключ, завантажує до 40 робіт, переглядає повторно обчислені результати, свідчення роботи та збіги, а потім зберігає `.review.json`. Правильність схеми не є доказом самостійності. Однакові мінімальні розв’язання й готові навчальні послідовності можуть бути очікуваними. Контрольна сума не підтверджує авторство; за потреби обговоріть пояснення студента та дайте новий шаблон даних чи адрес.

### Hotkey inputs and direct renaming

Double-click a component heading to edit its label on the canvas. **Enter** or leaving the field saves one undoable change; **Escape** cancels. An empty label restores the component’s default title. Read-only previews cannot be renamed.

The **Hotkey** component supplies one digital output. In **Hold** mode it is 1 while its assigned key is pressed and 0 after release; **Inverted hold** reverses these levels. **Toggle** changes the output once per fresh press, ignoring keyboard autorepeat. In Properties, choose **Assign a key**, then press a physical key or **Shift + key**. Duplicate assignments and system/browser combinations are rejected. Assigned workspace keys take priority over editor shortcuts; typing in fields and activating interface buttons retain their normal behavior. Clicking outside the browser or opening a dialog releases momentary inputs; a toggle keeps its latched value. Recorded experiments store actual input edges and replay without physical keyboard input. The **Keyboard inputs** example includes all three modes, indicators, a ready action sequence and a bilingual laboratory worksheet.

### Keyboard and navigation

| Action                      | Control                                                   |
| --------------------------- | --------------------------------------------------------- |
| Run or pause                | R                                                         |
| Delete selection            | Delete / Backspace                                        |
| Undo                        | Ctrl / Cmd + Z                                            |
| Redo                        | Ctrl / Cmd + Shift + Z                                    |
| Save project                | Ctrl / Cmd + S                                            |
| Copy selected components    | Ctrl / Cmd + C                                            |
| Paste components            | Ctrl / Cmd + V                                            |
| Fit circuit                 | F / Home                                                  |
| Cancel a pending connection | Escape                                                    |
| Zoom at the cursor          | Mouse wheel / trackpad pinch                              |
| Zoom at the center          | + / −                                                     |
| Reset zoom to 100%          | 0 / click the zoom percentage                             |
| Pan                         | Hold Space or Shift and drag; middle/right drag; Pan tool |
| Pan with the wheel          | Shift + wheel / Alt + wheel / horizontal scroll           |
| Select several components   | Ctrl / Cmd + click                                        |
| Select an area              | Drag an empty canvas area                                 |
| Trace physical connections  | T, then click a pin or wire                               |
| Nudge wire handle           | Arrow keys; Shift for larger steps                        |

Shortcuts are ignored while editing text or values. On compact screens, select a component and open **Inspector** to edit it; selecting or dragging a component keeps the circuit visible. The walkthrough opens only when requested. Editing tools and zoom controls sit outside the scaled circuit, with secondary tools in the **More tools** menu on phones.

Each existing component has a focusable heading. Use **Tab** to reach it, **Arrow keys** to move between headings, **Home/End** to reach the first/last component, and **Enter/Space** to open its properties. Closing the compact inspector returns focus to that component. These keys select components without moving them; native switches and value fields keep their own controls.

Copy/Paste carries the selected components and only the connections between them, including wire bends. Paste works across circuits and browser tabs, selects the new components, and creates one Undo step. Text fields keep ordinary text copy/paste. Pasted Hotkey components start released; conflicting keyboard bindings are cleared and reported.

While a contact has focus, **Delete/Backspace**, arrow keys, and **Ctrl/Cmd+D** cannot delete, move, or duplicate another selected component. **Enter/Space** connects contacts, **Tab** changes focus, and **Escape** cancels the pending connection.

Canvas navigation follows WirePad: wheel zoom stays anchored at the cursor, temporary pan restores the chosen tool on release, and the zoom range is 1–400%. Fresh compact circuits start at a readable scale of at least 75%; Fit still frames the complete circuit, and restored or manually chosen viewports stay unchanged. The component library has a category disclosure with counts and separate add/help actions. The laboratory catalog has a topic sidebar, search and difficulty filters, with separate circuit, worksheet and JSON actions.

## Component library

| Family                 | Components                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logic gates            | AND, OR, NOT, NAND, NOR, XOR, XNOR                                                                                                                    |
| Sources and indicators | GND, VCC, toggle switch, momentary button, 3×4 matrix keypad, Hotkey, numeric byte input, clock, LED, LED matrix, seven-segment display, oscilloscope |
| Sound                  | Active buzzer with internal tone, passive buzzer driven by binary periods                                                                             |
| Combinational          | Multiplexer, demultiplexer, half adder, full adder, comparator, encoder, decoder                                                                      |
| Sequential             | SR latch, D / JK / T flip-flops, register, shift register, binary counter                                                                             |
| Mixed signals          | ADC, DAC, AM / FM generators, PWM generator, servo bank                                                                                               |
| Architecture           | ALU, tri-state buffer, priority encoder, bit splitter and merger                                                                                      |
| Memory                 | RAM, ROM, register file                                                                                                                               |
| Physical behavior      | Open-drain output, pull-up and pull-down, Schmitt trigger, monostable                                                                                 |
| Motion and sensing     | Stepper motor, limit switch, position sensor                                                                                                          |
| Automation             | Aquarium ecosystem, greenhouse, smart home and yard                                                                                                   |
| Interactive scenes     | Traffic signal, road junction, railway interlocking, animal feeder, water tank and pump, nine-floor elevator                                          |
| Annotation             | Text notes and colored groups                                                                                                                         |

Digital connections use separate one-bit lines. Eight-bit data exposes eight numbered pins, while addresses and operation codes expose their required number of lines. The numeric byte source provides D0…D7, BCD0…BCD3, and ADDR0…ADDR2; each contact can connect directly to a digital input. Analog values use a separate analog contact. Use the inspector and pin labels to follow each connection.

### Simulation model

This is an educational behavioral simulator, not a transistor-level or SPICE simulator. Combinational logic settles iteratively; stateful components update on simulation steps and clock edges. There are no modeled propagation delays, setup or hold constraints, metastability, drive-current limits, thermal effects, or transistor-level TTL/CMOS characteristics.

Signals carry numeric values, `Z` (high impedance), or `X` (unknown or contention). Digital data groups expose numbered contacts rather than bundled bus ports. The scope observes one selected digital line or one analog voltage; component readouts show complete byte values. Disconnected and released outputs remain high impedance. Conflicting driven values produce an unknown state. Pull resistors are weak drivers, allowing an open-drain output to override a pull-up. Logic gates propagate unknown inputs according to their operation. A feedback loop that does not settle is reported through simulation diagnostics.

Analog generators and scopes show sampled values. Physics steps are no larger than 0.5 ms and become shorter for narrow monitor windows and analog carriers (at least 32 physics samples per highest estimated analog cycle). Clock/PWM edge checkpoints preserve narrow pulses and allow microsecond pulse measurements. Trace history has a separate 256-sample capacity, so long windows still need an appropriate sampling rate; the monitor offers a shorter window when needed. CSV, PNG and live plots use actual simulation timestamps. Slow playback changes simulated time per frame rather than generator frequencies. The Step button advances 10 ms multiplied by the selected speed.

The servo bank accepts digital RC command pulses, with a default 1000–1500–2000 µs mapping to −90°–0°–+90°. Changing repetition frequency while retaining pulse width preserves the commanded angle. Missing, conflicting, out-of-range or stale commands show X; there is no inferred centered position. The updated PWM laboratory wires PWM outputs to the servo rather than the analog DUTY readout. Older duty-ratio servo projects are identified explicitly. If saved work cannot be opened, its original JSON is backed up before replacement and remains accessible through **Project files → Saved originals**. An explicit **Open editable copy** action can retain the circuit while disconnecting unsupported analog servo commands for manual rewiring; recordings and instructor evidence are never automatically converted. Motor inertia, torque and electrical driver behavior remain idealized.

Bit breakout/connector blocks contain eight passive conductors. They preserve weak pulls, contention and continuity in both directions, while adjacent bits remain isolated; disabling the block opens the conductors. The digital one-shot is an abstract rising-edge timer with active-high reset, rather than a model of a particular analog timer IC.

RAM, ROM, and register-file sizes are intentionally bounded for interactive examples. Their contents are simulation state unless explicitly supplied through component parameters; JSON projects store circuit structure and parameters, not an instantaneous memory snapshot or scope trace.

## Architecture

The application is organized by feature. `src/app.js` only loads the stylesheet and starts the application; each directory owns its implementation and exposes an explicit entry where it has a public API.

| Directory                                | Responsibility                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/application/`                       | Application composition, shared editor state, commands, history, input gestures, shell bindings and frame scheduling.                                 |
| `src/workbench/`                         | Board, inspector, dialogs, lessons, signal monitor, scene controls and transactional wire editing.                                                    |
| `src/circuits/`                          | Project validation/storage, pin compatibility, net continuity, viewport mathematics and geometry for placement/routing/editing.                       |
| `src/components/catalog/`                | Component registry, definition factory and one definition module per component category. `src/components/pins.js` owns physical contact presentation. |
| `src/simulation/`                        | Browser-independent circuit evaluation, electrical nets, contacts, state transitions, periodic timing and bounded advancement.                        |
| `src/scenes/models/`                     | Scene parameters, initial state, sensors and physics, separated by world type.                                                                        |
| `src/scenes/views/`                      | Three.js scene builders, with separate automation, transport/resource and mechanical renderers.                                                       |
| `src/scenes/transport/`                  | Shared vehicle shapes, swept collision contact and route geometry used by both physics and rendering.                                                 |
| `src/scenes/data/`, `src/scenes/common/` | Read-only runtime snapshots, camera fitting and numeric helpers.                                                                                      |
| `src/learning/`                          | One bilingual manual per component, truth tables and guide/catalog views.                                                                             |
| `src/locales/`                           | English and Ukrainian translations grouped by interface topic.                                                                                        |
| `src/experiments/`                       | Validated source-action recording, observations and deterministic replay.                                                                             |
| `src/assessment/`                        | Assignments, student variants, submissions, cancellable grading and topology/similarity evidence.                                                     |
| `src/classroom/`                         | Student/instructor workflows, recording controls, draft storage, file operations and classroom views.                                                 |
| `src/signals/`                           | Sampled waveform plotting, recording, CSV/PNG export and display time settings.                                                                       |
| `src/shared/`                            | UI formatting, selectors and icons.                                                                                                                   |
| `src/styles/`                            | Styles grouped by surface, component and responsive breakpoint. `style.css` defines cascade order.                                                    |
| `examples/<id>/`                         | Standalone circuit JSON, bilingual lesson metadata and lab worksheet for each exercise. `examples/index.js` registers the collection.                 |
| `test/`                                  | Domain suites and shared fixtures, discovered recursively by `scripts/test.mjs`.                                                                      |
| `scripts/`                               | Build, local preview, syntax checks and architecture checks.                                                                                          |

Controllers share one project/runtime through the application model and explicit adapters. Recording, grading and renderers do not maintain independent circuit models. Scene physics never depends on its 3D renderer. Vehicle geometry is shared so the rendered surface and collision calculation describe the same objects. The canvas uses separate grid, wire and component layers, and its pan/zoom behavior follows [WirePad](https://github.com/defencore/WirePad).

### Extending the application

- **Component:** add its category definition in `src/components/catalog/categories/`, its model/state behavior in `src/simulation/`, and its manual under the matching category in `src/learning/guides/`. Register the manual in the guide entry. Digital data is exposed through individual bit contacts. Add behavioral coverage in the corresponding simulation suite.
- **3D world:** add configuration/state/physics under `src/scenes/models/` and a builder under `src/scenes/views/`, then register them in their domain entries. Connect the world to the component catalog and runtime snapshots. Keep sensor logic in the model and read state from the view; rendering must not advance physics.
- **Laboratory:** add `examples/<id>/{circuit.json,lesson.js,README.md}` and a registry entry in `examples/index.js`. The starting circuit remains separately downloadable and reusable as a worksheet.
- **Interface:** extend the relevant workbench/classroom controller, matching style surface and locale namespace. Add application orchestration only when the feature needs cooperation between controllers.

### Architecture checks

`npm run check` validates JavaScript/JSON syntax, resolves local imports, rejects circular dependencies, and prevents simulation, assessment and other domain modules from importing presentation modules. It also enforces **350 physical lines and 24 KiB per JavaScript/CSS module**, including tests, example lesson metadata and build scripts. `src/app.js` is the only root source entry; implementation belongs in its feature directory. Structured circuit JSON remains a complete standalone lab document and is validated as data rather than subject to a code line budget.

`npm test` discovers all nested suites; `npm run format:check` verifies readable formatting, and `npm run build` verifies the deployable site. GitHub Actions runs these checks before publishing. Temporary preview output stays in ignored `.cache/`; only `dist/` is uploaded to Pages.

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

Open **3D mechanisms** in the header or **Open 3D view** on a component. The linked 3D dock sits beside the circuit on roomy screens and shares its runtime. **Controls** contains related circuit sources, including momentary buttons; **Contacts** shows live physical pins. Select a mesh or contact to highlight its structural connection path and corresponding scene object. The first three motors drive the printer's X carriage, Y bed and Z gantry; other scenes expose their own actuators and sensors. Camera controls affect only the view. Three.js requires WebGL 2; if graphics are unavailable, circuit simulation still works.

The mechanical model is idealized: it does not simulate inertia, torque, missed steps, collisions, acceleration planning, or real electrical motor-driver behavior. STEP pulses must be sampled by the simulator; use frequencies comfortably below its sampling limit. Reset sets the configured initial position, while physical homing requires movement and a limit signal.

## Interactive 3D laboratories

The header's **3D** action appears only when the circuit contains a stepper mechanism or an interactive scene object. Sensors alone and ordinary logic circuits do not show it. Each scene component also has its own **Open 3D view** action; when several objects are present, choose one in the scene selector. The scene, source controls, sensor outputs, simulation pause and reset all use the same circuit runtime. Camera presets fit the apparatus to the available viewport; resizing preserves the orbit direction. Railway perspective and front views focus on the crossing and turnouts, while the top view shows the complete layout.

The **3D scenes & automation** example topic contains the transport, feeder and water-tank laboratories with editable circuits, bilingual walkthroughs and standalone worksheets:

- **Traffic light:** drive red, amber and green separately and inspect the VALID and GO outputs. Red+amber is a valid stop phase. Green combined with any other lamp, and darkness, are invalid.
- **Traffic junction:** use a counter and clearance phases to manage real queues. Conflicting releases can cause a collision; CRASH stays latched until reset.
- **Railway interlocking:** alternate road and rail windows, wait for physically closed road gates and a clear crossing, and reserve the complete train route until its tail clears. Both road cars and trains move from the same physics state. Collision checks use the visible vehicle parts rather than the larger route-reservation rectangle. Unsafe bypasses can cause actual body collisions or derailments; an open empty crossing does not invent an accident.
- **Railway manual dispatch:** wire separate near/far turnout switches, guard requests with actual closed/clear feedback and dispatch each main-exit route. Selected switch paths affect real trajectories; an occupied receiving siding is still unsafe.
- **Animal feeder:** use hunger, bowl-full and empty-hopper feedback to control an auger. The animal consumes measured food, the hopper is finite, and unsafe filling triggers an alarm.
- **Water tank:** use LOW and HIGH feedback with a latch to regulate the pump against a drain. Flow rates change the measured water level; overflow stays latched until reset.

These are deterministic educational simulations, not models for controlling real traffic, railways, animals or industrial equipment. Scene mechanics advance once per simulation step; camera animation does not change physical state. Missing optional controls use the defaults documented in each guide. Unknown controls pause the affected mechanics and expose uncertainty. Disabled components stop advancing and release their outputs. Changing a scene's parameters resets that object; changing circuit sources keeps its physical and latched fault state. Use **Reset** after correcting an unsafe design.

## Aquarium, greenhouse and home automation

The [nine-floor elevator laboratory](./examples/elevator-logic/README.md) uses floors **1–9**, nine momentary CALL buttons and a momentary RESET. Released buttons return Q to 0 while nine visible SR memories retain their requests. Shared priority gates choose the lowest pending floor; separate binary contacts encode it into a numeric DAC target, and an external one-shot opens/holds the doors before closing. The physical plant supplies independent F1…F9 contacts, door sensors, position and latched faults. Its bilingual worksheet includes a replayable **3 → 5 → 9 → 1** trip and an unsafe interlock bypass with common reset. The circuit has 140 components, within the 200-component recording cap. Floor sensors use a ±0.015-floor alignment zone; the controller uses priority rather than FIFO.

The **Automation** topic adds seven laboratories using three circuit-controlled 3D components. Together with the other topics, including manual railway dispatch, the elevator and three buzzer laboratories, the catalog contains 43 reusable exercises.

- **Aquarium life support:** build temperature, oxygen and water-quality interlocks with AND, OR and NOT. Individual fish swim, lose health under sustained harmful conditions, and float belly-up with X eyes after death. Cold, overheating, oxygen deprivation, overfeeding, starvation, dirty water and nonstop lighting have different measured causes. Corrected conditions can heal surviving fish; reset starts a fresh ecosystem.
- **Aquarium feeding:** compare continuous feeding with a clock, one-shot and hunger permission. Observe food, cleanliness and health instead of treating a high control signal as a single portion.
- **Aquarium lighting:** use DAY and a manual XOR override to study day/night schedules and the need for a dark resting period.
- **Greenhouse climate and irrigation:** control a visible roof vent, heating, grow lights and water spray. Compare direct threshold control with SR-latch hysteresis; plants grow or wilt according to measured temperature, soil moisture and health.
- **Home climate and smart yard:** qualify lighting by darkness and occupancy; combine authorization and motion for the sliding gate; block irrigation during rain or low water. The tank refills during simulated rain and electricity use accumulates in kWh.
- **Manual railway dispatch:** independently switch the near and far turnouts from their circuit switches or the 3D control panel. Their highlighted rails show the selected physical route, and trains actually enter the selected exit. Keep blades stationary under a train and use the gate-closed/clearance feedback before admission.

Every new component has bilingual pin-by-pin instructions, live sensor and actuator readouts, editable source controls, and runnable worksheets in its own example directory. The scene never supplies a hidden controller: learners can remove a gate, deny a permission or create their own feedback circuit and observe the consequences. Day length and initial conditions are editable; pause and reset act on the same runtime as the canvas. Aquarium oxygen/food demand and contamination scale with living fish count relative to four fish; its excessive-light threshold scales with the chosen day length. Home fans and greenhouse vents exchange heat with outdoor air, so opening ventilation cannot refrigerate a room below ambient temperature.

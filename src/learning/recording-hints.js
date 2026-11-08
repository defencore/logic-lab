import { getDefinition } from '../components/catalog/index.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';

/** Plain-language controls follow the current circuit rather than a fixed demo. */
export function recordingInputHint(project, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const types = new Set(project.nodes.map((node) => node.type));
  if (types.has('elevator'))
    return project.exampleId === 'elevator-logic'
      ? L(
          'Натискайте CALL 1–9, змінюйте дозвіл RUN і скидайте через RESET. Спостерігайте за положенням кабіни, поверхами, дверима та аварією; 3D показує той самий стан.',
          'Press CALL 1–9, change RUN permission and reset with RESET. Observe cabin position, floor contacts, doors and faults; 3D shows the same state.',
        )
      : L(
          'Керуйте входами ліфта UP, DOWN, OPEN, CLOSE, RUN і RST через свою схему. Порівнюйте положення, датчики поверхів, двері та FAULT.',
          'Control elevator UP, DOWN, OPEN, CLOSE, RUN and RST through your circuit. Compare position, floor sensors, doors and FAULT.',
        );
  if (types.has('keypad'))
    return project.exampleId === 'keypad-code-lock'
      ? L(
          'Натискайте цифри на клавіатурі: # підтверджує код, * очищує спробу. Запустіть симуляцію для імпульсного вводу та спостерігайте за прогресом, відкриттям і помилкою. Код зберігається в SECRET.',
          'Press keypad digits: # confirms the code and * clears the attempt. Run simulation to process pulse input and observe progress, unlock and error. The code is stored in SECRET.',
        )
      : L(
          'Натискайте клавіші матриці й спостерігайте за C1–C3 при скануванні R1–R4. Імпульсна черга виконується під час запуску симуляції; режим утримання вимагає повного циклу сканування.',
          'Press matrix keys and observe C1–C3 while scanning R1–R4. The pulse queue runs when simulation runs; hold mode requires a complete scan cycle.',
        );
  if (types.has('shift_register'))
    return L(
      'Змінюйте SER і подавайте фронти CLK; RST очищує регістр. Порівнюйте Q7…Q0 до й після такту. Відтворення починається з початкової схеми.',
      'Change SER and apply CLK edges; RST clears the register. Compare Q7…Q0 before and after each clock. Replay starts from the initial circuit.',
    );
  if (types.has('ram') || types.has('register_file'))
    return L(
      'Змінюйте адреси й дані, дозвольте запис WE та подайте фронт CLK. Перевіряйте збережені комірки й виходи читання; сама зміна даних не виконує запис.',
      'Change addresses and data, enable WE and apply a CLK edge. Inspect stored locations and read outputs; changing data alone does not write memory.',
    );
  if (types.has('rom'))
    return L(
      'Змінюйте адресу ПЗП й порівнюйте відповідну збережену комірку з виходом. CS і OE дозволяють читання; вміст задається у властивостях пам’яті.',
      'Change the ROM address and compare the stored location with its output. CS and OE enable reading; edit the memory contents in Properties.',
    );
  const sources = project.nodes.filter((node) => SOURCE_PARAMETERS[node.type]);
  const names = sources.slice(0, 5).map((node) => {
    const definition = getDefinition(node.type);
    return node.label || (language === 'ua' ? definition.ua : definition.label);
  });
  return names.length
    ? L(
        `Змінюйте входи цієї схеми: ${names.join(', ')}${sources.length > names.length ? ' та інші' : ''}. Спостерігайте за контрольними сигналами. Порядок дій і час симуляції зберігаються в записі.`,
        `Change this circuit’s inputs: ${names.join(', ')}${sources.length > names.length ? ' and others' : ''}. Observe the selected signals. Recordings preserve action order and simulation time.`,
      )
    : L(
        'Додайте керовані входи до своєї схеми та оберіть сигнали для спостереження. Запис зберігає початкову схему, порядок дій і час симуляції.',
        'Add controllable inputs to your circuit and choose observed signals. Recordings preserve the initial circuit, action order and simulation time.',
      );
}

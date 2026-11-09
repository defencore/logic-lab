const id = 'lcd1602-parallel';
const steps = {
  en: [
    {
      title: 'Watch the LCD write two rows',
      text: 'Choose Run LCD demo above the circuit or on its catalog card. The LCD starts with its display off, then the prepared sequence initializes it and writes LOGIC LAB and PARALLEL LCD through D0…D7. Wait for both rows to appear. Choose Return to my circuit when you are done.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Initialize both rows',
      text: 'Choose Reset simulation, set RS=0 and leave E released. Select BYTE and open Properties → Parameters → Value. Enter the decimal values 56, 8, 1, 6, 12 in order. For each value, return to the circuit and press then release E once. Keep E low while entering the value. After 12 the display is on and ready for characters.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Write on two rows',
      text: 'With R/W grounded, RS=1 selects character bytes. Enter 72 and 73 in Value, pulsing E after each, to write HI on the first row. Set RS=0 and send 192 (0xC0) to select row 2. Set RS=1 and send 79 then 75 for OK. The address counter shows where the next character goes.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Hide, restore and clear text',
      text: 'Set RS=0 and send decimal 8 to hide the text, then 12 to reveal it again. Command 2 returns the address and view to their starting positions. Command 1 clears DDRAM. Record your own comparison and observe how the same eight data wires carry each command.',
      nodes: ['rs', 'enable', 'lcd'],
    },
  ],
  ua: [
    {
      title: 'Подивіться, як LCD записує два рядки',
      text: 'Натисніть «Запустити демо LCD» над схемою або в каталозі. Екран спочатку вимкнений. Готовий сценарій увімкне його й запише LOGIC LAB та PARALLEL LCD через D0…D7. Дочекайтеся обох рядків. Після перегляду натисніть «Повернутися до своєї схеми».',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Підготуйте обидва рядки',
      text: 'Натисніть «Скинути симуляцію», задайте RS=0 і залиште E відпущеною. Оберіть елемент BYTE, відкрийте «Властивості → Параметри → Значення». Введіть десяткові числа 56, 8, 1, 6, 12 по черзі. Після кожного числа поверніться до схеми, натисніть і відпустіть E один раз. Вводьте значення при E=0. Після 12 екран увімкнено й готовий до запису символів.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Запишіть текст у два рядки',
      text: 'Земля тримає R/W=0. Із RS=1 введіть у «Значення» 72 і 73, натискаючи й відпускаючи E після кожного числа. У першому рядку з’явиться HI. Задайте RS=0 та надішліть 192 (0xC0) для другого рядка. Знову задайте RS=1 і надішліть 79 та 75 для OK. Лічильник адреси показує місце наступного символу.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Приховайте, відновіть і очистіть текст',
      text: 'Задайте RS=0. Надішліть десяткове 8, щоб приховати текст, потім 12, щоб знову його показати. Команда 2 повертає адресу й вікно на початок. Команда 1 очищає DDRAM. Запишіть власне порівняння та простежте, як ті самі вісім дротів передають кожну команду.',
      nodes: ['rs', 'enable', 'lcd'],
    },
  ],
};

function exampleActions() {
  const text = (line) => [...line].map((character) => [1, character.charCodeAt(0)]);
  const transfers = [
    ...[0x38, 0x08, 0x01, 0x06, 0x0c, 0x80].map((command) => [0, command]),
    ...text('LOGIC LAB'),
    [0, 0xc0],
    ...text('PARALLEL LCD'),
  ];
  let previousRs = 0,
    previousByte = 0x38;
  const set = (at, node, value) => ({ at: at / 1000, node, key: 'value', value });
  return transfers.flatMap(([rs, byte], index) => {
    const at = 100 + index * 110;
    const actions = [];
    if (rs !== previousRs) actions.push(set(at, 'rs', rs));
    if (byte !== previousByte) actions.push(set(at + 10, 'byte', byte));
    actions.push(set(at + 25, 'enable', 1), set(at + 75, 'enable', 0));
    previousRs = rs;
    previousByte = byte;
    return actions;
  });
}

export default {
  id,
  label: 'LCD 1602: write a message',
  ua: 'LCD 1602: запис повідомлення',
  category: 'basics',
  level: 'beginner',
  demoLabel: { en: 'Run LCD demo', ua: 'Запустити демо LCD' },
  demoFocus: 'lcd',
  description: 'Send commands and character bytes on separate wires to a classic two-row LCD.',
  descriptionUa:
    'Передайте команди й байти символів окремими дротами до класичного дворядкового LCD.',
  lesson: {
    en: {
      goal: 'Initialize a parallel LCD and put different text on each row using DDRAM addresses.',
      steps: steps.en,
      expected:
        'Manual writes show HI and OK. The preset writes LOGIC LAB and PARALLEL LCD with R/W=0.',
    },
    ua: {
      goal: 'Підготуйте паралельний LCD і запишіть різний текст у кожний рядок через адреси DDRAM.',
      steps: steps.ua,
      expected:
        'Ручний запис покаже HI й OK. Готовий сценарій запише LOGIC LAB і PARALLEL LCD із R/W=0.',
    },
  },
  circuitPath: `examples/${id}/circuit.json`,
  labPath: `examples/${id}/README.md`,
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Use separate parallel data contacts and distinguish RS, R/W and E.',
        'Select a visible row through the DDRAM address command.',
      ],
      ua: [
        'Використайте окремі контакти даних і розрізніть призначення RS, R/W та E.',
        'Оберіть видимий рядок командою адреси DDRAM.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Which edge of E accepts data, and what happens if RS changes while setting up a byte?',
        'Why does writing the 17th character not begin the second visible row?',
      ],
      ua: [
        'Який фронт E приймає дані й що станеться, якщо змінити RS під час підготовки байта?',
        'Чому запис 17-го символу не починає другий видимий рядок?',
      ],
    },
    deliverables: {
      en: [
        'Your two-row message and a recording of the source changes.',
        'A command table explaining initialization, row selection, display off and clear.',
      ],
      ua: [
        'Ваше повідомлення у двох рядках і запис змін джерел.',
        'Таблиця команд із поясненням ініціалізації, вибору рядка, вимкнення й очищення.',
      ],
    },
  },
  actionPreset: exampleActions(),
  actionProbes: ['rs', 'rw', 'e', 'd'].map((port) => ({ node: 'lcd', port, side: 'inputs' })),
};

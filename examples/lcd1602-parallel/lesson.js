const id = 'lcd1602-parallel';
const steps = {
  en: [
    {
      title: 'Trace the eleven contacts',
      text: 'D0…D7 carry one byte on eight separate wires. Ground holds R/W low. RS chooses command (0) or character (1). The LCD starts with its display off; a byte change by itself does not write anything.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Initialize both rows',
      text: 'With RS=0, edit the Byte value parameter and press then release E once for each decimal value: 56, 8, 1, 6, 12. These are 0x38, 0x08, 0x01, 0x06, 0x0C. Set each value while E is low. The display status changes to 8-bit and 2 lines.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Write on two rows',
      text: 'With RS=1, send 72 then 73 to write HI on the first row. Set RS=0 and send 192 (0xC0) to select row 2. Set RS=1 and send 79 then 75 for OK. The address counter identifies where the next character goes.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Replay and compare commands',
      text: 'Open Assignments & submission → Action sequence → Example action sequence and replay it. The example writes LOGIC LAB and PARALLEL LCD. Stop restores your editable circuit. In your own recording, compare 0x08 and 0x0C with 0x01 to distinguish hiding text from clearing memory.',
      nodes: ['rs', 'enable', 'lcd'],
    },
  ],
  ua: [
    {
      title: 'Простежте одинадцять контактів',
      text: 'D0…D7 передають один байт вісьмома окремими дротами. Земля тримає R/W=0. RS вибирає команду (0) або символ (1). Екран LCD спочатку вимкнений, і сама зміна байта нічого не записує.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Підготуйте обидва рядки',
      text: 'Із RS=0 змінюйте властивість «Значення байта» та натискайте й відпускайте E один раз для кожного числа: 56, 8, 1, 6, 12. Це 0x38, 0x08, 0x01, 0x06, 0x0C. Задавайте значення при E=0. Стан LCD покаже 8-бітний дворядковий режим.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Запишіть текст у два рядки',
      text: 'Із RS=1 надішліть 72, потім 73, щоб записати HI в першому рядку. Задайте RS=0 і надішліть 192 (0xC0), щоб обрати рядок 2. Знову задайте RS=1 і надішліть 79 та 75 для OK. Лічильник адреси показує місце наступного символу.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Відтворіть і порівняйте команди',
      text: 'Відкрийте «Завдання та здача → Сценарій дій → Навчальний сценарій прикладу» та відтворіть його. Приклад запише LOGIC LAB і PARALLEL LCD. Зупинка поверне редаговану схему. У власному записі порівняйте 0x08 та 0x0C з 0x01, щоб відрізнити приховування тексту від очищення пам’яті.',
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

const id = 'lcd1602-parallel';
const steps = {
  en: [
    {
      title: 'Prepare the display',
      text: 'Open the circuit and choose Prepare LCD in the control panel. It sends 0x38, 0x06 and 0x0C over D0–D7 with RS=0. The display is now on and ready for characters. It stays blank until you send text.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Write on both rows',
      text: 'Select Character and send H, then I. Choose Row 2 and send O, then K. The row button sends command 0xC0. Each send puts a byte on D0–D7 and pulses E. The LCD accepts it as E returns to 0.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Hide, show and clear',
      text: 'Select Command and send 0x08 to hide the text, then 0x0C to show it again. Choose Clear to erase both rows. Compare the address and display after each transfer.',
      nodes: ['rs', 'enable', 'lcd'],
    },
    {
      title: 'Watch the same signals in the demo',
      text: 'Run the LCD demo, pause it and choose Next demo action. Watch RS, E and the byte in the panel. The text changes when E falls. Return to my circuit restores your own message.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
  ],
  ua: [
    {
      title: 'Підготуйте дисплей',
      text: 'Відкрийте схему й натисніть «Підготувати LCD» на панелі керування. Вона передасть 0x38, 0x06 та 0x0C через D0–D7 із RS=0. Екран увімкнеться й залишатиметься порожнім, доки ви не надішлете текст.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Запишіть текст у два рядки',
      text: 'Оберіть «Символ» і передайте H, потім I. Натисніть «Рядок 2» і передайте O, потім K. Кнопка рядка надсилає команду 0xC0. Під час кожного запису байт з’являється на D0–D7, а LCD приймає його, коли E повертається до 0.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Приховайте, покажіть і очистіть текст',
      text: 'Оберіть «Команда» й передайте 0x08, щоб приховати текст, а потім 0x0C, щоб показати його знову. «Очистити» стирає обидва рядки. Порівняйте адресу та екран після кожної передачі.',
      nodes: ['rs', 'enable', 'lcd'],
    },
    {
      title: 'Простежте ті самі сигнали в демо',
      text: 'Запустіть демо LCD, призупиніть його й оберіть «Наступна дія демо». Стежте за RS, E та байтом на панелі. Текст змінюється на спаді E. Кнопка «Повернутися до своєї схеми» відновить ваше повідомлення.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
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

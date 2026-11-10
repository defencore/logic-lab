const id = 'lcd1602-parallel';
const steps = {
  en: [
    {
      title: 'Prepare the display',
      text: 'Choose Prepare LCD. With RS=0, the panel sends 0x38 for 8 bits and two rows, 0x06 to advance one cell after each character, and 0x0C to turn the screen on. Preparation preserves any text already stored. If the display was shifted, Prepare LCD also returns it to its original position with 0x02.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Write on both rows',
      text: 'Select row 1, type HI and choose Write row. Repeat with OK on row 2. You can use 1–16 printable ASCII characters per row. The panel reports an error for 17 characters. Shorter text overwrites only its own cells. Use Clear to erase both rows or send spaces over the unwanted characters.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Follow a byte to its cell',
      text: 'Write row first sends 0x80 or 0xC0 with RS=0 to select address 0x00 or 0x40. Each character then sends its ASCII byte with RS=1. R/W stays at 0. When E returns from 1 to 0, the LCD accepts the byte and advances to the next cell after a character. Follow the upcoming bytes and the next write location in the panel.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Try a single command or character',
      text: 'Open Manual byte transfer. In Command mode, send 0x08 to hide the text, then 0x0C to show it again. The Start of row 1 and Start of row 2 shortcuts set the write address. Switch to Character and send A to try writing a single byte (0x41).',
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
      text: 'Натисніть «Підготувати LCD». Із RS=0 панель надсилає 0x38 для 8 бітів і двох рядків, 0x06 для переходу до наступної клітинки після символу та 0x0C для ввімкнення екрана. Підготовка зберігає текст у пам’яті. Якщо зображення було зсунуте, команда 0x02 поверне його у вихідне положення.',
      nodes: ['byte', 'rs', 'enable', 'ground', 'lcd'],
    },
    {
      title: 'Запишіть текст у два рядки',
      text: 'У полі «Куди записати» оберіть перший рядок, введіть HI й натисніть «Записати рядок». Повторіть з OK для другого рядка. Поле приймає 1–16 друкованих символів ASCII, зокрема латинські літери, цифри й пробіли. Для 17 символів панель покаже помилку. Коротший текст замінює лише зайняті ним клітинки. Щоб стерти залишок, допишіть пробіли або натисніть «Очистити».',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Простежте шлях байта до клітинки',
      text: '«Записати рядок» спершу надсилає 0x80 або 0xC0 з RS=0 і задає адресу 0x00 або 0x40. Далі кожен символ іде окремим байтом ASCII з RS=1. R/W залишається 0. LCD приймає байт, коли E переходить з 1 до 0. Після символу адреса просувається на одну клітинку. Простежте байти й наступну позицію запису на панелі.',
      nodes: ['byte', 'rs', 'enable', 'lcd'],
    },
    {
      title: 'Надішліть одну команду або символ',
      text: 'Відкрийте «Ручна передача байтів». У режимі «Команда» передайте 0x08, щоб приховати текст, а потім 0x0C, щоб показати його знову. Кнопки «На початок рядка 1» і «На початок рядка 2» задають адресу запису. Перейдіть у режим «Символ» і передайте A, щоб записати один байт (0x41).',
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
        'Writing the two rows shows HI and OK. The demo writes LOGIC LAB and PARALLEL LCD with R/W=0.',
    },
    ua: {
      goal: 'Підготуйте паралельний LCD і запишіть різний текст у кожний рядок через адреси DDRAM.',
      steps: steps.ua,
      expected: 'Запис двох рядків покаже HI й OK. Демо запише LOGIC LAB і PARALLEL LCD із R/W=0.',
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
        'Which edge of E accepts a byte, and how does RS distinguish a row address command from a character?',
        'Why does writing the 17th character not begin the second visible row?',
      ],
      ua: [
        'На якому фронті E LCD приймає байт і як RS відрізняє команду адреси рядка від символу?',
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

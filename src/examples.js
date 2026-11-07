const node = (id, type, x, y, label, params = {}) => ({
  id,
  type,
  x,
  y,
  label,
  enabled: true,
  params,
});
const wire = (source, output, target, input, width = 1) => ({
  id: `${source}-${output}-${target}-${input}`,
  from: { node: source, port: output },
  to: { node: target, port: input },
  width,
});
const project = (name, nodes, wires) => ({ version: 1, name, nodes, wires });
const input = (id, x, y, label, value = 0) => node(id, 'switch', x, y, label, { value });
const byte = (id, x, y, label, value = 0) => node(id, 'bus_input', x, y, label, { value });
const led = (id, x, y, label) => node(id, 'led', x, y, label);
const scope = (id, x, y, label, range = 5) => node(id, 'scope', x, y, label, { range });

function halfAdder() {
  return project(
    'Half adder',
    [
      input('a', 100, 140, 'Input A', 1),
      input('b', 100, 360, 'Input B'),
      node('sum', 'xor', 420, 140, 'SUM · A ⊕ B'),
      node('carry', 'and', 420, 360, 'CARRY · A ∧ B'),
      led('sum-led', 740, 140, 'Sum'),
      led('carry-led', 740, 360, 'Carry'),
    ],
    [
      wire('a', 'out', 'sum', 'a'),
      wire('b', 'out', 'sum', 'b'),
      wire('a', 'out', 'carry', 'a'),
      wire('b', 'out', 'carry', 'b'),
      wire('sum', 'out', 'sum-led', 'in'),
      wire('carry', 'out', 'carry-led', 'in'),
    ],
  );
}

function logicGates() {
  const types = ['and', 'or', 'xor', 'nand', 'nor', 'xnor', 'not'];
  const nodes = [input('a', 40, 240, 'Input A', 1), input('b', 40, 440, 'Input B')];
  const wires = [];
  types.forEach((type, index) => {
    const x = index < 4 ? 360 : 900,
      y = 40 + (index % 4) * 170;
    nodes.push(
      node(type, type, x, y, type.toUpperCase()),
      led(`${type}-led`, x + 240, y, `${type.toUpperCase()} output`),
    );
    wires.push(wire('a', 'out', type, 'a'), wire(type, 'out', `${type}-led`, 'in'));
    if (type !== 'not') wires.push(wire('b', 'out', type, 'b'));
  });
  return project('Seven logic gates', nodes, wires);
}

function fullAdder() {
  return project(
    'Full adder',
    [
      input('a', 100, 60, 'Input A', 1),
      input('b', 100, 260, 'Input B', 1),
      input('cin', 100, 460, 'Carry in'),
      node('adder', 'full_adder', 420, 240, 'A + B + Carry in'),
      led('sum', 740, 120, 'Sum'),
      led('carry', 740, 360, 'Carry out'),
    ],
    [
      wire('a', 'out', 'adder', 'a'),
      wire('b', 'out', 'adder', 'b'),
      wire('cin', 'out', 'adder', 'cin'),
      wire('adder', 'sum', 'sum', 'in'),
      wire('adder', 'carry', 'carry', 'in'),
    ],
  );
}

function dMemory() {
  return project(
    'One-bit memory',
    [
      input('data', 100, 60, 'Data D'),
      input('clock', 100, 260, 'Manual clock'),
      input('reset', 100, 460, 'Reset'),
      node('memory', 'd_ff', 420, 240, 'D flip-flop', { initial: 0 }),
      led('q', 740, 140, 'Stored Q'),
      led('nq', 740, 380, 'Inverted Q'),
    ],
    [
      wire('data', 'out', 'memory', 'd'),
      wire('clock', 'out', 'memory', 'clk'),
      wire('reset', 'out', 'memory', 'reset'),
      wire('memory', 'q', 'q', 'in'),
      wire('memory', 'nq', 'nq', 'in'),
    ],
  );
}

function counter() {
  const nodes = [
    node('clock', 'clock', 40, 40, 'Clock · 2 Hz', { frequency: 2, duty: 0.5 }),
    input('reset', 40, 260, 'Reset'),
    input('enable', 40, 480, 'Enable', 1),
    node('counter', 'counter', 340, 240, '8-bit counter', { initial: 0 }),
    node('bits', 'splitter', 620, 180, 'Bus → eight bits'),
  ];
  const wires = [
    wire('clock', 'out', 'counter', 'clk'),
    wire('reset', 'out', 'counter', 'reset'),
    wire('enable', 'out', 'counter', 'enable'),
    wire('counter', 'out', 'bits', 'in', 8),
  ];
  for (let i = 0; i < 8; i++) {
    nodes.push(
      led(
        `bit${i}`,
        920 + Math.floor(i / 4) * 260,
        40 + (i % 4) * 170,
        `Bit ${i} · weight ${2 ** i}`,
      ),
    );
    wires.push(wire('bits', `b${i}`, `bit${i}`, 'in'));
  }
  return project('Clocked binary counter', nodes, wires);
}

function bcdDisplay() {
  return project(
    'BCD display decoder',
    [
      byte('digit', 100, 220, 'Digit · value 0–9', 5),
      node('decoder', 'decoder', 420, 220, 'BCD → seven segments'),
      node('display', 'sevenseg', 740, 220, 'Decimal digit'),
    ],
    [wire('digit', 'nibble', 'decoder', 'in', 4), wire('decoder', 'out', 'display', 'in', 8)],
  );
}

function busMux() {
  const nodes = [
    byte('a', 40, 40, 'Byte A', 42),
    byte('b', 40, 260, 'Byte B', 165),
    input('select', 40, 480, 'Select B'),
    node('mux', 'mux', 320, 240, 'Choose A or B'),
    node('splitter', 'splitter', 600, 180, 'Split byte'),
    node('merger', 'merger', 880, 180, 'Merge the same bits'),
    node('demux', 'demux', 1160, 240, 'Route selected byte'),
    scope('left', 1440, 80, 'Route 0 · byte', 255),
    scope('right', 1440, 400, 'Route 1 · byte', 255),
  ];
  const wires = [
    wire('a', 'out', 'mux', 'a', 8),
    wire('b', 'out', 'mux', 'b', 8),
    wire('select', 'out', 'mux', 'sel'),
    wire('mux', 'out', 'splitter', 'in', 8),
    wire('merger', 'out', 'demux', 'in', 8),
    wire('select', 'out', 'demux', 'sel'),
    wire('demux', 'a', 'left', 'in', 8),
    wire('demux', 'b', 'right', 'in', 8),
  ];
  for (let i = 0; i < 8; i++) wires.push(wire('splitter', `b${i}`, 'merger', `b${i}`));
  return project('Bus routing and selection', nodes, wires);
}

function alu() {
  return project(
    '8-bit arithmetic and logic',
    [
      byte('a', 80, 40, 'Operand A', 5),
      byte('b', 80, 260, 'Operand B', 3),
      byte('op', 80, 480, 'Operation · value 0–7'),
      node('alu', 'alu', 420, 220, '8-bit ALU'),
      scope('result', 740, 40, 'Result · decimal byte', 255),
      led('carry', 740, 300, 'Carry / borrow'),
      led('zero', 740, 500, 'Zero result'),
    ],
    [
      wire('a', 'out', 'alu', 'a', 8),
      wire('b', 'out', 'alu', 'b', 8),
      wire('op', 'address', 'alu', 'op', 3),
      wire('alu', 'out', 'result', 'in', 8),
      wire('alu', 'carry', 'carry', 'in'),
      wire('alu', 'zero', 'zero', 'in'),
    ],
  );
}

function ram() {
  return project(
    'Memory read and write',
    [
      byte('address', 40, 40, 'Address · value 0–15', 2),
      byte('data', 40, 240, 'Write data', 42),
      input('clock', 40, 440, 'Write clock'),
      input('write', 40, 640, 'Write enable'),
      input('chip', 340, 640, 'Chip select', 1),
      input('read', 620, 640, 'Output enable', 1),
      node('ram', 'ram', 340, 80, 'RAM · writable'),
      node('rom', 'rom', 640, 80, 'ROM · fixed data', {
        data: '0,10,20,30,40,50,60,70,80,90,100,110,120,130,140,150',
      }),
      node('registers', 'register_file', 940, 80, 'Register file'),
      scope('ram-view', 340, 420, 'RAM output', 255),
      scope('rom-view', 640, 420, 'ROM output', 255),
      scope('reg-view', 940, 420, 'Register output', 255),
    ],
    [
      wire('address', 'nibble', 'ram', 'address', 4),
      wire('data', 'out', 'ram', 'data', 8),
      wire('clock', 'out', 'ram', 'clk'),
      wire('chip', 'out', 'ram', 'cs'),
      wire('read', 'out', 'ram', 'oe'),
      wire('write', 'out', 'ram', 'we'),
      wire('ram', 'out', 'ram-view', 'in', 8),
      wire('address', 'nibble', 'rom', 'address', 4),
      wire('chip', 'out', 'rom', 'cs'),
      wire('read', 'out', 'rom', 'oe'),
      wire('rom', 'out', 'rom-view', 'in', 8),
      wire('address', 'address', 'registers', 'read', 3),
      wire('address', 'address', 'registers', 'write', 3),
      wire('data', 'out', 'registers', 'data', 8),
      wire('clock', 'out', 'registers', 'clk'),
      wire('write', 'out', 'registers', 'we'),
      wire('registers', 'out', 'reg-view', 'in', 8),
    ],
  );
}

function wiredAnd() {
  return project(
    'Open-drain wired AND',
    [
      input('a', 80, 100, 'Release A', 1),
      input('b', 80, 380, 'Release B', 1),
      node('drain-a', 'open_drain', 380, 100, 'Open drain A'),
      node('drain-b', 'open_drain', 380, 380, 'Open drain B'),
      node('pull', 'pullup', 680, 80, 'Weak pull-up'),
      led('line', 980, 240, 'Shared line'),
    ],
    [
      wire('a', 'out', 'drain-a', 'in'),
      wire('b', 'out', 'drain-b', 'in'),
      wire('drain-a', 'out', 'line', 'in'),
      wire('drain-b', 'out', 'line', 'in'),
      wire('pull', 'out', 'line', 'in'),
    ],
  );
}

function schmitt() {
  return project(
    'Schmitt hysteresis',
    [
      byte('level', 80, 220, 'Voltage byte', 0),
      node('dac', 'dac', 360, 220, 'Byte → 0–5 V', { vcc: 5 }),
      node('schmitt', 'schmitt', 660, 220, 'Hysteresis · 1.5 / 3.5 V', { low: 1.5, high: 3.5 }),
      led('clean', 960, 220, 'Clean digital output'),
      scope('voltage', 360, 460, 'Input voltage', 5),
    ],
    [
      wire('level', 'out', 'dac', 'in', 8),
      wire('dac', 'out', 'schmitt', 'in'),
      wire('schmitt', 'out', 'clean', 'in'),
      wire('dac', 'out', 'voltage', 'in'),
    ],
  );
}

function monostable() {
  return project(
    'One trigger, one pulse',
    [
      input('trigger', 100, 120, 'Trigger'),
      input('reset', 100, 380, 'Reset'),
      node('timer', 'monostable', 420, 240, 'One-shot · 0.5 s', { duration: 0.5 }),
      led('pulse', 740, 120, 'Pulse output'),
      scope('trace', 740, 380, 'Pulse waveform', 1),
    ],
    [
      wire('trigger', 'out', 'timer', 'trigger'),
      wire('reset', 'out', 'timer', 'reset'),
      wire('timer', 'out', 'pulse', 'in'),
      wire('timer', 'out', 'trace', 'in'),
    ],
  );
}

function adcDac() {
  return project(
    'Digital–analog round trip',
    [
      byte('value', 40, 200, 'Original byte', 128),
      node('dac', 'dac', 320, 200, 'DAC · 5 V', { vcc: 5 }),
      node('adc', 'adc', 620, 200, 'ADC · 5 V', { vcc: 5 }),
      node('compare', 'comparator', 920, 200, 'Compare original and decoded'),
      led('equal', 1220, 40, 'Original = decoded'),
      led('less', 1220, 240, 'Original < decoded'),
      led('greater', 1220, 440, 'Original > decoded'),
      scope('voltage', 320, 460, 'Analog voltage', 5),
    ],
    [
      wire('value', 'out', 'dac', 'in', 8),
      wire('dac', 'out', 'adc', 'in'),
      wire('value', 'out', 'compare', 'a', 8),
      wire('adc', 'out', 'compare', 'b', 8),
      wire('compare', 'eq', 'equal', 'in'),
      wire('compare', 'lt', 'less', 'in'),
      wire('compare', 'gt', 'greater', 'in'),
      wire('dac', 'out', 'voltage', 'in'),
    ],
  );
}

function mixedSignals() {
  return project(
    'AM and FM modulation',
    [
      node('clock', 'clock', 40, 40, 'Sample clock · 8 Hz', { frequency: 8, duty: 0.5 }),
      input('reset', 40, 260, 'Reset'),
      input('enable', 40, 480, 'Enable', 1),
      node('counter', 'counter', 320, 240, 'Digital ramp', { initial: 128 }),
      node('dac', 'dac', 600, 240, 'DAC · modulation voltage', { vcc: 5 }),
      node('am', 'am', 900, 80, 'AM carrier', {
        carrier: 8,
        frequency: 1,
        depth: 0.6,
        amplitude: 5,
      }),
      node('fm', 'fm', 900, 400, 'FM carrier', {
        carrier: 8,
        frequency: 1,
        depth: 0.6,
        amplitude: 5,
      }),
      scope('ramp-scope', 600, 500, 'Modulation voltage', 5),
      scope('mod-scope', 1200, 80, 'AM waveform', 5),
      scope('fm-scope', 1200, 400, 'FM waveform', 5),
    ],
    [
      wire('clock', 'out', 'counter', 'clk'),
      wire('reset', 'out', 'counter', 'reset'),
      wire('enable', 'out', 'counter', 'enable'),
      wire('counter', 'out', 'dac', 'in', 8),
      wire('dac', 'out', 'am', 'mod'),
      wire('dac', 'out', 'fm', 'mod'),
      wire('dac', 'out', 'ramp-scope', 'in'),
      wire('am', 'out', 'mod-scope', 'in'),
      wire('fm', 'out', 'fm-scope', 'in'),
    ],
  );
}

function pwmServos() {
  return project(
    'PWM control surfaces',
    [
      node('course', 'pwm', 80, 100, 'Course PWM', { frequency: 105, duty: 0.34 }),
      node('height', 'pwm', 80, 380, 'Height PWM', { frequency: 105, duty: 0.66 }),
      scope('course-scope', 400, 80, 'Course PWM waveform', 1),
      scope('height-scope', 400, 440, 'Height PWM waveform', 1),
      node('servos', 'servo', 740, 240, 'Control surface bank', {
        minDuty: 0.18,
        maxDuty: 0.82,
        range: 180,
      }),
    ],
    [
      wire('course', 'out', 'course-scope', 'in'),
      wire('height', 'out', 'height-scope', 'in'),
      wire('course', 'duty', 'servos', 's1'),
      wire('height', 'duty', 'servos', 's2'),
      wire('course', 'duty', 'servos', 's3'),
      wire('height', 'duty', 'servos', 's4'),
    ],
  );
}

function lesson(goal, goalUa, steps, expected, expectedUa) {
  return {
    en: {
      goal,
      steps: steps.map(([nodes, title, text]) => ({ title, text, nodes: [...nodes] })),
      expected,
    },
    ua: {
      goal: goalUa,
      steps: steps.map(([nodes, , , title, text]) => ({ title, text, nodes: [...nodes] })),
      expected: expectedUa,
    },
  };
}
function exercise(
  id,
  label,
  ua,
  category,
  level,
  description,
  descriptionUa,
  create,
  instructions,
) {
  return {
    id,
    label,
    ua,
    category,
    level,
    description,
    descriptionUa,
    lesson: instructions,
    create: () => ({ ...create(), exampleId: id }),
  };
}

export const EXAMPLES = [
  exercise(
    'half-adder',
    'Half adder',
    'Напівсуматор',
    'basics',
    'beginner',
    'Build addition from XOR and AND, then test all four input combinations.',
    'Складіть додавання з XOR та AND і перевірте чотири комбінації входів.',
    halfAdder,
    lesson(
      'Discover how two bits produce a sum bit and a carry bit.',
      'Дослідіть, як два біти утворюють суму й перенос.',
      [
        [
          ['a', 'b'],
          'Start with 1 + 0',
          'A starts at 1 and B at 0. The Sum lamp is on; Carry is off. Click either switch to change its bit.',
          'Почніть з 1 + 0',
          'A має 1, B має 0. Sum світиться, Carry — ні. Клацніть перемикач, щоб змінити його біт.',
        ],
        [
          ['a', 'b', 'carry', 'carry-led'],
          'Try 1 + 1',
          'Set both A and B to 1. Sum turns off and Carry turns on: binary 10 means decimal 2.',
          'Спробуйте 1 + 1',
          'Установіть A та B в 1. Sum гасне, Carry світиться: двійкове 10 — це десяткове 2.',
        ],
        [
          ['sum', 'sum-led', 'carry'],
          'Complete the truth table',
          'Try 00, 01, 10 and 11. Select XOR or AND and compare its Truth table with the lamps. Run is unnecessary for these gates.',
          'Перевірте таблицю істинності',
          'Спробуйте 00, 01, 10 та 11. Оберіть XOR або AND і порівняйте таблицю істинності з індикаторами. Запуск для цих елементів не потрібний.',
        ],
      ],
      'Sum = A XOR B; Carry = A AND B. The pair Carry, Sum is the two-bit answer.',
      'Sum = A XOR B; Carry = A AND B. Пара Carry, Sum — двобітний результат.',
    ),
  ),

  exercise(
    'logic-gates',
    'Seven logic gates',
    'Сім логічних елементів',
    'basics',
    'beginner',
    'The same two switches feed AND, OR, XOR and their inverted variants.',
    'Два спільні перемикачі керують AND, OR, XOR та їхніми інверсіями.',
    logicGates,
    lesson(
      'Compare the seven basic logic functions using identical inputs.',
      'Порівняйте сім основних логічних функцій на однакових входах.',
      [
        [
          ['a', 'b', 'and', 'or', 'xor'],
          'Compare AND, OR and XOR',
          'With A=1 and B=0, AND is 0 while OR and XOR are 1. Set B=1: AND and OR become 1, but XOR becomes 0.',
          'Порівняйте AND, OR та XOR',
          'При A=1, B=0 елемент AND дає 0, OR і XOR — 1. Увімкніть B: AND та OR дадуть 1, XOR — 0.',
        ],
        [
          ['nand', 'nor', 'xnor', 'not'],
          'Look for opposites',
          'NAND always inverts AND, NOR inverts OR, and XNOR inverts XOR. NOT uses only A and always gives its opposite.',
          'Знайдіть протилежності',
          'NAND інвертує AND, NOR інвертує OR, XNOR інвертує XOR. NOT використовує лише A і дає протилежний біт.',
        ],
        [
          ['a', 'b'],
          'Try every input pair',
          'Click A and B to try 00, 01, 10 and 11. Select a gate header to read its explanation and Truth table in the inspector.',
          'Перевірте всі пари',
          'Клацайте A та B для комбінацій 00, 01, 10 та 11. Оберіть заголовок елемента, щоб прочитати пояснення й таблицю істинності.',
        ],
      ],
      'Every inverted pair has opposite lamps. XOR is high for exactly one high input.',
      'Індикатори кожної інверсної пари протилежні. XOR дає одиницю рівно для одного високого входу.',
    ),
  ),

  exercise(
    'full-adder',
    'Full adder',
    'Повний суматор',
    'basics',
    'beginner',
    'Add A, B and an incoming carry; read a two-bit answer.',
    'Додайте A, B і вхідний перенос; прочитайте двобітну відповідь.',
    fullAdder,
    lesson(
      'Learn why multi-bit addition needs a carry input.',
      'Дізнайтеся, навіщо багатобітному додаванню потрібен вхід переносу.',
      [
        [
          ['a', 'b', 'cin', 'adder'],
          'Add two ones',
          'A and B start high and Carry in is low. The total is 2: Sum=0 and Carry out=1.',
          'Додайте дві одиниці',
          'A та B увімкнені, Carry in вимкнений. Сума дорівнює 2: Sum=0, Carry out=1.',
        ],
        [
          ['cin', 'sum', 'carry'],
          'Add the incoming carry',
          'Turn Carry in on. The total becomes 3, so both result lamps turn on: binary 11.',
          'Додайте вхідний перенос',
          'Увімкніть Carry in. Сума стане 3, обидва індикатори засвітяться: двійкове 11.',
        ],
        [
          ['a', 'b', 'cin'],
          'Test an empty column',
          'Set A=B=0 and leave Carry in=1. Only Sum should stay high. Try the remaining combinations and compare the adder Truth table.',
          'Перевірте порожній розряд',
          'Установіть A=B=0, залишивши Carry in=1. Світиться лише Sum. Спробуйте інші комбінації й порівняйте таблицю істинності суматора.',
        ],
      ],
      'A + B + Carry in = Sum + 2 × Carry out for all eight combinations.',
      'A + B + Carry in = Sum + 2 × Carry out для всіх восьми комбінацій.',
    ),
  ),

  exercise(
    'd-memory',
    'One-bit memory',
    'Однобітна пам’ять',
    'sequential',
    'beginner',
    'Use a manual clock to store a bit and learn what a rising edge means.',
    'Запам’ятайте біт ручним тактом і дослідіть додатний фронт.',
    dMemory,
    lesson(
      'Separate the current data input from a stored output.',
      'Відрізніть поточний вхід від збереженого виходу.',
      [
        [
          ['data', 'memory', 'q'],
          'Change data without a clock',
          'Leave Manual clock at 0 and set Data D to 1. Stored Q remains 0: changing data alone does not write the memory.',
          'Змініть дані без такту',
          'Залиште Manual clock=0 та встановіть Data D=1. Stored Q залишається 0: сама зміна даних не записує пам’ять.',
        ],
        [
          ['clock', 'memory', 'q', 'nq'],
          'Capture a rising edge',
          'Click Manual clock from 0 to 1. Q becomes 1 and Inverted Q becomes 0. Now set Data D back to 0; Q still remembers 1.',
          'Захопіть додатний фронт',
          'Перемкніть Manual clock з 0 в 1. Q стане 1, Inverted Q — 0. Поверніть Data D в 0: Q усе ще пам’ятає 1.',
        ],
        [
          ['clock', 'reset', 'q'],
          'Write again, then reset',
          'Set Manual clock to 0 and back to 1 to store the new 0. Reset=1 clears Q immediately, with no clock edge. Return Reset to 0 afterward.',
          'Запишіть знову й скиньте',
          'Перемкніть Manual clock в 0 і знову в 1, щоб записати новий 0. Reset=1 негайно очищає Q без такту. Потім поверніть Reset в 0.',
        ],
      ],
      'Q changes on 0→1 clock transitions or an active reset; a steady high clock does not continuously copy D.',
      'Q змінюється за переходом такту 0→1 або при скиданні; постійна одиниця такту не копіює D безперервно.',
    ),
  ),

  exercise(
    'counter',
    'Binary counter',
    'Двійковий лічильник',
    'sequential',
    'beginner',
    'Watch eight real bit lamps count; pause, enable and reset the counter.',
    'Спостерігайте вісім бітових індикаторів; зупиняйте, дозволяйте й скидайте лічбу.',
    counter,
    lesson(
      'Read a byte as eight weighted binary bits.',
      'Навчіться читати байт як вісім двійкових бітів із вагами.',
      [
        [
          ['clock', 'counter', 'bits'],
          'Start the clock',
          'Keep the simulation running; press Run only if paused. The 2 Hz clock creates two rising edges per simulated second. Select the counter to watch its numeric Q value.',
          'Запустіть такт',
          'Залиште симуляцію активною; натисніть Запуск лише після паузи. Такт 2 Гц створює два додатні фронти за секунду симуляції. Оберіть лічильник і спостерігайте числове Q.',
        ],
        [
          ['bit0', 'bit1', 'bit2', 'bit3'],
          'Read the lamps',
          'Bit 0 has weight 1, bit 1 weight 2, bit 2 weight 4. For count 5, only the lamps with weights 1 and 4 are on. The splitter exposes each bit.',
          'Прочитайте індикатори',
          'Біт 0 має вагу 1, біт 1 — 2, біт 2 — 4. Для числа 5 світяться лише ваги 1 та 4. Розгалужувач показує кожен біт.',
        ],
        [
          ['enable', 'reset', 'counter'],
          'Hold and clear',
          'Set Enable=0: the clock keeps running but the stored count holds. Set Reset=1 to clear all bits; return Reset=0 and Enable=1 to resume.',
          'Зупиніть і очистіть',
          'Enable=0 зупиняє лічбу, хоча такт працює. Reset=1 очищає всі біти; поверніть Reset=0 та Enable=1 для продовження.',
        ],
      ],
      'The byte counts 0…255, then wraps to 0. The lamps show bit values, not seven-segment masks.',
      'Байт лічить від 0 до 255 і повертається в 0. Індикатори показують біти числа.',
    ),
  ),

  exercise(
    'bcd-display',
    'BCD display',
    'BCD-індикатор',
    'basics',
    'beginner',
    'Decode a four-bit decimal digit into a seven-segment pattern.',
    'Перетворіть чотирибітну десяткову цифру на семисегментний рисунок.',
    bcdDisplay,
    lesson(
      'Distinguish a digit code from the wires that light its segments.',
      'Відрізніть код цифри від дротів її окремих сегментів.',
      [
        [
          ['digit', 'decoder', 'display'],
          'Read digit 5',
          'The input value starts at 5. LOW4 carries its four-bit code; the decoder produces the eight-bit segment mask that lights a 5.',
          'Прочитайте цифру 5',
          'Вхідне значення — 5. LOW4 передає чотирибітний код; декодер формує восьмибітну маску сегментів цифри 5.',
        ],
        [
          ['digit', 'display'],
          'Choose another digit',
          'Select the Digit component header. In Parameters, change Value to 0, then 8, then 9. The display updates immediately without Run.',
          'Оберіть іншу цифру',
          'Оберіть заголовок Digit. У параметрах змініть Значення на 0, потім 8 і 9. Індикатор оновиться відразу, без Запуску.',
        ],
        [
          ['digit', 'decoder'],
          'Try an invalid BCD digit',
          'Set Value to 10. BCD only defines 0–9, so this decoder blanks the display. Restore a value from 0 to 9.',
          'Спробуйте недопустимий BCD',
          'Задайте Значення 10. BCD визначає лише цифри 0–9, тому цей декодер гасить індикатор. Поверніть значення від 0 до 9.',
        ],
      ],
      'The decoder output is a segment mask, not the original number; digit 8 activates all seven segments.',
      'Вихід декодера — маска сегментів, а не початкове число; цифра 8 вмикає всі сім сегментів.',
    ),
  ),

  exercise(
    'bus-mux',
    'Route an eight-bit bus',
    'Маршрутизація восьмибітної шини',
    'architecture',
    'intermediate',
    'Select a byte, split and merge its bits, then route it to one output.',
    'Оберіть байт, розділіть та об’єднайте біти й спрямуйте на один вихід.',
    busMux,
    lesson(
      'Follow a byte through selection, individual wires and routing.',
      'Простежте байт через вибір, окремі дроти й розподіл.',
      [
        [
          ['a', 'b', 'select', 'mux'],
          'Select byte A',
          'Select B starts at 0. The multiplexer forwards Byte A=42. Select MUX to see the numeric bus input and output values.',
          'Оберіть байт A',
          'Select B спочатку має 0. Мультиплексор передає Byte A=42. Оберіть MUX, щоб побачити числові значення шин.',
        ],
        [
          ['splitter', 'merger'],
          'Follow the bit order',
          'The splitter sends b0 to b0, b1 to b1 and so on. The merger reconstructs the same byte. Thick wires carry eight bits; thin wires carry one.',
          'Простежте порядок бітів',
          'Розгалужувач з’єднує b0 з b0, b1 з b1 тощо. Об’єднувач відновлює той самий байт. Товсті дроти передають вісім бітів, тонкі — один.',
        ],
        [
          ['select', 'demux', 'left', 'right'],
          'Switch the route',
          'Turn Select B on. Now 165 appears at Route 1 and Route 0 becomes 0. Turn it off to send 42 to Route 0. Select a scope to read its input immediately, or Run to draw traces.',
          'Перемкніть маршрут',
          'Увімкніть Select B. Тепер Route 1 має 165, Route 0 — 0. Вимкніть його для передавання 42 у Route 0. Вхід осцилографа видно відразу; Запуск малює графік.',
        ],
      ],
      'Selector 0 chooses A and route 0; selector 1 chooses B and route 1. Splitting and merging preserve the byte.',
      'Селектор 0 обирає A та маршрут 0, селектор 1 — B та маршрут 1. Розділення й об’єднання зберігають байт.',
    ),
  ),

  exercise(
    'alu',
    'Arithmetic & logic unit',
    'Арифметико-логічний пристрій',
    'architecture',
    'intermediate',
    'Choose addition, subtraction, logic or shifts and inspect result flags.',
    'Оберіть додавання, віднімання, логіку чи зсуви й перевірте прапорці.',
    alu,
    lesson(
      'Use an operation code to select what the same hardware computes.',
      'Керуйте обчисленням одного пристрою за допомогою коду операції.',
      [
        [
          ['a', 'b', 'op', 'alu', 'result'],
          'Add 5 and 3',
          'Operation Value=0 selects addition. Select the ALU: result Y is 8, Carry=0 and Zero=0. A scope input also shows the decimal result.',
          'Додайте 5 і 3',
          'Значення Operation=0 обирає додавання. Оберіть ALU: Y=8, Carry=0, Zero=0. Вхід осцилографа теж показує десятковий результат.',
        ],
        [
          ['op', 'alu'],
          'Choose a logic operation',
          'Set Operation Value to 2 for bitwise AND: 5 AND 3 = 1. Set it to 4 for XOR: result 6. Value 1 subtracts B from A, giving 2.',
          'Оберіть логічну операцію',
          'Задайте Operation=2 для побітового AND: 5 AND 3 = 1. Код 4 обирає XOR і дає 6. Код 1 віднімає B від A та дає 2.',
        ],
        [
          ['a', 'b', 'op', 'carry', 'zero'],
          'Cause an overflow',
          'Set A Value=255, B Value=1 and Operation Value=0. The eight-bit result wraps to 0; both Carry and Zero light up.',
          'Створіть переповнення',
          'Задайте A=255, B=1, Operation=0. Восьмибітний результат повернеться до 0; Carry та Zero засвітяться.',
        ],
      ],
      'Operation codes: 0 add, 1 subtract, 2 AND, 3 OR, 4 XOR, 5 left shift, 6 right shift, 7 NOT A.',
      'Коди: 0 додавання, 1 віднімання, 2 AND, 3 OR, 4 XOR, 5 зсув вліво, 6 вправо, 7 NOT A.',
    ),
  ),

  exercise(
    'ram',
    'Read & write memory',
    'Читання й запис пам’яті',
    'architecture',
    'intermediate',
    'Write a byte on a clock edge, change address, and compare RAM, ROM and registers.',
    'Запишіть байт за фронтом такту, змініть адресу й порівняйте ОЗП, ПЗП та регістри.',
    ram,
    lesson(
      'Understand address, data and the controls that permit a memory write.',
      'Зрозумійте адресу, дані та керування записом пам’яті.',
      [
        [
          ['address', 'data', 'ram', 'rom', 'registers'],
          'Inspect the starting address',
          'Address=2 and Write data=42. RAM and Register file initially read 0; the fixed ROM reads 20. Select their outputs or scopes to inspect them.',
          'Перевірте початкову адресу',
          'Address=2, Write data=42. RAM та Register file спочатку читають 0; постійна ROM читає 20. Оберіть їхні виходи або осцилографи.',
        ],
        [
          ['write', 'clock', 'ram', 'registers'],
          'Write one byte',
          'Turn Write enable on, then switch Write clock from 0 to 1. This writes 42 into RAM and the register file. RAM output is Z while Write enable=1. Turn Write enable off to read back 42.',
          'Запишіть байт',
          'Увімкніть Write enable, а потім перемкніть Write clock з 0 в 1. У RAM і регістровий файл запишеться 42. При Write enable=1 вихід RAM має Z. Вимкніть Write enable і прочитайте 42.',
        ],
        [
          ['address', 'ram-view', 'rom-view', 'reg-view'],
          'Visit another address',
          'Set Address Value to 3: RAM/registers read 0 and ROM reads 30. Set it back to 2: RAM/registers still contain 42. Register addresses use only the lowest three bits (0–7).',
          'Перейдіть за іншою адресою',
          'Задайте Address=3: RAM/регістри покажуть 0, ROM — 30. Поверніть 2: RAM/регістри зберегли 42. Регістри використовують лише три молодші біти адреси (0–7).',
        ],
        [
          ['chip', 'read', 'clock'],
          'Release the outputs',
          'Output enable=0 releases RAM and ROM to Z; Chip select=0 disables them. These controls do not gate the register file. Return both to 1. Before another write, return Write clock to 0.',
          'Відпустіть виходи',
          'Output enable=0 переводить RAM і ROM у Z; Chip select=0 вимикає їх. На регістровий файл ці входи не впливають. Поверніть обидва в 1. Перед новим записом поверніть Write clock в 0.',
        ],
      ],
      'Memory changes only on a permitted rising write edge. Changing data or address alone does not write a byte.',
      'Пам’ять змінюється лише за дозволеним додатним фронтом запису. Сама зміна даних чи адреси не записує байт.',
    ),
  ),

  exercise(
    'wired-and',
    'Open-drain wired AND',
    'Монтажне І з відкритим стоком',
    'physical',
    'intermediate',
    'Share a line safely using released outputs and a weak pull-up.',
    'Об’єднайте виходи через відкритий стік і слабку підтяжку.',
    wiredAnd,
    lesson(
      'See how a released output differs from actively driving a high level.',
      'Побачте відмінність між відпущеним виходом і активною одиницею.',
      [
        [
          ['a', 'b', 'drain-a', 'drain-b', 'pull'],
          'Release both drivers',
          'Release A and Release B start at 1. Both open drains output Z, so the weak pull-up alone makes Shared line high.',
          'Відпустіть обидва виходи',
          'Release A та Release B спочатку мають 1. Обидва відкриті стоки дають Z, тому слабка підтяжка піднімає Shared line.',
        ],
        [
          ['a', 'drain-a', 'line'],
          'Pull the shared line low',
          'Set Release A=0. Its driver actively pulls the line low and overrides the pull-up. Release B cannot force it high. Try both switch combinations.',
          'Стягніть спільну лінію до нуля',
          'Задайте Release A=0. Вихід активно стягує лінію до нуля й переважає підтяжку. Release B не може підняти її. Перевірте обидва перемикачі.',
        ],
        [
          ['a', 'b', 'pull', 'line'],
          'Remove the pull-up',
          'Return A=B=1. Select Weak pull-up and uncheck Enabled. Shared line becomes Z, not 1. Re-enable the resistor to restore a high line.',
          'Приберіть підтяжку',
          'Поверніть A=B=1. Оберіть Weak pull-up і вимкніть Увімкнено. Shared line стане Z, а не 1. Увімкніть резистор для відновлення одиниці.',
        ],
      ],
      'The shared line is high only when every open drain releases it and a pull-up exists: wired AND behavior.',
      'Спільна лінія висока лише тоді, коли всі відкриті стоки відпущені й є підтяжка: монтажне І.',
    ),
  ),

  exercise(
    'schmitt',
    'Schmitt hysteresis',
    'Гістерезис тригера Шмітта',
    'physical',
    'intermediate',
    'Move a voltage above and below two thresholds and watch the stored decision.',
    'Змінюйте напругу навколо двох порогів і спостерігайте збережене рішення.',
    schmitt,
    lesson(
      'Learn why two thresholds stop an output chattering near one voltage.',
      'Дізнайтеся, як два пороги запобігають перемиканню біля однієї напруги.',
      [
        [
          ['level', 'dac', 'schmitt'],
          'Start below the low threshold',
          'Voltage byte starts at 0, giving 0 V. The Schmitt output is 0. Select the DAC to read its voltage while changing the byte.',
          'Почніть нижче нижнього порогу',
          'Voltage byte=0 дає 0 В. Вихід Шмітта — 0. Оберіть ЦАП, щоб читати напругу під час зміни байта.',
        ],
        [
          ['level', 'schmitt', 'clean'],
          'Cross the high threshold',
          'Set Voltage byte Value=200: the DAC produces about 3.92 V, above 3.5 V, so the output turns on. Then set Value=128 (about 2.51 V); the output stays on.',
          'Перетніть верхній поріг',
          'Задайте Voltage byte=200: ЦАП дасть близько 3.92 В, вище 3.5 В, і вихід увімкнеться. Потім задайте 128 (близько 2.51 В): вихід залишиться увімкненим.',
        ],
        [
          ['level', 'schmitt', 'clean'],
          'Cross the low threshold',
          'Set Value=50 (about 0.98 V): output turns off below 1.5 V. Set Value=128 again: the same 2.51 V now holds an off output. Do not reset between these changes.',
          'Перетніть нижній поріг',
          'Задайте 50 (близько 0.98 В): нижче 1.5 В вихід вимкнеться. Поверніть 128: ті самі 2.51 В тепер збережуть вимкнений вихід. Не скидайте симуляцію між змінами.',
        ],
      ],
      'Between 1.5 V and 3.5 V the output remembers its previous state; outside that band it switches deterministically.',
      'Між 1.5 В і 3.5 В вихід пам’ятає попередній стан; за межами цього діапазону перемикається однозначно.',
    ),
  ),

  exercise(
    'monostable',
    'One trigger, one pulse',
    'Один запуск — один імпульс',
    'physical',
    'beginner',
    'Trigger a 0.5-second pulse and see why holding the trigger does not extend it.',
    'Запустіть імпульс 0.5 с і перевірте, чому утримання входу не подовжує його.',
    monostable,
    lesson(
      'Turn an input edge into a pulse of a known duration.',
      'Перетворіть фронт входу на імпульс заданої тривалості.',
      [
        [
          ['trigger', 'timer', 'pulse'],
          'Start time, then trigger',
          'Keep the simulation running; press Run only if paused. Click Trigger from 0 to 1. Pulse output lights immediately for 0.5 seconds.',
          'Запустіть час та імпульс',
          'Залиште симуляцію активною; натисніть Запуск лише після паузи. Перемкніть Trigger з 0 в 1. Pulse output одразу засвітиться на 0.5 секунди.',
        ],
        [
          ['trigger', 'timer', 'trace'],
          'Hold and re-arm',
          'Keep Trigger at 1: the pulse still ends. Return Trigger to 0 and then to 1 to create another pulse. Extra rising edges during an active pulse are ignored.',
          'Утримуйте й підготуйте знову',
          'Тримайте Trigger=1: імпульс усе одно завершиться. Поверніть Trigger в 0 і знову в 1 для нового імпульсу. Фронти під час активного імпульсу ігноруються.',
        ],
        [
          ['timer', 'reset'],
          'Change duration and cancel',
          'Select the timer and set Pulse duration to 1 second, then trigger again. Reset=1 cancels an active pulse immediately; return Reset=0 before the next experiment.',
          'Змініть тривалість і скасуйте',
          'Оберіть таймер, задайте Тривалість імпульсу 1 с та запустіть знову. Reset=1 негайно скасовує активний імпульс; поверніть Reset=0 перед наступним дослідом.',
        ],
      ],
      'One rising trigger produces one fixed-duration pulse. Pausing freezes time; Reset can end a pulse early.',
      'Один додатний фронт створює один імпульс заданої тривалості. Пауза зупиняє час; Reset може завершити імпульс раніше.',
    ),
  ),

  exercise(
    'adc-dac',
    'Digital–analog round trip',
    'Цифро-аналогове перетворення',
    'mixed',
    'beginner',
    'Convert a byte into voltage and back, then compare the recovered number.',
    'Перетворіть байт на напругу й назад та порівняйте відновлене число.',
    adcDac,
    lesson(
      'Connect digital codes to analog voltage using matching converter ranges.',
      'Пов’яжіть цифрові коди з напругою через однакові діапазони перетворювачів.',
      [
        [
          ['value', 'dac', 'adc', 'equal'],
          'Inspect the round trip',
          'Original byte starts at 128. DAC produces about 2.51 V, ADC recovers 128, and Original = decoded is on.',
          'Перевірте перетворення',
          'Original byte=128. ЦАП дає близько 2.51 В, АЦП відновлює 128, індикатор Original = decoded світиться.',
        ],
        [
          ['value', 'dac', 'adc', 'compare'],
          'Try the endpoints',
          'Select Original byte and change Value to 0, then 255. The DAC spans 0–5 V; the ADC recovers the same byte. Try intermediate values too.',
          'Перевірте межі',
          'Оберіть Original byte і задайте Значення 0, потім 255. ЦАП охоплює 0–5 В; АЦП відновлює той самий байт. Спробуйте проміжні значення.',
        ],
        [
          ['value', 'adc', 'less'],
          'Mismatch the voltage ranges',
          'Restore Value=128, then set the ADC Supply voltage to 2.5 V. Its output saturates at 255 and Original < decoded turns on. Restore ADC supply to 5 V.',
          'Змініть діапазон АЦП',
          'Поверніть Значення 128 та задайте АЦП Напруга живлення 2.5 В. Його вихід насититься до 255, Original < decoded засвітиться. Поверніть живлення АЦП 5 В.',
        ],
      ],
      'Matching 5 V converters recover every byte. Different ranges change the code even though the measured voltage is unchanged.',
      'За однакових діапазонів 5 В відновлюється кожен байт. Різні діапазони змінюють код при тій самій напрузі.',
    ),
  ),

  exercise(
    'mixed-signals',
    'Compare AM and FM',
    'Порівняння АМ і ЧМ',
    'mixed',
    'intermediate',
    'Feed the same changing voltage to AM and FM carriers and compare their scopes.',
    'Подайте одну змінну напругу на АМ та ЧМ і порівняйте осцилограми.',
    mixedSignals,
    lesson(
      'See that AM changes amplitude while FM changes instantaneous frequency.',
      'Побачте, як АМ змінює амплітуду, а ЧМ — миттєву частоту.',
      [
        [
          ['clock', 'counter', 'dac', 'ramp-scope'],
          'Start a modulation ramp',
          'Keep the simulation running; press Run only if paused. The counter starts at 128 and advances eight codes per simulated second. The DAC converts it into a rising 0–5 V staircase.',
          'Запустіть сигнал модуляції',
          'Залиште симуляцію активною; натисніть Запуск лише після паузи. Лічильник починає з 128 і додає вісім кодів за секунду. ЦАП перетворює їх на сходинкову напругу 0–5 В.',
        ],
        [
          ['am', 'fm', 'mod-scope', 'fm-scope'],
          'Compare the two carriers',
          'Both carriers start at 8 Hz and receive the same modulation. AM changes the waveform height; FM changes the spacing between cycles. Select each generator to inspect its parameters.',
          'Порівняйте несучі',
          'Обидві несучі починають з 8 Гц і отримують одну модуляцію. АМ змінює висоту хвилі, ЧМ — відстань між періодами. Оберіть генератори та перегляньте параметри.',
        ],
        [
          ['enable', 'reset', 'am', 'fm'],
          'Hold the modulation, then remove its effect',
          'Set Enable=0 to hold the DAC voltage while both carriers keep running. Set Modulation depth=0 on AM and FM: each becomes an unmodulated carrier. Reset=1 returns the ramp to 0.',
          'Зафіксуйте й усуньте модуляцію',
          'Enable=0 утримує напругу ЦАП, поки обидві несучі працюють. Задайте Глибина модуляції=0 в АМ та ЧМ: обидва стануть немодульованими. Reset=1 повертає сигнал до 0.',
        ],
      ],
      'Amplitude and frequency respond differently to one source. Use scopes and live numeric values together to compare them.',
      'Амплітуда й частота по-різному реагують на одне джерело. Порівнюйте осцилограми та поточні числові значення разом.',
    ),
  ),

  exercise(
    'pwm-servos',
    'PWM & control surfaces',
    'ШІМ та кермові поверхні',
    'mixed',
    'intermediate',
    'Adjust a 105 Hz duty cycle and move four control surfaces using the supplied radio-channel mapping.',
    'Змінюйте заповнення ШІМ 105 Гц і рухайте чотири рулі за наданим прикладом радіоканалу.',
    pwmServos,
    lesson(
      'Separate pulse frequency from duty ratio and turn that ratio into an angle.',
      'Відрізніть частоту від заповнення й перетворіть заповнення на кут.',
      [
        [
          ['course', 'height', 'servos'],
          'Inspect the starting angles',
          'Course PWM duty=0.34 drives S1/S3 to −45°. Height PWM duty=0.66 drives S2/S4 to +45°. The DUTY wires carry a ratio; the scope wires carry actual pulses.',
          'Перевірте початкові кути',
          'Course PWM із duty=0.34 задає S1/S3 кут −45°. Height PWM із duty=0.66 задає S2/S4 кут +45°. Дроти DUTY передають частку, осцилографи — самі імпульси.',
        ],
        [
          ['course', 'servos'],
          'Move one pair of surfaces',
          'Select Course PWM and set Duty cycle to 0.5: S1 and S3 center at 0°. Try 0.18 for −90° and 0.82 for +90°. The other pair is independent.',
          'Порухайте одну пару рулів',
          'Оберіть Course PWM та задайте Коефіцієнт заповнення 0.5: S1 і S3 стануть у 0°. Спробуйте 0.18 для −90° та 0.82 для +90°. Інша пара незалежна.',
        ],
        [
          ['course', 'height', 'course-scope', 'height-scope'],
          'Run and compare the pulses',
          'With the simulation running, both 105 Hz pulse trains draw automatically; press Run only if paused. Change frequency without changing duty: the pulse spacing changes while the duty-driven angles stay fixed. Reference mapping: duty = 0.5 − (command / 360) × 0.32.',
          'Порівняйте імпульси',
          'В активній симуляції осцилограми 105 Гц малюються автоматично; натисніть Запуск лише після паузи. Змініть частоту при сталому заповненні: період зміниться, кути залишаться сталими. Формула прикладу: duty = 0.5 − (команда / 360) × 0.32.',
        ],
      ],
      'Duty 0.18…0.82 maps to −90°…+90°. At the reference frequency, command ±360 arcmin maps through the supplied duty formula.',
      'Заповнення 0.18…0.82 відповідає кутам −90°…+90°. Команди ±360 кутових мінут перетворюються за наведеною формулою.',
    ),
  ),
];

export function createExample(id = 'half-adder') {
  const example = EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Unknown example: ${id}`);
  return example.create();
}

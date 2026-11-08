// Each text pair contains English first and Ukrainian second.
export const GUIDES = Object.create(null);

function add(type, content) {
  GUIDES[type] = Object.fromEntries(
    ['en', 'ua'].map((language, index) => [
      language,
      {
        purpose: content.purpose[index],
        steps: content.steps.map((text) => text[index]),
        experiment: content.experiment[index],
        expected: content.expected[index],
        pitfalls: content.pitfalls.map((text) => text[index]),
        inputs: Object.fromEntries(
          Object.entries(content.inputs || {}).map(([id, text]) => [id, text[index]]),
        ),
        outputs: Object.fromEntries(
          Object.entries(content.outputs || {}).map(([id, text]) => [id, text[index]]),
        ),
        examples: [...content.examples],
      },
    ]),
  );
}

const gatePins = {
  a: [
    'First one-bit operand. Connect a switch or another gate output.',
    'Перший однобітний аргумент. Підключіть перемикач або вихід іншого елемента.',
  ],
  b: ['Second one-bit operand, independent of A.', 'Другий однобітний аргумент, незалежний від A.'],
};

add('and', {
  purpose: [
    'An AND gate models a permission that requires two conditions at once, such as an armed system and a pressed button.',
    'Елемент І моделює дозвіл за одночасного виконання двох умов, наприклад увімкненого захисту та натиснутої кнопки.',
  ],
  steps: [
    [
      'Add two Toggle switches, an AND gate and an LED.',
      'Додайте два перемикачі, елемент І та світлодіод.',
    ],
    [
      'Connect the switches to A and B; connect Q to the LED input D.',
      'Підключіть перемикачі до A і B, а Q — до входу D світлодіода.',
    ],
    [
      'Try all four input pairs: 00, 01, 10 and 11.',
      'Перевірте всі чотири пари входів: 00, 01, 10 та 11.',
    ],
  ],
  experiment: [
    'Treat A as permission and B as a request. Leave either one at 0 while toggling the other.',
    'Вважайте A дозволом, а B запитом. Залиште один вхід у 0 та перемикайте інший.',
  ],
  expected: [
    'Only A=1 and B=1 light the LED. The output order for 00,01,10,11 is 0,0,0,1.',
    'Світлодіод горить лише при A=1 і B=1. Виходи для 00,01,10,11: 0,0,0,1.',
  ],
  pitfalls: [
    [
      'A disconnected input is floating Z, not an automatic zero. Drive both inputs for a complete truth table.',
      'Непідключений вхід має стан Z, а не автоматичний нуль. Задайте обидва входи для повної таблиці істинності.',
    ],
    [
      'A definite 0 controls AND even if the other input is unknown; this does not fix the floating connection.',
      'Визначений 0 задає вихід І навіть при невідомому іншому вході; це не усуває непідключений контакт.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=A AND B, a single digital bit.', 'Q=A І B, один цифровий біт.'] },
  examples: ['logic-gates', 'half-adder'],
});

add('or', {
  purpose: [
    'OR combines independent reasons to activate an output, such as two alarm sensors.',
    'АБО об’єднує незалежні причини ввімкнення виходу, наприклад два датчики тривоги.',
  ],
  steps: [
    [
      'Place an OR gate between two switches and an LED.',
      'Розмістіть елемент АБО між двома перемикачами та світлодіодом.',
    ],
    [
      'Wire each switch to a different input, A or B, and Q to the LED.',
      'Під’єднайте кожен перемикач до окремого входу A або B, а Q — до світлодіода.',
    ],
    [
      'Start with both inputs at 0, then activate each sensor separately.',
      'Почніть із двох нулів, потім увімкніть кожен датчик окремо.',
    ],
  ],
  experiment: [
    'Set A=1 and toggle B. Then set A=0 and toggle B again.',
    'Встановіть A=1 і перемикайте B. Потім встановіть A=0 та повторіть.',
  ],
  expected: [
    'Any high input keeps Q high. Only 00 produces 0; 01,10,11 produce 1.',
    'Будь-яка одиниця утримує Q у 1. Лише 00 дає 0; 01,10,11 дають 1.',
  ],
  pitfalls: [
    [
      'OR also outputs 1 when both inputs are 1; use XOR if exactly one condition should count.',
      'АБО дає 1 і при двох одиницях; використовуйте XOR, якщо потрібна рівно одна умова.',
    ],
    [
      'A known 1 dominates a floating input, but both inputs still need explicit wiring in a finished circuit.',
      'Визначена 1 переважає непідключений вхід, але у завершеній схемі слід підключити обидва входи.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: [
      'Q=A OR B; high when at least one input is high.',
      'Q=A АБО B; одиниця, якщо хоча б один вхід має одиницю.',
    ],
  },
  examples: ['logic-gates'],
});

add('nand', {
  purpose: [
    'NAND is an AND gate followed by inversion. It is a universal building block for digital logic.',
    'І-НЕ — це елемент І з інверсією виходу. Це універсальний блок цифрової логіки.',
  ],
  steps: [
    [
      'Connect two switches to NAND inputs A and B.',
      'Підключіть два перемикачі до входів A і B елемента І-НЕ.',
    ],
    [
      'Attach an LED to Q and compare its light with an AND gate fed by the same switches.',
      'Підключіть світлодіод до Q та порівняйте його з елементом І на тих самих перемикачах.',
    ],
    [
      'Set both switches to 1, then return either one to 0.',
      'Встановіть обидва перемикачі в 1, потім поверніть будь-який у 0.',
    ],
  ],
  experiment: [
    'Connect one switch output to both A and B, turning NAND into an inverter.',
    'Підключіть один перемикач одночасно до A і B: І-НЕ стане інвертором.',
  ],
  expected: [
    'NAND outputs 1,1,1,0 for 00,01,10,11. With joined inputs, Q is the inverse of the switch.',
    'І-НЕ дає 1,1,1,0 для 00,01,10,11. При об’єднаних входах Q є інверсією перемикача.',
  ],
  pitfalls: [
    [
      'The inversion belongs to the output, not to each input separately.',
      'Інвертується результат на виході, а не кожен вхід окремо.',
    ],
    [
      'Connecting NAND gates in feedback can create memory; a combinational loop without a stable state may produce X.',
      'Зворотний зв’язок між І-НЕ може утворити пам’ять; комбінаційний цикл без сталого стану може дати X.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=NOT(A AND B).', 'Q=НЕ(A І B).'] },
  examples: ['logic-gates'],
});

add('nor', {
  purpose: [
    'NOR detects that neither condition is present. Like NAND, it can construct any Boolean function.',
    'АБО-НЕ виявляє відсутність обох умов. Як І-НЕ, він може утворити будь-яку булеву функцію.',
  ],
  steps: [
    [
      'Wire two switches into NOR inputs A and B.',
      'Підключіть два перемикачі до входів A і B елемента АБО-НЕ.',
    ],
    [
      'Connect Q to an LED representing “no alarm”.',
      'Підключіть Q до світлодіода, що означає «тривоги немає».',
    ],
    ['Begin at 00; change either input to 1.', 'Почніть із 00; змініть будь-який вхід на 1.'],
  ],
  experiment: [
    'Join both NOR inputs to one switch and compare Q with a NOT gate on that switch.',
    'Приєднайте обидва входи АБО-НЕ до одного перемикача та порівняйте Q з інвертором.',
  ],
  expected: [
    'Only 00 produces 1. The complete output sequence is 1,0,0,0.',
    'Лише 00 дає 1. Повна послідовність виходів: 1,0,0,0.',
  ],
  pitfalls: [
    [
      'An asserted input forces NOR low; an unconnected input alone does not mean “no alarm”.',
      'Одиниця на вході примусово дає нуль; непідключений вхід не означає «тривоги немає».',
    ],
    [
      'A pair of cross-coupled NOR gates is a latch, but use the SR latch block first to learn its forbidden state.',
      'Пара перехресно з’єднаних АБО-НЕ є защіпкою; спочатку вивчіть її заборонений стан на блоці SR.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=NOT(A OR B).', 'Q=НЕ(A АБО B).'] },
  examples: ['logic-gates', 'd-memory'],
});

add('xor', {
  purpose: [
    'XOR detects different bits and supplies the sum bit in a half adder.',
    'XOR виявляє різні біти та формує біт суми в напівсуматорі.',
  ],
  steps: [
    [
      'Feed switches A and B into an XOR gate.',
      'Подайте сигнали перемикачів A і B на елемент XOR.',
    ],
    [
      'Connect its Q output to an LED labeled Sum.',
      'Підключіть вихід Q до світлодіода з назвою Sum.',
    ],
    ['Check 00,01,10,11 and compare with OR.', 'Перевірте 00,01,10,11 та порівняйте з АБО.'],
  ],
  experiment: [
    'Send the same A and B to an AND gate as well. Use its output as Carry.',
    'Подайте ті самі A і B також на І. Використайте його вихід як Carry.',
  ],
  expected: [
    'XOR gives 0,1,1,0. For 1+1, Sum=0 and Carry=1, which represents binary 10.',
    'XOR дає 0,1,1,0. Для 1+1 маємо Sum=0 і Carry=1, тобто двійкове 10.',
  ],
  pitfalls: [
    [
      'XOR differs from OR at input 11: two asserted inputs cancel in the sum bit.',
      'XOR відрізняється від АБО при 11: дві одиниці взаємно скасовуються в біті суми.',
    ],
    [
      'An unknown operand normally makes the XOR output X; one valid input cannot determine parity alone.',
      'Невідомий аргумент зазвичай дає X на виході XOR; один визначений вхід не визначає парність.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: ['Q=A XOR B; high for unequal inputs.', 'Q=A XOR B; одиниця для різних входів.'],
  },
  examples: ['logic-gates', 'half-adder'],
});

add('xnor', {
  purpose: [
    'XNOR tests equality of two individual bits, useful for a simple match detector.',
    'XNOR перевіряє рівність двох окремих бітів і підходить для простого детектора збігу.',
  ],
  steps: [
    [
      'Place two switches, XNOR and an LED labeled Match.',
      'Розмістіть два перемикачі, XNOR та світлодіод Match.',
    ],
    [
      'Wire the switches into A and B, then Q into the LED.',
      'Підключіть перемикачі до A і B, а Q — до світлодіода.',
    ],
    [
      'Make the switches equal, then make them different.',
      'Задайте однакові стани перемикачів, потім різні.',
    ],
  ],
  experiment: [
    'Fix B at 0 to make Q follow NOT A. Fix B at 1 to make Q follow A.',
    'Зафіксуйте B=0, щоб Q повторював НЕ A. При B=1 вихід Q повторює A.',
  ],
  expected: [
    'XNOR produces 1,0,0,1 for 00,01,10,11, the inverse of XOR.',
    'XNOR дає 1,0,0,1 для 00,01,10,11 — інверсію XOR.',
  ],
  pitfalls: [
    [
      'This block compares one bit; use the 8-bit Comparator for whole unsigned numbers.',
      'Цей блок порівнює один біт; для цілих беззнакових чисел використовуйте 8-бітний компаратор.',
    ],
    [
      'Two floating inputs are not a valid equality match; they produce unknown logic rather than a meaningful 1.',
      'Два непідключені входи не є достовірним збігом; вони дають невідомий стан замість змістовної 1.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: ['Q=NOT(A XOR B); high for equal bits.', 'Q=НЕ(A XOR B); одиниця для однакових бітів.'],
  },
  examples: ['logic-gates'],
});

add('not', {
  purpose: [
    'A NOT gate reverses one digital condition: high becomes low and low becomes high.',
    'Інвертор змінює цифрову умову на протилежну: одиницю на нуль, а нуль на одиницю.',
  ],
  steps: [
    ['Add one switch, a NOT gate and an LED.', 'Додайте перемикач, інвертор та світлодіод.'],
    [
      'Connect switch Q to A and inverter Q to LED D.',
      'Підключіть Q перемикача до A, а Q інвертора — до D світлодіода.',
    ],
    [
      'Toggle the switch and watch the opposite LED state.',
      'Перемикайте вхід та спостерігайте протилежний стан світлодіода.',
    ],
  ],
  experiment: [
    'Put a second NOT gate after the first. Its output restores the original input.',
    'Поставте другий інвертор після першого. Його вихід відновить початковий сигнал.',
  ],
  expected: [
    'A=0 gives Q=1; A=1 gives Q=0. Two inversions give the original bit.',
    'A=0 дає Q=1; A=1 дає Q=0. Дві інверсії повертають початковий біт.',
  ],
  pitfalls: [
    [
      'NOT cannot recover a floating or conflicting input: Z or X is interpreted as unknown logic.',
      'Інвертор не відновлює непідключений або конфліктний вхід: Z чи X дає невідомий результат.',
    ],
  ],
  inputs: { a: ['The one-bit signal to invert.', 'Однобітний сигнал для інверсії.'] },
  outputs: { out: ['The logical complement of A.', 'Логічне заперечення A.'] },
  examples: ['logic-gates'],
});

add('gnd', {
  purpose: [
    'Ground is a digital constant 0 that makes an unused control deliberately inactive.',
    'Земля — цифрова константа 0, що явно вимикає невикористаний керувальний вхід.',
  ],
  steps: [
    ['Add Ground from Inputs & outputs.', 'Додайте Землю з розділу джерел та індикаторів.'],
    [
      'Connect its 0 output to a reset input that should remain inactive.',
      'Підключіть вихід 0 до входу скидання, який має бути неактивним.',
    ],
    [
      'Fan the same output out to other one-bit inputs requiring a definite 0.',
      'За потреби розгалузьте цей вихід до інших однобітних входів із потрібним нулем.',
    ],
  ],
  experiment: [
    'Compare an AND input connected to Ground with one left unwired in Diagnostics.',
    'Порівняйте в діагностиці вхід І, підключений до Землі, та непідключений вхід.',
  ],
  expected: [
    'Connected inputs read 0. They no longer have a floating-Z warning.',
    'Підключені входи показують 0. Попередження про непідключений стан Z зникає.',
  ],
  pitfalls: [
    [
      'This is a logic source, not a simulated electrical reference or a complete 8-bit zero bus.',
      'Це логічне джерело, а не модель електричної землі чи готова 8-бітна нульова шина.',
    ],
    [
      'A strong 1 on the same net conflicts with Ground and creates X. Disabling Ground releases its output to Z.',
      'Сильна 1 у тій самій мережі конфліктує із Землею та дає X. Вимкнення Землі переводить вихід у Z.',
    ],
  ],
  outputs: {
    out: [
      'A continuously driven one-bit 0 while enabled.',
      'Постійний однобітний 0, поки елемент увімкнено.',
    ],
  },
  examples: ['d-memory', 'counter'],
});

add('vcc', {
  purpose: [
    'Power supplies a digital constant 1, useful for enable pins and fixed logic conditions.',
    'Живлення задає цифрову константу 1 для входів дозволу та постійних логічних умов.',
  ],
  steps: [
    [
      'Add Power and connect its 1 output to an Enable input.',
      'Додайте Живлення та підключіть вихід 1 до входу Enable.',
    ],
    [
      'Attach the same output to an LED to verify the fixed high level.',
      'Підключіть цей вихід також до світлодіода для перевірки постійної одиниці.',
    ],
    [
      'Use separate wires from this output when several controls must stay enabled.',
      'Використовуйте окремі дроти від цього виходу для кількох постійно активних входів.',
    ],
  ],
  experiment: [
    'Feed VCC and a switch into AND; Q should now follow the switch.',
    'Подайте VCC і перемикач на І: Q повторюватиме перемикач.',
  ],
  expected: [
    'Every connected one-bit input reads 1; the test LED stays lit.',
    'Кожен підключений однобітний вхід читає 1; перевірочний світлодіод постійно світиться.',
  ],
  pitfalls: [
    [
      'Digital VCC=1 is a bit, not an analog 5 V supply. Use a DAC for a voltage.',
      'Цифровий VCC=1 — це біт, а не аналогове джерело 5 В. Для напруги використовуйте ЦАП.',
    ],
    [
      'Do not join strong VCC and Ground outputs: the shared net becomes X. A pull-up is the weak alternative.',
      'Не з’єднуйте сильні виходи VCC і Землі: мережа отримає X. Підтяжка дає слабку альтернативу.',
    ],
  ],
  outputs: {
    out: [
      'A continuously driven one-bit 1; disabling the source changes it to Z.',
      'Постійна однобітна 1; вимкнення джерела змінює її на Z.',
    ],
  },
  examples: ['logic-gates', 'd-memory'],
});

add('switch', {
  purpose: [
    'A toggle switch supplies a digital bit that you can change by hand during a simulation.',
    'Перемикач задає цифровий біт, який можна вручну змінювати під час симуляції.',
  ],
  steps: [
    [
      'Place the switch and connect Q to a gate input or LED D.',
      'Розмістіть перемикач і підключіть Q до входу елемента або D світлодіода.',
    ],
    [
      'Use its switch control to alternate between 0 and 1.',
      'Користуйтеся кнопкою перемикача для зміни між 0 і 1.',
    ],
    [
      'Set Value in Properties if you need a particular initial switch position.',
      'Задайте Value у властивостях, якщо потрібен певний початковий стан.',
    ],
  ],
  experiment: [
    'Use one switch as a manual clock: 0→1 is a rising edge; returning to 0 prepares the next edge.',
    'Використайте перемикач як ручний такт: 0→1 є додатним фронтом; повернення в 0 готує наступний фронт.',
  ],
  expected: [
    'An LED follows the position immediately; an edge-triggered register changes only on the 0→1 transition.',
    'Світлодіод одразу повторює стан; регістр із тактуванням змінюється лише під час переходу 0→1.',
  ],
  pitfalls: [
    [
      'Holding a manual clock at 1 does not generate repeated clock edges.',
      'Утримання ручного такту в 1 не створює повторних фронтів.',
    ],
    [
      'Value is interpreted as a bit: zero is low and a nonzero value is high. Use Bus value for numbers.',
      'Value трактується як біт: нуль є 0, ненульове значення — 1. Для чисел використовуйте Значення шини.',
    ],
  ],
  outputs: {
    out: ['The current one-bit switch position.', 'Поточний однобітний стан перемикача.'],
  },
  examples: ['half-adder', 'd-memory', 'ram'],
});

add('bus_input', {
  purpose: [
    'Bus value supplies a whole unsigned byte, plus narrower views for BCD digits and addresses.',
    'Значення шини задає цілий беззнаковий байт і його вужчі частини для BCD-цифр та адрес.',
  ],
  steps: [
    [
      'Add Bus value and set Value to an integer from 0 to 255.',
      'Додайте Значення шини та задайте ціле Value від 0 до 255.',
    ],
    [
      'Connect BYTE to an 8-bit data pin, LOW4 to a 4-bit pin, or LOW3 to a 3-bit pin.',
      'Підключіть BYTE до 8-бітного входу, LOW4 до 4-бітного або LOW3 до 3-бітного.',
    ],
    [
      'Read the receiver value in Properties to check that you chose the intended width.',
      'Перевірте значення приймача у властивостях, щоб підтвердити правильну ширину.',
    ],
  ],
  experiment: [
    'Set Value=173. Compare BYTE=173, LOW4=13 and LOW3=5.',
    'Задайте Value=173. Порівняйте BYTE=173, LOW4=13 та LOW3=5.',
  ],
  expected: [
    'The narrower outputs contain only the lowest bits; they are not decimal-digit conversions.',
    'Вужчі виходи містять лише молодші біти; це не перетворення на десяткові цифри.',
  ],
  pitfalls: [
    [
      'A port width must match the receiving bus. A one-bit switch cannot replace a complete byte.',
      'Ширина порту має відповідати вхідній шині. Однобітний перемикач не замінює цілий байт.',
    ],
    [
      'For a BCD decoder keep LOW4 between 0 and 9; values 10–15 are not decimal digits.',
      'Для BCD-декодера тримайте LOW4 у межах 0–9; значення 10–15 не є десятковими цифрами.',
    ],
  ],
  outputs: {
    out: [
      'BYTE: the rounded value clamped to 0–255, eight bits.',
      'BYTE: округлене значення в межах 0–255, вісім бітів.',
    ],
    nibble: ['LOW4: value AND 15, range 0–15.', 'LOW4: значення І 15, діапазон 0–15.'],
    address: ['LOW3: value AND 7, range 0–7.', 'LOW3: значення І 7, діапазон 0–7.'],
  },
  examples: ['bcd-display', 'bus-mux', 'alu', 'ram'],
});

add('clock', {
  purpose: [
    'A clock produces repeating digital edges so counters and registers can run automatically.',
    'Тактовий генератор створює повторювані цифрові фронти для автоматичної роботи лічильників і регістрів.',
  ],
  steps: [
    [
      'Connect CLK to the CLK input of a counter and also to an oscilloscope.',
      'Підключіть CLK до входу CLK лічильника та до осцилографа.',
    ],
    [
      'Set Frequency=2 Hz and Duty=0.5, then run the simulation.',
      'Задайте Frequency=2 Гц та Duty=0.5, потім запустіть симуляцію.',
    ],
    [
      'Observe the counter on each low-to-high transition rather than on both edges.',
      'Спостерігайте зміну лічильника за кожним переходом 0→1, а не за обома фронтами.',
    ],
  ],
  experiment: [
    'Change Frequency from 2 to 4 Hz while keeping Duty=0.5.',
    'Змініть Frequency з 2 на 4 Гц, зберігаючи Duty=0.5.',
  ],
  expected: [
    'The counter advances twice as quickly. One 2 Hz period lasts 0.5 seconds; half of it is high.',
    'Лічильник просувається вдвічі швидше. Один період 2 Гц триває 0.5 с; половина періоду має рівень 1.',
  ],
  pitfalls: [
    [
      'Duty is a fraction from 0 to 1, not a percentage. At 0 or 1 there are no repeating edges.',
      'Duty — частка від 0 до 1, не відсотки. При 0 або 1 повторюваних фронтів немає.',
    ],
    [
      'The simulator samples time. Pulses narrower than the time step can be missed; start at low frequencies.',
      'Симулятор дискретизує час. Імпульси, вужчі за крок часу, можуть бути пропущені; починайте з низьких частот.',
    ],
  ],
  outputs: {
    out: [
      'A one-bit periodic waveform; this model starts in its low interval.',
      'Однобітний періодичний сигнал; ця модель починає з низького інтервалу.',
    ],
  },
  examples: ['counter', 'd-memory', 'mixed-signals'],
});

add('led', {
  purpose: [
    'An LED makes one digital bit visible without changing that signal.',
    'Світлодіод показує один цифровий біт, не змінюючи сигнал.',
  ],
  steps: [
    [
      'Add an LED near the output you want to observe.',
      'Додайте світлодіод біля виходу, який потрібно спостерігати.',
    ],
    [
      'Connect a one-bit output to D; use a splitter before observing an individual bus bit.',
      'Підключіть однобітний вихід до D; для окремого біта шини спочатку використайте розгалужувач.',
    ],
    [
      'Set Color in Properties and run or change the source switch.',
      'Задайте Color у властивостях та запустіть симуляцію або змініть перемикач.',
    ],
  ],
  experiment: [
    'Watch the Sum and Carry LEDs of the half-adder example for all input combinations.',
    'Перевірте світлодіоди Sum і Carry в прикладі напівсуматора для всіх комбінацій входів.',
  ],
  expected: [
    'D=1 lights the indicator and D=0 turns it off; its trace records the input bit.',
    'D=1 вмикає індикатор, D=0 вимикає; осцилограма записує вхідний біт.',
  ],
  pitfalls: [
    [
      'A dark LED does not prove a valid zero: inspect the pin for floating Z or conflicting X.',
      'Темний світлодіод не доводить визначений нуль: перевірте контакт на Z або конфлікт X.',
    ],
    [
      'This educational LED has no current or resistor model; Color changes its appearance, not its logic.',
      'Навчальний світлодіод не моделює струм або резистор; Color змінює вигляд, а не логіку.',
    ],
  ],
  inputs: {
    in: ['D: the single digital bit to display.', 'D: один цифровий біт для відображення.'],
  },
  examples: ['half-adder', 'logic-gates', 'counter'],
});

add('matrix', {
  purpose: [
    'The 8×8 matrix lights intersections selected by separate row and column masks.',
    'Матриця 8×8 підсвічує перетини, вибрані окремими масками рядків і стовпців.',
  ],
  steps: [
    [
      'Use two Bus value sources and connect BYTE to ROWS and COLS.',
      'Використайте два джерела Значення шини та підключіть BYTE до ROWS і COLS.',
    ],
    [
      'Set both masks to 1 to select the first row and first column.',
      'Задайте обом маскам 1, щоб вибрати перший рядок і перший стовпець.',
    ],
    [
      'Try row mask 3 and column mask 5 to select two rows and two columns.',
      'Спробуйте маску рядків 3 та стовпців 5 для вибору двох рядків і двох стовпців.',
    ],
  ],
  experiment: [
    'Keep COLS=255 and advance ROWS through 1,2,4,8,16,32,64,128.',
    'Залиште COLS=255 та змінюйте ROWS: 1,2,4,8,16,32,64,128.',
  ],
  expected: [
    'A complete lit row moves through the matrix. Each pixel is on only when both its row and column bits are 1.',
    'Суцільний рядок світла рухається матрицею. Піксель активний лише коли біти його рядка й стовпця дорівнюють 1.',
  ],
  pitfalls: [
    [
      'The inputs are masks, not row numbers: value 3 selects rows 0 and 1 rather than only row 3.',
      'Входи є масками, не номерами рядків: 3 вибирає рядки 0 і 1, а не лише рядок 3.',
    ],
    [
      'This block shows the current mask; it does not store a separate 64-bit frame or model LED persistence.',
      'Блок показує поточну маску; він не зберігає окремий 64-бітний кадр і не моделює післясвітіння.',
    ],
  ],
  inputs: {
    rows: [
      'Eight row-enable bits; bit 0 selects the first row.',
      'Вісім бітів дозволу рядків; біт 0 вибирає перший рядок.',
    ],
    cols: [
      'Eight column-enable bits; bit 0 selects the first column.',
      'Вісім бітів дозволу стовпців; біт 0 вибирає перший стовпець.',
    ],
  },
  examples: ['counter', 'bus-mux'],
});

add('sevenseg', {
  purpose: [
    'The display shows an eight-bit segment mask, not a number decoder by itself.',
    'Індикатор відображає восьмибітну маску сегментів і самостійно не декодує число.',
  ],
  steps: [
    [
      'Connect an 8-bit source to the display input.',
      'Підключіть 8-бітне джерело до входу індикатора.',
    ],
    [
      'For decimal digits, put BCD → 7-segment between Bus value LOW4 and the display.',
      'Для десяткових цифр поставте BCD → 7 сегментів між LOW4 джерела шини та індикатором.',
    ],
    [
      'Alternatively set the raw mask to 63 for digit 0 or 127 for digit 8.',
      'Або задайте необроблену маску 63 для цифри 0 чи 127 для цифри 8.',
    ],
  ],
  experiment: [
    'Set a direct mask to 1,2,4,8,16,32,64,128 to locate every segment and the decimal point.',
    'Змінюйте пряму маску на 1,2,4,8,16,32,64,128, щоб знайти кожен сегмент і крапку.',
  ],
  expected: [
    'Bits 0–6 control a,b,c,d,e,f,g in order; bit 7 controls the decimal point.',
    'Біти 0–6 по черзі керують a,b,c,d,e,f,g; біт 7 керує десятковою крапкою.',
  ],
  pitfalls: [
    [
      'Direct byte 5 lights segments a and c; it does not draw the decimal digit 5. Use the decoder.',
      'Прямий байт 5 вмикає сегменти a і c, а не малює цифру 5. Використовуйте декодер.',
    ],
  ],
  inputs: {
    in: [
      'ABCDEFG·DP: raw 8-bit segment mask, active-high.',
      'ABCDEFG·DP: пряма 8-бітна маска сегментів, активна одиницею.',
    ],
  },
  examples: ['bcd-display'],
});

add('scope', {
  purpose: [
    'The oscilloscope records recent samples so a changing signal can be inspected over simulated time.',
    'Осцилограф записує останні відліки для спостереження змін сигналу в модельному часі.',
  ],
  steps: [
    [
      'Branch a wire from the signal output into SIGNAL; the scope accepts a bit, bus or analog voltage.',
      'Розгалузьте дріт від виходу сигналу до SIGNAL; осцилограф приймає біт, шину чи аналогову напругу.',
    ],
    [
      'Set Range to a useful vertical scale, for example 1 for logic or 5 for a 5 V waveform.',
      'Задайте Range для зручної вертикальної шкали: наприклад 1 для логіки або 5 для сигналу 5 В.',
    ],
    [
      'Run the simulation to collect up to 256 samples; pausing leaves the captured trace visible.',
      'Запустіть симуляцію для збору до 256 відліків; пауза залишає записану осцилограму видимою.',
    ],
  ],
  experiment: [
    'Probe a clock and an AM generator separately; compare a rectangular trace with a modulated wave.',
    'Окремо підключіть тактовий генератор та АМ-генератор; порівняйте прямокутний сигнал із модульованою хвилею.',
  ],
  expected: [
    'Digital inputs alternate between 0 and 1; a byte trace displays its numeric value; analog traces display voltage.',
    'Цифровий вхід змінюється між 0 і 1; байтова осцилограма показує число; аналогова — напругу.',
  ],
  pitfalls: [
    [
      'A sampled trace can alias: use frequencies low enough that several time steps fit inside the shortest pulse.',
      'Дискретна осцилограма може давати аліасинг: у найкоротшому імпульсі мають міститися кілька кроків часу.',
    ],
    [
      'Z and X are unknown samples, not valid zero volts; verify pin values and Diagnostics before interpreting the trace.',
      'Z та X — невідомі відліки, а не достовірні нуль вольт; перевірте контакти й діагностику перед аналізом.',
    ],
  ],
  inputs: {
    in: [
      'SIGNAL: a non-driving observation input accepting digital, bus and analog values.',
      'SIGNAL: спостережний вхід, що приймає цифрові, шинні та аналогові значення і не керує лінією.',
    ],
  },
  examples: ['mixed-signals', 'pwm-servos', 'adc-dac'],
});

add('mux', {
  purpose: [
    'A 2:1 multiplexer chooses one complete byte from two data sources using a single select bit.',
    'Мультиплексор 2:1 обирає цілий байт одного з двох джерел за одним керувальним бітом.',
  ],
  steps: [
    [
      'Connect two Bus value BYTE outputs to A and B, using values 12 and 200.',
      'Підключіть два виходи BYTE джерел шини до A і B зі значеннями 12 та 200.',
    ],
    [
      'Connect a switch to S and Y to a bus probe or splitter.',
      'Підключіть перемикач до S, а Y — до осцилографа шини або розгалужувача.',
    ],
    [
      'Toggle S while watching the output value.',
      'Перемикайте S та спостерігайте вихідне значення.',
    ],
  ],
  experiment: [
    'Keep S=0 and change B; then set S=1 without changing either data connection.',
    'Залиште S=0 і змініть B; потім встановіть S=1, не змінюючи дротів даних.',
  ],
  expected: [
    'S=0 selects A and S=1 selects B. Changes on the unselected input do not affect Y.',
    'S=0 обирає A, S=1 обирає B. Зміни необраного входу не впливають на Y.',
  ],
  pitfalls: [
    [
      'A, B and Y are all 8-bit buses; S is one bit. A multiplexer selects data rather than merging it.',
      'A, B та Y — 8-бітні шини; S — один біт. Мультиплексор обирає дані, а не об’єднує їх.',
    ],
    [
      'A floating S makes the result uncertain unless both input values already match.',
      'Непідключений S робить результат невизначеним, крім випадку однакових значень обох входів.',
    ],
  ],
  inputs: {
    a: ['The byte selected when S=0.', 'Байт, обраний при S=0.'],
    b: ['The byte selected when S=1.', 'Байт, обраний при S=1.'],
    sel: ['S: one-bit selection control.', 'S: однобітний сигнал вибору.'],
  },
  outputs: {
    out: ['Y: the selected unsigned 8-bit value.', 'Y: обране беззнакове 8-бітне значення.'],
  },
  examples: ['bus-mux'],
});

add('demux', {
  purpose: [
    'A 1:2 demultiplexer sends one byte to either of two destinations.',
    'Демультиплексор 1:2 спрямовує один байт до одного з двох приймачів.',
  ],
  steps: [
    ['Connect a Bus value BYTE output to D.', 'Підключіть вихід BYTE джерела шини до D.'],
    [
      'Use a switch for S and connect Y0 and Y1 to separate probes.',
      'Подайте перемикач на S та підключіть Y0 і Y1 до окремих осцилографів.',
    ],
    ['Set D=37 and toggle the select switch.', 'Задайте D=37 та перемикайте сигнал вибору.'],
  ],
  experiment: [
    'Watch both outputs while changing S; check the numeric value of the inactive output.',
    'Спостерігайте обидва виходи при зміні S; перевірте числове значення неактивного виходу.',
  ],
  expected: [
    'S=0 gives Y0=37,Y1=0; S=1 gives Y0=0,Y1=37.',
    'S=0 дає Y0=37,Y1=0; S=1 дає Y0=0,Y1=37.',
  ],
  pitfalls: [
    [
      'The unselected output is driven to zero, not released to Z. Use tri-state buffers for a shared bus.',
      'Необраний вихід примусово має нуль, а не Z. Для спільної шини використовуйте буфери з трьома станами.',
    ],
    [
      'A floating or unknown S makes both destinations uncertain.',
      'Непідключений або невідомий S робить обидва виходи невизначеними.',
    ],
  ],
  inputs: {
    in: ['D: the 8-bit source byte.', 'D: початковий 8-бітний байт.'],
    sel: ['S: selects destination Y0 at 0 or Y1 at 1.', 'S: обирає Y0 при 0 або Y1 при 1.'],
  },
  outputs: {
    a: ['Y0: D when S=0, otherwise zero.', 'Y0: D при S=0, інакше нуль.'],
    b: ['Y1: D when S=1, otherwise zero.', 'Y1: D при S=1, інакше нуль.'],
  },
  examples: ['bus-mux'],
});

add('half_adder', {
  purpose: [
    'A half adder adds two individual bits and separates the result into a sum bit and a carry bit.',
    'Напівсуматор додає два окремі біти та розділяє результат на біт суми й біт перенесення.',
  ],
  steps: [
    [
      'Connect two switches to A and B of Half adder.',
      'Підключіть два перемикачі до A і B напівсуматора.',
    ],
    [
      'Attach one LED to Σ and a second LED to C.',
      'Приєднайте один світлодіод до Σ, а другий до C.',
    ],
    [
      'Read the two-bit answer in the order Carry then Sum.',
      'Читайте двобітну відповідь у порядку Carry, потім Sum.',
    ],
  ],
  experiment: [
    'Set A=B=1, then compare this block with the XOR-plus-AND implementation in the half-adder example.',
    'Встановіть A=B=1 та порівняйте блок із реалізацією XOR+І у прикладі напівсуматора.',
  ],
  expected: [
    '0+0 gives 00; 0+1 and 1+0 give 01; 1+1 gives 10. Sum is XOR and Carry is AND.',
    '0+0 дає 00; 0+1 та 1+0 дають 01; 1+1 дає 10. Sum — XOR, Carry — І.',
  ],
  pitfalls: [
    [
      'This block has no carry input; use Full adder when connecting stages of a larger adder.',
      'Блок не має входу перенесення; для послідовного з’єднання розрядів використовуйте повний суматор.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    sum: ['Σ: result bit with weight 1, A XOR B.', 'Σ: біт результату з вагою 1, A XOR B.'],
    carry: ['C: carry bit with weight 2, A AND B.', 'C: біт перенесення з вагою 2, A І B.'],
  },
  examples: ['half-adder', 'full-adder'],
});

add('full_adder', {
  purpose: [
    'A full adder adds A, B and an incoming carry, making it suitable for chaining into a multi-bit adder.',
    'Повний суматор додає A, B і вхід перенесення та підходить для каскадування в багаторозрядний суматор.',
  ],
  steps: [
    ['Connect three switches to A, B and Ci.', 'Підключіть три перемикачі до A, B та Ci.'],
    [
      'Connect Σ and Co to LEDs labeled Sum and Carry.',
      'Підключіть Σ і Co до світлодіодів Sum і Carry.',
    ],
    [
      'Test inputs 111 and then tie Ci to Ground to compare with a half adder.',
      'Перевірте 111, потім підключіть Ci до Землі для порівняння з напівсуматором.',
    ],
  ],
  experiment: [
    'Connect Co of one full adder to Ci of a second one; it becomes the next bit’s incoming carry.',
    'З’єднайте Co першого повного суматора з Ci другого: це буде вхід перенесення наступного розряду.',
  ],
  expected: [
    'A+B+Ci=3 produces Co=1 and Sum=1, binary 11. With Ci=0 it behaves as a half adder.',
    'A+B+Ci=3 дає Co=1 і Sum=1, двійкове 11. При Ci=0 блок працює як напівсуматор.',
  ],
  pitfalls: [
    [
      'Do not leave Ci unwired when you mean zero; connect Ground or a known carry signal.',
      'Не залишайте Ci непідключеним, якщо потрібен нуль; підключіть Землю або визначений сигнал перенесення.',
    ],
    [
      'Co has weight 2 relative to this stage’s Sum; it is not a second copy of the sum bit.',
      'Co має вагу 2 відносно Sum цього розряду; це не копія біта суми.',
    ],
  ],
  inputs: {
    ...gatePins,
    cin: [
      'Ci: one-bit carry from the less significant stage.',
      'Ci: однобітне перенесення з молодшого розряду.',
    ],
  },
  outputs: {
    sum: ['Σ=(A+B+Ci) modulo 2.', 'Σ=(A+B+Ci) за модулем 2.'],
    carry: [
      'Co=1 when at least two of the three inputs are 1.',
      'Co=1, коли принаймні два з трьох входів мають 1.',
    ],
  },
  examples: ['full-adder'],
});

add('comparator', {
  purpose: [
    'The comparator reports whether one unsigned byte is greater than, equal to, or less than another.',
    'Компаратор показує, чи один беззнаковий байт більший, рівний або менший за інший.',
  ],
  steps: [
    ['Connect Bus value BYTE outputs to A and B.', 'Підключіть виходи BYTE джерел шини до A та B.'],
    ['Attach three LEDs to >, = and <.', 'Приєднайте три світлодіоди до >, = та <.'],
    [
      'Set A=10,B=20, then make A equal to and greater than B.',
      'Задайте A=10,B=20, потім зробіть A рівним і більшим за B.',
    ],
  ],
  experiment: [
    'Compare 255 with 1 and consider how unsigned comparison differs from signed arithmetic.',
    'Порівняйте 255 з 1 та подумайте, чим беззнакове порівняння відрізняється від знакового.',
  ],
  expected: [
    'Exactly one result is high for known inputs. 255 is greater than 1 in this model.',
    'Для визначених входів рівно один результат має 1. У цій моделі 255 більше за 1.',
  ],
  pitfalls: [
    [
      'Bytes are unsigned 0–255; the most significant bit is not a sign bit here.',
      'Байти беззнакові, 0–255; старший біт тут не є знаком.',
    ],
    [
      'An unknown byte makes all three comparison results unknown rather than asserting equality.',
      'Невідомий байт робить усі три результати невідомими замість підтвердження рівності.',
    ],
  ],
  inputs: {
    a: ['First unsigned 8-bit number.', 'Перше беззнакове 8-бітне число.'],
    b: ['Second unsigned 8-bit number.', 'Друге беззнакове 8-бітне число.'],
  },
  outputs: {
    gt: ['High only when A>B.', 'Одиниця лише при A>B.'],
    eq: ['High only when A=B.', 'Одиниця лише при A=B.'],
    lt: ['High only when A<B.', 'Одиниця лише при A<B.'],
  },
  examples: ['adc-dac', 'alu'],
});

add('decoder', {
  purpose: [
    'The BCD decoder turns a four-bit decimal digit into the segment mask needed to draw it.',
    'BCD-декодер перетворює чотирибітну десяткову цифру на маску сегментів для її зображення.',
  ],
  steps: [
    ['Connect Bus value LOW4 to BCD.', 'Підключіть LOW4 джерела шини до BCD.'],
    [
      'Connect SEG to the 8-bit input of a 7-segment display.',
      'Підключіть SEG до 8-бітного входу семисегментного індикатора.',
    ],
    ['Set the source Value to a digit from 0 to 9.', 'Задайте джерелу Value від 0 до 9.'],
  ],
  experiment: [
    'Try digits 1,5,8, then set 10 to see how an invalid BCD digit is handled.',
    'Спробуйте цифри 1,5,8, потім 10, щоб перевірити обробку недійсної BCD-цифри.',
  ],
  expected: [
    'Valid inputs draw their digits; input 5 gives mask 109 (0x6D). Inputs 10–15 produce a blank mask.',
    'Коректні входи відображають цифри; 5 дає маску 109 (0x6D). Значення 10–15 дають порожню маску.',
  ],
  pitfalls: [
    [
      'BCD is one decimal digit encoded in four bits. This block does not split an 8-bit number into tens and units.',
      'BCD — одна десяткова цифра в чотирьох бітах. Блок не розділяє 8-бітне число на десятки й одиниці.',
    ],
    [
      'SEG bit 7 stays low: the decoder does not turn on the decimal point.',
      'Біт 7 виходу SEG залишається нульовим: декодер не вмикає десяткову крапку.',
    ],
  ],
  inputs: {
    in: [
      'BCD: a four-bit digit, valid decimal range 0–9.',
      'BCD: чотирибітна цифра, дійсний десятковий діапазон 0–9.',
    ],
  },
  outputs: {
    out: [
      'SEG: eight-bit active-high a–g segment mask; decimal point off.',
      'SEG: восьмибітна маска a–g, активна одиницею; крапку вимкнено.',
    ],
  },
  examples: ['bcd-display'],
});

add('encoder', {
  purpose: [
    'The 8:3 encoder converts the position of one asserted input bit into its three-bit index.',
    'Шифратор 8:3 перетворює позицію одного активного вхідного біта на його трьохбітний номер.',
  ],
  steps: [
    ['Connect Bus value BYTE to D.', 'Підключіть BYTE джерела шини до D.'],
    ['Probe CODE and attach an LED to V.', 'Підключіть осцилограф до CODE та світлодіод до V.'],
    [
      'Use one-hot values 1,2,4,8,16,32,64,128.',
      'Використовуйте значення з одним активним бітом: 1,2,4,8,16,32,64,128.',
    ],
  ],
  experiment: [
    'Compare source values 8 and 12; the latter asserts two input bits.',
    'Порівняйте значення джерела 8 та 12; друге активує два вхідні біти.',
  ],
  expected: [
    'Input 8 gives CODE=3,V=1. Input 0 gives CODE=0,V=0. Input 12 is ambiguous and gives X.',
    'Вхід 8 дає CODE=3,V=1. Вхід 0 дає CODE=0,V=0. Вхід 12 неоднозначний і дає X.',
  ],
  pitfalls: [
    [
      'The encoder expects a bit mask, not the decimal number to be copied. Bit 3 has mask value 8.',
      'Шифратор очікує бітову маску, а не число для копіювання. Біт 3 має маску 8.',
    ],
    [
      'Use Priority encoder when several requests may be active together.',
      'Коли одночасно можливі кілька запитів, використовуйте пріоритетний шифратор.',
    ],
  ],
  inputs: {
    in: [
      'D: eight one-hot request bits packed in a byte.',
      'D: вісім бітів запиту в байті, лише один має бути активним.',
    ],
  },
  outputs: {
    out: ['CODE: index 0–7 of the only active bit.', 'CODE: номер 0–7 єдиного активного біта.'],
    valid: [
      'V: 1 for one active bit, 0 for no bits, X for multiple bits.',
      'V: 1 для одного активного біта, 0 для жодного, X для кількох.',
    ],
  },
  examples: ['bus-mux', 'alu'],
});

const resetPin = [
  'RST: active-high asynchronous reset; an unwired reset is treated as inactive in this model.',
  'RST: асинхронне скидання одиницею; непідключене скидання в цій моделі вважається неактивним.',
];
const clockPin = [
  'CLK: captures or changes state on a 0→1 transition only.',
  'CLK: запам’ятовує або змінює стан лише за переходом 0→1.',
];
const qPins = {
  q: ['Q: the stored one-bit state.', 'Q: збережений однобітний стан.'],
  nq: ['Q̅: the logical complement of the stored state.', 'Q̅: логічна інверсія збереженого стану.'],
};

add('sr_latch', {
  purpose: [
    'An SR latch remembers one bit without a clock: Set writes 1, Reset writes 0, and inactive controls hold it.',
    'SR-защіпка зберігає один біт без такту: Set записує 1, Reset — 0, а неактивні входи зберігають стан.',
  ],
  steps: [
    [
      'Connect separate switches to S and R and LEDs to Q and Q̅.',
      'Підключіть окремі перемикачі до S і R та світлодіоди до Q і Q̅.',
    ],
    [
      'Start at S=0,R=0. Set S=1,R=0, then return S to 0.',
      'Почніть із S=0,R=0. Задайте S=1,R=0, потім поверніть S у 0.',
    ],
    [
      'Reset with S=0,R=1, then release R to 0.',
      'Скиньте стан через S=0,R=1, потім поверніть R у 0.',
    ],
  ],
  experiment: [
    'Set Initial=1 and reset the simulation. Compare the initial state with the state retained after releasing S.',
    'Задайте Initial=1 та скиньте симуляцію. Порівняйте початковий стан зі станом після відпускання S.',
  ],
  expected: [
    'Q remains 1 after a Set pulse and remains 0 after a Reset pulse, until the opposite command occurs.',
    'Q залишається 1 після імпульсу Set і 0 після Reset до протилежної команди.',
  ],
  pitfalls: [
    [
      'S=R=1 is forbidden and produces X. Recover with a definite set-only or reset-only command.',
      'S=R=1 заборонено та дає X. Відновіть стан визначеною командою лише Set або лише Reset.',
    ],
    [
      'Unlike D flip-flops, this latch reacts to control levels immediately; it has no clock edge.',
      'На відміну від D-тригера, защіпка реагує на рівні входів одразу; тактового фронту немає.',
    ],
  ],
  inputs: {
    s: [
      'S: active-high Set; use R=0 to write 1.',
      'S: встановлення одиницею; для запису 1 потрібно R=0.',
    ],
    r: [
      'R: active-high Reset; use S=0 to write 0.',
      'R: скидання одиницею; для запису 0 потрібно S=0.',
    ],
  },
  outputs: qPins,
  examples: ['d-memory'],
});

add('d_ff', {
  purpose: [
    'The D flip-flop stores a data bit at a rising clock edge and keeps it unchanged between edges.',
    'D-тригер зберігає біт даних за додатним фронтом такту та утримує його між фронтами.',
  ],
  steps: [
    [
      'Connect a data switch to D and a manual clock switch, initially 0, to CLK.',
      'Підключіть перемикач даних до D та ручний тактовий перемикач, спочатку 0, до CLK.',
    ],
    [
      'Connect reset to Ground or a switch at 0, and attach an LED to Q.',
      'Підключіть скидання до Землі або перемикача в 0 та світлодіод до Q.',
    ],
    [
      'Choose D, raise CLK from 0 to 1, then change D while CLK stays high.',
      'Оберіть D, підніміть CLK з 0 до 1, потім змініть D, утримуючи CLK у 1.',
    ],
  ],
  experiment: [
    'Change D several times without a new rising edge; finally lower CLK and raise it again.',
    'Кілька разів змініть D без нового додатного фронту; наприкінці опустіть CLK і знову підніміть.',
  ],
  expected: [
    'Q holds the previously captured value until the next 0→1 edge. RST=1 clears Q immediately.',
    'Q утримує раніше записане значення до наступного фронту 0→1. RST=1 одразу скидає Q.',
  ],
  pitfalls: [
    [
      'CLK=1 is a level, not a continuing command to copy D. This is an edge-triggered flip-flop.',
      'CLK=1 — рівень, а не постійна команда копіювати D. Це тригер із запуском за фронтом.',
    ],
    [
      'Initial chooses startup state; reset the simulation after changing it. A reset signal overrides clock capture.',
      'Initial задає початковий стан; після зміни скиньте симуляцію. Сигнал скидання має пріоритет над записом.',
    ],
  ],
  inputs: {
    d: [
      'The bit sampled on the rising clock edge.',
      'Біт, що зчитується за додатним фронтом такту.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['d-memory'],
});

add('jk_ff', {
  purpose: [
    'A JK flip-flop can hold, reset, set or toggle its stored bit on each rising clock edge.',
    'JK-тригер може зберігати, скидати, встановлювати або інвертувати біт за кожним додатним фронтом.',
  ],
  steps: [
    [
      'Use switches for J and K, a clock for CLK and a low reset signal.',
      'Використайте перемикачі для J і K, тактовий сигнал для CLK та низький рівень скидання.',
    ],
    [
      'Attach LEDs to Q and Q̅; start with J=K=0.',
      'Підключіть світлодіоди до Q і Q̅; почніть із J=K=0.',
    ],
    [
      'Test JK=01,10,11 while advancing the clock one rising edge at a time.',
      'Перевірте JK=01,10,11, просуваючи такт по одному додатному фронту.',
    ],
  ],
  experiment: [
    'Keep J=K=1 and drive CLK with a 2 Hz clock.',
    'Залиште J=K=1 і подайте на CLK тактовий сигнал 2 Гц.',
  ],
  expected: [
    'JK=00 holds, 01 resets, 10 sets, 11 toggles. With 11, Q completes one cycle per two clock periods.',
    'JK=00 зберігає, 01 скидає, 10 встановлює, 11 інвертує. При 11 цикл Q триває два тактові періоди.',
  ],
  pitfalls: [
    [
      'J=K=1 is valid for JK, unlike S=R=1 on an SR latch.',
      'J=K=1 є дозволеним для JK, на відміну від S=R=1 у SR-защіпки.',
    ],
    [
      'Initial is applied when simulation state is initialized; RST=1 clears regardless of J, K or clock.',
      'Initial застосовується під час ініціалізації симуляції; RST=1 скидає незалежно від J, K і такту.',
    ],
  ],
  inputs: {
    j: [
      'J: set request on a rising edge; with K=1 it requests toggling.',
      'J: запит встановлення за фронтом; разом із K=1 задає інверсію.',
    ],
    k: [
      'K: reset request on a rising edge; with J=1 it requests toggling.',
      'K: запит скидання за фронтом; разом із J=1 задає інверсію.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['d-memory', 'counter'],
});

add('t_ff', {
  purpose: [
    'The T flip-flop toggles its state on a clock edge when enabled by T, making a divide-by-two stage.',
    'T-тригер інвертує стан за фронтом такту при активному T та утворює подільник частоти на два.',
  ],
  steps: [
    [
      'Connect VCC to T, a 2 Hz clock to CLK and Ground to RST.',
      'Підключіть VCC до T, тактовий сигнал 2 Гц до CLK та Землю до RST.',
    ],
    [
      'Place a scope on Q and optionally another scope on the clock.',
      'Підключіть осцилограф до Q та за потреби ще один до такту.',
    ],
    [
      'Run long enough to see several rising clock edges.',
      'Запустіть симуляцію на кілька додатних фронтів такту.',
    ],
  ],
  experiment: [
    'Replace VCC on T with a switch and set it to 0 while the clock continues.',
    'Замініть VCC на T перемикачем та встановіть 0, не зупиняючи такт.',
  ],
  expected: [
    'With T=1, Q alternates at every rising edge and has half the clock frequency; T=0 holds the current bit.',
    'При T=1 Q змінюється за кожним додатним фронтом і має вдвічі меншу частоту; T=0 утримує поточний біт.',
  ],
  pitfalls: [
    [
      'An unwired T is unknown, not enabled by default; connect it explicitly.',
      'Непідключений T є невідомим, а не автоматично дозволеним; підключіть його явно.',
    ],
    [
      'Use Initial plus a simulation reset for a reproducible starting phase; use RST to clear during a run.',
      'Для повторюваної початкової фази задайте Initial та скиньте симуляцію; RST скидає під час роботи.',
    ],
  ],
  inputs: {
    t: [
      'Toggle enable: 1 toggles on an edge, 0 holds.',
      'Дозвіл інверсії: 1 перемикає за фронтом, 0 зберігає.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['counter', 'd-memory'],
});

add('register', {
  purpose: [
    'An 8-bit register stores a complete byte at a clock edge, acting as a small parallel memory.',
    '8-бітний регістр зберігає цілий байт за фронтом такту та працює як невелика паралельна пам’ять.',
  ],
  steps: [
    [
      'Connect a Bus value BYTE output to D and a manual clock to CLK.',
      'Підключіть BYTE джерела шини до D та ручний такт до CLK.',
    ],
    [
      'Connect EN to VCC or a switch at 1; keep RST at 0.',
      'Підключіть EN до VCC або перемикача в 1; тримайте RST у 0.',
    ],
    [
      'Choose a byte and apply a 0→1 clock transition, then change the source value.',
      'Оберіть байт, подайте перехід такту 0→1, потім змініть значення джерела.',
    ],
  ],
  experiment: [
    'Capture 42, change D to 99, set EN=0 and apply more clock edges.',
    'Запишіть 42, змініть D на 99, встановіть EN=0 та подайте ще кілька фронтів.',
  ],
  expected: [
    'Q stays 42 until a rising edge with EN=1; RST=1 immediately makes the stored byte zero.',
    'Q залишається 42 до додатного фронту з EN=1; RST=1 одразу обнуляє збережений байт.',
  ],
  pitfalls: [
    [
      'An unwired EN defaults to 1 and an unwired RST to 0 in this teaching model; explicit controls are clearer.',
      'У цій навчальній моделі непідключений EN означає 1, а RST — 0; явні керувальні сигнали наочніші.',
    ],
    [
      'Initial is an 8-bit startup value, applied after resetting the simulation; changing D alone never writes it.',
      'Initial — 8-бітне початкове значення після скидання симуляції; сама зміна D не записує дані.',
    ],
  ],
  inputs: {
    d: [
      'D: eight parallel data bits captured together.',
      'D: вісім паралельних бітів, що записуються разом.',
    ],
    clk: clockPin,
    enable: [
      'EN: active-high capture enable; defaults to 1 if unwired.',
      'EN: дозвіл запису одиницею; непідключений вхід означає 1.',
    ],
    reset: resetPin,
  },
  outputs: {
    out: ['Q: the stored unsigned byte, 0–255.', 'Q: збережений беззнаковий байт, 0–255.'],
  },
  examples: ['d-memory', 'ram'],
});

add('shift_register', {
  purpose: [
    'A shift register assembles serial bits into a byte by shifting the previous contents left at every rising edge.',
    'Регістр зсуву збирає послідовні біти в байт, зсуваючи попередній вміст уліво за кожним додатним фронтом.',
  ],
  steps: [
    [
      'Use a data switch on SER and a manual clock on CLK; keep RST=0.',
      'Подайте перемикач даних на SER та ручний такт на CLK; тримайте RST=0.',
    ],
    [
      'Connect Q to a splitter and observe its eight bits with LEDs.',
      'Підключіть Q до розгалужувача та спостерігайте вісім бітів світлодіодами.',
    ],
    [
      'Set SER before each rising edge; after the edge return CLK to 0.',
      'Задавайте SER перед кожним додатним фронтом; після нього повертайте CLK у 0.',
    ],
  ],
  experiment: [
    'Starting from zero, shift in 1,0,1,1 on four successive rising edges.',
    'Починаючи з нуля, послідовно введіть 1,0,1,1 за чотирма додатними фронтами.',
  ],
  expected: [
    'The byte progresses 1,2,5,11. New data enters bit 0; the old bit 7 falls out.',
    'Байт набуває значень 1,2,5,11. Нові дані входять у біт 0; старий біт 7 втрачається.',
  ],
  pitfalls: [
    [
      'Q7 shows the current most significant stored bit, not a separate delayed copy of SER.',
      'Q7 показує поточний старший збережений біт, а не окрему затриману копію SER.',
    ],
    [
      'RST clears all bits; Initial selects startup contents after a simulation reset. There is no parallel-load input.',
      'RST очищує всі біти; Initial задає початковий вміст після скидання симуляції. Паралельного завантаження немає.',
    ],
  ],
  inputs: {
    d: [
      'SER: one serial bit inserted into bit 0.',
      'SER: один послідовний біт, що входить у біт 0.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: {
    out: ['Q: all eight stored bits as one byte.', 'Q: усі вісім збережених бітів одним байтом.'],
    serial: ['Q7: the current highest stored bit.', 'Q7: поточний старший збережений біт.'],
  },
  examples: ['counter', 'd-memory'],
});

add('counter', {
  purpose: [
    'The binary counter counts rising clock edges as an unsigned eight-bit number.',
    'Двійковий лічильник підраховує додатні фронти такту як беззнакове восьмибітне число.',
  ],
  steps: [
    [
      'Connect a low-frequency clock to CLK and switches to RST and EN.',
      'Підключіть низькочастотний такт до CLK та перемикачі до RST і EN.',
    ],
    [
      'Set RST=0,EN=1 and connect Q to a splitter with eight LEDs.',
      'Задайте RST=0,EN=1 та підключіть Q до розгалужувача з вісьмома світлодіодами.',
    ],
    [
      'Run the simulation and read the LEDs with weights 1,2,4,8,16,32,64,128.',
      'Запустіть симуляцію та читайте світлодіоди з вагами 1,2,4,8,16,32,64,128.',
    ],
  ],
  experiment: [
    'Set Initial=254, reset the simulation and watch the next three rising edges.',
    'Задайте Initial=254, скиньте симуляцію та спостерігайте наступні три додатні фронти.',
  ],
  expected: [
    'The values become 255,0,1. EN=0 pauses counting; RST=1 immediately clears the count.',
    'Значення стануть 255,0,1. EN=0 зупиняє лічбу; RST=1 одразу скидає число.',
  ],
  pitfalls: [
    [
      'It counts only 0→1 transitions, not elapsed frames or both clock edges.',
      'Лічильник рахує лише переходи 0→1, а не кадри чи обидва фронти.',
    ],
    [
      'Unwired EN defaults high and RST low. A raw seven-segment display interprets Q as segments, not a decimal number.',
      'Непідключений EN означає 1, RST — 0. Прямий семисегментний індикатор трактує Q як сегменти, а не десяткове число.',
    ],
  ],
  inputs: {
    clk: clockPin,
    reset: resetPin,
    enable: [
      'EN: 1 counts, 0 holds; an unwired input defaults to 1.',
      'EN: 1 дозволяє лічбу, 0 утримує; непідключений вхід означає 1.',
    ],
  },
  outputs: {
    out: [
      'Q: the count modulo 256, packed into eight bits.',
      'Q: число за модулем 256, упаковане у вісім бітів.',
    ],
  },
  examples: ['counter', 'mixed-signals'],
});

add('ram', {
  purpose: [
    'RAM stores 16 independently addressed bytes and permits writing during simulation.',
    'ОЗП зберігає 16 окремо адресованих байтів та дозволяє їх запис під час симуляції.',
  ],
  steps: [
    [
      'Connect LOW4 of an address source to ADDR and BYTE of a data source to DATA.',
      'Підключіть LOW4 джерела адреси до ADDR та BYTE джерела даних до DATA.',
    ],
    [
      'Use switches for CS, OE, WE and a manual CLK. Start CS=1,OE=1,WE=0,CLK=0.',
      'Використайте перемикачі CS, OE, WE та ручний CLK. Почніть із CS=1,OE=1,WE=0,CLK=0.',
    ],
    [
      'Choose address and data, set WE=1 and pulse CLK 0→1. Return WE to 0 to read Q.',
      'Оберіть адресу й дані, задайте WE=1 та імпульс CLK 0→1. Поверніть WE у 0 для читання Q.',
    ],
  ],
  experiment: [
    'Write 37 to address 2 and 99 to address 3, then switch addresses with WE=0.',
    'Запишіть 37 за адресою 2 та 99 за адресою 3, потім перемикайте адреси при WE=0.',
  ],
  expected: [
    'Q follows the stored byte at ADDR while CS=OE=1 and WE=0. Other locations retain their own values.',
    'Q показує байт за ADDR при CS=OE=1 і WE=0. Інші комірки зберігають власні значення.',
  ],
  pitfalls: [
    [
      'Controls are active-high here: this model does not use the active-low bars found on many physical SRAM chips.',
      'Керування тут активне одиницею: модель не використовує інверсні входи багатьох реальних SRAM.',
    ],
    [
      'Q is Z during writes, CS=0 or OE=0. Merely changing DATA with WE=1 does not write without a rising CLK.',
      'Q має Z під час запису, при CS=0 або OE=0. Сама зміна DATA при WE=1 не записує без додатного CLK.',
    ],
    [
      'Unwired CS/OE default to 1 and WE to 0; resetting the simulation clears every RAM byte.',
      'Непідключені CS/OE означають 1, WE — 0; скидання симуляції очищує всі байти ОЗП.',
    ],
  ],
  inputs: {
    address: ['ADDR: four-bit address 0–15.', 'ADDR: чотирибітна адреса 0–15.'],
    data: ['DATA: eight-bit byte to write.', 'DATA: восьмибітний байт для запису.'],
    clk: clockPin,
    cs: [
      'CS: chip select, active-high; default 1 when unwired.',
      'CS: вибір мікросхеми одиницею; без дроту означає 1.',
    ],
    oe: [
      'OE: output enable, active-high; default 1 when unwired.',
      'OE: дозвіл виходу одиницею; без дроту означає 1.',
    ],
    we: [
      'WE: write enable, active-high; default 0. Q releases while WE=1.',
      'WE: дозвіл запису одиницею; типово 0. При WE=1 вихід Q відпущено.',
    ],
  },
  outputs: {
    out: [
      'Q: addressed byte during an enabled read, otherwise high-impedance Z.',
      'Q: адресований байт при дозволеному читанні, інакше високий імпеданс Z.',
    ],
  },
  examples: ['ram'],
});

add('rom', {
  purpose: [
    'ROM supplies a preset lookup table of 16 bytes, such as program constants or display patterns.',
    'ПЗП задає попередньо заповнену таблицю з 16 байтів, наприклад константи програми чи шаблони індикатора.',
  ],
  steps: [
    [
      'Enter up to 16 comma-separated bytes in Data; decimal and 0x-prefixed hexadecimal values are accepted.',
      'Введіть до 16 байтів через кому в Data; приймаються десяткові та шістнадцяткові з префіксом 0x.',
    ],
    [
      'Connect Bus value LOW4 to ADDR and keep CS=1,OE=1.',
      'Підключіть LOW4 джерела шини до ADDR та тримайте CS=1,OE=1.',
    ],
    [
      'Probe Q and step the address from 0 through the populated locations.',
      'Підключіть осцилограф до Q та змінюйте адресу від 0 по заповнених комірках.',
    ],
  ],
  experiment: [
    'Set Data to 63,6,91,79 and connect Q directly to a seven-segment display; select addresses 0–3.',
    'Задайте Data як 63,6,91,79 та підключіть Q безпосередньо до семисегментного індикатора; обирайте адреси 0–3.',
  ],
  expected: [
    'The four addresses draw digits 0,1,2,3. Unspecified table locations read zero.',
    'Чотири адреси малюють цифри 0,1,2,3. Незаповнені комірки читаються як нуль.',
  ],
  pitfalls: [
    [
      'ROM has no clock or write input; editing Data changes its configured contents rather than performing a RAM write.',
      'ПЗП не має такту чи входу запису; редагування Data змінює налаштування, а не виконує запис ОЗП.',
    ],
    [
      'CS and OE are active-high and default to 1 if unwired; lowering either one releases Q to Z.',
      'CS та OE активні одиницею й без дроту означають 1; нуль на будь-якому переводить Q у Z.',
    ],
  ],
  inputs: {
    address: [
      'ADDR: four-bit index 0–15 into the configured table.',
      'ADDR: чотирибітний індекс 0–15 у заданій таблиці.',
    ],
    cs: ['CS: active-high chip select.', 'CS: вибір мікросхеми одиницею.'],
    oe: ['OE: active-high permission to drive Q.', 'OE: дозвіл керувати Q одиницею.'],
  },
  outputs: {
    out: [
      'Q: the selected table byte when CS and OE are high, otherwise Z.',
      'Q: обраний байт таблиці при CS=OE=1, інакше Z.',
    ],
  },
  examples: ['ram', 'bcd-display'],
});

add('register_file', {
  purpose: [
    'A register file keeps eight byte-sized registers, with independent read and write addresses like a small CPU register bank.',
    'Регістровий файл зберігає вісім байтових регістрів із незалежними адресами читання й запису, як банк регістрів процесора.',
  ],
  steps: [
    [
      'Connect separate Bus value LOW3 outputs to RA and WA, and BYTE data to DATA.',
      'Підключіть окремі LOW3 джерел шини до RA і WA та байтові дані до DATA.',
    ],
    [
      'Connect a manual clock to CLK and a switch to WE; start both at 0.',
      'Підключіть ручний такт до CLK та перемикач до WE; почніть з обох у 0.',
    ],
    [
      'Set WA and DATA, raise WE, pulse CLK, then lower WE and select RA for reading.',
      'Задайте WA та DATA, увімкніть WE, подайте імпульс CLK, потім вимкніть WE та оберіть RA для читання.',
    ],
  ],
  experiment: [
    'Write 11 to register 1 and 22 to register 2, then alternate RA without clocking.',
    'Запишіть 11 у регістр 1 та 22 в регістр 2, потім перемикайте RA без такту.',
  ],
  expected: [
    'Q immediately follows the register selected by RA. A write affects only WA at its rising edge.',
    'Q одразу показує регістр за RA. Запис змінює лише WA за додатним фронтом.',
  ],
  pitfalls: [
    [
      'RA and WA are three bits for addresses 0–7; do not use the four-bit LOW4 port.',
      'RA і WA мають три біти для адрес 0–7; не використовуйте чотирибітний LOW4.',
    ],
    [
      'WE defaults inactive if unwired. Resetting the simulation clears all eight registers; there is no separate reset pin.',
      'Непідключений WE неактивний. Скидання симуляції очищує всі вісім регістрів; окремого входу скидання немає.',
    ],
  ],
  inputs: {
    read: [
      'RA: the three-bit register address to read continuously.',
      'RA: трьохбітна адреса регістра для безперервного читання.',
    ],
    write: [
      'WA: the three-bit destination address sampled during a write.',
      'WA: трьохбітна адреса призначення під час запису.',
    ],
    data: [
      'DATA: eight data bits written together.',
      'DATA: вісім бітів даних для одночасного запису.',
    ],
    clk: clockPin,
    we: [
      'WE: active-high write permission on a rising CLK.',
      'WE: дозвіл запису одиницею за додатним CLK.',
    ],
  },
  outputs: {
    out: [
      'Q: contents of register RA, independent of WA.',
      'Q: вміст регістра RA, незалежно від WA.',
    ],
  },
  examples: ['ram', 'alu'],
});

add('dac', {
  purpose: [
    'A digital-to-analog converter turns an unsigned byte into a voltage, bridging logic buses and analog blocks.',
    'Цифро-аналоговий перетворювач перетворює беззнаковий байт на напругу та з’єднує цифрові шини з аналоговими блоками.',
  ],
  steps: [
    [
      'Connect Bus value BYTE to D and set Vcc=5.',
      'Підключіть BYTE джерела шини до D та задайте Vcc=5.',
    ],
    ['Connect V to an oscilloscope with Range=5.', 'Підключіть V до осцилографа з Range=5.'],
    ['Change the source byte through 0,128,255.', 'Змінюйте байт джерела на 0,128,255.'],
  ],
  experiment: [
    'Connect a binary counter to D to create a rising staircase waveform.',
    'Підключіть двійковий лічильник до D, щоб утворити зростаючий сходинковий сигнал.',
  ],
  expected: [
    'V=byte/255×Vcc. At Vcc=5, bytes 0,128,255 produce 0 V, approximately 2.51 V and 5 V.',
    'V=байт/255×Vcc. При Vcc=5 байти 0,128,255 дають 0 В, приблизно 2.51 В та 5 В.',
  ],
  pitfalls: [
    [
      'The conversion uses 255 as the full-scale denominator; one code step is Vcc/255.',
      'Повний масштаб має знаменник 255; один крок коду дорівнює Vcc/255.',
    ],
    [
      'The output is an ideal sampled voltage with no settling time, loading or reconstruction filter.',
      'Вихід — ідеальна дискретна напруга без часу встановлення, навантаження та відновлювального фільтра.',
    ],
  ],
  inputs: { in: ['D: unsigned eight-bit code 0–255.', 'D: беззнаковий восьмибітний код 0–255.'] },
  outputs: {
    out: [
      'V: analog voltage from zero to the configured Vcc.',
      'V: аналогова напруга від нуля до заданого Vcc.',
    ],
  },
  examples: ['adc-dac', 'mixed-signals', 'schmitt'],
});

add('adc', {
  purpose: [
    'An analog-to-digital converter quantizes an input voltage into an unsigned eight-bit code.',
    'Аналого-цифровий перетворювач квантує вхідну напругу в беззнаковий восьмибітний код.',
  ],
  steps: [
    [
      'Use a DAC or analog generator as the voltage source and connect it to V.',
      'Використайте ЦАП або аналоговий генератор як джерело напруги та підключіть його до V.',
    ],
    [
      'Set a positive Vcc reference, for example 5 V, matching the source range.',
      'Задайте додатну опорну напругу Vcc, наприклад 5 В, відповідно до діапазону джерела.',
    ],
    [
      'Connect D to a bus probe, splitter or another DAC.',
      'Підключіть D до осцилографа шини, розгалужувача або іншого ЦАП.',
    ],
  ],
  experiment: [
    'Build BYTE → DAC → ADC with the same Vcc for both converters and vary BYTE.',
    'Побудуйте BYTE → ЦАП → АЦП з однаковим Vcc обох перетворювачів та змінюйте BYTE.',
  ],
  expected: [
    'D=round(clamp(V/Vcc,0,1)×255). Equal references recover the original byte; voltages outside the range saturate.',
    'D=round(clamp(V/Vcc,0,1)×255). Однакові опори відновлюють початковий байт; напруги поза діапазоном насичуються.',
  ],
  pitfalls: [
    [
      'A voltage is not an eight-bit bus: use the analog V pin and observe the digital D pin separately.',
      'Напруга не є восьмибітною шиною: використовуйте аналоговий V і окремо спостерігайте цифровий D.',
    ],
    [
      'This ADC samples every simulation step and has no conversion clock, latency or noise model.',
      'Цей АЦП зчитує кожен крок симуляції та не має окремого такту, затримки чи моделі шуму.',
    ],
  ],
  inputs: {
    in: [
      'V: analog voltage; zero maps to 0 and Vcc maps to 255.',
      'V: аналогова напруга; нуль дає 0, Vcc дає 255.',
    ],
  },
  outputs: {
    out: [
      'D: the rounded and saturated unsigned eight-bit conversion result.',
      'D: округлений і насичений беззнаковий восьмибітний результат перетворення.',
    ],
  },
  examples: ['adc-dac'],
});

add('am', {
  purpose: [
    'An AM generator changes a carrier’s envelope according to a slower modulation signal.',
    'АМ-генератор змінює обвідну несучої відповідно до повільнішого модулювального сигналу.',
  ],
  steps: [
    [
      'Connect V to a scope and set Carrier=8 Hz, Frequency=1 Hz, Depth=0.6, Amplitude=5 V.',
      'Підключіть V до осцилографа й задайте Carrier=8 Гц, Frequency=1 Гц, Depth=0.6, Amplitude=5 В.',
    ],
    [
      'Leave MOD unwired first to use the internal sine modulation.',
      'Спочатку залиште MOD непідключеним для внутрішньої синусоїдальної модуляції.',
    ],
    [
      'Then connect a switch, bus or DAC to MOD to supply external modulation.',
      'Потім підключіть перемикач, шину або ЦАП до MOD для зовнішньої модуляції.',
    ],
  ],
  experiment: [
    'Compare Depth=0 with Depth=0.8; with a switch on MOD, compare its 0 and 1 positions.',
    'Порівняйте Depth=0 і Depth=0.8; з перемикачем на MOD порівняйте його стани 0 та 1.',
  ],
  expected: [
    'Depth=0 keeps a constant envelope. Increasing depth changes the envelope more strongly while the carrier spacing stays fixed.',
    'Depth=0 зберігає сталу обвідну. Зі збільшенням глибини обвідна змінюється сильніше, а інтервали несучої сталі.',
  ],
  pitfalls: [
    [
      'Amplitude is the upper voltage range: output is centered at Amplitude/2, not a bipolar ±Amplitude signal.',
      'Amplitude задає верхню межу напруги: центр виходу Amplitude/2, а не двополярний сигнал ±Amplitude.',
    ],
    [
      'Digital bits map 0/1 to modulation −1/+1; analog 0…Amplitude spans that same range. Frequency controls the internal modulator only.',
      'Цифрові 0/1 дають модуляцію −1/+1; аналогові 0…Amplitude охоплюють той самий діапазон. Frequency керує лише внутрішнім модулятором.',
    ],
    [
      'Use a carrier slow enough to resolve with several samples per period.',
      'Використовуйте несучу, період якої містить достатньо відліків.',
    ],
  ],
  inputs: {
    mod: [
      'MOD: optional analog voltage, digital bit or bus. An unwired input selects the internal sine.',
      'MOD: необов’язкова аналогова напруга, цифровий біт чи шина. Без дроту обрано внутрішню синусоїду.',
    ],
  },
  outputs: {
    out: [
      'V: the amplitude-modulated waveform, bounded between 0 and Amplitude.',
      'V: амплітудно-модульований сигнал у межах від 0 до Amplitude.',
    ],
  },
  examples: ['mixed-signals'],
});

add('fm', {
  purpose: [
    'An FM generator changes the carrier’s instantaneous frequency while keeping its voltage amplitude constant.',
    'ЧМ-генератор змінює миттєву частоту несучої, зберігаючи сталу амплітуду напруги.',
  ],
  steps: [
    [
      'Connect V to a scope and use Carrier=8 Hz, Frequency=1 Hz, Depth=0.6 and Amplitude=5 V.',
      'Підключіть V до осцилографа та задайте Carrier=8 Гц, Frequency=1 Гц, Depth=0.6 і Amplitude=5 В.',
    ],
    [
      'Observe the internal modulator with MOD unwired, then feed MOD from a switch or DAC.',
      'Спостерігайте внутрішню модуляцію без дроту MOD, потім подайте на MOD перемикач або ЦАП.',
    ],
    [
      'Compare the spacing of peaks rather than their height.',
      'Порівнюйте відстань між піками, а не їхню висоту.',
    ],
  ],
  experiment: [
    'Drive MOD with a digital switch and hold each state long enough to compare the two carrier frequencies.',
    'Керуйте MOD цифровим перемикачем та утримуйте кожен стан достатньо довго для порівняння двох частот.',
  ],
  expected: [
    'For digital modulation, instantaneous frequency is Carrier×(1−Depth) at 0 and Carrier×(1+Depth) at 1.',
    'Для цифрової модуляції миттєва частота дорівнює Carrier×(1−Depth) при 0 та Carrier×(1+Depth) при 1.',
  ],
  pitfalls: [
    [
      'Frequency is the internal modulation rate, not the carrier frequency. External MOD replaces that internal waveform.',
      'Frequency — частота внутрішньої модуляції, а не несучої. Зовнішній MOD замінює внутрішню хвилю.',
    ],
    [
      'The waveform is centered at Amplitude/2. Sampling must resolve the highest deviated frequency, not just Carrier.',
      'Сигнал має центр Amplitude/2. Дискретизація має розрізняти найбільшу частоту девіації, а не лише Carrier.',
    ],
  ],
  inputs: {
    mod: [
      'MOD: optional voltage, bit or bus normalized to modulation −1…+1; unwired uses an internal sine.',
      'MOD: необов’язкова напруга, біт чи шина, нормовані до −1…+1; без дроту використовується синусоїда.',
    ],
  },
  outputs: {
    out: [
      'V: frequency-modulated voltage between zero and Amplitude.',
      'V: частотно-модульована напруга від нуля до Amplitude.',
    ],
  },
  examples: ['mixed-signals'],
});

add('pwm', {
  purpose: [
    'PWM represents a control value by the fraction of each repeating period spent high.',
    'ШІМ представляє керувальне значення часткою кожного періоду, протягом якої сигнал має одиницю.',
  ],
  steps: [
    [
      'Set Frequency=105 Hz and Duty=0.5; leave CTRL unwired to use the Duty setting.',
      'Задайте Frequency=105 Гц та Duty=0.5; залиште CTRL без дроту для використання налаштування Duty.',
    ],
    [
      'Connect PWM to a scope with Range=1 and DUTY to a servo input.',
      'Підключіть PWM до осцилографа з Range=1, а DUTY — до входу сервопривода.',
    ],
    [
      'Change Duty between 0.18 and 0.82 to move the control surface.',
      'Змінюйте Duty між 0.18 і 0.82 для руху кермової поверхні.',
    ],
  ],
  experiment: [
    'At 105 Hz compare duty 0.25 and 0.75. Both have a period of about 9.52 ms, with different high times.',
    'При 105 Гц порівняйте duty 0.25 і 0.75. Обидва мають період близько 9.52 мс, але різну тривалість одиниці.',
  ],
  expected: [
    'PWM is a digital pulse train; DUTY is its continuous 0–1 ratio. Frequency changes pulse rate without changing the commanded duty.',
    'PWM — цифрові імпульси; DUTY — їхня неперервна частка 0–1. Frequency змінює частоту імпульсів, не команду заповнення.',
  ],
  pitfalls: [
    [
      'Duty is a fraction, so 0.5 means 50%. A wired CTRL overrides the property and is clamped to 0–1.',
      'Duty — частка, тому 0.5 означає 50%. Підключений CTRL замінює властивість і обмежується 0–1.',
    ],
    [
      'Short digital pulses can be missed by sampling. DUTY gives the servo an exact command without pulse-width quantization.',
      'Короткі цифрові імпульси можуть пропускатися. DUTY задає сервоприводу точну команду без квантування ширини імпульсу.',
    ],
  ],
  inputs: {
    control: [
      'CTRL: optional analog duty ratio 0–1; when unwired, the Duty property is used.',
      'CTRL: необов’язкова аналогова частка заповнення 0–1; без дроту діє властивість Duty.',
    ],
  },
  outputs: {
    out: ['PWM: repeating one-bit pulses.', 'PWM: повторювані однобітні імпульси.'],
    duty: [
      'DUTY: the effective analog ratio from 0 to 1.',
      'DUTY: фактична аналогова частка від 0 до 1.',
    ],
  },
  examples: ['pwm-servos'],
});

add('servo', {
  purpose: [
    'This four-channel teaching block converts PWM commands into visible control-surface angles.',
    'Цей чотириканальний навчальний блок перетворює команди ШІМ на видимі кути кермових поверхонь.',
  ],
  steps: [
    [
      'Connect PWM generator DUTY outputs to S1–S4; a single command may drive several channels.',
      'Підключіть виходи DUTY ШІМ-генераторів до S1–S4; одна команда може керувати кількома каналами.',
    ],
    [
      'Set MinDuty=0.18, MaxDuty=0.82 and Range=180 degrees.',
      'Задайте MinDuty=0.18, MaxDuty=0.82 та Range=180 градусів.',
    ],
    [
      'Move a source Duty from 0.18 through 0.5 to 0.82 and watch the corresponding surface.',
      'Змінюйте Duty джерела від 0.18 через 0.5 до 0.82 та спостерігайте відповідну поверхню.',
    ],
  ],
  experiment: [
    'Drive S1 and S3 from one PWM source and S2 and S4 from another; move both pairs independently.',
    'Керуйте S1 і S3 одним джерелом ШІМ, а S2 і S4 іншим; рухайте обидві пари незалежно.',
  ],
  expected: [
    'With the default range, duty 0.18 maps to −90°, 0.5 to 0°, and 0.82 to +90°; outside commands clamp at the endpoints.',
    'За типового діапазону duty 0.18 дає −90°, 0.5 — 0°, 0.82 — +90°; інші команди обмежуються крайніми кутами.',
  ],
  pitfalls: [
    [
      'DUTY is the preferred precise input. Digital PWM is measured at sample instants and needs several samples inside the shortest pulse.',
      'DUTY є рекомендованим точним входом. Цифровий ШІМ вимірюється за відліками й потребує кількох відліків у найкоротшому імпульсі.',
    ],
    [
      'Range is total angular travel, so 180 means ±90°. This model has no inertia, current, torque or hardware-controller timing.',
      'Range — повний кут руху, тому 180 означає ±90°. Модель не має інерції, струму, моменту чи часових характеристик реального контролера.',
    ],
  ],
  inputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `s${index}`,
      [
        `S${index}: duty ratio or digital PWM for channel ${index}; unwired centers this channel.`,
        `S${index}: частка заповнення чи цифровий ШІМ каналу ${index}; без дроту канал центровано.`,
      ],
    ]),
  ),
  outputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `a${index}`,
      [
        `A${index}: channel ${index} angle in degrees, an analog value.`,
        `A${index}: аналогове значення кута каналу ${index} у градусах.`,
      ],
    ]),
  ),
  examples: ['pwm-servos'],
});

add('alu', {
  purpose: [
    'The 8-bit ALU selects an arithmetic or bitwise operation on two bytes using a three-bit operation code.',
    '8-бітний АЛП обирає арифметичну або побітову операцію над двома байтами за трьохбітним кодом.',
  ],
  steps: [
    [
      'Connect Bus value BYTE sources to A and B and a LOW3 source to OP.',
      'Підключіть джерела BYTE до A і B та LOW3 до OP.',
    ],
    ['Probe Y and connect LEDs to C and Z.', 'Підключіть осцилограф до Y та світлодіоди до C і Z.'],
    [
      'Try OP 0 add, 1 subtract, 2 AND, 3 OR, 4 XOR, 5 left shift, 6 right shift, 7 NOT A.',
      'Спробуйте OP: 0 додавання, 1 віднімання, 2 І, 3 АБО, 4 XOR, 5 зсув уліво, 6 вправо, 7 НЕ A.',
    ],
  ],
  experiment: [
    'Set A=250,B=10,OP=0; then change to A=10,B=10,OP=1.',
    'Задайте A=250,B=10,OP=0; потім змініть на A=10,B=10,OP=1.',
  ],
  expected: [
    '250+10 gives Y=4,C=1 because the byte wraps. 10−10 gives Y=0,Z=1.',
    '250+10 дає Y=4,C=1 через переповнення байта. 10−10 дає Y=0,Z=1.',
  ],
  pitfalls: [
    [
      'Operations use unsigned eight-bit values. For shifts, only B’s lowest three bits set the count, so shifting by 8 acts like 0.',
      'Операції використовують беззнакові восьмибітні значення. Зсув задають три молодші біти B, тому 8 означає зсув на 0.',
    ],
    [
      'C reflects a raw result outside the byte range, including a negative subtraction result; these are simplified flags, not a full CPU flag register.',
      'C відображає результат поза діапазоном байта, зокрема від’ємне віднімання; це спрощені прапорці, а не повний регістр стану процесора.',
    ],
  ],
  inputs: {
    a: [
      'A: first unsigned byte; OP=7 inverts this operand.',
      'A: перший беззнаковий байт; OP=7 інвертує його.',
    ],
    b: [
      'B: second unsigned byte or the low-three-bit shift count.',
      'B: другий беззнаковий байт або кількість зсувів у трьох молодших бітах.',
    ],
    op: ['OP: three-bit operation selector 0–7.', 'OP: трьохбітний вибір операції 0–7.'],
  },
  outputs: {
    out: ['Y: low eight bits of the result.', 'Y: вісім молодших бітів результату.'],
    carry: [
      'C: out-of-byte-range flag for the raw computation.',
      'C: прапорець виходу початкового результату за межі байта.',
    ],
    zero: [
      'Z: 1 when the resulting byte equals zero.',
      'Z: 1, коли результуючий байт дорівнює нулю.',
    ],
  },
  examples: ['alu'],
});

add('tristate', {
  purpose: [
    'A tri-state buffer lets one device drive a shared byte bus or disconnect itself electrically.',
    'Буфер із трьома станами дозволяє пристрою керувати спільною байтовою шиною або електрично від’єднатися.',
  ],
  steps: [
    [
      'Connect a Bus value BYTE output to D and a switch to EN.',
      'Підключіть BYTE джерела шини до D та перемикач до EN.',
    ],
    [
      'Connect Q to a bus probe; EN=1 enables data and EN=0 releases the line.',
      'Підключіть Q до осцилографа шини; EN=1 дозволяє дані, EN=0 відпускає лінію.',
    ],
    [
      'To share a bus, connect a second buffer Q to that same receiving input with its own EN.',
      'Для спільної шини підключіть Q другого буфера до того самого входу приймача з власним EN.',
    ],
  ],
  experiment: [
    'Use data bytes 12 and 200. Enable only the first buffer, then only the second, then both.',
    'Використайте байти 12 і 200. Дозвольте лише перший буфер, потім другий, потім обидва.',
  ],
  expected: [
    'A single enabled driver supplies its byte. Both disabled give Z; disagreeing enabled drivers give X throughout the shared net.',
    'Один дозволений вихід задає свій байт. Обидва вимкнені дають Z; різні дозволені дані дають X у всій спільній мережі.',
  ],
  pitfalls: [
    [
      'Z means no active drive, not the numeric value zero. Use a controlled source rather than relying on floating data.',
      'Z означає відсутність активного керування, а не числовий нуль. Використовуйте кероване джерело замість непідключених даних.',
    ],
    [
      'Wire crossings do not automatically join nets; outputs share a net when connected through the same pins.',
      'Перетини дротів автоматично не об’єднують мережі; виходи спільні, коли з’єднані через ті самі контакти.',
    ],
  ],
  inputs: {
    in: [
      'D: eight-bit data to drive when enabled.',
      'D: восьмибітні дані для передавання при дозволі.',
    ],
    enable: [
      'EN: 1 drives D, 0 produces high-impedance Z.',
      'EN: 1 передає D, 0 задає високий імпеданс Z.',
    ],
  },
  outputs: {
    out: ['Q: enabled byte or a released bus.', 'Q: дозволений байт або відпущена шина.'],
  },
  examples: ['bus-mux', 'wired-and'],
});

add('priority_encoder', {
  purpose: [
    'A priority encoder chooses the highest-numbered active request when several bits are asserted together.',
    'Пріоритетний шифратор обирає активний запит із найбільшим номером, коли одночасно встановлено кілька бітів.',
  ],
  steps: [
    ['Connect a Bus value BYTE source to D.', 'Підключіть BYTE джерела шини до D.'],
    ['Probe CODE and attach an LED to V.', 'Підключіть осцилограф до CODE та світлодіод до V.'],
    ['Try input masks 1,8,12,128 and 255.', 'Спробуйте вхідні маски 1,8,12,128 та 255.'],
  ],
  experiment: [
    'Start with D=12, which contains requests 2 and 3; remove bit 3 by changing D to 4.',
    'Почніть із D=12 із запитами 2 і 3; приберіть біт 3, змінивши D на 4.',
  ],
  expected: [
    'D=12 gives CODE=3; D=4 gives CODE=2. Any nonzero mask gives V=1; zero gives V=0.',
    'D=12 дає CODE=3; D=4 дає CODE=2. Будь-яка ненульова маска дає V=1; нуль дає V=0.',
  ],
  pitfalls: [
    [
      'Priority belongs to the bit index, not the number of requests. Bit 7 outranks every lower bit.',
      'Пріоритет задає номер біта, а не кількість запитів. Біт 7 важливіший за будь-який молодший.',
    ],
    [
      'CODE=0 can mean bit 0 is active or no request exists; check V to distinguish them.',
      'CODE=0 може означати активний біт 0 або відсутність запитів; розрізняйте їх за V.',
    ],
  ],
  inputs: {
    in: [
      'D: eight active-high request bits packed into a byte.',
      'D: вісім запитів, активних одиницею та упакованих у байт.',
    ],
  },
  outputs: {
    out: [
      'CODE: three-bit index of the highest asserted input.',
      'CODE: трьохбітний номер найстаршого активного входу.',
    ],
    valid: [
      'V: 1 if any known request is active, otherwise 0.',
      'V: 1, якщо є хоча б один визначений активний запит, інакше 0.',
    ],
  },
  examples: ['alu', 'bus-mux'],
});

add('splitter', {
  purpose: [
    'A bus splitter exposes each bit of one byte as an individual digital wire.',
    'Розгалужувач шини виводить кожен біт одного байта окремим цифровим дротом.',
  ],
  steps: [
    ['Connect an 8-bit source to BUS.', 'Підключіть 8-бітне джерело до BUS.'],
    [
      'Wire outputs 0–7 to separate LEDs, keeping their bit numbers visible.',
      'Підключіть виходи 0–7 до окремих світлодіодів зі збереженням номерів бітів.',
    ],
    [
      'Set the source byte to 165 and read the individual outputs.',
      'Задайте джерелу байт 165 та прочитайте окремі виходи.',
    ],
  ],
  experiment: [
    'Use a counter on BUS; compare how often bits 0,1,2 toggle.',
    'Подайте лічильник на BUS та порівняйте частоту перемикання бітів 0,1,2.',
  ],
  expected: [
    '165=128+32+4+1, so bits 7,5,2,0 are high. Each higher counter bit toggles half as often as the previous one.',
    '165=128+32+4+1, тому біти 7,5,2,0 мають 1. Кожен старший біт лічильника перемикається вдвічі рідше.',
  ],
  pitfalls: [
    [
      'Bit 0 is the least significant bit even if the visual pin order runs top to bottom.',
      'Біт 0 — молодший незалежно від того, як контакти розташовані згори донизу.',
    ],
    [
      'Splitting preserves data; it does not select just one bit or convert the byte to decimal digits.',
      'Розгалуження зберігає дані; воно не обирає лише один біт і не перетворює байт у десяткові цифри.',
    ],
  ],
  inputs: {
    in: [
      'BUS: the unsigned byte to separate into eight bits.',
      'BUS: беззнаковий байт для поділу на вісім бітів.',
    ],
  },
  outputs: Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [
      `b${index}`,
      [
        `Bit ${index}: weight ${2 ** index}; (BUS >> ${index}) AND 1.`,
        `Біт ${index}: вага ${2 ** index}; (BUS >> ${index}) І 1.`,
      ],
    ]),
  ),
  examples: ['counter', 'bus-mux'],
});

add('merger', {
  purpose: [
    'A bus merger packs eight separate digital signals into one unsigned byte.',
    'Об’єднувач шини пакує вісім окремих цифрових сигналів в один беззнаковий байт.',
  ],
  steps: [
    [
      'Connect eight switches or gate outputs to pins 0–7.',
      'Підключіть вісім перемикачів або виходів логіки до контактів 0–7.',
    ],
    [
      'Tie unused bit inputs to Ground so every bit is defined.',
      'Підключіть невикористані біти до Землі, щоб усі біти були визначеними.',
    ],
    [
      'Connect BUS to a bus probe or DAC and vary the switches.',
      'Підключіть BUS до осцилографа шини або ЦАП та змінюйте перемикачі.',
    ],
  ],
  experiment: [
    'Set only bits 0,2 and 7 high, then pass BUS through a splitter to verify the same pattern.',
    'Встановіть лише біти 0,2 і 7 та подайте BUS на розгалужувач для перевірки тієї самої комбінації.',
  ],
  expected: [
    'The resulting byte is 1+4+128=133. Setting bit n adds the weight 2ⁿ.',
    'Результат дорівнює 1+4+128=133. Встановлення біта n додає вагу 2ⁿ.',
  ],
  pitfalls: [
    [
      'An unwired bit is Z, not 0, and makes the assembled byte unknown. Define all eight inputs.',
      'Непідключений біт є Z, а не 0, і робить зібраний байт невідомим. Задайте всі вісім входів.',
    ],
    [
      'A merger packs independent bits; it does not safely combine several complete bus drivers. Use tri-state control for that.',
      'Об’єднувач пакує незалежні біти, а не безпечно з’єднує кілька повних шинних виходів. Для цього потрібне керування трьома станами.',
    ],
  ],
  inputs: Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [
      `b${index}`,
      [
        `Bit ${index}: one-bit contribution with weight ${2 ** index}.`,
        `Біт ${index}: однобітний внесок із вагою ${2 ** index}.`,
      ],
    ]),
  ),
  outputs: {
    out: [
      'BUS: sum of each defined input bit times its binary weight.',
      'BUS: сума добутків кожного визначеного біта на його двійкову вагу.',
    ],
  },
  examples: ['bus-mux', 'counter'],
});

add('open_drain', {
  purpose: [
    'An open-drain output can pull a shared line low or release it, enabling wired-AND logic with a pull-up.',
    'Вихід із відкритим стоком може стягувати спільну лінію до нуля або відпускати її, утворюючи монтажне І з підтяжкою.',
  ],
  steps: [
    [
      'Connect a switch to D and connect Q to an LED input.',
      'Підключіть перемикач до D, а Q — до входу світлодіода.',
    ],
    [
      'Connect a Pull-up output to that same LED input to define the released state.',
      'Підключіть вихід підтяжки до живлення до того самого входу світлодіода для визначення відпущеного стану.',
    ],
    [
      'For wired-AND, add a second open drain with its own switch and connect its Q to the shared input.',
      'Для монтажного І додайте другий відкритий стік зі своїм перемикачем і підключіть його Q до спільного входу.',
    ],
  ],
  experiment: [
    'Set both data switches to 1, then lower either one to 0.',
    'Встановіть обидва перемикачі даних у 1, потім опустіть будь-який у 0.',
  ],
  expected: [
    'Both released outputs let the pull-up produce 1. Any D=0 sinks the whole shared net to 0.',
    'Два відпущені виходи дозволяють підтяжці дати 1. Будь-який D=0 стягує всю спільну мережу до 0.',
  ],
  pitfalls: [
    [
      'D=1 does not actively drive 1: the output is Z. Without the pull-up, the released line floats.',
      'D=1 не задає активну 1: вихід має Z. Без підтяжки відпущена лінія не визначена.',
    ],
    [
      'Do not substitute strong VCC for the pull-up; it conflicts with an asserted low and produces X.',
      'Не замінюйте підтяжку сильним VCC: він конфліктує з активним нулем і дає X.',
    ],
  ],
  inputs: {
    in: [
      'D: 0 turns on the low-side driver; 1 releases it.',
      'D: 0 вмикає стягування до нуля; 1 відпускає вихід.',
    ],
  },
  outputs: {
    out: [
      'Q: strong 0 or high-impedance Z, never a strong 1.',
      'Q: сильний 0 або високий імпеданс Z, ніколи сильна 1.',
    ],
  },
  examples: ['wired-and'],
});

add('pullup', {
  purpose: [
    'A pull-up gives an otherwise released digital net a weak default high level.',
    'Підтяжка до живлення задає відпущеній цифровій мережі слабкий високий рівень.',
  ],
  steps: [
    [
      'Build a switch-controlled open-drain output connected to an LED.',
      'Побудуйте відкритий стік із перемикачем, підключений до світлодіода.',
    ],
    [
      'Connect the pull-up output to the same LED input, creating one shared net.',
      'Підключіть вихід підтяжки до того самого входу світлодіода, утворивши спільну мережу.',
    ],
    [
      'Set the open-drain input to 1 to release it, then to 0 to sink the line.',
      'Задайте входу відкритого стоку 1 для відпускання, потім 0 для стягування лінії.',
    ],
  ],
  experiment: [
    'Disable the pull-up while every open-drain driver is released; inspect the net value.',
    'Вимкніть підтяжку, коли всі відкриті стоки відпущено, та перевірте значення мережі.',
  ],
  expected: [
    'With the pull-up enabled, a released net reads 1 and a strong low overrides it. Without any drive it reads Z.',
    'З увімкненою підтяжкою відпущена мережа має 1, а сильний нуль переважає. Без жодного джерела маємо Z.',
  ],
  pitfalls: [
    [
      'The resistor is a weak logic source, not a tunable resistance or an RC rise-time simulation.',
      'Резистор є слабким логічним джерелом, а не регульованим опором чи моделлю часу наростання RC.',
    ],
    [
      'Opposing pull-up and pull-down sources without a strong driver are ambiguous and resolve to X.',
      'Протилежні підтяжки до живлення та землі без сильного джерела неоднозначні й дають X.',
    ],
  ],
  outputs: {
    out: [
      '1w: weak 1, considered only when no strong driver is active on its net.',
      '1w: слабка 1, що діє лише за відсутності активного сильного джерела в мережі.',
    ],
  },
  examples: ['wired-and'],
});

add('pulldown', {
  purpose: [
    'A pull-down defines an idle net as a weak zero while allowing an active strong source to drive it high.',
    'Підтяжка до землі задає вільній мережі слабкий нуль, дозволяючи активному сильному джерелу підняти її до одиниці.',
  ],
  steps: [
    [
      'Connect a pull-down output to an LED input and observe the default zero.',
      'Підключіть вихід підтяжки до землі до світлодіода та перевірте типовий нуль.',
    ],
    [
      'Connect a switch output to the same LED input as a strong driver.',
      'Підключіть вихід перемикача до того самого входу світлодіода як сильне джерело.',
    ],
    [
      'Toggle the switch and then disable the switch component to release its output.',
      'Перемикайте вхід, потім вимкніть компонент перемикача, щоб відпустити вихід.',
    ],
  ],
  experiment: [
    'Compare the idle LED input with and without the pull-down enabled after disabling the strong source.',
    'Після вимкнення сильного джерела порівняйте вхід світлодіода з увімкненою та вимкненою підтяжкою.',
  ],
  expected: [
    'A strong 1 overrides the weak 0. When the strong source releases, the pull-down restores 0 instead of Z.',
    'Сильна 1 переважає слабкий 0. Коли сильне джерело відпускає вихід, підтяжка відновлює 0 замість Z.',
  ],
  pitfalls: [
    [
      'A disabled switch produces Z, whereas a switch set to 0 actively drives zero; these are different conditions.',
      'Вимкнений компонент перемикача дає Z, а перемикач у стані 0 активно задає нуль; це різні випадки.',
    ],
    [
      'This is a one-bit weak source, not an automatic eight-bit bus terminator.',
      'Це однобітне слабке джерело, а не автоматичний термінатор восьмибітної шини.',
    ],
  ],
  outputs: {
    out: [
      '0w: weak 0, overridden by any active strong driver.',
      '0w: слабкий 0, який переважає будь-яке активне сильне джерело.',
    ],
  },
  examples: ['wired-and', 'logic-gates'],
});

add('schmitt', {
  purpose: [
    'A Schmitt trigger converts an analog level to a stable bit using different rising and falling thresholds.',
    'Тригер Шмітта перетворює аналоговий рівень на стійкий біт із різними порогами підйому й спаду.',
  ],
  steps: [
    [
      'Connect Bus value → DAC → Schmitt V and connect Q to an LED.',
      'З’єднайте Значення шини → ЦАП → V тригера Шмітта та Q зі світлодіодом.',
    ],
    [
      'Set DAC Vcc=5 and Schmitt Low=1.5 V, High=3.5 V.',
      'Задайте Vcc ЦАП=5 та пороги Шмітта Low=1.5 В, High=3.5 В.',
    ],
    [
      'Start below 1.5 V, rise above 3.5 V, then return to a middle voltage.',
      'Почніть нижче 1.5 В, підніміться вище 3.5 В, потім поверніться до середньої напруги.',
    ],
  ],
  experiment: [
    'Set source codes 0→128→220→128→20 and note the output at both visits to 128.',
    'Задавайте коди 0→128→220→128→20 та порівняйте вихід під час обох відвідувань 128.',
  ],
  expected: [
    'Q follows 0,0,1,1,0. The middle voltage retains whichever state was established by the last crossed threshold.',
    'Q набуває 0,0,1,1,0. Середня напруга зберігає стан, заданий останнім перетнутим порогом.',
  ],
  pitfalls: [
    [
      'The gap between Low and High is hysteresis, not an unknown region. It deliberately remembers the previous bit.',
      'Проміжок між Low і High — гістерезис, а не невизначена зона. Він навмисно зберігає попередній біт.',
    ],
    [
      'This model starts low and has ideal switching without analog noise or propagation delay.',
      'Модель починає з нуля та перемикається ідеально, без аналогового шуму й затримки поширення.',
    ],
  ],
  inputs: {
    in: [
      'V: analog voltage compared against Low and High.',
      'V: аналогова напруга для порівняння з Low та High.',
    ],
  },
  outputs: {
    out: [
      'Q: becomes 1 at or above High, 0 at or below Low, and holds between them.',
      'Q: стає 1 при High або вище, 0 при Low або нижче, і зберігається між порогами.',
    ],
  },
  examples: ['schmitt'],
});

add('monostable', {
  purpose: [
    'A monostable produces one fixed-duration pulse after a trigger edge, illustrating a simplified 555 one-shot.',
    'Одновібратор створює один імпульс фіксованої тривалості після фронту запуску та ілюструє спрощений одновібратор 555.',
  ],
  steps: [
    [
      'Connect a switch initially at 0 to TRIG, keep RST=0, and attach Q to an LED or scope.',
      'Підключіть перемикач, спочатку 0, до TRIG, тримайте RST=0 та підключіть Q до світлодіода чи осцилографа.',
    ],
    [
      'Set Duration=0.5 seconds and run the simulation.',
      'Задайте Duration=0.5 секунди та запустіть симуляцію.',
    ],
    [
      'Toggle TRIG from 0 to 1, then release it back to 0.',
      'Перемкніть TRIG з 0 у 1, потім поверніть у 0.',
    ],
  ],
  experiment: [
    'Trigger again while the pulse is already active; then trigger once more after it expires.',
    'Повторіть запуск під час активного імпульсу, потім ще раз після його завершення.',
  ],
  expected: [
    'Q stays high for Duration after the first rising trigger. Triggers during that pulse do not extend it; a later fresh edge starts another pulse.',
    'Q має 1 протягом Duration після першого додатного фронту. Запуски під час імпульсу не подовжують його; новий фронт після завершення запускає наступний.',
  ],
  pitfalls: [
    [
      'This teaching block uses a rising trigger and active-high reset; it does not reproduce the pin polarity or analog thresholds of a physical 555.',
      'Цей навчальний блок має запуск додатним фронтом і скидання одиницею; він не відтворює полярності та аналогові пороги реального 555.',
    ],
    [
      'Hold TRIG=1 after expiration and no second pulse starts: first return it to 0. RST=1 cancels the current pulse.',
      'Утримання TRIG=1 після завершення не запускає новий імпульс: спочатку поверніть 0. RST=1 скасовує поточний імпульс.',
    ],
  ],
  inputs: {
    trigger: [
      'TRIG: a 0→1 edge starts a pulse only while idle.',
      'TRIG: фронт 0→1 запускає імпульс лише у стані очікування.',
    ],
    reset: resetPin,
  },
  outputs: {
    out: ['Q: 1 during the timed pulse, otherwise 0.', 'Q: 1 під час заданого імпульсу, інакше 0.'],
  },
  examples: ['monostable'],
});

add('note', {
  purpose: [
    'A text note explains a circuit’s assumptions, signal names or expected results directly on the canvas.',
    'Текстова нотатка пояснює припущення схеми, назви сигналів чи очікувані результати безпосередньо на полотні.',
  ],
  steps: [
    [
      'Place Text note next to the circuit section it explains.',
      'Розмістіть Текстову нотатку біля частини схеми, яку вона пояснює.',
    ],
    [
      'Edit Text in Properties and choose a readable Color.',
      'Відредагуйте Text у властивостях та оберіть читабельний Color.',
    ],
    [
      'Drag the note away from ports and wires so it stays easy to read.',
      'Перетягніть нотатку подалі від контактів і дротів, щоб її було легко читати.',
    ],
  ],
  experiment: [
    'Write “A=B=1 → Carry=1, Sum=0” beside a half adder, then verify it using the switches.',
    'Напишіть «A=B=1 → Carry=1, Sum=0» біля напівсуматора та перевірте перемикачами.',
  ],
  expected: [
    'The annotation moves with its own position and is saved with the circuit without changing any signal.',
    'Анотація має власне положення, зберігається зі схемою та не змінює сигнали.',
  ],
  pitfalls: [
    [
      'A note has no electrical pins and cannot act as a wire label, signal source or logic expression.',
      'Нотатка не має електричних контактів і не працює як мітка дроту, джерело сигналу чи логічний вираз.',
    ],
  ],
  examples: ['half-adder', 'ram'],
});

add('group', {
  purpose: [
    'A color region visually marks a functional area, such as data sources, processing or output devices.',
    'Кольорова область візуально позначає функціональну частину, наприклад джерела даних, обробку чи вихідні пристрої.',
  ],
  steps: [
    [
      'Add Color region behind the components belonging to one function.',
      'Додайте Кольорову область позаду компонентів однієї функції.',
    ],
    [
      'Set Text to the function name and choose Color.',
      'Задайте Text як назву функції та оберіть Color.',
    ],
    [
      'Adjust Width and Height to surround the intended blocks with comfortable spacing.',
      'Налаштуйте Width і Height так, щоб охопити потрібні блоки з достатніми відступами.',
    ],
  ],
  experiment: [
    'Mark the input, sum logic and output areas of a full adder with three regions.',
    'Позначте вхідну частину, логіку суми та вихідну частину повного суматора трьома областями.',
  ],
  expected: [
    'Colored backgrounds clarify the circuit layout while wires and components keep their electrical behavior.',
    'Кольорові фони пояснюють структуру схеми, зберігаючи електричну поведінку дротів і компонентів.',
  ],
  pitfalls: [
    [
      'A region is a background annotation, not a subcircuit container: moving it does not automatically move the enclosed components.',
      'Область — фонова анотація, а не контейнер підсхеми: її переміщення автоматично не рухає компоненти всередині.',
    ],
    [
      'Width and Height change the drawn area only; they do not affect simulation or create electrical connections.',
      'Width і Height змінюють лише намальовану площу; вони не впливають на симуляцію та не створюють з’єднань.',
    ],
  ],
  examples: ['full-adder', 'bus-mux'],
});

add('stepper', {
  purpose: [
    'A STEP/DIR motor drives a simulated linear carriage, showing how printer motion follows digital pulses rather than a continuous angle command.',
    'Двигун STEP/DIR рухає модельовану лінійну каретку та показує, як рух принтера залежить від цифрових імпульсів, а не неперервної команди кута.',
  ],
  steps: [
    [
      'Connect a clock or manual switch to STEP, a direction switch to DIR, and position to a position sensor or endstop.',
      'Підключіть такт або ручний перемикач до STEP, перемикач напрямку до DIR, а position — до датчика положення чи кінцевика.',
    ],
    [
      'Set StepsPerRevolution=200, Microsteps=1 and Lead=8 mm per revolution. Choose Initial, Min and Max in millimeters, then reset the simulation.',
      'Задайте StepsPerRevolution=200, Microsteps=1 та Lead=8 мм за оберт. Оберіть Initial, Min і Max у міліметрах, потім скиньте симуляцію.',
    ],
    [
      'Keep EN=1 and RST=0, start STEP at 0, and apply rising edges. DIR=1 moves positive; DIR=0 moves negative. Open the motion view to inspect the carriage.',
      'Тримайте EN=1 і RST=0, почніть із STEP=0 та подавайте додатні фронти. DIR=1 рухає вперед, DIR=0 назад. Відкрийте вигляд руху для спостереження каретки.',
    ],
  ],
  experiment: [
    'Apply 200 rising edges with default mechanics, then repeat with Microsteps=4. Reverse DIR and return toward the starting point.',
    'Подайте 200 додатних фронтів із типовою механікою, потім повторіть із Microsteps=4. Змініть DIR та поверніться до початкової точки.',
  ],
  expected: [
    'Each edge moves Lead/(StepsPerRevolution×Microsteps). Defaults give 0.04 mm and 1.8° per edge; 200 edges travel 8 mm. Four microsteps reduce that distance fourfold.',
    'Кожен фронт рухає на Lead/(StepsPerRevolution×Microsteps). Типово це 0.04 мм і 1.8° за фронт; 200 фронтів дають 8 мм. Чотири мікрокроки зменшують цю відстань учетверо.',
  ],
  pitfalls: [
    [
      'A held STEP=1 does not move repeatedly. Enabling, reconnecting or releasing reset while STEP is high does not invent a step; observe a fresh low-to-high transition.',
      'Утримання STEP=1 не повторює рух. Увімкнення, перепідключення чи відпускання скидання при високому STEP не створює крок; потрібен новий перехід 0→1.',
    ],
    [
      'Unwired EN defaults to 1 and RST to 0. RST returns Initial immediately; it is a teaching reset, not physical homing. Unknown direction or enable at a possible step makes position X until reset.',
      'Непідключений EN означає 1, RST — 0. RST одразу повертає Initial; це навчальне скидання, а не фізичне базування. Невідомий напрямок чи дозвіл у момент кроку дає положення X до скидання.',
    ],
    [
      'Min and Max clamp carriage travel. The model has no torque, missed steps, acceleration or inertia; an external endstop affects control only when its output is wired into the logic.',
      'Min і Max обмежують рух каретки. Модель не має моменту, пропущених кроків, прискорення чи інерції; зовнішній кінцевик впливає на керування лише через підключену логіку.',
    ],
  ],
  inputs: {
    step: [
      'STEP: one movement command per observed rising edge; its shortest pulse must exceed the simulation time step.',
      'STEP: одна команда руху за спостереженим додатним фронтом; найкоротший імпульс має перевищувати крок часу симуляції.',
    ],
    dir: [
      'DIR: 1 moves toward increasing position, 0 toward decreasing position; define it before a step.',
      'DIR: 1 рухає в бік збільшення положення, 0 — зменшення; задайте його перед кроком.',
    ],
    enable: [
      'EN: active-high movement permission; zero holds position and ignores incoming edges. Unwired means 1.',
      'EN: дозвіл руху одиницею; нуль утримує положення та ігнорує фронти. Без дроту означає 1.',
    ],
    reset: [
      'RST: active-high return to the Initial position, clamped to Min/Max. Unwired means 0.',
      'RST: повернення до Initial одиницею з обмеженням Min/Max. Без дроту означає 0.',
    ],
  },
  outputs: {
    position: [
      'POS: carriage position in millimeters, suitable for a sensor input or the 3D axis view.',
      'POS: положення каретки в міліметрах для входу датчика або тривимірного вигляду осі.',
    ],
    angle: [
      'ANGLE: unwrapped shaft angle in degrees, calculated as position/Lead×360; it does not wrap at one revolution.',
      'ANGLE: розгорнутий кут вала в градусах, position/Lead×360; він не обмежується одним обертом.',
    ],
    moving: [
      'MOVE: a one-physics-step indication that the carriage actually changed position; attempts against a hard stop give zero.',
      'MOVE: індикація протягом одного фізичного кроку, що каретка справді змінила положення; спроби руху в упор дають нуль.',
    ],
  },
  examples: ['stepper-basics', 'printer-homing', 'position-control'],
});

add('limit_switch', {
  purpose: [
    'An endstop turns a mechanical boundary into a digital contact signal, allowing homing and travel-limit logic.',
    'Кінцевик перетворює механічну межу на цифровий контактний сигнал для базування та обмеження ходу.',
  ],
  steps: [
    [
      'Connect a stepper POS output to the endstop POS input; both carry millimeters.',
      'Підключіть вихід POS крокового двигуна до входу POS кінцевика; обидва передають міліметри.',
    ],
    [
      'For a minimum endstop set Threshold=0, Mode=below and NormallyClosed=false. Use Mode=above for a maximum endstop.',
      'Для мінімального кінцевика задайте Threshold=0, Mode=below та NormallyClosed=false. Для максимального використовуйте Mode=above.',
    ],
    [
      'Connect Q to an LED and through a NOT gate to the motor EN for a simple homing stop. Keep the clock connected directly to STEP.',
      'Підключіть Q до світлодіода та через НЕ до EN двигуна для простого зупинення базування. Такт залиште безпосередньо підключеним до STEP.',
    ],
  ],
  experiment: [
    'Start above zero and move with DIR=0 until Q activates. Add OR(DIR,NOT Q) on EN so DIR=1 can move away from the minimum endstop.',
    'Почніть вище нуля та рухайтеся з DIR=0 до спрацювання Q. Подайте OR(DIR,NOT Q) на EN, щоб DIR=1 дозволяв відійти від мінімального кінцевика.',
  ],
  expected: [
    'Below mode activates at position≤Threshold; above mode activates at position≥Threshold. NormallyClosed=true inverts the known contact result.',
    'Режим below спрацьовує при position≤Threshold; above — при position≥Threshold. NormallyClosed=true інвертує визначений стан контакту.',
  ],
  pitfalls: [
    [
      'The sensor does not stop a motor by itself: wire its signal into enable or control logic. A simple NOT Q enable also blocks moving away unless direction is considered.',
      'Датчик сам не зупиняє двигун: підключіть сигнал до дозволу чи керувальної логіки. Простий EN=NOT Q також блокує відхід, якщо не врахувати напрямок.',
    ],
    [
      'Normally closed describes contact polarity, not a simulated safety circuit. An unconnected or conflicting position is X even with NormallyClosed enabled.',
      'Нормально замкнений означає полярність контакту, а не модель захисного кола. Непідключене чи конфліктне положення дає X навіть при NormallyClosed.',
    ],
  ],
  inputs: {
    position: [
      'POS: measured carriage position in millimeters, usually from a stepper motor.',
      'POS: виміряне положення каретки в міліметрах, зазвичай від крокового двигуна.',
    ],
  },
  outputs: {
    out: [
      'Q: active contact bit. With normally-open polarity, 1 means the configured boundary is reached.',
      'Q: активний біт контакту. Для нормально розімкненої полярності 1 означає досягнуту межу.',
    ],
  },
  examples: ['printer-homing', 'stepper-basics'],
});

add('position_sensor', {
  purpose: [
    'A position sensor forwards the measured carriage coordinate and detects its relation to a fixed or live target.',
    'Датчик положення передає виміряну координату каретки та визначає її відношення до сталої або змінної цілі.',
  ],
  steps: [
    [
      'Connect stepper POS to sensor POS. Leave TARGET unwired to use Threshold, or connect an analog millimeter target such as a DAC output.',
      'Підключіть POS крокового двигуна до POS датчика. Без TARGET діє Threshold; або подайте аналогову ціль у міліметрах, наприклад вихід ЦАП.',
    ],
    [
      'Choose Mode=below, above or window. In window mode set Tolerance in millimeters around the target.',
      'Оберіть Mode=below, above або window. У режимі window задайте Tolerance у міліметрах навколо цілі.',
    ],
    [
      'For position control, use a below sensor for DIR and NOT(window sensor Q) for EN, with both sensors sharing the same TARGET.',
      'Для позиціонування використайте датчик below для DIR та NOT(Q датчика window) для EN; обидва датчики мають спільний TARGET.',
    ],
  ],
  experiment: [
    'Set target 10 mm and Tolerance=0.5 mm. Compare position 9,9.5,10,10.5,11 mm, then change a wired target while the motor runs.',
    'Задайте ціль 10 мм і Tolerance=0.5 мм. Порівняйте положення 9,9.5,10,10.5,11 мм, потім змініть підключену ціль під час руху двигуна.',
  ],
  expected: [
    'Window Q is high from 9.5 through 10.5 mm, inclusively. Below and above compare directly to the target; the POS output always forwards the measurement.',
    'Q у режимі window має 1 від 9.5 до 10.5 мм включно. Below та above порівнюють безпосередньо з ціллю; вихід POS завжди передає вимірювання.',
  ],
  pitfalls: [
    [
      'A wired TARGET overrides Threshold; a floating wired target is unknown, not a fallback to the property. Tolerance applies only to window mode.',
      'Підключений TARGET замінює Threshold; непідключений рівень на наявному дроті є невідомим, а не поверненням до властивості. Tolerance діє лише в window.',
    ],
    [
      'A target window narrower than the motor’s reachable step grid can cause endless direction changes. Use a tolerance at least half the step distance and a target inside Min/Max.',
      'Вікно цілі, вужче за досяжну сітку кроків двигуна, може спричинити нескінченну зміну напрямку. Задайте допуск щонайменше в половину кроку та ціль у межах Min/Max.',
    ],
    [
      'These coordinates are millimeters, even when supplied by a DAC. This block has no optical, magnetic or quantization model of a physical position sensor.',
      'Ці координати вимірюються в міліметрах, навіть якщо їх задає ЦАП. Блок не моделює оптичні, магнітні чи дискретизаційні властивості реального датчика.',
    ],
  ],
  inputs: {
    position: [
      'POS: actual measured coordinate in millimeters; unknown measurements propagate to the outputs.',
      'POS: фактична виміряна координата в міліметрах; невідомі вимірювання передаються на виходи.',
    ],
    target: [
      'TARGET: optional analog reference in millimeters; when unwired the Threshold property supplies it.',
      'TARGET: необов’язкова аналогова опора в міліметрах; без дроту її задає властивість Threshold.',
    ],
  },
  outputs: {
    position: [
      'POS: unchanged measured position, for chaining sensors or observation.',
      'POS: незмінене виміряне положення для каскадування датчиків або спостереження.',
    ],
    out: [
      'Q: below means POS≤target, above means POS≥target, window means |POS−target|≤Tolerance.',
      'Q: below означає POS≤ціль, above — POS≥ціль, window — |POS−ціль|≤Tolerance.',
    ],
  },
  examples: ['position-control', 'stepper-basics'],
});

add('traffic_light', {
  purpose: [
    'A traffic-light block turns three digital lamp commands into a visible signal and checks whether exactly one lamp is active.',
    'Блок світлофора перетворює три цифрові команди на видимі лампи й перевіряє, чи активна рівно одна лампа.',
  ],
  steps: [
    [
      'Connect independent switches to RED, YELLOW and GREEN. Start with RED=1 and the other two inputs at 0.',
      'Підключіть незалежні перемикачі до RED, YELLOW та GREEN. Почніть з RED=1 та двох інших нулів.',
    ],
    [
      'Connect VALID and GO to LEDs, then open the traffic-light scene from 3D to compare the visible lamps with these outputs.',
      'Підключіть VALID та GO до світлодіодів і відкрийте сцену світлофора через 3D для порівняння ламп із виходами.',
    ],
    [
      'Test red only, amber only, green only, all off and multiple lamps on. This component has no timing parameters or hidden controller.',
      'Перевірте окремо червоний, жовтий, зелений, усі вимкнені й кілька ввімкнених. Блок не має параметрів часу чи прихованого контролера.',
    ],
  ],
  experiment: [
    'Leave GREEN=1 and also set RED=1, then remove RED. Watch VALID and GO drop and recover while the physical lamp commands remain visible.',
    'Залиште GREEN=1 та додайте RED=1, потім приберіть RED. Спостерігайте зникнення й відновлення VALID/GO, поки команди ламп лишаються видимими.',
  ],
  expected: [
    'Exactly one lamp gives VALID=1. Only the green-only combination gives GO=1; the other seven input combinations do not grant passage.',
    'Рівно одна лампа дає VALID=1. Лише окремий зелений дає GO=1; інші сім комбінацій не дозволяють проїзд.',
  ],
  pitfalls: [
    [
      'This intentionally simplified model rejects red plus amber together. It does not implement country-specific traffic rules or automatically sequence the lamps.',
      'Ця спрощена модель не приймає одночасний червоний із жовтим. Вона не реалізує правила окремої країни чи автоматичне перемикання.',
    ],
    [
      'Drive every lamp input with a known bit; an unconnected Z is not a deliberate all-off command. VALID describes lamp consistency, not a complete road-safety assessment.',
      'Задайте кожній лампі визначений біт; непідключений Z не є навмисною командою вимкнення. VALID описує узгодженість ламп, а не повну безпеку дороги.',
    ],
  ],
  inputs: {
    red: ['RED: high lights the stop lamp.', 'RED: одиниця вмикає червону лампу зупинки.'],
    yellow: [
      'YELLOW: high lights the amber caution lamp.',
      'YELLOW: одиниця вмикає жовту попереджувальну лампу.',
    ],
    green: [
      'GREEN: high lights the green lamp; passage still requires a valid one-lamp state.',
      'GREEN: одиниця вмикає зелену; дозвіл додатково потребує правильного стану однієї лампи.',
    ],
  },
  outputs: {
    valid: [
      'VALID: 1 only when exactly one of RED, YELLOW and GREEN is high.',
      'VALID: 1 лише тоді, коли рівно один RED, YELLOW чи GREEN має 1.',
    ],
    go: ['GO: 1 only for GREEN=1 with RED=YELLOW=0.', 'GO: 1 лише при GREEN=1 та RED=YELLOW=0.'],
  },
  examples: ['traffic-light', 'traffic-junction'],
});

add('traffic_junction', {
  purpose: [
    'A crossroad process moves real simulated cars according to two-axis signal commands, exposing queues and a latched collision for feedback experiments.',
    'Процес перехрестя рухає змодельовані машини за сигналами двох напрямків і показує черги та запам’ятоване зіткнення для дослідів керування.',
  ],
  steps: [
    [
      'Connect mutually exclusive NS_GREEN and EW_GREEN commands and amber clearance phases. Red/amber stops the complete car nose before its stop line and zebra; already admitted vehicles continue through.',
      'Підключіть взаємно виключні NS_GREEN та EW_GREEN і жовті інтервали очищення. Червоний/жовтий зупиняє всю передню частину машини до лінії й зебри; допущені машини продовжують рух.',
    ],
    [
      'Use a counter/decoder for green, amber, opposite green, opposite amber. Set carSpeed=12 meters/second, arrivalInterval=4 seconds and initialCars=2 per axis for the supplied laboratory.',
      'Використайте лічильник і декодер для зеленого, жовтого, протилежного зеленого та жовтого. Для лабораторної задайте carSpeed=12 м/с, arrivalInterval=4 с та initialCars=2 на напрямок.',
    ],
    [
      'Drive RUN=1 and RESET=0, open the junction scene in 3D and observe cars, waiting traffic and PASSED. Pulse RESET after removing a deliberately unsafe override.',
      'Задайте RUN=1 та RESET=0, відкрийте перехрестя в 3D і спостерігайте машини, черги та PASSED. Подавайте RESET після усунення навмисного небезпечного обходу.',
    ],
  ],
  experiment: [
    'Run the four-phase laboratory safely, then reset and force both green directions at the starting phase. The vehicles can physically meet in the conflict area.',
    'Запустіть правильні чотири фази, потім скиньте й увімкніть обидва зелені в початковій фазі. Машини можуть фізично зустрітися в зоні конфлікту.',
  ],
  expected: [
    'Safe phases keep stopped noses behind the zebra, preserve body-length queue gaps and increase PASSED. CRASH latches only when actual vehicle footprints contact, then clears with RESET; simultaneous green alone is not a collision.',
    'Правильні фази тримають передні частини до зебри, зберігають проміжки між кузовами й збільшують PASSED. CRASH запам’ятовується лише при контакті реальних габаритів і скидається RESET; сам одночасний зелений не є зіткненням.',
  ],
  pitfalls: [
    [
      'Exclusive green signals still need enough yellow or all-red clearance for existing cars. Raising carSpeed or shortening phases can invalidate a previously safe timing plan.',
      'Навіть взаємно виключні зелені потребують достатнього жовтого чи всечервоного інтервалу. Зміна carSpeed або скорочення фаз може зіпсувати попередній безпечний цикл.',
    ],
    [
      'RUN=0 pauses this process, not the whole circuit. RESET restores initialCars and clears collision history; remove the unsafe command before releasing it.',
      'RUN=0 зупиняє цей процес, а не всю схему. RESET відновлює initialCars і стирає аварію; усуньте небезпечну команду перед відпусканням.',
    ],
  ],
  inputs: {
    ns_green: [
      'NS_GREEN: grants north/south traffic permission to enter the junction.',
      'NS_GREEN: дозволяє транспортові північ/південь в’їжджати на перехрестя.',
    ],
    ns_yellow: [
      'NS_YELLOW: displays north/south caution and stops new entries.',
      'NS_YELLOW: жовтий північ/південь, який зупиняє нові в’їзди.',
    ],
    ew_green: [
      'EW_GREEN: grants east/west traffic permission; simultaneous opposing greens can cause a collision.',
      'EW_GREEN: дозволяє схід/захід; одночасні зелені напрямків можуть спричинити зіткнення.',
    ],
    ew_yellow: [
      'EW_YELLOW: displays east/west caution and stops new entries.',
      'EW_YELLOW: жовтий схід/захід, який зупиняє нові в’їзди.',
    ],
    run: [
      'RUN: high advances traffic; low holds process positions and arrivals. Unwired defaults high.',
      'RUN: 1 рухає транспорт, 0 утримує позиції та надходження. Без дроту активний.',
    ],
    reset: [
      'RESET: active-high reset of cars, counters and the latched crash.',
      'RESET: активне скидання машин, лічильників і запам’ятованої аварії.',
    ],
  },
  outputs: {
    ns_wait: [
      'NS_WAIT: one-bit flag; 1 means north/south vehicles are queued and waiting.',
      'NS_WAIT: однобітний прапорець; 1 означає чергу машин північ/південь.',
    ],
    ew_wait: [
      'EW_WAIT: one-bit flag; 1 means east/west vehicles are queued and waiting.',
      'EW_WAIT: однобітний прапорець; 1 означає чергу машин схід/захід.',
    ],
    crash: [
      'CRASH: latched collision bit, cleared only by RESET.',
      'CRASH: запам’ятований біт зіткнення до RESET.',
    ],
    passed: [
      'PASSED: eight-bit count of successfully cleared vehicles.',
      'PASSED: восьмибітна кількість машин, що успішно виїхали.',
    ],
  },
  examples: ['traffic-junction', 'traffic-light'],
});

add('railway', {
  purpose: [
    'A railway and road crossing models finite train/car bodies, timed road gates and a complete-route reservation, so interlocking prevents physical contact instead of hiding vehicles.',
    'Залізничний переїзд моделює повні тіла поїздів і машин, часові шлагбауми та повне резервування, щоб блокування запобігало фізичному контакту замість приховування транспорту.',
  ],
  steps: [
    [
      'Use APPROACH_A/B and OCCUPIED to request one route at a time. Reserve the converging, shared and divergent corridor until the entire train tail clears; retain POINTS with an SR latch throughout that reservation.',
      'За APPROACH_A/B та OCCUPIED обирайте один маршрут. Резервуйте вхідну, спільну й вихідну ділянки до виходу всього хвоста; утримуйте POINTS через SR увесь час резервування.',
    ],
    [
      'Alternate rail and road windows. Command BARRIER closed for a rail request or occupied reservation, then require GATE_CLOSED=1 and CROSSING_CLEAR=1 before showing green. Road cars already inside must clear before the gates lower. Use THROTTLE=30 km/h with speedLimit=60.',
      'Чергуйте дорожні й залізничні вікна. Закривайте BARRIER для залізничного запиту чи зайнятого резервування, а перед зеленим вимагайте GATE_CLOSED=1 та CROSSING_CLEAR=1. Машини всередині спершу мають виїхати. Використайте THROTTLE=30 км/год та speedLimit=60.',
    ],
    [
      'Set initialA=-48 and initialB=-85 meters for the supplied spacing. With RUN=1 and RESET=0, inspect moving road traffic, stopped train noses and the train passage counter in 3D. The 40-second laboratory cycle starts with 20 seconds for road traffic.',
      'Задайте initialA=-48 та initialB=-85 м. При RUN=1, RESET=0 спостерігайте в 3D рух машин, зупинені передні частини поїздів і лічильник проїзду потягів. Цикл лабораторної 40 с починається з 20 с для автодороги.',
    ],
  ],
  experiment: [
    'Compare the guarded cycle with a forced-open gate: the ready guard keeps trains red. Then bypass signals to inspect actual body contact; test THROTTLE=120 separately for turnout derailment. An empty road must not create a collision merely because the gates are open.',
    'Порівняйте правильний цикл із примусово відкритими шлагбаумами: захист лишає поїздам червоний. Потім обійдіть сигнали для перевірки справжнього контакту; окремо задайте THROTTLE=120 для сходження. Порожня дорога не створює аварії лише через відкриті шлагбауми.',
  ],
  expected: [
    'Trains and road cars both make repeated safe passages. A committed train keeps its route and closed gates until its full tail clears, even when the rail window ends. Collisions require overlapping physical bodies; overspeed or points violations can cause separate visible derailments.',
    'Поїзди й машини багаторазово безпечно проїжджають. Допущений поїзд зберігає маршрут і закриті шлагбауми до виходу всього хвоста, навіть після кінця вікна. Зіткнення потребує контакту тіл; швидкість чи стрілка окремо можуть спричинити видиме сходження.',
  ],
  pitfalls: [
    [
      'OCCUPIED is a complete-body route reservation, not a nose-only test. A train waiting behind its red stop line must not reserve the block; an admitted train must retain it until its rear clears the divergent exit.',
      'OCCUPIED — резервування для всього тіла, не лише голови. Поїзд перед червоною стоп-лінією не має займати ділянку; допущений зберігає її до виходу хвоста з вихідної стрілки.',
    ],
    [
      'A close command is not closed-gate feedback: lowering takes time and waits for cars inside. Keep a road window so queued cars can move. An open gate is not itself contact, and a static decorative car must never trigger an accident.',
      'Команда закривання не є підтвердженням: опускання триває певний час і чекає виїзду машин. Лишайте дорожнє вікно для черги. Відкритий шлагбаум сам не є контактом, декоративна нерухома машина не спричиняє аварії.',
    ],
  ],
  inputs: {
    signal_a: [
      'SIGNAL_A: high admits train A past its red stop line into the shared track.',
      'SIGNAL_A: 1 дозволяє поїзду A пройти червону стоп-лінію на спільну колію.',
    ],
    signal_b: [
      'SIGNAL_B: high admits train B from the opposite end of the same track.',
      'SIGNAL_B: 1 дозволяє поїзду B зайти з іншого боку тієї самої колії.',
    ],
    points: [
      'POINTS: near turnout; 0 connects siding A, 1 connects the straight main. Changing the physical blades beneath a train derails it.',
      'POINTS: ближня стрілка; 0 з’єднує гілку A, 1 — пряму головну колію. Зміна фізичних рейок під потягом призводить до сходження.',
    ],
    exit_points: [
      'EXIT POINTS: far turnout; 0 connects the straight main, 1 connects siding B. Unwired it follows POINTS; wire a separate switch for independent dispatch.',
      'EXIT POINTS: дальня стрілка; 0 з’єднує пряму колію, 1 — гілку B. Без дроту повторює POINTS; окремий перемикач дає незалежне керування.',
    ],
    barrier: [
      'BARRIER: 1 requests the gates across the road to close, 0 requests opening. Actual closure is timed and reported by GATE_CLOSED; the gates do not block the rails.',
      'BARRIER: 1 просить закрити шлагбауми поперек дороги, 0 — відкрити. Закривання має тривалість і підтверджується GATE_CLOSED; шлагбауми не перекривають рейки.',
    ],
    throttle: [
      'THROTTLE: eight-bit speed command in km/h, not a percentage; compare it with speedLimit.',
      'THROTTLE: восьмибітна команда швидкості в км/год, не відсоток; порівнюйте зі speedLimit.',
    ],
    run: [
      'RUN: high advances train motion; low pauses the process. Unwired defaults high.',
      'RUN: 1 рухає поїзди, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialA/initialB, clears passage counts and all latched railway failures.',
      'RESET: відновлює initialA/initialB, очищає проїзди та всі запам’ятовані несправності.',
    ],
  },
  outputs: {
    approach_a: [
      'APPROACH_A: train A is approaching the shared block and can request admission.',
      'APPROACH_A: поїзд A наближається до ділянки та може запитати дозвіл.',
    ],
    approach_b: [
      'APPROACH_B: train B is approaching from the opposite side.',
      'APPROACH_B: поїзд B наближається з протилежного боку.',
    ],
    occupied: [
      'OCCUPIED: complete protected-route reservation after admission, held until the entire train rear clears the corridor.',
      'OCCUPIED: повне резервування після дозволеного в’їзду до виходу всього хвоста із захищеного коридору.',
    ],
    fault: [
      'FAULT: any latched collision, overspeed, moving-points or open-barrier failure.',
      'FAULT: запам’ятоване зіткнення, швидкість, рух стрілки чи відкритий переїзд.',
    ],
    speed: [
      'SPEED: numeric railway speed in km/h for inspection and plotting.',
      'SPEED: числова швидкість залізниці в км/год для огляду й графіка.',
    ],
    passed: [
      'PASSED: eight-bit count of trains that cleared the route before respawning.',
      'PASSED: восьмибітна кількість поїздів, що завершили маршрут до повторної появи.',
    ],
    gate_closed: [
      'GATE_CLOSED: actual gate arms are fully lowered, not merely commanded closed.',
      'GATE_CLOSED: фактичні шлагбауми повністю опущені, а не лише мають команду закривання.',
    ],
    crossing_clear: [
      'CROSSING_CLEAR: no full road-vehicle body remains inside the protected crossing between the gates.',
      'CROSSING_CLEAR: жодне повне тіло дорожньої машини не лишається в захищеному переїзді між шлагбаумами.',
    ],
    points_state: [
      'POINTS: actual near turnout position, 0 for siding A and 1 for the main.',
      'POINTS: фактична ближня стрілка, 0 для гілки A, 1 для головної колії.',
    ],
    exit_points_state: [
      'EXIT POINTS: actual far turnout position, 0 for the main and 1 for siding B.',
      'EXIT POINTS: фактична дальня стрілка, 0 для головної колії, 1 для гілки B.',
    ],
    cars_wait: [
      'CARS_WAIT: road vehicles are queued before the closed/closing gate stop lines.',
      'CARS_WAIT: дорожні машини чекають перед стоп-лініями закритих чи закриваних шлагбаумів.',
    ],
  },
  examples: ['railway-interlocking', 'railway-dispatch'],
});

add('animal_feeder', {
  purpose: [
    'An animal-feeding process exposes bowl and hopper levels so a digital controller can replenish food only when needed and detect unsafe dispensing.',
    'Процес годівниці надає рівні миски й бункера, щоб цифрове керування додавало їжу за потреби та виявляло небезпечне насипання.',
  ],
  steps: [
    [
      'Set hopperCapacity=500, bowlCapacity=100, initialHopper=300 and initialLevel=10 for the supplied lab. Open the feeder in 3D to observe both containers and the animal.',
      'Для лабораторної задайте hopperCapacity=500, bowlCapacity=100, initialHopper=300 та initialLevel=10. Відкрийте годівницю в 3D для огляду обох місткостей і тварини.',
    ],
    [
      'Use HUNGRY to set an SR latch and FULL to reset it; gate its output with NOT EMPTY before DISPENSE. Set hungryThreshold=20 and fullThreshold=60 so feedback has a useful hysteresis band.',
      'Подайте HUNGRY на встановлення SR, FULL — на скидання; перед DISPENSE додайте NOT EMPTY. Задайте hungryThreshold=20 і fullThreshold=60 для корисного гістерезису.',
    ],
    [
      'dispenseRate=25 and eatRate=4 set transfer and consumption per second. alarmThreshold=90 detects excessive bowl fill; portionSize=40 defines one FED count. Pulse REFILL from 0 to 1 to refill only the hopper.',
      'dispenseRate=25 та eatRate=4 задають подавання й споживання за секунду. alarmThreshold=90 виявляє зайву їжу; portionSize=40 визначає одну порцію FED. Фронт REFILL 0→1 наповнює лише бункер.',
    ],
  ],
  experiment: [
    'Watch automatic fill/consume cycles, pulse hopper refill, then deliberately force DISPENSE past FULL to observe an excessive-fill alarm. Remove the override before RESET.',
    'Спостерігайте цикли насипання й споживання, подайте Refill, потім навмисно утримуйте DISPENSE після FULL для тривоги переповнення. Приберіть обхід перед RESET.',
  ],
  expected: [
    'Feedback fills until FULL, waits until HUNGRY and stops automatic transfer if EMPTY. REFILL is edge-triggered; consumed food increments FED by portionSize. Unsafe dispensing latches ALARM until reset.',
    'Керування насипає до FULL, чекає HUNGRY та блокує автоматичне подавання при EMPTY. REFILL діє за фронтом; спожита їжа збільшує FED за portionSize. Небезпечне насипання тримає ALARM до скидання.',
  ],
  pitfalls: [
    [
      'EMPTY means the hopper is empty, not that the bowl is hungry. Refill adds no food directly to the bowl and holding REFILL high does not perform repeated refills.',
      'EMPTY означає порожній бункер, а не голодну миску. Refill не насипає прямо до миски; утримання REFILL=1 не повторює наповнення.',
    ],
    [
      'Choose hungryThreshold below fullThreshold and alarmThreshold above the intended full level. A manual override intentionally bypasses the protection; restoring inputs does not erase a latched alarm.',
      'Задайте hungryThreshold нижче fullThreshold, а alarmThreshold вище робочого повного рівня. Ручний обхід навмисно оминає захист; відновлення входів не стирає тривогу.',
    ],
  ],
  inputs: {
    dispense: [
      'DISPENSE: high transfers food from hopper to bowl at dispenseRate.',
      'DISPENSE: 1 подає їжу з бункера до миски зі швидкістю dispenseRate.',
    ],
    refill: [
      'REFILL: rising edge fills the hopper to hopperCapacity; return to 0 to re-arm.',
      'REFILL: додатний фронт наповнює бункер до hopperCapacity; поверніть 0 для наступного запуску.',
    ],
    run: [
      'RUN: high advances transfer and eating; low pauses this process. Unwired defaults high.',
      'RUN: 1 запускає подавання й споживання, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialHopper and initialLevel and clears alarm/portion history.',
      'RESET: відновлює initialHopper й initialLevel та очищає тривоги й порції.',
    ],
  },
  outputs: {
    hungry: [
      'HUNGRY: bowl level is at or below hungryThreshold; use it as a feeding request.',
      'HUNGRY: рівень миски не вищий за hungryThreshold; запит годування.',
    ],
    full: [
      'FULL: bowl level is at or above fullThreshold; use it to stop feeding.',
      'FULL: рівень миски не нижчий за fullThreshold; команда зупинення подавання.',
    ],
    empty: [
      'EMPTY: the hopper has no food available for transfer.',
      'EMPTY: у бункері немає їжі для подавання.',
    ],
    alarm: [
      'ALARM: latched unsafe dispensing or excessive bowl fill, cleared by RESET.',
      'ALARM: запам’ятоване небезпечне подавання чи надмірний рівень до RESET.',
    ],
    level: [
      'LEVEL: current bowl food mass in grams for observation and feedback.',
      'LEVEL: поточна маса їжі в мисці в грамах для огляду й керування.',
    ],
    hopper: [
      'HOPPER: remaining stored food mass in grams.',
      'HOPPER: залишок запасу їжі в бункері в грамах.',
    ],
    fed: [
      'FED: eight-bit number of portionSize portions consumed by the animal.',
      'FED: восьмибітна кількість порцій розміром portionSize, які з’їла тварина.',
    ],
  },
  examples: ['animal-feeder'],
});

add('water_tank', {
  purpose: [
    'A water-tank process turns pump and drain commands into a measured level, exposing low/high switches and a remembered overflow for hysteresis control.',
    'Процес резервуара перетворює команди насоса й зливу на рівень і надає нижній/верхній датчики та пам’ять переливу для гістерезисного керування.',
  ],
  steps: [
    [
      'Set capacity=100 liters and initialLevel=35 percent. Connect a drain switch to DRAIN and a controller output to PUMP, then open the tank in 3D.',
      'Задайте capacity=100 літрів та initialLevel=35 відсотків. Підключіть перемикач зливу до DRAIN і вихід керування до PUMP та відкрийте резервуар у 3D.',
    ],
    [
      'Use LOW to set an SR latch and HIGH to reset it. Set lowThreshold=20 and highThreshold=80 percent; the latch holds the pump decision between these thresholds.',
      'LOW встановлює SR, HIGH скидає її. Задайте lowThreshold=20 та highThreshold=80 відсотків; пам’ять утримує рішення насоса між порогами.',
    ],
    [
      'Set pumpRate=12 liters/second and drainRate=4 liters/second. With both active the net inflow is 8 liters/second. RUN advances the process; RESET restores the initial level and clears overflow history.',
      'Задайте pumpRate=12 л/с та drainRate=4 л/с. При обох активних чистий приплив — 8 л/с. RUN запускає процес; RESET повертає початковий рівень і стирає перелив.',
    ],
  ],
  experiment: [
    'Observe an automatic fill/drain cycle, then bypass the latch with a forced pump and close DRAIN. After spilling, remove the override and pulse RESET to recover.',
    'Спостерігайте автоматичний цикл, потім обійдіть пам’ять примусовим насосом і закрийте DRAIN. Після переливу приберіть обхід та подайте RESET.',
  ],
  expected: [
    'The latch keeps the level near the low/high band without chattering at one threshold. An unchecked pump can reach capacity and spill; OVERFLOW remains high until reset even if the pump is later stopped.',
    'Пам’ять утримує рівень поблизу смуги Low/High без перемикань біля одного порогу. Насос без обмеження досягає місткості й переливає; OVERFLOW тримається до скидання навіть після зупинення насоса.',
  ],
  pitfalls: [
    [
      'LEVEL and thresholds are percentages, while capacity is liters and pumpRate/drainRate are liters per second. Doubling capacity changes the percentage rate at the same flow.',
      'LEVEL та пороги — відсотки, capacity — літри, pumpRate/drainRate — літри за секунду. Подвоєння місткості змінює відсоткову швидкість при тому самому потоці.',
    ],
    [
      'LOW and HIGH can both be zero in the middle band; that is why the controller needs memory. Keep lowThreshold below highThreshold and remove a forced-pump command before resetting.',
      'LOW і HIGH можуть одночасно бути нулями посередині; тому потрібна пам’ять. lowThreshold має бути нижчим за highThreshold; приберіть примусовий насос перед скиданням.',
    ],
  ],
  inputs: {
    pump: [
      'PUMP: high adds water at pumpRate while the process runs.',
      'PUMP: 1 додає воду зі швидкістю pumpRate під час роботи.',
    ],
    drain: [
      'DRAIN: high opens the outlet at drainRate; low closes it.',
      'DRAIN: 1 відкриває злив зі швидкістю drainRate, 0 закриває.',
    ],
    run: [
      'RUN: high advances fill/drain physics; low freezes the process. Unwired defaults high.',
      'RUN: 1 запускає наповнення й злив, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialLevel and clears the latched overflow.',
      'RESET: відновлює initialLevel та очищає запам’ятований перелив.',
    ],
  },
  outputs: {
    low: [
      'LOW: level is at or below lowThreshold, a request to begin filling.',
      'LOW: рівень не вищий за lowThreshold, запит початку наповнення.',
    ],
    high: [
      'HIGH: level is at or above highThreshold, a request to stop filling.',
      'HIGH: рівень не нижчий за highThreshold, запит зупинення наповнення.',
    ],
    overflow: [
      'OVERFLOW: latched record of water spilling beyond capacity.',
      'OVERFLOW: запам’ятований факт переливу за місткість.',
    ],
    level: [
      'LEVEL: current fill percentage, bounded between 0 and 100.',
      'LEVEL: поточний відсоток наповнення в межах від 0 до 100.',
    ],
  },
  examples: ['water-tank'],
});

add('aquarium', {
  purpose: [
    'Build a complete fish life-support controller from logic gates. Temperature, oxygen, food and water quality change continuously; sustained unsafe conditions reduce health and can kill individual fish.',
    'Побудуйте керування життям рибок із логічних елементів. Температура, кисень, корм і чистота змінюються безперервно; тривалі небезпечні умови погіршують здоров’я та можуть убити окремих рибок.',
  ],
  steps: [
    [
      'Start with initialTemperature=24 °C, ambientTemperature=18 °C, initialOxygen=70, initialFood=45, initialCleanliness=80, fishCount=4 and dayLength=60 seconds. Open 3D to watch fish, bubbles, feeding and the thermometer.',
      'Почніть з initialTemperature=24 °C, ambientTemperature=18 °C, initialOxygen=70, initialFood=45, initialCleanliness=80, fishCount=4 і dayLength=60 секунд. Відкрийте 3D та спостерігайте рибок, бульбашки, корм і термометр.',
    ],
    [
      'Connect COLD to HEATER, HOT to COOLER, LOW OXYGEN to AERATOR and DIRTY to FILTER. Qualify each request with a permission switch through AND; use NOT HOT to block unnecessary heating.',
      'Підключіть COLD до HEATER, HOT до COOLER, LOW OXYGEN до AERATOR та DIRTY до FILTER. Через І додайте до запитів перемикачі дозволу; NOT HOT може блокувати зайве нагрівання.',
    ],
    [
      'Use HUNGRY to permit bounded feeding and DAY to schedule LIGHT. RUN=1 advances the ecosystem; pulse RESET and return it to 0 to restore the configured fish and initial quantities.',
      'За HUNGRY дозволяйте обмежену годівлю, за DAY плануйте LIGHT. RUN=1 запускає екосистему; імпульс RESET із поверненням у 0 відновлює заданих рибок і початкові показники.',
    ],
  ],
  experiment: [
    'Deny aerator permission or force the heater or feeder on. Record the changing measurement, declining HEALTH, alarm and ALIVE. Restore safe control before death, then compare with a full RESET after death.',
    'Заблокуйте помпу або примусово ввімкніть нагрівач чи годівницю. Запишіть зміну вимірювання, падіння HEALTH, тривогу й ALIVE. Поверніть безпечне керування до загибелі, потім порівняйте зі скиданням RESET після загибелі.',
  ],
  expected: [
    'Healthy fish swim. Low temperature, excess heat, low oxygen, excess food, starvation, dirt or uninterrupted light cause cumulative harm. Dead fish turn belly-up, show X eyes and float to the surface; surviving fish can recover.',
    'Здорові рибки плавають. Холод, перегрів, брак кисню, надмір корму, голод, бруд чи постійне світло поступово шкодять. Загиблі рибки перевертаються черевом догори, мають очі X та спливають; живі можуть одужати.',
  ],
  pitfalls: [
    [
      'This is an accelerated educational ecosystem: one complete dayLength includes day and night. ALARM remembers damage after health drops below 60; correcting a signal does not revive dead fish or clear that history without RESET.',
      'Це прискорена навчальна екосистема: dayLength охоплює день і ніч. ALARM запам’ятовує шкоду при здоров’ї нижче 60; виправлення сигналу не оживляє загиблих і не очищає історію без RESET.',
    ],
    [
      'FEED is a level-driven actuator, not a one-portion button. Holding it high overfeeds fish; combine HUNGRY with a clock or one-shot. A sensor request and the actual actuator command can differ when permission is denied.',
      'FEED працює весь час одиниці, а не видає одну порцію за натискання. Постійна 1 перегодовує; поєднайте HUNGRY з генератором або одновібратором. Запит датчика й команда механізму можуть відрізнятися через відсутність дозволу.',
    ],
  ],
  inputs: {
    heater: [
      'HEATER: 1 heats water; use COLD and a permission interlock.',
      'HEATER: 1 нагріває воду; використовуйте COLD та дозвіл.',
    ],
    cooler: [
      'COOLER: 1 cools water; use HOT to stop excess heat.',
      'COOLER: 1 охолоджує воду; HOT допомагає прибрати перегрів.',
    ],
    aerator: [
      'AERATOR: 1 runs the oxygen pump and produces visible bubbles.',
      'AERATOR: 1 вмикає кисневу помпу та видимі бульбашки.',
    ],
    feed: [
      'FEED: 1 continuously adds food; pulse it or stop at HUNGRY=0.',
      'FEED: 1 безперервно додає корм; подавайте імпульси або зупиняйте при HUNGRY=0.',
    ],
    light: [
      'LIGHT: 1 lights the aquarium; fish need dark resting periods.',
      'LIGHT: 1 освітлює акваріум; рибкам потрібні темні періоди відпочинку.',
    ],
    filter: [
      'FILTER: 1 cleans the water and rotates the visible filter.',
      'FILTER: 1 очищує воду та обертає видимий фільтр.',
    ],
    water_change: [
      'WATER CHANGE: 1 replenishes oxygen and cleans the water.',
      'WATER CHANGE: 1 поповнює кисень та очищує воду.',
    ],
    run: [
      'RUN: 1 advances time and biology, 0 pauses; unwired defaults to 1.',
      'RUN: 1 рухає час і біологію, 0 призупиняє; без дроту діє 1.',
    ],
    reset: [
      'RESET: high restores configured levels, fish health, life and alarm history.',
      'RESET: 1 відновлює задані рівні, здоров’я, життя рибок та історію тривог.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 22 °C, a request for heating.', 'COLD: 1 нижче 22 °C, запит нагрівання.'],
    hot: ['HOT: 1 above 28 °C, a request for cooling.', 'HOT: 1 вище 28 °C, запит охолодження.'],
    low_oxygen: [
      'LOW OXYGEN: 1 below 55% oxygen, a request for air.',
      'LOW OXYGEN: 1 при кисні нижче 55%, запит повітря.',
    ],
    hungry: [
      'HUNGRY: 1 when FOOD is below 35%, a feeding request.',
      'HUNGRY: 1 при FOOD нижче 35%, запит годівлі.',
    ],
    dirty: [
      'DIRTY: 1 below 45% cleanliness; request filtration or fresh water.',
      'DIRTY: 1 при чистоті нижче 45%; потрібен фільтр або свіжа вода.',
    ],
    day: [
      'DAY: 1 in the first half of the simulated dayLength cycle.',
      'DAY: 1 у першій половині модельного циклу dayLength.',
    ],
    alarm: [
      'ALARM: latched record of serious health loss or fish death.',
      'ALARM: запам’ятований значний спад здоров’я або загибель рибок.',
    ],
    alive: [
      'ALIVE: eight-bit count of living fish, from 0 to fishCount.',
      'ALIVE: восьмибітна кількість живих рибок від 0 до fishCount.',
    ],
    temperature: [
      'TEMP: measured water temperature in degrees Celsius.',
      'TEMP: виміряна температура води у градусах Цельсія.',
    ],
    oxygen: [
      'OXYGEN: current oxygen level from 0 to 100%.',
      'OXYGEN: поточний рівень кисню від 0 до 100%.',
    ],
    food: [
      'FOOD: current available food from 0 to 100%; excess is harmful.',
      'FOOD: поточний доступний корм від 0 до 100%; надлишок шкодить.',
    ],
    cleanliness: [
      'CLEANLINESS: water quality from 0 to 100%; higher is cleaner.',
      'CLEANLINESS: якість води від 0 до 100%; більше означає чистіше.',
    ],
    health: [
      'HEALTH: average fish health, including zero health of dead fish.',
      'HEALTH: середнє здоров’я рибок із урахуванням нуля в загиблих.',
    ],
  },
  examples: ['aquarium-life-support', 'aquarium-feeding', 'aquarium-lighting'],
});

add('greenhouse', {
  purpose: [
    'Control a greenhouse using temperature, soil moisture and daylight feedback. Plants grow under suitable conditions and lose health when exposed to cold, heat, drought, flooding or prolonged darkness.',
    'Керуйте теплицею за температурою, вологістю ґрунту та денним світлом. Рослини ростуть за належних умов і втрачають здоров’я від холоду, спеки, посухи, затоплення чи тривалої темряви.',
  ],
  steps: [
    [
      'Set initialTemperature=20 °C, ambientTemperature=12 °C, initialMoisture=45% and dayLength=60 seconds. In 3D locate the heater, roof vent, irrigation and growing plants.',
      'Задайте initialTemperature=20 °C, ambientTemperature=12 °C, initialMoisture=45% та dayLength=60 секунд. У 3D знайдіть нагрівач, кватирку, полив і рослини.',
    ],
    [
      'Use COLD for HEATER and HOT for VENT. Add permission switches through AND and block heating during an excessive-heat request.',
      'За COLD керуйте HEATER, за HOT — VENT. Через І додайте дозволи та блокуйте нагрів за запиту надлишкової температури.',
    ],
    [
      'For irrigation, connect DRY to SR set and WET to reset; drive PUMP with Q and a permission. Use DARK for GROW LIGHT, then observe MOISTURE, GROWTH and HEALTH over several days.',
      'Для поливу підключіть DRY до S, WET до R SR-защіпки; керуйте PUMP виходом Q із дозволом. За DARK вмикайте GROW LIGHT, спостерігайте MOISTURE, GROWTH і HEALTH протягом кількох діб.',
    ],
  ],
  experiment: [
    'Compare direct DRY control with SR hysteresis. Force the pump on or deny watering, and record when wet soil or drought starts harming plants. Restore control and reset for a fresh trial.',
    'Порівняйте пряме керування DRY з гістерезисом SR. Примусово ввімкніть насос або забороніть полив та запишіть початок шкоди від перезволоження чи посухи. Відновіть керування та скиньте для нового досліду.',
  ],
  expected: [
    'A working circuit keeps soil within its chosen band and temperature suitable for growth. The roof vent moves, water spray follows the pump, grow lights illuminate, and plant size and leaf condition follow GROWTH and HEALTH.',
    'Правильна схема тримає вологість у заданому діапазоні та придатну для росту температуру. Кватирка рухається, полив відповідає насосу, лампи світять, а розмір рослин і стан листя відповідають GROWTH та HEALTH.',
  ],
  pitfalls: [
    [
      'DRY and WET are different thresholds, so both are normally 0 inside the middle band. Use a latch to remember whether irrigation is filling that band. Alarm history persists until RESET even when plant health recovers.',
      'DRY та WET мають різні пороги, тому всередині діапазону обидва зазвичай 0. Защіпка запам’ятовує, чи триває наповнення. Історія тривоги лишається до RESET навіть після відновлення здоров’я.',
    ],
  ],
  inputs: {
    heater: ['HEATER: 1 warms the greenhouse air.', 'HEATER: 1 нагріває повітря теплиці.'],
    vent: [
      'VENT: 1 opens ventilation and cools air; it also increases drying.',
      'VENT: 1 відкриває вентиляцію та охолоджує; також посилює висихання.',
    ],
    pump: ['PUMP: 1 continuously irrigates the soil.', 'PUMP: 1 безперервно поливає ґрунт.'],
    grow_light: [
      'GROW LIGHT: 1 supplies artificial light when daylight is absent.',
      'GROW LIGHT: 1 додає штучне світло за відсутності денного.',
    ],
    run: [
      'RUN: 1 advances climate and plant life, 0 pauses; defaults high.',
      'RUN: 1 рухає клімат і життя рослин, 0 призупиняє; типово 1.',
    ],
    reset: [
      'RESET: 1 restores initial temperature, moisture, growth and health.',
      'RESET: 1 відновлює початкові температуру, вологість, ріст і здоров’я.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 18 °C; request heating.', 'COLD: 1 нижче 18 °C; запит нагрівання.'],
    hot: ['HOT: 1 above 28 °C; request ventilation.', 'HOT: 1 вище 28 °C; запит вентиляції.'],
    dry: ['DRY: 1 below 35% soil moisture.', 'DRY: 1 при вологості ґрунту нижче 35%.'],
    wet: ['WET: 1 above 75% soil moisture.', 'WET: 1 при вологості ґрунту вище 75%.'],
    dark: ['DARK: 1 during the night half of dayLength.', 'DARK: 1 у нічній половині dayLength.'],
    day: ['DAY: 1 during the daylight half of dayLength.', 'DAY: 1 у денній половині dayLength.'],
    alarm: [
      'ALARM: latched record of plant health falling below 60%.',
      'ALARM: запам’ятоване падіння здоров’я рослин нижче 60%.',
    ],
    temperature: [
      'TEMP: measured greenhouse air temperature in °C.',
      'TEMP: виміряна температура повітря теплиці у °C.',
    ],
    moisture: [
      'MOISTURE: soil moisture from 0 to 100%.',
      'MOISTURE: вологість ґрунту від 0 до 100%.',
    ],
    growth: [
      'GROWTH: accumulated plant growth from 0 to 100%.',
      'GROWTH: накопичений ріст рослин від 0 до 100%.',
    ],
    health: [
      'HEALTH: current plant health from 0 to 100%.',
      'HEALTH: поточне здоров’я рослин від 0 до 100%.',
    ],
  },
  examples: ['greenhouse-climate', 'greenhouse-irrigation'],
});

add('smart_home', {
  purpose: [
    'Automate a house and yard using logic for climate, occupancy lighting, authorized access and water-saving irrigation. The simulated environment supplies periodic daylight, visitors and rain.',
    'Автоматизуйте будинок і подвір’я логікою клімату, світла за присутністю, дозволеного доступу та ощадного поливу. Модельне довкілля дає періодичні день, відвідувачів і дощ.',
  ],
  steps: [
    [
      'Start with initialTemperature=20 °C, ambientTemperature=12 °C, initialWater=70% and dayLength=60 seconds. Observe the house, sliding gate, water tank and visitor in 3D.',
      'Почніть з initialTemperature=20 °C, ambientTemperature=12 °C, initialWater=70% та dayLength=60 секунд. У 3D спостерігайте будинок, відсувні ворота, бак і відвідувача.',
    ],
    [
      'Gate HEATER with COLD and FAN with HOT. Combine DARK AND MOTION for OUTDOOR LIGHT; an occupancy permission can also control INDOOR LIGHT.',
      'Дозволяйте HEATER за COLD, FAN за HOT. Поєднайте DARK І MOTION для OUTDOOR LIGHT; дозвіл присутності також може керувати INDOOR LIGHT.',
    ],
    [
      'Use MOTION AND authorization for GATE, and NOT authorization for ALARM ARM. Permit SPRINKLER only when NOT RAIN AND NOT TANK LOW. Compare ENERGY and WATER for guarded and unconditional operation.',
      'За MOTION І авторизацією керуйте GATE, за NOT авторизацією — ALARM ARM. Дозволяйте SPRINKLER лише за NOT RAIN І NOT TANK LOW. Порівняйте ENERGY та WATER за захищеної й постійної роботи.',
    ],
  ],
  experiment: [
    'Deny visitor authorization before a motion window and compare gate travel with the current alarm. Then start at initialWater=0 and deliberately bypass the irrigation guard to record a dry-pump fault; restore the level and reset.',
    'Забороніть доступ перед вікном руху та порівняйте переміщення воріт із поточною тривогою. Потім задайте initialWater=0 та навмисно обійдіть захист поливу для несправності сухого насоса; відновіть запас і скиньте.',
  ],
  expected: [
    'The sliding gate takes time to open; GATE OPEN confirms full travel. Rain replenishes the tank, guarded sprinklers stop during rain or low water, and ENERGY accumulates actual actuator use in kWh. Lighting and climate react to circuit outputs.',
    'Відкриття відсувних воріт потребує часу; GATE OPEN підтверджує повний хід. Дощ поповнює бак, захищений полив зупиняється за дощу чи браку води, ENERGY накопичує роботу механізмів у кВт·год. Світло й клімат реагують на схему.',
  ],
  pitfalls: [
    [
      'MOTION, RAIN and DARK are deterministic simulated sensors, not real camera or weather services. A security alarm clears when its current condition ends; a dry-pump fault is remembered until RESET. A gate command does not instantly mean GATE OPEN=1.',
      'MOTION, RAIN і DARK — визначені модельні датчики, не камера чи погодний сервіс. Охоронна тривога зникає з поточною умовою; сухий насос запам’ятовується до RESET. Команда воріт не означає миттєве GATE OPEN=1.',
    ],
  ],
  inputs: {
    heater: [
      'HEATER: 1 heats the home and consumes energy.',
      'HEATER: 1 гріє будинок та витрачає енергію.',
    ],
    fan: [
      'FAN: 1 cools the home and consumes energy.',
      'FAN: 1 охолоджує будинок та витрачає енергію.',
    ],
    indoor_light: [
      'INDOOR LIGHT: 1 turns on the house lamps.',
      'INDOOR LIGHT: 1 вмикає лампи в будинку.',
    ],
    outdoor_light: [
      'OUTDOOR LIGHT: 1 turns on the yard lamps.',
      'OUTDOOR LIGHT: 1 вмикає ліхтарі подвір’я.',
    ],
    gate: [
      'GATE: 1 opens the sliding gate, 0 closes it over time.',
      'GATE: 1 відкриває відсувні ворота, 0 поступово закриває.',
    ],
    sprinkler: [
      'SPRINKLER: 1 requests irrigation and draws from the finite water tank.',
      'SPRINKLER: 1 запитує полив та витрачає скінченний запас бака.',
    ],
    alarm_arm: [
      'ALARM ARM: 1 arms motion detection while the gate is not fully open.',
      'ALARM ARM: 1 вмикає виявлення руху, поки ворота не відкриті повністю.',
    ],
    run: [
      'RUN: 1 advances climate, weather and actuators; 0 pauses.',
      'RUN: 1 рухає клімат, погоду та механізми; 0 призупиняє.',
    ],
    reset: [
      'RESET: 1 restores initial water and temperature and clears energy and alarms.',
      'RESET: 1 відновлює початкові воду й температуру, очищає енергію та тривоги.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 19 °C, requesting heating.', 'COLD: 1 нижче 19 °C, запит нагрівання.'],
    hot: ['HOT: 1 above 25 °C, requesting the fan.', 'HOT: 1 вище 25 °C, запит вентилятора.'],
    dark: ['DARK: 1 during the night half of dayLength.', 'DARK: 1 у нічній половині dayLength.'],
    motion: [
      'MOTION: periodic simulated visitor requests during day and night.',
      'MOTION: періодичні модельні відвідувачі вдень і вночі.',
    ],
    rain: [
      'RAIN: periodic rainfall that replenishes the water tank.',
      'RAIN: періодичний дощ, що поповнює водяний бак.',
    ],
    tank_low: [
      'TANK LOW: 1 when the tank contains less than 15% water.',
      'TANK LOW: 1 при запасі води в баку нижче 15%.',
    ],
    gate_open: [
      'GATE OPEN: 1 only after the gate has completed its opening travel.',
      'GATE OPEN: 1 лише після завершення повного відкриття воріт.',
    ],
    alarm: [
      'ALARM: current armed motion alert or a latched empty-tank fault.',
      'ALARM: поточна охоронна тривога руху або запам’ятований порожній бак.',
    ],
    temperature: [
      'TEMP: measured indoor temperature in °C.',
      'TEMP: виміряна температура в будинку у °C.',
    ],
    water: [
      'WATER: available irrigation water from 0 to 100%.',
      'WATER: доступна для поливу вода від 0 до 100%.',
    ],
    energy: [
      'ENERGY: cumulative actuator electricity in kWh since reset.',
      'ENERGY: накопичена електроенергія механізмів у кВт·год від скидання.',
    ],
  },
  examples: ['home-climate', 'yard-security'],
});

export function getGuide(type, language = 'en') {
  return GUIDES[type]?.[language === 'ua' || language === 'uk' ? 'ua' : 'en'];
}

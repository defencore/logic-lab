export default {
  id: 'ram-addressing',
  label: 'RAM: address isolation and write protection',
  ua: 'ОЗП: незалежні адреси й захист запису',
  category: 'architecture',
  level: 'intermediate',
  description:
    'Write different bytes to two addresses, distinguish address selection from storage, and test CS, OE and WE independently.',
  descriptionUa:
    'Запишіть різні байти за двома адресами, відрізніть вибір адреси від зберігання та незалежно перевірте CS, OE і WE.',
  lesson: {
    en: {
      goal: 'Show that each RAM address retains its own byte and only a permitted rising edge writes.',
      steps: [
        {
          title: 'Read an unwritten location',
          text: 'The initial address is 2 and the input data is 42. CS=1 and OE=1 allow reading, WE=0 disables writes, and the RAM byte is 0. Changing data alone must not change the stored byte.',
          nodes: ['address', 'data', 'memory'],
        },
        {
          title: 'Write address 2',
          text: 'With CLK=0, set WE=1 and pulse CLK to 1, then back to 0. While WE=1 the read output is Z. Return WE to 0: address 2 now reads 42. A falling edge by itself does not write.',
          nodes: ['clock', 'write', 'memory'],
        },
        {
          title: 'Keep two independent bytes',
          text: 'Set Address=9 and Write data=165, then repeat the permitted write pulse. With WE=0, alternate addresses 2 and 9: expect 42 and 165. Address 3 remains 0. Record address bits A3…A0 beside each observed byte.',
          nodes: ['address', 'data', 'memory', 'bit0'],
        },
        {
          title: 'Test each control separately',
          text: 'With CS=0, attempt a write of 255 to address 2, then restore CS=1 and WE=0: it still contains 42. With OE=0 the output is Z but storage is retained; OE does not prohibit an otherwise valid write. Restore OE=1 and explain the distinction.',
          nodes: ['chip', 'read', 'write', 'clock', 'memory'],
        },
      ],
      expected:
        'Addresses 2 and 9 retain 42 and 165 independently. CS gates access, WE and a rising CLK permit writing, and OE controls output visibility only.',
    },
    ua: {
      goal: 'Покажіть, що кожна адреса ОЗП зберігає свій байт, а запис відбувається лише за дозволеним додатним фронтом.',
      steps: [
        {
          title: 'Прочитайте незаписану комірку',
          text: 'Початкова адреса — 2, вхідні дані — 42. CS=1 та OE=1 дозволяють читання, WE=0 забороняє запис, байт ОЗП дорівнює 0. Сама зміна даних не має змінювати збережений байт.',
          nodes: ['address', 'data', 'memory'],
        },
        {
          title: 'Запишіть адресу 2',
          text: 'При CLK=0 задайте WE=1 і перемкніть CLK у 1, а потім назад у 0. При WE=1 вихід читання має Z. Поверніть WE у 0: адреса 2 тепер містить 42. Сам спадний фронт не записує.',
          nodes: ['clock', 'write', 'memory'],
        },
        {
          title: 'Збережіть два незалежні байти',
          text: 'Задайте Address=9 та Write data=165 і повторіть дозволений імпульс запису. При WE=0 чергуйте адреси 2 і 9: очікуйте 42 та 165. Адреса 3 залишиться 0. Поруч зі спостереженим байтом записуйте біти адреси A3…A0.',
          nodes: ['address', 'data', 'memory', 'bit0'],
        },
        {
          title: 'Окремо перевірте керувальні входи',
          text: 'При CS=0 спробуйте записати 255 за адресою 2, потім поверніть CS=1 та WE=0: там залишиться 42. При OE=0 вихід має Z, але дані зберігаються; OE не забороняє інакше дозволений запис. Поверніть OE=1 і поясніть різницю.',
          nodes: ['chip', 'read', 'write', 'clock', 'memory'],
        },
      ],
      expected:
        'Адреси 2 та 9 незалежно зберігають 42 і 165. CS дозволяє доступ, WE разом із фронтом CLK — запис, а OE керує лише видимістю виходу.',
    },
  },
  circuitPath: 'examples/ram-addressing/circuit.json',
  labPath: 'examples/ram-addressing/README.md',
  lab: {
    duration: 35,
    objectives: {
      en: [
        'Decode four address bits as a location from 0 through 15.',
        'Separate storage, write permission and output-enable behavior.',
      ],
      ua: [
        'Зіставте чотири адресні біти з коміркою від 0 до 15.',
        'Розділіть зберігання, дозвіл запису та керування виходом.',
      ],
    },
    tasks: {
      en: [
        'The initial address is 2 and the input data is 42. CS=1 and OE=1 allow reading, WE=0 disables writes, and the RAM byte is 0. Changing data alone must not change the stored byte.',
        'With CLK=0, set WE=1 and pulse CLK to 1, then back to 0. While WE=1 the read output is Z. Return WE to 0: address 2 now reads 42. A falling edge by itself does not write.',
        'Set Address=9 and Write data=165, then repeat the permitted write pulse. With WE=0, alternate addresses 2 and 9: expect 42 and 165. Address 3 remains 0. Record address bits A3…A0 beside each observed byte.',
        'With CS=0, attempt a write of 255 to address 2, then restore CS=1 and WE=0: it still contains 42. With OE=0 the output is Z but storage is retained; OE does not prohibit an otherwise valid write. Restore OE=1 and explain the distinction.',
      ],
      ua: [
        'Початкова адреса — 2, вхідні дані — 42. CS=1 та OE=1 дозволяють читання, WE=0 забороняє запис, байт ОЗП дорівнює 0. Сама зміна даних не має змінювати збережений байт.',
        'При CLK=0 задайте WE=1 і перемкніть CLK у 1, а потім назад у 0. При WE=1 вихід читання має Z. Поверніть WE у 0: адреса 2 тепер містить 42. Сам спадний фронт не записує.',
        'Задайте Address=9 та Write data=165 і повторіть дозволений імпульс запису. При WE=0 чергуйте адреси 2 і 9: очікуйте 42 та 165. Адреса 3 залишиться 0. Поруч зі спостереженим байтом записуйте біти адреси A3…A0.',
        'При CS=0 спробуйте записати 255 за адресою 2, потім поверніть CS=1 та WE=0: там залишиться 42. При OE=0 вихід має Z, але дані зберігаються; OE не забороняє інакше дозволений запис. Поверніть OE=1 і поясніть різницю.',
      ],
    },
    questions: {
      en: [
        'Which three conditions permit a RAM write?',
        'Can OE=0 protect memory from being overwritten?',
        'Why do addresses 2 and 9 preserve different values?',
      ],
      ua: [
        'Які три умови дозволяють запис до ОЗП?',
        'Чи захищає OE=0 пам’ять від перезапису?',
        'Чому адреси 2 і 9 зберігають різні значення?',
      ],
    },
    deliverables: {
      en: [
        'Submit a recorded write/read experiment and your editable circuit.',
        'Include an address/data table and separate evidence for CS, OE and WE tests.',
      ],
      ua: [
        'Здайте запис досліду запису/читання та власну редаговану схему.',
        'Додайте таблицю адрес/даних і окремі результати перевірок CS, OE та WE.',
      ],
    },
  },
  actionPreset: [
    {
      at: 0.1,
      node: 'write',
      key: 'value',
      value: 1,
    },
    {
      at: 0.2,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.3,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 0.4,
      node: 'write',
      key: 'value',
      value: 0,
    },
    {
      at: 0.5,
      node: 'address',
      key: 'value',
      value: 9,
    },
    {
      at: 0.6,
      node: 'data',
      key: 'value',
      value: 165,
    },
    {
      at: 0.7,
      node: 'write',
      key: 'value',
      value: 1,
    },
    {
      at: 0.8,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.9,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1,
      node: 'write',
      key: 'value',
      value: 0,
    },
    {
      at: 1.1,
      node: 'address',
      key: 'value',
      value: 2,
    },
    {
      at: 1.2,
      node: 'address',
      key: 'value',
      value: 9,
    },
  ],
  actionProbes: [
    {
      node: 'memory',
      port: 'out',
      side: 'outputs',
    },
  ],
};

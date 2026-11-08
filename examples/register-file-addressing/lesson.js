export default {
  id: 'register-file-addressing',
  label: 'Register file: independent read and write addresses',
  ua: 'Регістровий файл: незалежні адреси читання й запису',
  category: 'architecture',
  level: 'intermediate',
  description:
    'Write one register while reading another, then verify both values and the distinct RA and WA signal groups.',
  descriptionUa:
    'Записуйте один регістр, одночасно читаючи інший, і перевірте обидва значення та незалежні групи сигналів RA й WA.',
  lesson: {
    en: {
      goal: 'Demonstrate independent read selection and edge-triggered write selection in an eight-register file.',
      steps: [
        {
          title: 'Identify two address ports',
          text: 'Initially RA=2, WA=5 and Write data=85. Both registers are empty, so the output is 0. Trace RA0–RA2 to the read port and WA0–WA2 to the write port: changing one address does not change the other.',
          nodes: ['read-address', 'write-address', 'registers'],
        },
        {
          title: 'Write without changing the read address',
          text: 'With CLK=0, set WE=1 and pulse CLK 0→1→0, then return WE to 0. Register 5 now contains 85, but RA still selects register 2 and the visible output remains 0. Set RA=5 to read back 85.',
          nodes: ['clock', 'write', 'read-address', 'registers'],
        },
        {
          title: 'Update another register in parallel',
          text: 'Keep RA=5, change WA=2 and data=170, and perform another enabled write pulse. The visible output stays 85 while register 2 is updated. Then alternate RA=2 and RA=5: expect 170 and 85.',
          nodes: ['data', 'write-address', 'read-address', 'registers'],
        },
        {
          title: 'Test disabled writes and address width',
          text: 'With WE=0, change data and give CLK a complete pulse: no register changes. Set RA=13; only three address bits are wired, so it selects register 5 (13 modulo 8). Explain why the byte source can display 13 while the actual address port carries 5.',
          nodes: ['write', 'clock', 'read-address', 'registers'],
        },
      ],
      expected:
        'Writing register 5 does not change a simultaneous read of register 2. Registers 2 and 5 retain 170 and 85; RA and WA independently use their lowest three bits.',
    },
    ua: {
      goal: 'Продемонструйте незалежний вибір читання та запису за фронтом у файлі з восьми регістрів.',
      steps: [
        {
          title: 'Розрізніть два адресні порти',
          text: 'Спочатку RA=2, WA=5 та Write data=85. Обидва регістри порожні, тому вихід дорівнює 0. Простежте RA0–RA2 до порту читання та WA0–WA2 до порту запису: зміна однієї адреси не змінює іншу.',
          nodes: ['read-address', 'write-address', 'registers'],
        },
        {
          title: 'Запишіть без зміни адреси читання',
          text: 'При CLK=0 задайте WE=1, зробіть імпульс CLK 0→1→0 і поверніть WE у 0. Регістр 5 містить 85, але RA все ще обирає регістр 2 і видимий вихід залишається 0. Задайте RA=5, щоб прочитати 85.',
          nodes: ['clock', 'write', 'read-address', 'registers'],
        },
        {
          title: 'Оновіть інший регістр паралельно',
          text: 'Залиште RA=5, задайте WA=2 та data=170 і виконайте ще один дозволений імпульс запису. Видимий вихід залишається 85, поки оновлюється регістр 2. Потім чергуйте RA=2 та RA=5: очікуйте 170 і 85.',
          nodes: ['data', 'write-address', 'read-address', 'registers'],
        },
        {
          title: 'Перевірте заборону запису й ширину адреси',
          text: 'При WE=0 змініть дані та дайте повний імпульс CLK: регістри не зміняться. Задайте RA=13; підключені лише три адресні біти, тому вибирається регістр 5 (13 за модулем 8). Поясніть, чому джерело показує 13, а адресний порт несе 5.',
          nodes: ['write', 'clock', 'read-address', 'registers'],
        },
      ],
      expected:
        'Запис до регістра 5 не змінює одночасне читання регістра 2. Регістри 2 та 5 зберігають 170 і 85; RA та WA незалежно використовують три молодші біти.',
    },
  },
  circuitPath: 'examples/register-file-addressing/circuit.json',
  labPath: 'examples/register-file-addressing/README.md',
  lab: {
    duration: 35,
    objectives: {
      en: [
        'Distinguish read address, write address and write data.',
        'Verify independent register retention and three-bit address aliasing.',
      ],
      ua: [
        'Розрізніть адресу читання, адресу запису та дані запису.',
        'Перевірте незалежне зберігання регістрів і збіг адрес через трибітну ширину.',
      ],
    },
    tasks: {
      en: [
        'Initially RA=2, WA=5 and Write data=85. Both registers are empty, so the output is 0. Trace RA0–RA2 to the read port and WA0–WA2 to the write port: changing one address does not change the other.',
        'With CLK=0, set WE=1 and pulse CLK 0→1→0, then return WE to 0. Register 5 now contains 85, but RA still selects register 2 and the visible output remains 0. Set RA=5 to read back 85.',
        'Keep RA=5, change WA=2 and data=170, and perform another enabled write pulse. The visible output stays 85 while register 2 is updated. Then alternate RA=2 and RA=5: expect 170 and 85.',
        'With WE=0, change data and give CLK a complete pulse: no register changes. Set RA=13; only three address bits are wired, so it selects register 5 (13 modulo 8). Explain why the byte source can display 13 while the actual address port carries 5.',
      ],
      ua: [
        'Спочатку RA=2, WA=5 та Write data=85. Обидва регістри порожні, тому вихід дорівнює 0. Простежте RA0–RA2 до порту читання та WA0–WA2 до порту запису: зміна однієї адреси не змінює іншу.',
        'При CLK=0 задайте WE=1, зробіть імпульс CLK 0→1→0 і поверніть WE у 0. Регістр 5 містить 85, але RA все ще обирає регістр 2 і видимий вихід залишається 0. Задайте RA=5, щоб прочитати 85.',
        'Залиште RA=5, задайте WA=2 та data=170 і виконайте ще один дозволений імпульс запису. Видимий вихід залишається 85, поки оновлюється регістр 2. Потім чергуйте RA=2 та RA=5: очікуйте 170 і 85.',
        'При WE=0 змініть дані та дайте повний імпульс CLK: регістри не зміняться. Задайте RA=13; підключені лише три адресні біти, тому вибирається регістр 5 (13 за модулем 8). Поясніть, чому джерело показує 13, а адресний порт несе 5.',
      ],
    },
    questions: {
      en: [
        'Why does the output stay 0 after the first write to register 5?',
        'What changes when RA and WA select the same register?',
        'Why do address-source values 5 and 13 select the same register?',
      ],
      ua: [
        'Чому після першого запису до регістра 5 вихід залишається 0?',
        'Що змінюється, коли RA та WA обирають один регістр?',
        'Чому значення джерела адреси 5 та 13 обирають той самий регістр?',
      ],
    },
    deliverables: {
      en: [
        'Submit a sequence that writes two registers while observing the other address.',
        'Include a table of RA, WA, WE, CLK, data and read output with your predictions.',
      ],
      ua: [
        'Здайте послідовність запису двох регістрів зі спостереженням іншої адреси.',
        'Додайте таблицю RA, WA, WE, CLK, даних і виходу читання з власними прогнозами.',
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
      node: 'read-address',
      key: 'value',
      value: 5,
    },
    {
      at: 0.6,
      node: 'write-address',
      key: 'value',
      value: 2,
    },
    {
      at: 0.7,
      node: 'data',
      key: 'value',
      value: 170,
    },
    {
      at: 0.8,
      node: 'write',
      key: 'value',
      value: 1,
    },
    {
      at: 0.9,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 1,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1.1,
      node: 'write',
      key: 'value',
      value: 0,
    },
    {
      at: 1.2,
      node: 'read-address',
      key: 'value',
      value: 2,
    },
  ],
  actionProbes: [
    {
      node: 'registers',
      port: 'out',
      side: 'outputs',
    },
  ],
};

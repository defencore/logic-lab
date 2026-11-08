export default {
  id: 'ram',
  label: 'Read & write memory',
  ua: 'Читання й запис пам’яті',
  category: 'architecture',
  level: 'intermediate',
  description: 'Write a byte on a clock edge, change address, and compare RAM, ROM and registers.',
  descriptionUa:
    'Запишіть байт за фронтом такту, змініть адресу й порівняйте ОЗП, ПЗП та регістри.',
  lesson: {
    en: {
      goal: 'Understand address, data and the controls that permit a memory write.',
      steps: [
        {
          title: 'Inspect the starting address',
          text: 'Address=2 and Write data=42. RAM and Register file initially read 0; the fixed ROM reads 20. Read the complete bytes on the memory components; each scope traces only output bit 0.',
          nodes: ['address', 'data', 'ram', 'rom', 'registers'],
        },
        {
          title: 'Write one byte',
          text: 'Turn Write enable on, then switch Write clock from 0 to 1. This writes 42 into RAM and the register file. RAM output is Z while Write enable=1. Turn Write enable off to read back 42.',
          nodes: ['write', 'clock', 'ram', 'registers'],
        },
        {
          title: 'Visit another address',
          text: 'Set Address Value to 3: RAM/registers read 0 and ROM reads 30. Set it back to 2: RAM/registers still contain 42. Register addresses use only the lowest three bits (0–7).',
          nodes: ['address', 'ram-view', 'rom-view', 'reg-view'],
        },
        {
          title: 'Release the outputs',
          text: 'Output enable=0 releases RAM and ROM to Z; Chip select=0 disables them. These controls do not gate the register file. Return both to 1. Before another write, return Write clock to 0.',
          nodes: ['chip', 'read', 'clock'],
        },
      ],
      expected:
        'Memory changes only on a permitted rising write edge. Changing data or address alone does not write a byte.',
    },
    ua: {
      goal: 'Зрозумійте адресу, дані та керування записом пам’яті.',
      steps: [
        {
          title: 'Перевірте початкову адресу',
          text: 'Address=2, Write data=42. RAM та Register file спочатку читають 0; постійна ROM читає 20. Цілі байти читайте на компонентах пам’яті; кожен осцилограф відстежує лише вихідний біт 0.',
          nodes: ['address', 'data', 'ram', 'rom', 'registers'],
        },
        {
          title: 'Запишіть байт',
          text: 'Увімкніть Write enable, а потім перемкніть Write clock з 0 в 1. У RAM і регістровий файл запишеться 42. При Write enable=1 вихід RAM має Z. Вимкніть Write enable і прочитайте 42.',
          nodes: ['write', 'clock', 'ram', 'registers'],
        },
        {
          title: 'Перейдіть за іншою адресою',
          text: 'Задайте Address=3: RAM/регістри покажуть 0, ROM — 30. Поверніть 2: RAM/регістри зберегли 42. Регістри використовують лише три молодші біти адреси (0–7).',
          nodes: ['address', 'ram-view', 'rom-view', 'reg-view'],
        },
        {
          title: 'Відпустіть виходи',
          text: 'Output enable=0 переводить RAM і ROM у Z; Chip select=0 вимикає їх. На регістровий файл ці входи не впливають. Поверніть обидва в 1. Перед новим записом поверніть Write clock в 0.',
          nodes: ['chip', 'read', 'clock'],
        },
      ],
      expected:
        'Пам’ять змінюється лише за дозволеним додатним фронтом запису. Сама зміна даних чи адреси не записує байт.',
    },
  },
  circuitPath: 'examples/ram/circuit.json',
  labPath: 'examples/ram/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Understand address, data and the controls that permit a memory write.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Зрозумійте адресу, дані та керування записом пам’яті.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Address=2 and Write data=42. RAM and Register file initially read 0; the fixed ROM reads 20. Read the complete bytes on the memory components; each scope traces only output bit 0.',
        'Turn Write enable on, then switch Write clock from 0 to 1. This writes 42 into RAM and the register file. RAM output is Z while Write enable=1. Turn Write enable off to read back 42.',
        'Set Address Value to 3: RAM/registers read 0 and ROM reads 30. Set it back to 2: RAM/registers still contain 42. Register addresses use only the lowest three bits (0–7).',
        'Output enable=0 releases RAM and ROM to Z; Chip select=0 disables them. These controls do not gate the register file. Return both to 1. Before another write, return Write clock to 0.',
      ],
      ua: [
        'Address=2, Write data=42. RAM та Register file спочатку читають 0; постійна ROM читає 20. Цілі байти читайте на компонентах пам’яті; кожен осцилограф відстежує лише вихідний біт 0.',
        'Увімкніть Write enable, а потім перемкніть Write clock з 0 в 1. У RAM і регістровий файл запишеться 42. При Write enable=1 вихід RAM має Z. Вимкніть Write enable і прочитайте 42.',
        'Задайте Address=3: RAM/регістри покажуть 0, ROM — 30. Поверніть 2: RAM/регістри зберегли 42. Регістри використовують лише три молодші біти адреси (0–7).',
        'Output enable=0 переводить RAM і ROM у Z; Chip select=0 вимикає їх. На регістровий файл ці входи не впливають. Поверніть обидва в 1. Перед новим записом поверніть Write clock в 0.',
      ],
    },
    questions: {
      en: [
        'Which signals must be active when a rising edge writes RAM?',
        'Why can RAM output Z while its stored byte remains unchanged?',
        'How does the register-file address range differ from RAM?',
      ],
      ua: [
        'Які сигнали мають бути активними для запису ОЗП за фронтом?',
        'Чому вихід ОЗП може мати Z, хоча байт збережений?',
        'Чим діапазон адрес регістрового файлу відрізняється від ОЗП?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A write/read log for addresses 2 and 3 comparing RAM, ROM and register-file outputs.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Журнал запису й читання адрес 2 та 3 з порівнянням ОЗП, ПЗП і регістрового файлу.',
      ],
    },
  },
};

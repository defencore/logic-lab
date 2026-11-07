export default {
  id: 'alu',
  label: 'Arithmetic & logic unit',
  ua: 'Арифметико-логічний пристрій',
  category: 'architecture',
  level: 'intermediate',
  description: 'Choose addition, subtraction, logic or shifts and inspect result flags.',
  descriptionUa: 'Оберіть додавання, віднімання, логіку чи зсуви й перевірте прапорці.',
  lesson: {
    en: {
      goal: 'Use an operation code to select what the same hardware computes.',
      steps: [
        {
          title: 'Add 5 and 3',
          text: 'Operation Value=0 selects addition. Select the ALU: result Y is 8, Carry=0 and Zero=0. A scope input also shows the decimal result.',
          nodes: ['a', 'b', 'op', 'alu', 'result'],
        },
        {
          title: 'Choose a logic operation',
          text: 'Set Operation Value to 2 for bitwise AND: 5 AND 3 = 1. Set it to 4 for XOR: result 6. Value 1 subtracts B from A, giving 2.',
          nodes: ['op', 'alu'],
        },
        {
          title: 'Cause an overflow',
          text: 'Set A Value=255, B Value=1 and Operation Value=0. The eight-bit result wraps to 0; both Carry and Zero light up.',
          nodes: ['a', 'b', 'op', 'carry', 'zero'],
        },
      ],
      expected:
        'Operation codes: 0 add, 1 subtract, 2 AND, 3 OR, 4 XOR, 5 left shift, 6 right shift, 7 NOT A.',
    },
    ua: {
      goal: 'Керуйте обчисленням одного пристрою за допомогою коду операції.',
      steps: [
        {
          title: 'Додайте 5 і 3',
          text: 'Значення Operation=0 обирає додавання. Оберіть ALU: Y=8, Carry=0, Zero=0. Вхід осцилографа теж показує десятковий результат.',
          nodes: ['a', 'b', 'op', 'alu', 'result'],
        },
        {
          title: 'Оберіть логічну операцію',
          text: 'Задайте Operation=2 для побітового AND: 5 AND 3 = 1. Код 4 обирає XOR і дає 6. Код 1 віднімає B від A та дає 2.',
          nodes: ['op', 'alu'],
        },
        {
          title: 'Створіть переповнення',
          text: 'Задайте A=255, B=1, Operation=0. Восьмибітний результат повернеться до 0; Carry та Zero засвітяться.',
          nodes: ['a', 'b', 'op', 'carry', 'zero'],
        },
      ],
      expected:
        'Коди: 0 додавання, 1 віднімання, 2 AND, 3 OR, 4 XOR, 5 зсув вліво, 6 вправо, 7 NOT A.',
    },
  },
  circuitPath: 'examples/alu/circuit.json',
  labPath: 'examples/alu/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Use an operation code to select what the same hardware computes.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Керуйте обчисленням одного пристрою за допомогою коду операції.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Operation Value=0 selects addition. Select the ALU: result Y is 8, Carry=0 and Zero=0. A scope input also shows the decimal result.',
        'Set Operation Value to 2 for bitwise AND: 5 AND 3 = 1. Set it to 4 for XOR: result 6. Value 1 subtracts B from A, giving 2.',
        'Set A Value=255, B Value=1 and Operation Value=0. The eight-bit result wraps to 0; both Carry and Zero light up.',
      ],
      ua: [
        'Значення Operation=0 обирає додавання. Оберіть ALU: Y=8, Carry=0, Zero=0. Вхід осцилографа теж показує десятковий результат.',
        'Задайте Operation=2 для побітового AND: 5 AND 3 = 1. Код 4 обирає XOR і дає 6. Код 1 віднімає B від A та дає 2.',
        'Задайте A=255, B=1, Operation=0. Восьмибітний результат повернеться до 0; Carry та Zero засвітяться.',
      ],
    },
    questions: {
      en: [
        'Why does 255 + 1 produce result 0?',
        'How do Carry and Zero describe different properties of that result?',
        'How does bitwise AND differ from addition?',
      ],
      ua: [
        'Чому 255 + 1 дає результат 0?',
        'Які різні властивості результату описують Carry та Zero?',
        'Чим побітове AND відрізняється від додавання?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A table of the prescribed addition, AND, XOR, subtraction and overflow results with flags.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця результатів додавання, AND, XOR, віднімання та переповнення з прапорцями.',
      ],
    },
  },
};

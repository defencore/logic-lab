// Each text pair contains English first and Ukrainian second.
export default {
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
};

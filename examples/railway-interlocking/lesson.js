export default {
  id: 'railway-interlocking',
  label: 'Railway block interlocking',
  ua: 'Блокування залізничної ділянки',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Grant one train the shared track, retain turnout position while occupied and close the crossing before trains enter.',
  descriptionUa:
    'Надавайте спільну колію одному поїзду, утримуйте стрілку при зайнятості й закривайте переїзд.',
  lesson: {
    en: {
      goal: 'Grant one train the shared track, retain turnout position while occupied and close the crossing before trains enter.',
      steps: [
        {
          title: 'Follow automatic dispatch',
          text: 'Open the railway scene in 3D. At Throttle=30 km/h the approach and occupied sensors admit one train at a time, with A priority when both request. The SR latch remembers the selected points route while a train occupies the block. The barrier closes for an approach or occupied track.',
          nodes: ['railway', 'admit-a', 'admit-b', 'points', 'barrier'],
        },
        {
          title: 'Observe a collision',
          text: 'Leave Force barrier open=0 and Throttle=30. Pulse Reset railway, then turn Unsafe both-signals override on. Both trains enter the single track from opposite ends and collide. The fault lamp stays on and involved trains stop. Disable the override before resetting.',
          nodes: ['unsafe', 'reset', 'railway', 'fault'],
        },
        {
          title: 'Test overspeed separately',
          text: 'After a clean reset with both overrides off, set Throttle Value=120. It is an actual km/h command, not a percentage. Exceeding speedLimit=60 latches an overspeed fault; entering the turnout too fast can derail a train. Restore 30 before resetting.',
          nodes: ['throttle', 'reset', 'railway'],
        },
        {
          title: 'Open the crossing unsafely',
          text: 'At safe speed and with the signal override off, turn Force barrier open on. The physical barrier stays raised despite the approach logic; a train reaching the crossing latches an open-barrier fault. Restore the barrier and reset to clear the fault record. Never change points while the block is occupied.',
          nodes: ['open', 'barrier', 'railway', 'reset'],
        },
      ],
      expected:
        'Interlocked dispatch moves trains safely and increments Passed. Collision, overspeed, an open crossing or moving occupied points produce visible latched faults.',
    },
    ua: {
      goal: 'Надавайте спільну колію одному поїзду, утримуйте стрілку при зайнятості й закривайте переїзд.',
      steps: [
        {
          title: 'Простежте автоматичний пропуск',
          text: 'Відкрийте залізницю в 3D. При Throttle=30 км/год датчики наближення й зайнятості пропускають один поїзд; за двох запитів A має пріоритет. SR-защіпка утримує маршрут стрілки при зайнятості. Шлагбаум закривається при наближенні або зайнятій колії.',
          nodes: ['railway', 'admit-a', 'admit-b', 'points', 'barrier'],
        },
        {
          title: 'Спостерігайте зіткнення',
          text: 'Залиште Force barrier open=0 і Throttle=30. Подайте імпульс Reset railway, потім увімкніть Unsafe both-signals override. Поїзди зайдуть на одну колію з різних боків і зіткнуться. Fault залишиться активним, поїзди зупиняться. Перед скиданням вимкніть override.',
          nodes: ['unsafe', 'reset', 'railway', 'fault'],
        },
        {
          title: 'Окремо перевірте швидкість',
          text: 'Після чистого скидання з вимкненими override задайте Throttle=120. Це команда в км/год, не відсоток. Перевищення speedLimit=60 запам’ятовує несправність; надто швидкий вхід на стрілку може спричинити сходження. Поверніть 30 перед скиданням.',
          nodes: ['throttle', 'reset', 'railway'],
        },
        {
          title: 'Небезпечно відкрийте переїзд',
          text: 'За правильної швидкості й вимкненого override сигналів увімкніть Force barrier open. Шлагбаум залишиться піднятим попри логіку; поїзд на переїзді запам’ятає несправність відкритого переїзду. Відновіть шлагбаум і скиньте запис. Не змінюйте стрілку під поїздом.',
          nodes: ['open', 'barrier', 'railway', 'reset'],
        },
      ],
      expected:
        'Блокований пропуск безпечно рухає поїзди й збільшує Passed. Зіткнення, швидкість, відкритий переїзд або рух стрілки під поїздом запам’ятовують несправність.',
    },
  },
  circuitPath: 'examples/railway-interlocking/circuit.json',
  labPath: 'examples/railway-interlocking/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Grant one train the shared track, retain turnout position while occupied and close the crossing before trains enter.',
        'Relate visible 3D behavior to the actual circuit signals and feedback.',
      ],
      ua: [
        'Надавайте спільну колію одному поїзду, утримуйте стрілку при зайнятості й закривайте переїзд.',
        'Пов’яжіть видиму 3D-поведінку з реальними сигналами й зворотним зв’язком.',
      ],
    },
    tasks: {
      en: [
        'Open the railway scene in 3D. At Throttle=30 km/h the approach and occupied sensors admit one train at a time, with A priority when both request. The SR latch remembers the selected points route while a train occupies the block. The barrier closes for an approach or occupied track.',
        'Leave Force barrier open=0 and Throttle=30. Pulse Reset railway, then turn Unsafe both-signals override on. Both trains enter the single track from opposite ends and collide. The fault lamp stays on and involved trains stop. Disable the override before resetting.',
        'After a clean reset with both overrides off, set Throttle Value=120. It is an actual km/h command, not a percentage. Exceeding speedLimit=60 latches an overspeed fault; entering the turnout too fast can derail a train. Restore 30 before resetting.',
        'At safe speed and with the signal override off, turn Force barrier open on. The physical barrier stays raised despite the approach logic; a train reaching the crossing latches an open-barrier fault. Restore the barrier and reset to clear the fault record. Never change points while the block is occupied.',
      ],
      ua: [
        'Відкрийте залізницю в 3D. При Throttle=30 км/год датчики наближення й зайнятості пропускають один поїзд; за двох запитів A має пріоритет. SR-защіпка утримує маршрут стрілки при зайнятості. Шлагбаум закривається при наближенні або зайнятій колії.',
        'Залиште Force barrier open=0 і Throttle=30. Подайте імпульс Reset railway, потім увімкніть Unsafe both-signals override. Поїзди зайдуть на одну колію з різних боків і зіткнуться. Fault залишиться активним, поїзди зупиняться. Перед скиданням вимкніть override.',
        'Після чистого скидання з вимкненими override задайте Throttle=120. Це команда в км/год, не відсоток. Перевищення speedLimit=60 запам’ятовує несправність; надто швидкий вхід на стрілку може спричинити сходження. Поверніть 30 перед скиданням.',
        'За правильної швидкості й вимкненого override сигналів увімкніть Force barrier open. Шлагбаум залишиться піднятим попри логіку; поїзд на переїзді запам’ятає несправність відкритого переїзду. Відновіть шлагбаум і скиньте запис. Не змінюйте стрілку під поїздом.',
      ],
    },
    questions: {
      en: [
        'Why must points retain their route after the approach request disappears?',
        'What prevents simultaneous admission when both approaches request?',
        'How do collision and other fault latches differ from a current sensor level?',
      ],
      ua: [
        'Чому стрілка має зберігати маршрут після зникнення запиту наближення?',
        'Що запобігає одночасному дозволу двом поїздам?',
        'Чим запам’ятована несправність відрізняється від поточного датчика?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project with the tested control circuit.',
        'A dispatch/occupancy trace plus separate collision, overspeed and open-barrier fault observations after clean resets.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою керування.',
        'Графік дозволів і зайнятості та окремі спостереження зіткнення, швидкості й відкритого переїзду після чистих скидань.',
      ],
    },
  },
};

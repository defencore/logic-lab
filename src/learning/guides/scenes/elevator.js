import { FLOORS } from '../../../scenes/models/elevator/config.js';

export default {
  purpose: [
    'The nine-floor elevator is a physical plant: digital commands move its cabin and doors, while floor and door sensors return feedback. All request memory and dispatch must be built outside it.',
    'Дев’ятиповерховий ліфт — фізична установка: цифрові команди рухають кабіну й двері, а датчики поверхів і дверей повертають зворотний зв’язок. Пам’ять заявок та диспетчеризацію потрібно побудувати зовні.',
  ],
  steps: [
    [
      'Place the elevator and connect switches to UP, DOWN, OPEN and CLOSE for a manual trial. Unwired commands default to 0, RUN to 1 and RST to 0.',
      'Розмістіть ліфт і підключіть перемикачі до UP, DOWN, OPEN та CLOSE для ручного досліду. Непідключені команди типово мають 0, RUN — 1, RST — 0.',
    ],
    [
      'Choose initialFloor (integer 1–9), initialDoor (0 closed to 1 open), travelSpeed (>0 to 4 floors/s) and doorSpeed (>0 to 10 opening fractions/s). Defaults are 1, 0, 0.5 and 1. These are physical configuration, not source actions.',
      'Задайте initialFloor (ціле 1–9), initialDoor (від 0 — зачинено до 1 — відкрито), travelSpeed (>0 до 4 поверхів/с) та doorSpeed (>0 до 10 часток відкривання/с). Типово це 1, 0, 0.5 та 1. Це фізична конфігурація, а не дії джерел.',
    ],
    [
      'Close the doors fully, set UP=1 and inspect POSITION in floor units. Return UP=0 near F2, then use OPEN=1. Floor sensors indicate alignment within ±0.015 floor; neither a floor sensor nor a request automatically stops the cabin.',
      'Повністю зачиніть двері, задайте UP=1 та спостерігайте POSITION в одиницях поверху. Біля F2 поверніть UP=0, потім задайте OPEN=1. Датчики показують вирівнювання в межах ±0.015 поверху; датчик поверху або заявка самі не зупиняють кабіну.',
    ],
    [
      'Build a visible door_closed AND movement_request interlock, an external monostable for opening/dwell, and SR memories for released call buttons. Open the Elevator example to inspect a complete gate-based controller and its 3D feedback.',
      'Побудуйте видиме блокування door_closed AND movement_request, зовнішній одновібратор відкривання/витримки й SR-пам’яті відпущених викликів. Відкрийте приклад ліфта з повним контролером на вентилях і його 3D-відгуком.',
    ],
  ],
  experiment: [
    'Press and release call buttons for floors 9 and 3 in the example and predict the lowest-floor priority. During a separate trial bypass the visible door interlock with UNSAFE UP while doors are open, then remove the bypass and reset.',
    'Натисніть і відпустіть кнопки виклику поверхів 9 та 3 у прикладі й передбачте пріоритет нижчого поверху. Окремо обійдіть видиме блокування через UNSAFE UP при відкритих дверях, потім приберіть обхід і скиньте схему.',
  ],
  expected: [
    'External request latches retain released calls and external gates determine service order. The timed controller stops in the alignment zone, opens, holds and closes before moving. Unsafe command combinations latch FAULT and freeze the plant until RST.',
    'Зовнішні защіпки зберігають відпущені виклики, а зовнішні вентилі визначають порядок. Часовий контролер зупиняється в зоні вирівнювання, відкриває, утримує й зачиняє двері перед рухом. Небезпечні команди фіксують FAULT і зупиняють установку до RST.',
  ],
  pitfalls: [
    [
      'UP and DOWN together, OPEN and CLOSE together, drive with an open/opening door, or OPEN between floor zones are faults. The physical fault stop is visible protection, not a hidden dispatcher or a replacement for your logic.',
      'Одночасні UP і DOWN, OPEN і CLOSE, рух із відкритими дверима або командою відкривання та OPEN між зонами поверхів є аваріями. Фізична аварійна зупинка — видимий захист, а не прихований диспетчер чи заміна вашої логіки.',
    ],
    [
      'Release call buttons after a short press. A held request can be captured again after its reset pulse ends. Gate each SR set with NOT reset so S and R cannot become 1 together.',
      'Відпускайте кнопки викликів після короткого натискання. Утримуваний виклик може записатися знову після завершення скидання. Дозволяйте S кожної SR-защіпки лише через NOT reset, щоб S і R не ставали 1 одночасно.',
    ],
    [
      'The door pulse must last longer than 1/doorSpeed to include a fully-open dwell. RUN=0 freezes this plant; ordinary external clocks and one-shots still follow simulation time. Global Pause pauses both.',
      'Імпульс дверей має бути довшим за 1/doorSpeed, щоб залишити витримку повністю відкритих дверей. RUN=0 зупиняє цю установку; зовнішні генератори й одновібратори продовжують модельний час. Загальна пауза зупиняє обидва.',
    ],
    [
      'X commands freeze motion and expose uncertain MOVING/FAULT while physical measurements remain known. Z uses documented input defaults. A disabled component releases outputs to Z. Apply a known RST=1 to restore its configured initial state.',
      'Команди X зупиняють рух і дають невизначені MOVING/FAULT, а фізичні вимірювання залишаються відомими. Z використовує задокументовані типові входи. Вимкнений елемент відпускає виходи в Z. Визначений RST=1 відновлює налаштований початковий стан.',
    ],
  ],
  inputs: {
    up: [
      'UP: travel upward while doors are fully closed; do not combine with DOWN or OPEN.',
      'UP: рух угору лише при повністю зачинених дверях; не поєднуйте з DOWN або OPEN.',
    ],
    down: [
      'DOWN: travel downward while doors are fully closed; do not combine with UP or OPEN.',
      'DOWN: рух униз лише при повністю зачинених дверях; не поєднуйте з UP або OPEN.',
    ],
    open: [
      'OPEN: open the doors only while aligned with any floor from 1 to 9; 0 holds their current opening.',
      'OPEN: відкривання лише в зоні будь-якого поверху від 1 до 9; 0 утримує поточне відкривання.',
    ],
    close: [
      'CLOSE: close the doors at doorSpeed; do not combine with OPEN.',
      'CLOSE: зачинення зі швидкістю doorSpeed; не поєднуйте з OPEN.',
    ],
    run: [
      'RUN: 1 permits physical evolution, 0 holds the cabin and door positions.',
      'RUN: 1 дозволяє фізичну зміну, 0 утримує положення кабіни та дверей.',
    ],
    reset: [
      'RST: active-high recovery to initialFloor/initialDoor, clearing the latched plant fault.',
      'RST: активне високим рівнем повернення до initialFloor/initialDoor зі скиданням аварії установки.',
    ],
  },
  outputs: {
    ...Object.fromEntries(
      FLOORS.map((floor) => [
        `floor${floor}`,
        [
          `F${floor}: one independent digital contact, high within ±0.015 of floor ${floor}.`,
          `F${floor}: окремий цифровий контакт, 1 у межах ±0.015 від поверху ${floor}.`,
        ],
      ]),
    ),
    door_open: [
      'DOOR OPEN: 1 only when doors are fully open.',
      'DOOR OPEN: 1 лише при повністю відкритих дверях.',
    ],
    door_closed: [
      'DOOR CLOSED: 1 only when doors are fully closed; use as a movement permission.',
      'DOOR CLOSED: 1 лише при повністю зачинених дверях; використовуйте як дозвіл руху.',
    ],
    moving: [
      'MOVING: active travel, 0 while stopped, or X for uncertain commands.',
      'MOVING: активний рух, 0 при зупинці або X для невизначених команд.',
    ],
    fault: [
      'FAULT: latched unsafe command fault; only RST clears it. X means command uncertainty without a known latched fault.',
      'FAULT: зафіксована аварія небезпечних команд; очищає лише RST. X означає невизначеність команд без відомої зафіксованої аварії.',
    ],
    position: [
      'POSITION: analog cabin height in floor units, bounded from 1 to 9.',
      'POSITION: аналогова висота кабіни в одиницях поверху, обмежена від 1 до 9.',
    ],
    door_position: [
      'DOOR: analog opening fraction, 0 closed and 1 fully open.',
      'DOOR: аналогова частка відкривання, 0 — зачинено, 1 — повністю відкрито.',
    ],
  },
  examples: ['elevator-logic', 'position-control'],
};

// Each text pair contains English first and Ukrainian second.
export default {
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
};

import { component } from '../definition.js';
import { bit, analog } from '../pins.js';
import { ELEVATOR_DEFAULTS, FLOORS } from '../../../scenes/models/elevator/index.js';

export const ELEVATOR = [
  component(
    'elevator',
    'Nine-floor elevator',
    'Дев’ятиповерховий ліфт',
    'scenes',
    'LIFT',
    [
      bit('up', 'UP'),
      bit('down', 'DOWN'),
      bit('open', 'OPEN'),
      bit('close', 'CLOSE'),
      bit('run', 'RUN'),
      bit('reset', 'RST'),
    ],
    [
      ...FLOORS.map((floor) => bit(`floor${floor}`, `F${floor}`)),
      bit('door_open', 'DOOR OPEN'),
      bit('door_closed', 'DOOR CLOSED'),
      bit('moving', 'MOVING'),
      bit('fault', 'FAULT'),
      { ...analog('position', 'POSITION'), unit: 'floor' },
      { ...analog('door_position', 'DOOR'), unit: '0…1' },
    ],
    ELEVATOR_DEFAULTS,
    'A physical cabin and doors. Build request memory, dispatch, door dwell and interlocks with visible external logic.',
    'Фізична кабіна та двері. Побудуйте пам’ять викликів, диспетчеризацію, витримку дверей і блокування видимою зовнішньою логікою.',
  ),
];

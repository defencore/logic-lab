import { GATES } from './categories/gates.js';
import { IO } from './categories/io.js';
import { KEYPAD } from './categories/keypad.js';
import { BUS_MONITORS } from './categories/bus-monitors.js';
import { LCD1602 } from './categories/lcd1602.js';
import { MEMORY_CHIPS } from './categories/memory-chips.js';
import { PERIPHERAL_INPUTS } from './categories/peripheral-inputs.js';
import { AUDIO } from './categories/audio.js';
import { COMBINATIONAL } from './categories/combinational.js';
import { SEQUENTIAL } from './categories/sequential.js';
import { ANALOG } from './categories/analog.js';
import { ARCHITECTURE } from './categories/architecture.js';
import { PHYSICAL } from './categories/physical.js';
import { MOTION } from './categories/motion.js';
import { SCENES } from './categories/scenes.js';
import { ELEVATOR } from './categories/elevator.js';
import { AUTOMATION } from './categories/automation.js';
import { ANNOTATION } from './categories/annotation.js';

// Register each category once; its definitions supply the component library.
const categories = [
  { id: 'gates', label: 'Logic gates', ua: 'Логічні елементи', definitions: GATES },
  {
    id: 'io',
    label: 'Inputs & outputs',
    ua: 'Джерела та індикатори',
    definitions: [...IO, ...PERIPHERAL_INPUTS, ...KEYPAD, ...LCD1602, ...BUS_MONITORS],
  },
  { id: 'audio', label: 'Sound', ua: 'Звук', definitions: AUDIO },
  {
    id: 'combinational',
    label: 'Combinational',
    ua: 'Комбінаційна логіка',
    definitions: COMBINATIONAL,
  },
  {
    id: 'sequential',
    label: 'Sequential & memory',
    ua: 'Послідовна логіка та пам’ять',
    definitions: [...SEQUENTIAL, ...MEMORY_CHIPS],
  },
  { id: 'analog', label: 'Mixed signals', ua: 'Змішані сигнали', definitions: ANALOG },
  {
    id: 'architecture',
    label: 'Data & architecture',
    ua: 'Дані та архітектура',
    definitions: ARCHITECTURE,
  },
  { id: 'physical', label: 'TTL / CMOS', ua: 'TTL / CMOS', definitions: PHYSICAL },
  { id: 'motion', label: 'Motion & sensors', ua: 'Рух та датчики', definitions: MOTION },
  { id: 'scenes', label: '3D scenes', ua: '3D-сцени', definitions: [...SCENES, ...ELEVATOR] },
  { id: 'automation', label: 'Automation', ua: 'Автоматизація', definitions: AUTOMATION },
  { id: 'annotation', label: 'Annotations', ua: 'Анотації', definitions: ANNOTATION },
];

export const CATEGORIES = categories.map(({ definitions, ...category }) => category);
export const COMPONENTS = categories.flatMap(({ definitions }) => definitions);

const byType = new Map(COMPONENTS.map((definition) => [definition.type, definition]));
export const getDefinition = (type) => byType.get(type);

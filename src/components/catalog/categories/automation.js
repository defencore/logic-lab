import { component } from '../definition.js';
import { bit, word, analog } from '../pins.js';
import { AUTOMATION_DEFAULTS } from '../../../scenes/models/automation/index.js';

export const AUTOMATION = [
  component(
    'aquarium',
    'Aquarium ecosystem',
    'Акваріум',
    'automation',
    'AQUA',
    ['heater', 'cooler', 'aerator', 'feed', 'light', 'filter', 'water_change', 'run', 'reset'].map(
      (id) => bit(id, id.toUpperCase().replaceAll('_', ' ')),
    ),
    [
      ...['cold', 'hot', 'low_oxygen', 'hungry', 'dirty', 'day', 'alarm'].map((id) =>
        bit(id, id.toUpperCase().replaceAll('_', ' ')),
      ),
      word('alive', 'ALIVE'),
      { ...analog('temperature', 'TEMP'), unit: '°C' },
      ...['oxygen', 'food', 'cleanliness', 'health'].map((id) => ({ ...analog(id), unit: '%' })),
    ],
    AUTOMATION_DEFAULTS.aquarium,
    'Keep fish alive using temperature, oxygen, feeding, filtration and day/night feedback. Sustained unsafe conditions damage fish health.',
    'Підтримуйте життя рибок за температурою, киснем, кормом, чистотою та зміною дня і ночі. Тривалі небезпечні умови шкодять їхньому здоров’ю.',
  ),
  component(
    'greenhouse',
    'Greenhouse automation',
    'Розумна теплиця',
    'automation',
    'GROW',
    ['heater', 'vent', 'pump', 'grow_light', 'run', 'reset'].map((id) =>
      bit(id, id.toUpperCase().replaceAll('_', ' ')),
    ),
    [
      ...['cold', 'hot', 'dry', 'wet', 'dark', 'day', 'alarm'].map((id) =>
        bit(id, id.toUpperCase().replaceAll('_', ' ')),
      ),
      { ...analog('temperature', 'TEMP'), unit: '°C' },
      ...['moisture', 'growth', 'health'].map((id) => ({ ...analog(id), unit: '%' })),
    ],
    AUTOMATION_DEFAULTS.greenhouse,
    'Grow plants with heating, ventilation, irrigation and grow lights. Watch moisture, temperature, growth and plant health respond to your circuit.',
    'Вирощуйте рослини з обігрівом, вентиляцією, поливом та освітленням. Ваша схема змінює вологість, температуру, ріст і здоров’я рослин.',
  ),
  component(
    'smart_home',
    'Smart home & yard',
    'Розумний будинок і подвір’я',
    'automation',
    'HOME',
    [
      'heater',
      'fan',
      'indoor_light',
      'outdoor_light',
      'gate',
      'sprinkler',
      'alarm_arm',
      'run',
      'reset',
    ].map((id) => bit(id, id.toUpperCase().replaceAll('_', ' '))),
    [
      ...['cold', 'hot', 'dark', 'motion', 'rain', 'tank_low', 'gate_open', 'alarm'].map((id) =>
        bit(id, id.toUpperCase().replaceAll('_', ' ')),
      ),
      { ...analog('temperature', 'TEMP'), unit: '°C' },
      { ...analog('water', 'WATER'), unit: '%' },
      { ...analog('energy', 'ENERGY'), unit: 'kWh' },
    ],
    AUTOMATION_DEFAULTS.smart_home,
    'Control indoor climate, lights, a sliding gate and garden watering. Combine motion, darkness, rain and water-level sensors to save resources.',
    'Керуйте кліматом, світлом, відсувними воротами й поливом. Поєднуйте датчики руху, темряви, дощу та запасу води, щоб берегти ресурси.',
  ),
];

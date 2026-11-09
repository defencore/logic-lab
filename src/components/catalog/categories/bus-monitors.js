import { component } from '../definition.js';
import { word } from '../pins.js';

export const BUS_MONITORS = [4, 8].map((width) =>
  component(
    `bus_monitor_${width}`,
    `Bus monitor · ${width} bits`,
    `Індикатор шини · ${width} ${width === 4 ? 'біти' : 'біт'}`,
    'io',
    `HEX ${width}`,
    [word('in', 'D', width)],
    [],
    {},
    'Read binary, hexadecimal and decimal values from separate digital contacts.',
    'Показує двійкове, шістнадцяткове й десяткове значення з окремих цифрових контактів.',
  ),
);

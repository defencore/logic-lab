import { esc } from '../shared/ui.js';

export function memoryBytes(value) {
  const values = Array.isArray(value)
    ? value
    : String(value)
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
  if (
    values.length > 4096 ||
    values.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    throw new Error('Memory values must be integer bytes from 0 to 255.');
  return values.join(', ');
}
const PARAM_NAMES = {
  carSpeed: ['Car speed (m/s)', 'Швидкість авто (м/с)'],
  arrivalInterval: ['Arrival interval (s)', 'Інтервал прибуття (с)'],
  initialCars: ['Initial cars per road', 'Початкова кількість авто на напрямок'],
  initialA: ['Initial train A position (m)', 'Початкова позиція потяга A (м)'],
  initialB: ['Initial train B position (m)', 'Початкова позиція потяга B (м)'],
  speedLimit: ['Speed restriction (km/h)', 'Обмеження швидкості (км/год)'],
  hopperCapacity: ['Hopper capacity (g)', 'Місткість бункера (г)'],
  bowlCapacity: ['Bowl capacity (g)', 'Місткість миски (г)'],
  initialHopper: ['Initial food in hopper (g)', 'Початковий корм у бункері (г)'],
  initialLevel: ['Initial level', 'Початковий рівень'],
  dispenseRate: ['Food delivery (g/s)', 'Подача корму (г/с)'],
  eatRate: ['Consumption (g/s)', 'Споживання (г/с)'],
  hungryThreshold: ['Hungry threshold (g)', 'Поріг голоду (г)'],
  fullThreshold: ['Bowl target (g)', 'Цільовий рівень миски (г)'],
  alarmThreshold: ['Unsafe bowl level (g)', 'Небезпечний рівень миски (г)'],
  portionSize: ['Portion size (g)', 'Розмір порції (г)'],
  capacity: ['Tank capacity (L)', 'Місткість резервуара (л)'],
  pumpRate: ['Pump rate (L/s)', 'Подача насоса (л/с)'],
  drainRate: ['Drain rate (L/s)', 'Витрата води (л/с)'],
  lowThreshold: ['Low level (%)', 'Низький рівень (%)'],
  highThreshold: ['High level (%)', 'Високий рівень (%)'],
  initialTemperature: ['Initial temperature (°C)', 'Початкова температура (°C)'],
  ambientTemperature: ['Ambient temperature (°C)', 'Температура довкілля (°C)'],
  initialOxygen: ['Initial oxygen (%)', 'Початковий кисень (%)'],
  initialFood: ['Initial food (%)', 'Початковий запас корму (%)'],
  initialCleanliness: ['Initial cleanliness (%)', 'Початкова чистота (%)'],
  fishCount: ['Fish count', 'Кількість рибок'],
  dayLength: ['Day and night cycle (s)', 'Повний цикл дня і ночі (с)'],
  initialMoisture: ['Initial soil moisture (%)', 'Початкова вологість ґрунту (%)'],
  initialWater: ['Initial water reserve (%)', 'Початковий запас води (%)'],
  frequency: ['Frequency (Hz)', 'Частота (Гц)'],
  duty: ['Duty cycle (0–1)', 'Коефіцієнт заповнення (0–1)'],
  carrier: ['Carrier (Hz)', 'Несуча (Гц)'],
  depth: ['Modulation depth', 'Глибина модуляції'],
  amplitude: ['Amplitude (V)', 'Амплітуда (В)'],
  vcc: ['Supply voltage (V)', 'Напруга живлення (В)'],
  initial: ['Initial value', 'Початкове значення'],
  value: ['Value', 'Значення'],
  range: ['Range', 'Діапазон'],
  minDuty: ['Minimum duty', 'Мінімальне заповнення'],
  maxDuty: ['Maximum duty', 'Максимальне заповнення'],
  text: ['Text', 'Текст'],
  color: ['Color', 'Колір'],
  stepsPerRevolution: ['Full steps / revolution', 'Повних кроків на оберт'],
  microsteps: ['Microsteps / full step', 'Мікрокроків на повний крок'],
  lead: ['Travel / revolution (mm)', 'Хід за оберт (мм)'],
  min: ['Minimum position (mm)', 'Мінімальна позиція (мм)'],
  max: ['Maximum position (mm)', 'Максимальна позиція (мм)'],
  threshold: ['Trip / target position (mm)', 'Поріг / цільова позиція (мм)'],
  tolerance: ['Position tolerance (mm)', 'Допуск позиції (мм)'],
  mode: ['Detection mode', 'Режим виявлення'],
  normallyClosed: ['Normally closed contact (NC)', 'Нормально замкнений контакт (NC)'],
  duration: ['Pulse duration (s)', 'Тривалість імпульсу (с)'],
  low: ['Low threshold', 'Нижній поріг'],
  high: ['High threshold', 'Верхній поріг'],
  data: ['Memory bytes (comma-separated)', 'Байти пам’яті (через кому)'],
  width: ['Width', 'Ширина'],
  height: ['Height', 'Висота'],
};
export function parameterField(key, value, componentType, lang, t) {
  const baseLabel =
    PARAM_NAMES[key]?.[lang === 'ua' ? 1 : 0] ||
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  const label =
    key === 'initialLevel'
      ? `${baseLabel} (${componentType === 'water_tank' ? '%' : 'g'})`
      : baseLabel;
  if (key === 'text')
    return `<label>${label}<textarea data-param="${key}" rows="3" maxlength="16384">${esc(value)}</textarea></label>`;
  if (key === 'data')
    return `<label>${esc(label)}<textarea data-param="data" data-memory-bytes="true" rows="3" maxlength="16384" placeholder="0, 1, 2, 255">${esc(Array.isArray(value) ? value.join(', ') : value)}</textarea></label>`;
  const type =
    typeof value === 'boolean'
      ? 'checkbox'
      : typeof value === 'number'
        ? 'number'
        : key === 'color'
          ? 'color'
          : 'text';
  if (key === 'mode' && ['limit_switch', 'position_sensor'].includes(componentType)) {
    const options =
      componentType === 'limit_switch' ? ['below', 'above'] : ['below', 'above', 'window'];
    return `<label>${esc(label)}<select data-param="mode">${options.map((option) => `<option value="${option}" ${value === option ? 'selected' : ''}>${t(option)}</option>`).join('')}</select></label>`;
  }
  const bounds = {
    carSpeed: [1, 40, 0.5],
    arrivalInterval: [1, 60, 0.5],
    initialCars: [0, 8, 1],
    speedLimit: [1, 255, 1],
    initialA: [-500, -20, 1],
    initialB: [-500, -20, 1],
    hopperCapacity: [1, 100000, 1],
    bowlCapacity: [1, 10000, 1],
    initialHopper: [0, 100000, 1],
    initialLevel: [0, 10000, 1],
    dispenseRate: [0.1, 10000, 0.1],
    eatRate: [0, 1000, 0.1],
    hungryThreshold: [0, 10000, 1],
    fullThreshold: [0, 10000, 1],
    alarmThreshold: [0, 10000, 1],
    portionSize: [1, 10000, 1],
    capacity: [1, 100000, 1],
    pumpRate: [0.1, 10000, 0.1],
    drainRate: [0, 10000, 0.1],
    lowThreshold: [0, 100, 1],
    highThreshold: [0, 100, 1],
    initialTemperature: [-20, 80, 0.5],
    ambientTemperature: [-20, 50, 0.5],
    initialOxygen: [0, 100, 1],
    initialFood: [0, 100, 1],
    initialCleanliness: [0, 100, 1],
    fishCount: [1, 8, 1],
    dayLength: [10, 3600, 1],
    initialMoisture: [0, 100, 1],
    initialWater: [0, 100, 1],
    duty: [0, 1, 0.01],
    depth: [0, 1, 0.01],
    minDuty: [0, 1, 0.01],
    maxDuty: [0, 1, 0.01],
    stepsPerRevolution: [1, 10000, 1],
    microsteps: [1, 256, 1],
    lead: [0.001, 1000, 0.1],
    min: [-1000000, 1000000, 0.1],
    max: [-1000000, 1000000, 0.1],
    threshold: [-1000000, 1000000, 0.1],
    tolerance: [0, 1000000, 0.1],
    frequency: [0, 1000, 0.1],
    carrier: [0, 1000, 0.1],
    duration: [0.0005, 1000, 0.01],
    width: [100, 3000, 20],
    height: [100, 3000, 20],
    vcc: [0.01, 1000, 0.1],
  };
  const limits =
    key === 'value' && componentType === 'bus_input'
      ? [0, 255, 1]
      : key === 'value' && componentType === 'switch'
        ? [0, 1, 1]
        : key === 'initialLevel' && componentType === 'water_tank'
          ? [0, 100, 1]
          : bounds[key];
  const attributes =
    type === 'number'
      ? limits
        ? `min="${limits[0]}" max="${limits[1]}" step="${limits[2]}"`
        : `step="${Number.isInteger(value) ? 1 : 0.01}"`
      : 'maxlength="16384"';
  return `<label ${type === 'checkbox' ? 'class="toggle-row"' : ''}>${esc(label)}<input data-param="${esc(key)}" type="${type}" ${attributes} ${Array.isArray(value) ? 'data-array="true"' : ''} ${type === 'checkbox' ? (value ? 'checked' : '') : `value="${esc(Array.isArray(value) ? JSON.stringify(value) : value)}"`}>${key === 'duty' ? `<input class="duty-slider" data-slider="duty" type="range" aria-label="${esc(label)}" min="0" max="1" step="0.01" value="${esc(value)}">` : ''}</label>`;
}

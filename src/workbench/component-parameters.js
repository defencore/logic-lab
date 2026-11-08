import { parameterRule } from '../components/parameter-rules.js';
import { KEYPAD_DEFAULTS } from '../components/keypad.js';
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
  volume: ['Volume (0–1)', 'Гучність (0–1)'],
  initialFloor: ['Initial floor (1–9)', 'Початковий поверх (1–9)'],
  unit: ['Displayed position unit', 'Одиниця позиції на екрані'],
  pulseDuration: ['Minimum key pulse (simulation s)', 'Мінімальний імпульс (секунди симуляції)'],
  initialDoor: ['Initial door opening (0–1)', 'Початкове відкриття дверей (0–1)'],
  travelSpeed: ['Cabin speed (floors/s)', 'Швидкість кабіни (поверхів/с)'],
  doorSpeed: ['Door opening speed (1/s)', 'Швидкість відкриття дверей (1/с)'],
  duty: ['Duty cycle (0–1)', 'Коефіцієнт заповнення (0–1)'],
  carrier: ['Carrier (Hz)', 'Несуча (Гц)'],
  depth: ['Modulation depth', 'Глибина модуляції'],
  amplitude: ['Amplitude (V)', 'Амплітуда (В)'],
  vcc: ['Supply voltage (V)', 'Напруга живлення (В)'],
  initial: ['Initial value', 'Початкове значення'],
  value: ['Value', 'Значення'],
  range: ['Range', 'Діапазон'],
  minPulse: ['Minimum pulse (µs)', 'Мінімальний імпульс (мкс)'],
  centerPulse: ['Center pulse (µs)', 'Центральний імпульс (мкс)'],
  maxPulse: ['Maximum pulse (µs)', 'Максимальний імпульс (мкс)'],
  signalTimeout: ['Signal timeout (s)', 'Час втрати сигналу (с)'],
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
export function parameterLabel(key, componentType, lang, parameters = {}) {
  if (key === 'mode' && componentType === 'keypad')
    return lang === 'ua' ? 'Режим кнопок' : 'Button mode';
  const baseLabel =
    PARAM_NAMES[key]?.[lang === 'ua' ? 1 : 0] ||
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  if (componentType === 'position_sensor' && parameters.unit === 'floor') {
    if (key === 'threshold')
      return lang === 'ua'
        ? 'Поріг / цільова позиція (поверхи)'
        : 'Trip / target position (floors)';
    if (key === 'tolerance')
      return lang === 'ua' ? 'Допуск позиції (поверхи)' : 'Position tolerance (floors)';
  }
  return key === 'initialLevel'
    ? `${baseLabel} (${componentType === 'water_tank' ? '%' : 'g'})`
    : baseLabel;
}
export function parameterField(key, value, componentType, lang, t, parameters = {}) {
  const label = parameterLabel(key, componentType, lang, parameters);
  const caption = `<span data-parameter-label="${esc(key)}">${esc(label)}</span>`;
  if (key === 'mode' && componentType === 'keypad')
    return `<label>${caption}<select data-param="mode"><option value="pulse" ${value === 'pulse' ? 'selected' : ''}>${lang === 'ua' ? 'Імпульс · звичайні кліки' : 'Pulse · ordinary clicks'}</option><option value="hold" ${value === 'hold' ? 'selected' : ''}>${lang === 'ua' ? 'Утримання · відпускання повертає 0' : 'Hold · release returns to 0'}</option><option value="toggle" ${value === 'toggle' ? 'selected' : ''}>${lang === 'ua' ? 'Фіксація · натисніть ще раз для 0' : 'Latch · press again for 0'}</option></select></label>`;
  if (key === 'text')
    return `<label>${caption}<textarea data-param="${key}" rows="3" maxlength="16384">${esc(value)}</textarea></label>`;
  if (key === 'data')
    return `<label>${caption}<textarea data-param="data" data-memory-bytes="true" rows="3" maxlength="16384" placeholder="0, 1, 2, 255">${esc(Array.isArray(value) ? value.join(', ') : value)}</textarea></label>`;
  if (key === 'unit' && componentType === 'position_sensor')
    return `<label>${caption}<select data-param="unit"><option value="mm" ${value === 'mm' ? 'selected' : ''}>mm</option><option value="floor" ${value === 'floor' ? 'selected' : ''}>${lang === 'ua' ? 'Поверхи' : 'Floors'}</option></select></label>`;
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
    return `<label>${caption}<select data-param="mode">${options.map((option) => `<option value="${option}" ${value === option ? 'selected' : ''}>${t(option)}</option>`).join('')}</select></label>`;
  }
  const limits = parameterRule(componentType, key);
  const attributes =
    type === 'number'
      ? `step="${limits.step}"${limits.min === undefined ? '' : ` min="${limits.min}" max="${limits.max}"`}${limits.integer ? ' data-integer="true"' : ''}`
      : 'maxlength="16384"';
  const hidden =
    componentType === 'keypad' &&
    key === 'pulseDuration' &&
    (parameters.mode ?? KEYPAD_DEFAULTS.mode) !== 'pulse';
  return `<label ${type === 'checkbox' ? 'class="toggle-row"' : ''} ${hidden ? 'hidden' : ''}>${caption}<input data-param="${esc(key)}" type="${type}" ${attributes} ${Array.isArray(value) ? 'data-array="true"' : ''} ${type === 'checkbox' ? (value ? 'checked' : '') : `value="${esc(Array.isArray(value) ? JSON.stringify(value) : value)}"`}>${key === 'duty' ? `<input class="duty-slider" data-slider="duty" type="range" aria-label="${esc(label)}" min="0" max="1" step="0.01" value="${esc(value)}">` : ''}</label>`;
}

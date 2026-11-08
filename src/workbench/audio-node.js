import { esc } from '../shared/ui.js';
import { icon } from '../shared/icons.js';

export const isAudioNode = (node) => ['active_buzzer', 'passive_buzzer'].includes(node.type);

export function audioNodeMarkup() {
  return `<div class="buzzer-widget"><span class="buzzer-speaker">${icon('speaker', 30)}<i></i></span><strong data-buzzer-reading></strong><small data-buzzer-detail></small></div>`;
}

export function noteName(frequency) {
  if (!(frequency > 0) || !Number.isFinite(frequency)) return '';
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  if (midi < 0 || midi > 127) return '';
  return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function audioNodeReading(node, runtime, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const audio = runtime.audio?.[node.id];
  if (node.enabled === false)
    return { sounding: false, reading: L('Вимкнено', 'Disabled'), detail: '' };
  if (!audio || audio.value === null)
    return {
      sounding: false,
      reading: L('Немає коректного сигналу', 'No valid signal'),
      detail: L('Перевірте вхід і параметри', 'Check the input and parameters'),
    };
  const frequency =
    node.type === 'active_buzzer'
      ? audio.value === 1
        ? audio.frequency
        : 0
      : audio.measuredFrequency > 0 &&
          runtime.time - audio.lastEdgeAt <= Math.max(3 * audio.period, 0.1)
        ? audio.measuredFrequency
        : 0;
  return {
    sounding: frequency > 0 && audio.volume > 0,
    reading:
      frequency > 0
        ? `${Number(frequency.toFixed(1))} Hz · ${noteName(frequency)}`
        : L('Тиша', 'Silent'),
    detail:
      node.type === 'active_buzzer'
        ? `${L('Вхід', 'Input')}: ${audio.value}`
        : frequency > 0
          ? `T = ${(1000 / frequency).toFixed(3)} ms · ${L('при 1×', 'at 1×')}`
          : L('Потрібні переходи 0 ↔ 1', 'Needs 0 ↔ 1 transitions'),
  };
}

export function updateAudioNode(element, node, runtime, language) {
  const value = audioNodeReading(node, runtime, language);
  element.querySelector('.buzzer-widget').classList.toggle('is-sounding', value.sounding);
  element.querySelector('[data-buzzer-reading]').textContent = value.reading;
  element.querySelector('[data-buzzer-detail]').textContent = value.detail;
}

export function audioParameterHelp(type, language) {
  if (!['active_buzzer', 'passive_buzzer'].includes(type)) return '';
  const ua = language === 'ua';
  const text =
    type === 'active_buzzer'
      ? ua
        ? '1 вмикає тон заданої частоти, 0 вимикає. Запустіть симуляцію та натисніть «Увімкнути звук».'
        : '1 turns on the configured tone; 0 turns it off. Run the simulation and click “Enable sound”.'
      : ua
        ? 'Висоту задають переходи 1/0: f = 1/(T₁ + T₀). Сталі 0 або 1 не дають тону. Для A4: CLK 440 Гц, заповнення 0,5; швидкість 1×.'
        : 'Pitch follows 1/0 transitions: f = 1/(T₁ + T₀). Constant 0 or 1 produces no tone. For A4: CLK 440 Hz, duty 0.5; speed 1×.';
  return `<p class="parameter-help">${esc(text)}</p>`;
}

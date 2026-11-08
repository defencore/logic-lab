import { esc } from '../shared/ui.js';

const copy = {
  en: {
    title: 'Buzzer state table',
    input: 'Input signal',
    result: 'Sound behavior',
    condition: 'While simulation runs, sound is enabled, and volume is greater than 0.',
    active: [
      ['0', 'Silent'],
      ['1', 'Internal tone: 880 Hz by default'],
      ['X / Z', 'No valid tone; inspect the signal and Diagnostics'],
    ],
    passive: [
      ['Constant 0', 'No sustained tone'],
      ['Constant 1', 'No sustained tone'],
      ['Periodic 0 ↔ 1', 'f = 1 / (T1 + T0); at 1×, 440 Hz gives A4'],
      ['X / Z', 'No valid tone; inspect the signal and Diagnostics'],
    ],
    note: 'A passive input transition may click. Its full repeating period, not a static bit, produces a sustained note. Sound is an observation, not an extra electrical output contact.',
  },
  ua: {
    title: 'Таблиця станів зумера',
    input: 'Вхідний сигнал',
    result: 'Поведінка звуку',
    condition: 'Коли симуляція працює, звук увімкнений, а гучність більша за 0.',
    active: [
      ['0', 'Тиша'],
      ['1', 'Внутрішній тон: типово 880 Гц'],
      ['X / Z', 'Немає коректного тону; перевірте сигнал і діагностику'],
    ],
    passive: [
      ['Стала 0', 'Немає сталого тону'],
      ['Стала 1', 'Немає сталого тону'],
      ['Періодичні 0 ↔ 1', 'f = 1 / (T1 + T0); при 1× 440 Гц дають ля A4'],
      ['X / Z', 'Немає коректного тону; перевірте сигнал і діагностику'],
    ],
    note: 'Перехід пасивного входу може клацнути. Сталу ноту створює повний повторюваний період, а не нерухомий біт. Звук є спостереженням, а не додатковим електричним виходом.',
  },
};

export function audioStateTableMarkup(type, language = 'en') {
  const text = copy[language === 'ua' || language === 'uk' ? 'ua' : 'en'];
  const rows = type === 'active_buzzer' ? text.active : text.passive;
  const contact = type === 'active_buzzer' ? 'EN' : 'SIGNAL';
  return `<section class="truth-reference truth-table-section property-section" aria-label="${esc(text.title)}"><h4 class="truth-table-heading">${esc(text.title)}</h4><p class="truth-table-explanation">${esc(text.condition)}</p><div class="truth-table-scroll"><table class="truth-table"><caption>${esc(text.title)}</caption><thead><tr><th scope="col">${esc(text.input)} · ${contact}</th><th scope="col">${esc(text.result)}</th></tr></thead><tbody>${rows.map(([input, result]) => `<tr><td>${esc(input)}</td><td>${esc(result)}</td></tr>`).join('')}</tbody></table></div><p class="truth-table-explanation">${esc(text.note)}</p></section>`;
}

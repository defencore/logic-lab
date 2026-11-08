import { esc } from '../shared/ui.js';

export function hotkeyStateTableMarkup(language = 'en') {
  const L = (ua, en) => (language === 'ua' || language === 'uk' ? ua : en);
  const title = L('Таблиця станів клавіатурного входу', 'Keyboard input state table');
  const rows = [
    ['hold', L('Клавішу відпущено', 'Released'), '0'],
    ['hold', L('Клавішу утримують', 'Held'), '1'],
    ['inverted', L('Клавішу відпущено', 'Released'), '1'],
    ['inverted', L('Клавішу утримують', 'Held'), '0'],
    ['toggle', L('Новий елемент: value = 0', 'New component: value = 0'), '0'],
    ['toggle', L('Нове натискання після відпускання', 'New press after release'), '¬Q'],
    ['toggle', L('Утримання або автоповтор клавіші', 'Holding or keyboard autorepeat'), 'Q'],
    ['toggle', L('Клавішу відпущено', 'Released'), 'Q'],
  ];
  return `<section class="truth-reference truth-table-section property-section" aria-label="${esc(title)}"><h4 class="truth-table-heading">${title}</h4><p class="truth-table-explanation">${L('Q означає попередній стан виходу, ¬Q — протилежний. Це стани клавіатури, а не додаткові електричні входи елемента.', 'Q means the previous output state; ¬Q is its opposite. These are keyboard states, rather than additional electrical input contacts.')}</p><div class="truth-table-scroll"><table class="truth-table"><caption>${title}</caption><thead><tr><th scope="col">${L('Режим · mode', 'Mode')}</th><th scope="col">${L('Стан або дія клавіші', 'Key state or event')}</th><th scope="col">${L('Вихід після дії', 'Output after event')}</th></tr></thead><tbody>${rows.map(([mode, event, output]) => `<tr><td>${mode}</td><td>${esc(event)}</td><td>${output}</td></tr>`).join('')}</tbody></table></div></section>`;
}

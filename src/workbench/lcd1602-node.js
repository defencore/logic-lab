import { $, $$ } from '../shared/ui.js';
import { lcd1602Snapshot } from '../simulation/lcd1602.js';

const rendered = new WeakMap();
const faults = {
  read: ['R/W має дорівнювати 0', 'Set R/W to 0 to write'],
  control: ['Перевірте рівні RS і R/W', 'Check RS and R/W levels'],
  data: ['Перевірте задіяні контакти D', 'Check the active data pins'],
  phase: ['RS змінився між півбайтами', 'RS changed between nibbles'],
  address: ['Адреса поза межами DDRAM', 'Address is outside DDRAM'],
  cgram: ['CGRAM не підтримується', 'CGRAM is not supported'],
};

const row = () =>
  `<div class="lcd1602-row">${'<span class="lcd1602-cell" data-lcd-cell> </span>'.repeat(16)}</div>`;

export function lcd1602NodeMarkup() {
  return `<div class="lcd1602-widget"><div class="lcd1602-bezel"><div class="lcd1602-display" data-lcd-display data-display-on="false" role="img">${row()}${row()}</div></div><span class="lcd1602-status" data-lcd-status></span><span class="lcd1602-fault" data-lcd-fault></span></div>`;
}

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

export function updateLcd1602Node(element, node, runtime, language = 'en') {
  const state = runtime.state[node.id];
  const enabled = node.enabled !== false;
  const previous = rendered.get(element);
  if (previous?.state === state && previous?.language === language && previous?.enabled === enabled)
    return;
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const display = $('[data-lcd-display]', element);
  if (!display) return;
  rendered.set(element, { state, language, enabled });
  const snapshot = lcd1602Snapshot(state);
  const on = enabled && snapshot.displayOn;
  const rows = on ? snapshot.rows : [' '.repeat(16), ' '.repeat(16)];
  display.dataset.displayOn = String(on);
  display.setAttribute(
    'aria-label',
    on
      ? `LCD 1602 · ${rows.map((line, i) => `${L('Рядок', 'Row')} ${i + 1}: ${line.trimEnd() || L('порожньо', 'blank')}`).join(' · ')}`
      : `LCD 1602 · ${L('екран вимкнено', 'display off')}`,
  );
  $$('[data-lcd-cell]', display).forEach((cell, index) => {
    const row = Math.floor(index / 16),
      column = index % 16;
    const cursor =
      on && snapshot.cursor?.row === row && snapshot.cursor.column === column
        ? snapshot.cursor
        : null;
    setText(cell, rows[row][column]);
    cell.classList.toggle('lcd1602-cursor', !!cursor?.underline);
    cell.classList.toggle('lcd1602-blink', !!cursor?.blink);
  });
  const status = $('[data-lcd-status]', element);
  const fault = $('[data-lcd-fault]', element);
  const address = `0x${snapshot.address.toString(16).padStart(2, '0').toUpperCase()}`;
  const width = `${snapshot.dataBits}${L(snapshot.dataBits === 4 ? ' біти' : ' бітів', '-bit')}`;
  const mode = `${width} · ${snapshot.twoLines ? L('2 рядки', '2 lines') : L('1 рядок', '1 line')}`;
  setText(
    status,
    enabled
      ? `${mode} · ${snapshot.awaitingLowNibble ? L('чекає 2-й півбайт', 'awaiting low nibble') : on ? address : L('екран вимкнено', 'display off')}`
      : L('Елемент вимкнено', 'Component disabled'),
  );
  setText(fault, enabled && faults[snapshot.fault] ? L(...faults[snapshot.fault]) : '');
}

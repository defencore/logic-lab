import { LCD_COLUMNS } from '../simulation/lcd1602.js';

export const L = (language, ua, en) => (language === 'ua' ? ua : en);
export const hex = (byte) => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`;
export const rowCommands = [0x80, 0xc0];
export const command = (byte) => ({ rs: 0, byte });
const ascii = /^[\x20-\x7e]+$/;

export function prepareTransfers(lcd) {
  const bytes = [0x38, 0x06, 0x0c];
  if (lcd?.shift) bytes.push(0x02);
  return bytes.map(command);
}

export function rowGuideReady(lcd) {
  return (
    lcd?.dataBits === 8 &&
    lcd.twoLines &&
    lcd.displayOn &&
    lcd.direction === 1 &&
    !lcd.entryShift &&
    !lcd.shift
  );
}

export function rowTransfers(row, text) {
  if (text.length > LCD_COLUMNS || !ascii.test(text)) return null;
  return [
    command(rowCommands[row]),
    ...Array.from(text, (c) => ({ rs: 1, byte: c.charCodeAt(0) })),
  ];
}

export function rowPlan(row, text, language) {
  const transfers = rowTransfers(row, text);
  const target = `RS=0 · ${hex(rowCommands[row])} → ${L(language, 'початок рядка', 'row start')} ${row + 1}`;
  if (!transfers) return target;
  const [, first, second, ...rest] = transfers;
  const example = [first, second]
    .filter(Boolean)
    .map(({ byte }) => `${JSON.stringify(String.fromCharCode(byte))}=${hex(byte)}`)
    .join(', ');
  return `${target}. RS=1 · ${example}${rest.length ? ', …' : ''} → ${L(language, 'байти символів', 'character bytes')}.`;
}

export function writeTarget(lcd, language) {
  if (!lcd) return '';
  const address = hex(lcd.address);
  if (lcd.addressSpace !== 'ddram') return `CGRAM ${address}`;
  const row = lcd.address >= 0x40 ? 2 : 1;
  const column = lcd.address - (row === 2 ? 0x40 : 0) + 1;
  if (lcd.shift || (row === 2 && !lcd.twoLines)) return `DDRAM ${address}`;
  if (column > LCD_COLUMNS)
    return L(language, `DDRAM ${address} поза екраном`, `DDRAM ${address} off screen`);
  return L(
    language,
    `рядок ${row}, стовпець ${column} · ${address}`,
    `row ${row}, column ${column} · ${address}`,
  );
}

export function lcdRowGuideMarkup(language) {
  const t = (ua, en) => L(language, ua, en);
  return `<div class="lcd-lab-guide" data-lcd-row-guide>
    <div class="lcd-lab-setup">
      <button type="button" class="primary-btn" data-lcd-lab-quick="prepare">${t('1. Підготувати LCD', '1. Prepare LCD')}</button>
      <p>${t('З RS=0', 'With RS=0')} <code>0x38</code> ${t('обирає 8 біт і 2 рядки', 'selects 8 bits and 2 rows')}, <code>0x06</code> ${t('рухає адресу вправо після запису', 'moves the address right after a write')}, <code>0x0C</code> ${t('вмикає екран.', 'turns the display on.')}</p>
    </div>
    <form class="lcd-lab-form lcd-lab-row-form" data-lcd-row-form>
      <label>${t('2. Куди записати', '2. Where to write')}<select data-lcd-row><option value="0">${t('Рядок 1', 'Row 1')} · 0x80</option><option value="1">${t('Рядок 2', 'Row 2')} · 0xC0</option></select></label>
      <label>${t(`Текст (1–${LCD_COLUMNS} символів ASCII)`, `Text (1–${LCD_COLUMNS} ASCII characters)`)}<input type="text" data-lcd-row-text placeholder="HELLO" aria-describedby="lcd-lab-row-plan" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <button type="submit" class="primary-btn">${t('Записати рядок', 'Write row')}</button>
    </form>
    <p class="lcd-lab-plan" id="lcd-lab-row-plan"></p>
    <p>${t('Для кожного байта панель виставляє D7…D0 й дає імпульс E. LCD приймає байт, коли E переходить з 1 до 0.', 'For each byte, the panel sets D7…D0 and pulses E. The LCD accepts the byte when E goes from 1 to 0.')}</p>
    <div class="lcd-lab-quick">
      <button type="button" class="soft-btn" data-lcd-lab-quick="clear">${t('Очистити', 'Clear')}</button>
      <p>${t('Новий текст замінює символи з початку рядка. «Очистити» стирає обидва рядки повністю.', 'New text overwrites characters from the start of the row. Clear erases both rows.')}</p>
    </div>
  </div>`;
}

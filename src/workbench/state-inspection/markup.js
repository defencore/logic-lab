import { MEMORY_TYPES, BYTE_TYPES } from './model.js';

const L = (language, ua, en) => (language === 'ua' ? ua : en);
const bits = (attribute, labels = true) =>
  Array.from({ length: 8 }, (_, index) => {
    const bit = 7 - index;
    return `<span class="inspection-bit" ${attribute}="${bit}">${labels ? `<small data-bit-label="${bit}">Q${bit}</small>` : ''}<b data-bit-value>X</b></span>`;
  }).join('');

export function byteWidgetMarkup(node, language, { compact = false } = {}) {
  const registers = node.type === 'hc595';
  const storage = registers
    ? `<p class="chip-register-caption">${L(language, 'Зберігання · QA–QH', 'Storage · QA–QH')}</p>`
    : '';
  const shift = registers
    ? `<p class="chip-register-caption">${L(language, 'Зсув', 'Shift')} <b data-chip-shift>XXXXXXXX</b> · QH′=<b data-chip-serial>X</b></p>`
    : '';
  return `<div class="byte-widget ${compact ? 'compact-byte' : ''}" data-byte-view data-inspection-compact="${compact}">${storage}<div class="byte-bits">${bits('data-byte-bit')}</div><div class="byte-formats"><span>BIN <b data-byte-bin>XXXXXXXX</b></span><span>HEX <b data-byte-hex>0xXX</b></span><span>DEC <b data-byte-dec>X</b></span>${compact ? '<span class="byte-output-status" data-byte-status></span>' : ''}</div>${compact ? '' : '<p data-byte-status></p>'}${shift}${node.type === 'bus_input' ? '' : `<div class="byte-change-inspection">${!compact && node.type === 'shift_register' ? '<strong>Q7 ← … ← Q1 ← Q0 ← SER · SOUT = Q7</strong>' : ''}<span data-byte-event></span><span data-byte-before></span><span data-byte-after></span>${compact ? '' : '<small data-byte-change-legend></small>'}</div>`}</div>`;
}

export function memoryMapMarkup(node, language, { compact = false } = {}) {
  const size = node.type === 'register_file' ? 8 : 16;
  const status = compact
    ? '<p class="memory-compact-status" data-memory-compact></p>'
    : `<p class="memory-read-status" data-memory-read></p><p class="memory-write-status" data-memory-write></p><p class="memory-last-write" data-memory-last></p><p class="inspection-legend">${L(language, 'Синій — адреса читання; помаранчевий — дозволений запис; ★ — останній запис; рамка біта — змінено. Пунктир — невизначений вибір.', 'Blue: read address; amber: enabled write address; ★: last write; outlined bit: changed. Dashed: uncertain selection.')}</p>`;
  const imageHint =
    node.type === 'eeprom' && !compact
      ? `<p>${L(language, 'Карта показує поточний вміст. Скидання симуляції відновлює збережений образ.', 'The map shows live contents. Simulation reset reloads the saved image.')}</p>`
      : '';
  return `<div class="memory-inspection ${compact ? 'compact-memory' : ''}" data-memory-view data-inspection-compact="${compact}">${imageHint}${status}<div class="memory-map-scroll"><table class="memory-map"><caption>${L(language, 'Збережені комірки', 'Stored locations')} · ${size}×8</caption><thead><tr><th scope="col">ADDR</th><th scope="col">BIN · 7…0</th><th scope="col">HEX</th>${compact ? '' : '<th scope="col">DEC</th>'}</tr></thead><tbody>${Array.from({ length: size }, (_, address) => `<tr data-memory-address="${address}"><th scope="row" title="${L(language, 'Адреса', 'Address')} ${address}">0x${address.toString(16).toUpperCase()}<span data-memory-marker></span></th><td class="memory-binary">${bits('data-memory-bit', false)}</td><td data-memory-hex>0xXX</td>${compact ? '' : '<td data-memory-dec>X</td>'}</tr>`).join('')}</tbody></table></div></div>`;
}

export function inspectionMarkup(node, language) {
  const memory = MEMORY_TYPES.has(node.type);
  if (!memory && !BYTE_TYPES.has(node.type)) return '';
  return `<details class="property-section state-inspection" open><summary>${L(language, memory ? 'Карта пам’яті · лише перегляд' : 'Біти та збережений стан', memory ? 'Memory map · read only' : 'Bits and stored state')}</summary>${memory ? memoryMapMarkup(node, language) : byteWidgetMarkup(node, language)}</details>`;
}

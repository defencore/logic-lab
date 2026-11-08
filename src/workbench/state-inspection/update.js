import { MEMORY_TYPES, BYTE_TYPES, byteFormats, inspectByte, inspectMemory } from './model.js';

const L = (language, ua, en) => (language === 'ua' ? ua : en);
function text(root, selector, value) {
  const element = root.querySelector(selector);
  if (element && element.textContent !== String(value)) element.textContent = value;
}
function bitValue(element, value, changed = false) {
  const shown = value === 0 || value === 1 || value === 'Z' ? String(value) : 'X';
  text(element, '[data-bit-value]', shown);
  element.classList.toggle('bit-high', value === 1);
  element.classList.toggle('bit-unknown', shown === 'X');
  element.classList.toggle('bit-floating', shown === 'Z');
  element.classList.toggle('bit-changed', changed);
}
const locations = (addresses) =>
  addresses.length === 1 ? String(addresses[0]) : `{${addresses.join(', ')}}`;
const at = (time) => (Number.isFinite(time) ? `${time.toFixed(4)} s` : '');

function updateByte(root, node, runtime, language) {
  const data = inspectByte(node, runtime);
  const compact = root.dataset.inspectionCompact === 'true';
  for (const element of root.querySelectorAll('[data-byte-bit]')) {
    const bit = Number(element.dataset.byteBit);
    bitValue(
      element,
      data.bits[bit],
      !!data.change && data.change.before[bit] !== data.change.after[bit],
    );
    text(element, '[data-bit-label]', data.labels[bit]);
  }
  for (const key of ['bin', 'hex', 'dec']) text(root, `[data-byte-${key}]`, data.formats[key]);
  text(
    root,
    '[data-byte-status]',
    compact
      ? data.enabled
        ? ''
        : 'OUT Z'
      : !data.enabled
        ? L(
            language,
            data.stored ? 'Стан збережено; виходи вимкнені (Z).' : 'Виходи вимкнені (Z).',
            data.stored ? 'State retained; outputs disabled (Z).' : 'Outputs disabled (Z).',
          )
        : L(
            language,
            data.stored ? 'Поточний збережений байт.' : 'Поточний вихідний байт.',
            data.stored ? 'Current stored byte.' : 'Current output byte.',
          ),
  );
  if (!data.stored) return;
  const change = data.change;
  const kind =
    node.type === 'shift_register' ? 'shift' : node.type === 'counter' ? 'count' : 'capture';
  const labels = {
    shift: L(
      language,
      change?.definite ? 'Останній зсув' : 'Можливий зсув',
      change?.definite ? 'Last shift' : 'Possible shift',
    ),
    count: L(
      language,
      change?.definite ? 'Останній крок лічби' : 'Можливий крок лічби',
      change?.definite ? 'Last count' : 'Possible count',
    ),
    capture: L(
      language,
      change?.definite ? 'Останнє захоплення' : 'Можливе захоплення',
      change?.definite ? 'Last capture' : 'Possible capture',
    ),
  };
  text(
    root,
    '[data-byte-event]',
    compact
      ? change
        ? `${L(language, kind === 'shift' ? 'Зсув' : kind === 'count' ? 'Лічба' : 'Запис', kind === 'shift' ? 'Shift' : kind === 'count' ? 'Count' : 'Capture')} #${change.sequence}${change.definite ? '' : '?'}${kind === 'shift' ? ` · SER=${change.ser}` : ''}`
        : '—'
      : change
        ? `${labels[kind]} #${change.sequence} · ${at(change.at)}${kind === 'shift' ? ` · SER=${change.ser}` : ''}`
        : L(
            language,
            'Немає події після ініціалізації/скидання.',
            'No event since initialization/reset.',
          ),
  );
  text(
    root,
    '[data-byte-before]',
    change ? `${L(language, 'До', 'Before')}: ${byteFormats(change.before).bin}` : '',
  );
  text(
    root,
    '[data-byte-after]',
    change ? `${L(language, 'Після', 'After')}: ${byteFormats(change.after).bin}` : '',
  );
  const legend = {
    shift: L(language, 'зсувом', 'shift'),
    count: L(language, 'кроком лічби', 'count'),
    capture: L(language, 'захопленням', 'capture'),
  };
  text(
    root,
    '[data-byte-change-legend]',
    L(
      language,
      `Рамка: біти, змінені останнім ${legend[kind]}.`,
      `Outline: bits changed by the last ${legend[kind]}.`,
    ),
  );
}

function updateMemory(root, node, project, runtime, language) {
  const data = inspectMemory(node, project, runtime);
  const location = (values) =>
    values.length === 1 ? `0x${values[0].toString(16).toUpperCase()}` : `?${values.length}`;
  text(
    root,
    '[data-memory-compact]',
    [
      data.readActive ? `R${location(data.read)}${data.readCertain ? '' : '?'}` : 'R—',
      ...(node.type === 'rom'
        ? []
        : [data.writeActive ? `W${location(data.write)}${data.writeCertain ? '' : '?'}` : 'W—']),
      ...(data.lastWrite ? [`★${location(data.lastWrite.addresses)}`] : []),
    ].join(' · '),
  );
  const readStatus = data.readActive
    ? L(
        language,
        data.readCertain ? 'Читання' : 'Можливе читання',
        data.readCertain ? 'Read' : 'Possible read',
      )
    : L(language, 'Вихід читання вимкнений', 'Read output disabled');
  text(
    root,
    '[data-memory-read]',
    `${readStatus} · ADDR=${locations(data.read)}${node.type === 'register_file' ? '' : ` · CS=${data.cs}, OE=${data.oe}`}`,
  );
  text(
    root,
    '[data-memory-write]',
    node.type === 'rom'
      ? L(language, 'ROM: вміст лише для читання.', 'ROM: contents are read only.')
      : `${L(language, 'Запис', 'Write')}: ${data.writeActive ? locations(data.write) : '—'} · WE=${data.we} · CLK↑`,
  );
  const last = data.lastWrite;
  text(
    root,
    '[data-memory-last]',
    last
      ? `${L(language, last.definite ? 'Останній запис' : 'Можливий запис', last.definite ? 'Last write' : 'Possible write')} #${last.sequence} · ${locations(last.addresses)} · ${at(last.at)}${last.cells.every((cell) => !cell.changed.length) ? ` · ${L(language, 'без зміни бітів', 'bits unchanged')}` : ''}`
      : L(
          language,
          'Записів ще не було. Вміст не залежить від OE.',
          'No writes yet. Stored contents do not depend on OE.',
        ),
  );
  for (const row of root.querySelectorAll('[data-memory-address]')) {
    const item = data.rows[Number(row.dataset.memoryAddress)];
    const read = data.read.includes(item.address),
      write = data.write.includes(item.address) && data.writeActive;
    row.classList.toggle('memory-reading', read);
    row.classList.toggle('memory-read-disabled', read && !data.readActive);
    row.classList.toggle('memory-writing', write);
    row.classList.toggle(
      'memory-possible',
      (read && (data.read.length > 1 || (data.readActive && !data.readCertain))) ||
        (write && (data.write.length > 1 || !data.writeCertain)),
    );
    row.classList.toggle('memory-last-written', item.lastWritten);
    text(
      row,
      '[data-memory-marker]',
      `${read ? ' R' : ''}${write ? ' W' : ''}${item.lastWritten ? ' ★' : ''}`,
    );
    text(row, '[data-memory-hex]', item.formats.hex);
    text(row, '[data-memory-dec]', item.formats.dec);
    for (const bit of row.querySelectorAll('[data-memory-bit]'))
      bitValue(
        bit,
        item.bits[Number(bit.dataset.memoryBit)],
        item.changed.includes(Number(bit.dataset.memoryBit)),
      );
  }
}

/** Patch readonly text/classes; property editors and their focus are never reconstructed. */
export function updateStateInspection(container, node, project, runtime, language) {
  if (!container || !node) return;
  if (BYTE_TYPES.has(node.type)) {
    const root = container.querySelector('[data-byte-view]');
    if (root) updateByte(root, node, runtime, language);
  }
  if (MEMORY_TYPES.has(node.type)) {
    const root = container.querySelector('[data-memory-view]');
    if (root) updateMemory(root, node, project, runtime, language);
  }
}

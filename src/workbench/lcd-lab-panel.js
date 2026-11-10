import { LCD_COLUMNS } from '../simulation/lcd1602.js';
import { lcd1602NodeMarkup, updateLcd1602Node } from './lcd1602-node.js';
import {
  L,
  command,
  hex,
  lcdRowGuideMarkup,
  prepareTransfers,
  rowCommands,
  rowGuideReady,
  rowPlan,
  rowTransfers,
  writeTarget,
} from './lcd-lab-guide.js';

const isBit = (value) => value === 0 || value === 1;
const level = (value) => (isBit(value) || value === 'X' ? String(value) : 'Z');

function parseByte(value, rs) {
  if (rs === 1 && /^[\x20-\x7e]$/.test(value)) return value.charCodeAt(0);
  const text = value.trim();
  if (/^0x[0-9a-f]{1,2}$/i.test(text)) return Number(text);
  if (rs === 0 && /^\d{1,3}$/.test(text) && Number(text) <= 255) return Number(text);
  return null;
}

function inputPins(runtime, nodeId) {
  const { rs, rw, e, ...data } = runtime.inputs[nodeId] || {};
  const bits = Array.from({ length: 8 }, (_, index) => data[`d${7 - index}`]);
  const binary = bits.map(level).join('');
  const byte = bits.every(isBit) ? Number.parseInt(binary, 2) : null;
  return { rs, rw, e, binary, byte };
}

function markup(language) {
  const t = (ua, en) => L(language, ua, en);
  return `<div class="lcd-lab-card">
    <div class="lcd-lab-preview"><h2>${t('LCD 1602 · Запис повідомлення', 'LCD 1602 · Write a message')}</h2>${lcd1602NodeMarkup()}
      <div class="lcd-lab-pins" aria-label="${t('Рівні входів LCD', 'LCD input levels')}"><span data-lcd-lab-control-pins></span><span data-lcd-lab-data-pins></span></div>
      <p class="lcd-lab-target" data-lcd-lab-target></p>
    </div>
    <div class="lcd-lab-controls">
      <p class="lcd-lab-status" data-lcd-lab-status role="status" hidden></p>
      ${lcdRowGuideMarkup(language)}
      <p class="lcd-lab-feedback" data-lcd-lab-feedback role="status" hidden></p>
      <details class="lcd-lab-manual" data-lcd-lab-manual>
        <summary>${t('Ручна передача байтів', 'Manual byte transfer')}</summary>
        <p>${t('R/W=0 дозволяє запис. RS=0 означає команду, RS=1 — символ. Наприклад, A — це байт 0x41. Кнопка «Передати байт» дає один імпульс E.', 'R/W=0 enables writing. RS=0 means command and RS=1 means character. For example, A is byte 0x41. Send byte pulses E once.')}</p>
        <form class="lcd-lab-form" data-lcd-lab-form>
          <label>${t('Режим запису', 'Write mode')}<select data-lcd-lab-rs><option value="1">${t('Символ · RS=1', 'Character · RS=1')}</option><option value="0">${t('Команда · RS=0', 'Command · RS=0')}</option></select></label>
          <label><span data-lcd-lab-value-label></span><input type="text" data-lcd-lab-value maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <button type="submit" class="soft-btn">${t('Передати байт', 'Send byte')}</button>
        </form>
        <div class="lcd-lab-quick" aria-label="${t('Команди вибору рядка', 'Row selection commands')}">
          <button type="button" class="soft-btn" data-lcd-lab-quick="row1">${t('На початок рядка 1', 'Start of row 1')} · 0x80</button>
          <button type="button" class="soft-btn" data-lcd-lab-quick="row2">${t('На початок рядка 2', 'Start of row 2')} · 0xC0</button>
        </div>
      </details>
    </div>
  </div>`;
}

function errorMessage(code, language, rs) {
  const t = (ua, en) => L(language, ua, en);
  switch (code) {
    case 'wiring':
      return t(
        'Відновіть підключення RS, R/W, E та D0–D7 у схемі лабораторної.',
        'Restore the lab connections to RS, R/W, E and D0–D7.',
      );
    case 'mode':
      return t(
        'Для 8-бітного запису скиньте симуляцію й натисніть «Підготувати LCD».',
        'For 8-bit writes, reset simulation and choose Prepare LCD.',
      );
    case 'busy':
      return t(
        'Відпустіть кнопку E й завершіть відтворення, якщо воно активне.',
        'Release E and finish any active replay.',
      );
    case 'input':
      return rs === 1
        ? t(
            'Введіть один друкований символ ASCII або байт 0xNN.',
            'Enter one printable ASCII character or a byte such as 0x41.',
          )
        : t(
            'Введіть команду від 0 до 255 або байт 0xNN.',
            'Enter a command from 0 to 255 or a byte such as 0x0C.',
          );
    default:
      return t(
        'LCD не прийняв байт. Перевірте стан дисплея й рівні входів.',
        'The LCD did not accept the byte. Check its state and input levels.',
      );
  }
}

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

function statusMessage({ language, playback, locked, node, pins, lcd }) {
  const t = (ua, en) => L(language, ua, en);
  if (playback)
    return t(
      'Стежте за RS, даними й E. LCD приймає байт, коли E переходить з 1 до 0.',
      'Watch RS, data and E. The LCD accepts the byte when E goes from 1 to 0.',
    );
  if (locked)
    return t(
      'Дочекайтеся завершення поточної операції.',
      'Wait for the current operation to finish.',
    );
  if (node.enabled === false)
    return t('Увімкніть LCD у властивостях елемента.', 'Enable the LCD in its properties.');
  if (!isBit(pins.rs) || !isBit(pins.e) || pins.rw !== 0 || pins.byte === null)
    return errorMessage('wiring', language);
  if (pins.e === 1)
    return t('Відпустіть E перед записом із панелі.', 'Release E before sending from the panel.');
  if (lcd?.dataBits === 4) return errorMessage('mode', language);
  return '';
}

export function createLcdLabPanel(state, { send }) {
  let panel = null;
  const lcdState = () => state.runtime.state.lcd;

  function mount(root, language) {
    const t = (ua, en) => L(language, ua, en);
    root.innerHTML = markup(language);
    const get = (selector) => root.querySelector(selector);
    const form = get('[data-lcd-lab-form]');
    const mode = get('[data-lcd-lab-rs]');
    const input = get('[data-lcd-lab-value]');
    const valueLabel = get('[data-lcd-lab-value-label]');
    const rowForm = get('[data-lcd-row-form]');
    const rowSelect = get('[data-lcd-row]');
    const rowInput = get('[data-lcd-row-text]');
    const plan = get('#lcd-lab-row-plan');
    const selectedRow = () => Number(rowSelect.value);
    const feedback = get('[data-lcd-lab-feedback]');
    const quick = [...root.querySelectorAll('[data-lcd-lab-quick]')];
    const binding = {
      root,
      language,
      controls: [...root.querySelectorAll('button, input, select')],
      guide: get('[data-lcd-row-guide]'),
      manual: get('[data-lcd-lab-manual]'),
      prepare: get('[data-lcd-lab-quick="prepare"]'),
      rowSubmit: rowForm.querySelector('button[type="submit"]'),
      preview: get('.lcd-lab-preview'),
      status: get('[data-lcd-lab-status]'),
      target: get('[data-lcd-lab-target]'),
      controlPins: get('[data-lcd-lab-control-pins]'),
      dataPins: get('[data-lcd-lab-data-pins]'),
      feedback,
      locked: false,
    };
    const describeByte = () => {
      const character = mode.value === '1';
      valueLabel.textContent = character
        ? t('Символ або байт', 'Character or byte')
        : t('Байт команди', 'Command byte');
      input.placeholder = character ? 'A / 0x41' : '12 / 0x0C';
      input.removeAttribute('aria-invalid');
    };
    function report(message, error = false) {
      setText(feedback, message);
      feedback.hidden = !message;
      feedback.dataset.error = String(error);
    }
    function describeRow() {
      setText(plan, rowPlan(selectedRow(), rowInput.value, language));
      rowInput.removeAttribute('aria-invalid');
    }
    function write(transfers, success) {
      if (binding.locked) return;
      const result = send(transfers);
      if (result.error) {
        const progress = result.sent ? t(`Передано ${result.sent}. `, `Sent ${result.sent}. `) : '';
        report(progress + errorMessage(result.error, language, transfers[result.sent]?.rs), true);
      } else report(success);
      update();
    }
    rowForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (binding.rowSubmit.disabled) return;
      const row = selectedRow();
      const transfers = rowTransfers(row, rowInput.value);
      if (!transfers) {
        rowInput.setAttribute('aria-invalid', 'true');
        const hint =
          rowInput.value.length > LCD_COLUMNS
            ? t(
                `У рядку максимум ${LCD_COLUMNS} символів.`,
                `A row holds at most ${LCD_COLUMNS} characters.`,
              )
            : t(
                'Введіть латинські літери, цифри або інші друковані символи ASCII. Наприклад, HELLO 123.',
                'Enter Latin letters, digits or other printable ASCII characters. For example, HELLO 123.',
              );
        report(hint, true);
        return;
      }
      const count = transfers.length - 1;
      write(
        transfers,
        t(
          `Рядок ${row + 1} · ${hex(rowCommands[row])} задав адресу. Записано символів: ${count}.`,
          `Row ${row + 1} · ${hex(rowCommands[row])} set the address. Characters written: ${count}.`,
        ),
      );
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (binding.locked) return;
      const rs = Number(mode.value);
      const byte = parseByte(input.value, rs);
      if (byte === null) {
        input.setAttribute('aria-invalid', 'true');
        report(errorMessage('input', language, rs), true);
        return;
      }
      input.removeAttribute('aria-invalid');
      write(
        [{ rs, byte }],
        t(
          `LCD прийняв ${hex(byte)} з RS=${rs} на спаді E.`,
          `LCD accepted ${hex(byte)} with RS=${rs} on the falling edge of E.`,
        ),
      );
    });
    rowSelect.addEventListener('change', describeRow);
    rowInput.addEventListener('input', describeRow);
    mode.addEventListener('change', describeByte);
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    const handlers = {
      prepare: () => {
        const transfers = prepareTransfers(lcdState());
        const bytes = transfers.map(({ byte }) => hex(byte)).join(' → ');
        write(transfers, t(`LCD підготовлено · RS=0 · ${bytes}.`, `LCD ready · RS=0 · ${bytes}.`));
      },
      clear: () =>
        write([command(0x01)], t('0x01 очистила обидва рядки.', '0x01 cleared both rows.')),
      row1: () =>
        write([command(rowCommands[0])], t('0x80 задає адресу 0x00.', '0x80 sets address 0x00.')),
      row2: () =>
        write([command(rowCommands[1])], t('0xC0 задає адресу 0x40.', '0xC0 sets address 0x40.')),
    };
    for (const button of quick)
      button.addEventListener('click', handlers[button.dataset.lcdLabQuick]);
    describeByte();
    describeRow();
    return binding;
  }

  function update() {
    const root = document.querySelector('#lcd-lab-panel');
    if (!root) return;
    const node =
      state.project.exampleId === 'lcd1602-parallel'
        ? state.project.nodes.find(({ id, type }) => id === 'lcd' && type === 'lcd1602')
        : null;
    root.hidden = !node;
    if (!node) return;
    const language = state.lang;
    if (panel?.root !== root || panel.language !== language) panel = mount(root, language);
    if (panel.project !== state.project) {
      panel.project = state.project;
      panel.feedback.hidden = true;
    }
    const playback = !!state.classroom?.isPlaying?.();
    const locked =
      playback || (!!state.classroom?.isLocked?.() && !state.classroom?.isRecording?.());
    panel.locked = locked || node.enabled === false;
    panel.guide.hidden = playback;
    panel.manual.hidden = playback;
    const lcd = lcdState();
    const ready = rowGuideReady(lcd);
    for (const control of panel.controls)
      control.disabled = panel.locked || (control === panel.rowSubmit && !ready);
    panel.prepare.classList.toggle('primary-btn', !ready);
    panel.prepare.classList.toggle('soft-btn', ready);
    updateLcd1602Node(panel.preview, node, state.runtime, language);
    const pins = inputPins(state.runtime, node.id);
    setText(panel.controlPins, `RS ${level(pins.rs)} · R/W ${level(pins.rw)} · E ${level(pins.e)}`);
    setText(
      panel.dataPins,
      `D7…D0 ${pins.binary}${pins.byte === null ? '' : ` · ${hex(pins.byte)}`}`,
    );
    const target = writeTarget(lcd, language);
    setText(
      panel.target,
      target ? `${L(language, 'Поточна адреса LCD', 'Current LCD address')} · ${target}` : '',
    );
    const status = statusMessage({ language, playback, locked, node, pins, lcd });
    setText(panel.status, status);
    panel.status.hidden = !status;
  }

  return { update };
}

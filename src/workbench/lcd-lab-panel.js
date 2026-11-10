import { lcd1602NodeMarkup, updateLcd1602Node } from './lcd1602-node.js';

const L = (language, ua, en) => (language === 'ua' ? ua : en);
const hex = (byte) => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`;
const isBit = (value) => value === 0 || value === 1;
const level = (value) => (isBit(value) || value === 'X' ? String(value) : 'Z');
const quickWrites = {
  prepare: [0x38, 0x06, 0x0c],
  row1: [0x80],
  row2: [0xc0],
  clear: [0x01],
};

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
  return `<div class="lcd-lab-card">
    <div class="lcd-lab-preview"><h2>${L(language, 'LCD 1602 · Запис повідомлення', 'LCD 1602 · Write a message')}</h2>${lcd1602NodeMarkup()}
      <div class="lcd-lab-pins" aria-label="${L(language, 'Рівні входів LCD', 'LCD input levels')}"><span data-lcd-lab-control-pins></span><span data-lcd-lab-data-pins></span></div>
    </div>
    <div class="lcd-lab-controls"><p data-lcd-lab-status role="status"></p>
      <form class="lcd-lab-form" data-lcd-lab-form>
        <label>${L(language, 'Режим запису', 'Write mode')}<select data-lcd-lab-rs><option value="0">${L(language, 'Команда · RS=0', 'Command · RS=0')}</option><option value="1">${L(language, 'Символ · RS=1', 'Character · RS=1')}</option></select></label>
        <label><span data-lcd-lab-value-label></span><input type="text" data-lcd-lab-value maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
        <button type="submit" class="primary-btn">${L(language, 'Записати · E', 'Send E pulse')}</button>
      </form>
      <div class="lcd-lab-quick" aria-label="${L(language, 'Команди LCD', 'LCD commands')}">
        <button type="button" class="soft-btn" data-lcd-lab-quick="prepare" title="0x38 → 0x06 → 0x0C">${L(language, 'Підготувати LCD', 'Prepare LCD')}</button>
        <button type="button" class="soft-btn" data-lcd-lab-quick="row1" title="0x80">${L(language, 'Рядок 1', 'Row 1')}</button>
        <button type="button" class="soft-btn" data-lcd-lab-quick="row2" title="0xC0">${L(language, 'Рядок 2', 'Row 2')}</button>
        <button type="button" class="soft-btn" data-lcd-lab-quick="clear" title="0x01">${L(language, 'Очистити', 'Clear')}</button>
      </div>
      <p class="lcd-lab-feedback" data-lcd-lab-feedback role="status" hidden></p>
    </div>
  </div>`;
}

function errorMessage(code, language, rs) {
  switch (code) {
    case 'wiring':
      return L(
        language,
        'Відновіть підключення RS, R/W, E та D0–D7 у схемі лабораторної.',
        'Restore the lab connections to RS, R/W, E and D0–D7.',
      );
    case 'mode':
      return L(
        language,
        'Панель записує в 8-бітному режимі. Скиньте симуляцію й натисніть «Підготувати LCD».',
        'The panel sends 8-bit writes. Reset simulation and choose Prepare LCD.',
      );
    case 'busy':
      return L(
        language,
        'Відпустіть кнопку E й завершіть відтворення, якщо воно активне.',
        'Release E and finish any active replay.',
      );
    case 'input':
      return rs === 1
        ? L(
            language,
            'Введіть один друкований символ ASCII або байт 0xNN.',
            'Enter one printable ASCII character or a byte such as 0x41.',
          )
        : L(
            language,
            'Введіть команду від 0 до 255 або байт 0xNN.',
            'Enter a command from 0 to 255 or a byte such as 0x0C.',
          );
    default:
      return L(
        language,
        'LCD не прийняв запис. Перевірте стан дисплея й рівні входів.',
        'The LCD did not accept the write. Check its state and input levels.',
      );
  }
}

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

export function createLcdLabPanel(state, { send }) {
  let panel = null;
  function mount(root, language) {
    root.innerHTML = markup(language);
    const get = (selector) => root.querySelector(selector);
    const form = get('[data-lcd-lab-form]');
    const mode = get('[data-lcd-lab-rs]');
    const input = get('[data-lcd-lab-value]');
    const valueLabel = get('[data-lcd-lab-value-label]');
    const feedback = get('[data-lcd-lab-feedback]');
    const quick = [...root.querySelectorAll('[data-lcd-lab-quick]')];
    const controls = [mode, input, form.querySelector('button[type="submit"]'), ...quick];
    const binding = {
      root,
      language,
      controls,
      form,
      quickBar: get('.lcd-lab-quick'),
      prepare: get('[data-lcd-lab-quick="prepare"]'),
      preview: get('.lcd-lab-preview'),
      status: get('[data-lcd-lab-status]'),
      controlPins: get('[data-lcd-lab-control-pins]'),
      dataPins: get('[data-lcd-lab-data-pins]'),
      feedback,
      locked: false,
    };
    const describe = () => {
      const character = mode.value === '1';
      valueLabel.textContent = character
        ? L(language, 'Символ або байт', 'Character or byte')
        : L(language, 'Байт команди', 'Command byte');
      input.placeholder = character ? 'A / 0x41' : '12 / 0x0C';
      input.removeAttribute('aria-invalid');
    };
    function write(rs, bytes) {
      if (binding.locked) return;
      let result;
      try {
        result = send({ rs, bytes });
      } catch {
        result = { sent: 0, error: 'transfer' };
      }
      const pins = inputPins(state.runtime, 'lcd');
      const summary =
        result.sent > 0
          ? `${L(language, 'Байтів передано', 'Bytes sent')} ${result.sent} · RS ${level(pins.rs)} · D ${pins.byte === null ? pins.binary : hex(pins.byte)}.`
          : '';
      setText(
        feedback,
        [summary, result.error ? errorMessage(result.error, language, rs) : '']
          .filter(Boolean)
          .join(' '),
      );
      feedback.hidden = !feedback.textContent;
      feedback.dataset.error = String(!!result.error);
      update();
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (binding.locked) return;
      const rs = Number(mode.value);
      const byte = parseByte(input.value, rs);
      if (byte === null) {
        input.setAttribute('aria-invalid', 'true');
        setText(feedback, errorMessage('input', language, rs));
        feedback.dataset.error = 'true';
        feedback.hidden = false;
        return;
      }
      input.removeAttribute('aria-invalid');
      write(rs, [byte]);
    });
    mode.addEventListener('change', describe);
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    for (const button of quick)
      button.addEventListener('click', () => write(0, quickWrites[button.dataset.lcdLabQuick]));
    describe();
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
    panel.form.hidden = playback;
    panel.quickBar.hidden = playback;
    for (const control of panel.controls) control.disabled = panel.locked;
    updateLcd1602Node(panel.preview, node, state.runtime, language);
    const pins = inputPins(state.runtime, node.id);
    setText(panel.controlPins, `RS ${level(pins.rs)} · R/W ${level(pins.rw)} · E ${level(pins.e)}`);
    setText(
      panel.dataPins,
      `D7…D0 ${pins.binary}${pins.byte === null ? '' : ` · ${hex(pins.byte)}`}`,
    );
    const lcd = state.runtime.state[node.id];
    let message;
    if (playback)
      message = L(
        language,
        'Під час відтворення панель доступна для перегляду. Завершіть його, щоб записувати байти.',
        'The panel is read-only during replay. End replay to send bytes.',
      );
    else if (locked)
      message = L(
        language,
        'Дочекайтеся завершення поточної операції.',
        'Wait for the current operation to finish.',
      );
    else if (node.enabled === false)
      message = L(
        language,
        'Увімкніть LCD у властивостях елемента.',
        'Enable the LCD in its properties.',
      );
    else if (!isBit(pins.rs) || !isBit(pins.e) || pins.rw !== 0 || pins.byte === null)
      message = errorMessage('wiring', language);
    else if (pins.e === 1)
      message = L(
        language,
        'Відпустіть E перед записом із панелі.',
        'Release E before sending from the panel.',
      );
    else if (lcd?.dataBits === 4) message = errorMessage('mode', language);
    else if (!lcd?.twoLines)
      message = L(
        language,
        'Щоб увімкнути обидва рядки, натисніть «Підготувати LCD».',
        'Choose Prepare LCD to turn on both rows.',
      );
    else if (!lcd.displayOn)
      message = L(
        language,
        'Екран вимкнено. Щоб знову показати текст, надішліть команду 0x0C.',
        'Display off. Send command 0x0C to show the text again.',
      );
    else
      message = L(
        language,
        'Щоб додати літеру, оберіть «Символ», введіть її й натисніть Enter. Запис відбувається на спаді E.',
        'To add a letter, choose Character, type it and press Enter. The falling edge of E writes it.',
      );
    const needsSetup = !panel.locked && !lcd?.twoLines;
    panel.prepare.classList.toggle('primary-btn', needsSetup);
    panel.prepare.classList.toggle('soft-btn', !needsSetup);
    setText(panel.status, message);
  }

  return { update };
}

import {
  contactSwitchClosed,
  isMomentaryInput,
  POTENTIOMETER_DEFAULTS,
  POTENTIOMETER_RANGE,
} from '../components/peripheral-inputs.js';
import { esc, format } from '../shared/ui.js';
import { bindMomentaryButton } from './momentary-button.js';

const local = (language, ua, en) => (language === 'ua' ? ua : en);
const contactLabel = (closed, language) =>
  closed ? local(language, 'Замкнено', 'Closed') : local(language, 'Розімкнено', 'Open');
const voltageLabel = (value) => (typeof value === 'number' ? `${format(value)} V` : format(value));

export function peripheralInputMarkup(node, language) {
  if (node.type === 'contact_switch') {
    const closed = contactSwitchClosed(node);
    const mode = isMomentaryInput(node)
      ? local(language, 'Утримання', 'Hold to close')
      : local(language, 'Фіксація', 'Latch');
    const name = node.label || local(language, 'Контакт', 'Contact switch');
    return `<div class="peripheral-input"><button type="button" class="contact-control soft-btn" data-contact-control aria-label="${esc(`${name} · ${mode}`)}" aria-pressed="${closed}" ${node.enabled === false ? 'disabled' : ''}><span data-contact-state>${contactLabel(closed, language)}</span></button><small>${mode}</small></div>`;
  }
  const value = node.params.value ?? POTENTIOMETER_DEFAULTS.value;
  const name = node.label || local(language, 'Напруга потенціометра', 'Potentiometer voltage');
  return `<label class="peripheral-input potentiometer-control"><input type="range" data-potentiometer-control min="${POTENTIOMETER_RANGE[0]}" max="${POTENTIOMETER_RANGE[1]}" step="any" value="${esc(value)}" aria-label="${esc(name)}" aria-valuetext="${esc(voltageLabel(value))}" ${node.enabled === false ? 'disabled' : ''}><output data-potentiometer-voltage>${esc(voltageLabel(node.enabled === false ? 'Z' : value))}</output></label>`;
}

export function bindPeripheralInput(
  root,
  node,
  { setMomentarySource, toggleSource, setPotentiometer },
) {
  if (node.type === 'contact_switch') {
    const control = root.querySelector('[data-contact-control]');
    const momentary = isMomentaryInput(node);
    return bindMomentaryButton(control, {
      press: () => (momentary ? setMomentarySource(node.id, 1) : toggleSource(node.id)),
      release: () => {
        if (momentary) setMomentarySource(node.id, 0);
      },
    });
  }
  const slider = root.querySelector('[data-potentiometer-control]');
  let editing = false;
  const change = () => {
    if (
      !slider.disabled &&
      setPotentiometer(node.id, Number(slider.value), { checkpoint: !editing })
    )
      editing = true;
  };
  const finish = () => {
    editing = false;
  };
  slider.addEventListener('input', change);
  slider.addEventListener('change', finish);
  slider.addEventListener('blur', finish);
  return () => {
    slider.removeEventListener('input', change);
    slider.removeEventListener('change', finish);
    slider.removeEventListener('blur', finish);
  };
}

export function updatePeripheralInput(root, node, runtime, locked, language) {
  const disabled = locked || node.enabled === false;
  if (node.type === 'contact_switch') {
    const control = root.querySelector('[data-contact-control]');
    const status = root.querySelector('[data-contact-state]');
    const closed = contactSwitchClosed(node);
    control.disabled = disabled;
    control.setAttribute('aria-pressed', String(closed));
    const text = contactLabel(closed, language);
    if (status.textContent !== text) status.textContent = text;
    return;
  }
  const slider = root.querySelector('[data-potentiometer-control]');
  const output = root.querySelector('[data-potentiometer-voltage]');
  const text = voltageLabel(runtime.outputs[node.id]?.out);
  slider.disabled = disabled;
  const value = String(node.params.value ?? POTENTIOMETER_DEFAULTS.value);
  if (slider.value !== value && (disabled || document.activeElement !== slider))
    slider.value = value;
  slider.setAttribute('aria-valuetext', text);
  if (output.textContent !== text) output.textContent = text;
}

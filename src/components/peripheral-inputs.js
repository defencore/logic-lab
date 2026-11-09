export const CONTACT_SWITCH_DEFAULTS = Object.freeze({ mode: 'momentary', value: 0 });
export const CONTACT_SWITCH_MODES = Object.freeze(['momentary', 'toggle']);
export const POTENTIOMETER_DEFAULTS = Object.freeze({ value: 2.5 });
export const POTENTIOMETER_RANGE = Object.freeze([0, 5]);
export const POTENTIOMETER_STEP = 0.01;

const contactMode = (node) => node.params?.mode ?? CONTACT_SWITCH_DEFAULTS.mode;

export const isMomentaryInput = (node) =>
  node?.type === 'button' || (node?.type === 'contact_switch' && contactMode(node) === 'momentary');

export const isLatchingInput = (node) =>
  node?.type === 'switch' || (node?.type === 'contact_switch' && contactMode(node) === 'toggle');

export const contactSwitchClosed = (node) =>
  node?.type === 'contact_switch' &&
  node.enabled !== false &&
  node.params?.value === 1 &&
  CONTACT_SWITCH_MODES.includes(contactMode(node));

export function potentiometerValue(value) {
  const [minimum, maximum] = POTENTIOMETER_RANGE;
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : 'X';
}

export function peripheralInputParameterError(node) {
  if (node.type === 'contact_switch') {
    const { mode, value } = { ...CONTACT_SWITCH_DEFAULTS, ...node.params };
    if (!CONTACT_SWITCH_MODES.includes(mode))
      return 'Contact switch mode must be momentary or toggle.';
    if (value !== 0 && value !== 1) return 'Contact switch value must be 0 or 1.';
  }
  if (node.type === 'potentiometer') {
    const { value } = { ...POTENTIOMETER_DEFAULTS, ...node.params };
    if (potentiometerValue(value) === 'X') return 'Potentiometer voltage must be from 0 to 5 V.';
  }
  return null;
}

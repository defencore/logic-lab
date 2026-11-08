const modifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'];
const flags = ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'];
const codes = new Set([
  'Space',
  'Enter',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backquote',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash',
  'IntlBackslash',
  'IntlRo',
  'IntlYen',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'NumpadDecimal',
  'NumpadEnter',
  'NumpadEqual',
  'Tab',
  'Escape',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Pause',
  'PrintScreen',
  'ContextMenu',
]);
const knownCode = (code) =>
  typeof code === 'string' &&
  (codes.has(code) ||
    /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(?:Up|Down|Left|Right)|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(
      code,
    ));
const reservedCodes = new Set([
  'Tab',
  'Escape',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Pause',
  'PrintScreen',
  'ContextMenu',
]);

export function canonicalHotkeyBinding(value) {
  if (value === '') return '';
  if (typeof value === 'string') return parseHotkeyBinding(value)?.binding ?? null;
  if (!value || !knownCode(value.code)) return null;
  return [...modifiers.filter((_, index) => !!value[flags[index]]), value.code].join('+');
}

/** A binding names one physical KeyboardEvent.code, independent of the active text layout. */
export function parseHotkeyBinding(value) {
  if (typeof value !== 'string' || !value || value.length > 80) return null;
  const parts = value.split('+');
  const code = parts.pop();
  if (
    !knownCode(code) ||
    parts.some((part) => !modifiers.includes(part)) ||
    new Set(parts).size !== parts.length
  )
    return null;
  const descriptor = { code };
  flags.forEach((flag, index) => {
    descriptor[flag] = parts.includes(modifiers[index]);
  });
  return { ...descriptor, binding: canonicalHotkeyBinding(descriptor) };
}

/** Only plain keys with optional Shift are portable through browser and OS shortcut layers. */
export function hotkeyBindingError(value) {
  if (value === '') return null;
  const parsed = parseHotkeyBinding(value);
  if (!parsed) return 'invalid';
  if (parsed.binding !== value) return 'noncanonical';
  if (
    parsed.ctrlKey ||
    parsed.altKey ||
    parsed.metaKey ||
    reservedCodes.has(parsed.code) ||
    /^F\d+$/.test(parsed.code)
  )
    return 'reserved';
  return null;
}

export function bindingFromEvent(event) {
  if (event.isComposing || event.getModifierState?.('AltGraph')) return null;
  return canonicalHotkeyBinding(event);
}

export function matchesHotkeyBinding(binding, event) {
  if (
    !binding ||
    hotkeyBindingError(binding) ||
    event.isComposing ||
    event.getModifierState?.('AltGraph')
  )
    return false;
  const parsed = parseHotkeyBinding(binding);
  return event.code === parsed.code && flags.every((flag) => !!event[flag] === parsed[flag]);
}

export function displayHotkeyBinding(binding, language = 'ua') {
  if (!binding) return language === 'ua' ? 'Не призначено' : 'Unassigned';
  const parsed = parseHotkeyBinding(binding);
  if (!parsed) return language === 'ua' ? 'Некоректне призначення' : 'Invalid binding';
  const labels = {
    Space: language === 'ua' ? 'Пробіл' : 'Space',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backquote: '`',
    Minus: '−',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
  };
  const key =
    labels[parsed.code] || parsed.code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num ');
  return [...modifiers.filter((_, index) => parsed[flags[index]]), key].join(' + ');
}

export function findHotkeyConflict(project, binding, exceptNodeId) {
  if (!binding || hotkeyBindingError(binding)) return null;
  return (
    project.nodes.find(
      (node) =>
        node.id !== exceptNodeId && node.type === 'hotkey' && node.params?.binding === binding,
    ) || null
  );
}

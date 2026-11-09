export const EEPROM_SIZE = 16;

/** The saved image contains unsigned decimal or 0x hexadecimal bytes. */
export function decodeEepromData(data) {
  const tokens = Array.isArray(data)
    ? data
    : typeof data === 'string'
      ? data
          .trim()
          .split(/[\s,;]+/)
          .filter(Boolean)
      : null;
  if (!tokens || tokens.length > EEPROM_SIZE) return null;
  if (
    tokens.some(
      (token) =>
        !['string', 'number'].includes(typeof token) ||
        !/^(?:\d+|0x[\da-f]+)$/i.test(String(token)) ||
        Number(token) > 255,
    )
  )
    return null;
  return Array.from({ length: EEPROM_SIZE }, (_, address) => Number(tokens[address] ?? 0));
}

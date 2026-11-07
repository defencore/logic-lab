export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
export const format = (value) =>
  typeof value === 'number'
    ? Number.isInteger(value)
      ? String(value)
      : value.toFixed(3)
    : (value ?? 'Z');
export const safeColor = (value) => (/^#[0-9a-f]{6}$/i.test(value) ? value : '#e7eddc');
export const signalClass = (value) =>
  value === 'X'
    ? 'unknown'
    : value === 'Z' || value == null
      ? 'floating'
      : Number(value) !== 0
        ? 'high'
        : 'low';

const paths = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  probe: '<path d="m4 20 6-6m-3-3 6 6M9 9l7-7 6 6-7 7Z M16 2l6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  step: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  mouse: '<path d="m5 3 14 9-7 1-3 7Z"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v7c0 5-3 8-7 8-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
  wire: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h5v12h5"/>',
  note: '<path d="M14 3H4v18h16V9ZM14 3v6h6M8 13h8M8 17h5"/>',
  undo: '<path d="M3 9h10a7 7 0 0 1 0 14M3 9l5-5M3 9l5 5"/>',
  redo: '<path d="M21 9H11a7 7 0 0 0 0 14M21 9l-5-5M21 9l-5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  fit: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 2-1 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  signal: '<path d="M2 16h5V7h5v9h5V7h5"/>',
  box: '<path d="m12 3 9 5v8l-9 5-9-5V8ZM3 8l9 5 9-5M12 13v8"/>',
  folder: '<path d="M3 7V4h6l3 3h9v13H3Z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
};
export const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
export function gateIcon(type, size = 28) {
  const bubble = ['nand', 'nor', 'xnor', 'not'].includes(type);
  let body = ['or', 'nor', 'xor', 'xnor'].includes(type)
    ? '<path d="M8 4q10 0 14 8-4 8-14 8 5-8 0-16Z"/>'
    : type === 'not'
      ? '<path d="m8 4 14 8-14 8Z"/>'
      : '<path d="M8 4h6a8 8 0 0 1 0 16H8Z"/>';
  if (['xor', 'xnor'].includes(type)) body += '<path d="M5 4q5 8 0 16"/>';
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M1 8h7M1 16h7M${bubble ? 26 : 22} 12h5"/>${body}${bubble ? '<circle cx="24" cy="12" r="2"/>' : ''}</svg>`;
}

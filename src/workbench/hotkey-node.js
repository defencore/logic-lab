import { esc } from '../shared/ui.js';
import { displayHotkeyBinding } from '../components/catalog/hotkey-bindings.js';

export function hotkeyNodeMarkup(node, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const mode = node.params.mode || 'hold';
  const caption =
    mode === 'toggle'
      ? L('Перемикач', 'Toggle')
      : mode === 'inverted'
        ? L('Інверсне утримання', 'Inverted hold')
        : L('Утримання', 'Hold');
  return `<div class="hotkey-widget"><kbd class="hotkey-key" title="${esc(node.params.binding || '')}">${esc(displayHotkeyBinding(node.params.binding, language))}</kbd><span class="hotkey-mode">${caption}</span><strong class="node-readout">0</strong></div>`;
}

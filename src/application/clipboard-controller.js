export const FRAGMENT_MIME = 'application/x-logic-lab-fragment+json';
const textField = 'input,textarea,select,[contenteditable]';

/** Native copy/paste events carry user-authorized clipboard data without permission prompts. */
export function createClipboardController({ state, services, actions, t }, root = document) {
  function blocked(event) {
    const target = event.target?.closest ? event.target : root.activeElement;
    return (
      event.defaultPrevented ||
      target?.closest?.(textField) ||
      root.activeElement?.closest?.(textField) ||
      services.dialogs?.isOpen()
    );
  }
  function copy(event) {
    if (blocked(event) || !event.clipboardData || String(root.getSelection?.() || '')) return false;
    const node = root.activeElement?.closest?.('.circuit-node')?.dataset.node;
    // Copying a keyboard-focused component must not silently copy an older selection elsewhere.
    if (node && !state.selected.has(node)) {
      state.selected = new Set([node]);
      state.selectedWire = null;
      actions.selectionChanged();
    }
    const source = actions.copySelection();
    if (!source) return false;
    try {
      event.clipboardData.setData('text/plain', source);
      try {
        event.clipboardData.setData(FRAGMENT_MIME, source);
      } catch {
        // Plain text is the portable representation when a browser filters custom MIME types.
      }
      event.preventDefault();
      actions.notify(t('selectionCopied').replace('{count}', state.selected.size));
      return true;
    } catch {
      actions.notify(t('clipboardUnavailable'));
      return false;
    }
  }
  function paste(event) {
    if (blocked(event) || !event.clipboardData) return false;
    const source =
      event.clipboardData.getData(FRAGMENT_MIME) || event.clipboardData.getData('text/plain');
    if (!source) return false;
    event.preventDefault();
    return actions.pasteSelection(source);
  }
  return { copy, paste };
}

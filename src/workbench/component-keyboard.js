import { esc } from '../shared/ui.js';
import { dimensions } from '../circuits/geometry/placement.js';
import { zoomAt } from '../circuits/viewport.js';

export function componentHeaderMarkup(node, label, propertiesLabel, code = '') {
  return `<div class="node-header" data-node-header="${esc(node.id)}" tabindex="0" role="button" aria-label="${esc(label)} · ${esc(propertiesLabel)}" aria-controls="inspector-content"><span class="node-type-dot"></span><span>${esc(label)}</span><small>${esc(code)}</small></div>`;
}

function revealComponent(header, node, state, applyView, root) {
  const viewport = root.querySelector('#viewport').getBoundingClientRect();
  if (state.view.zoom < 0.85) {
    const rect = header.getBoundingClientRect();
    state.view = zoomAt(
      state.view,
      {
        x: rect.left + rect.width / 2 - viewport.left,
        y: rect.top + rect.height / 2 - viewport.top,
      },
      0.85 / state.view.zoom,
    );
    applyView();
  }
  const size = dimensions(node),
    inset = 24;
  const left = node.x * state.view.zoom + state.view.x;
  const top = node.y * state.view.zoom + state.view.y;
  // Large background groups still reveal their header rather than centering it offscreen.
  const width = Math.min(size.w * state.view.zoom, Math.max(0, viewport.width - inset * 2));
  const height = Math.min(size.h * state.view.zoom, Math.max(0, viewport.height - inset * 2));
  const x = Math.max(inset - left, Math.min(0, viewport.width - inset - left - width));
  const y = Math.max(inset - top, Math.min(0, viewport.height - inset - top - height));
  if (x || y) {
    state.view = { ...state.view, x: state.view.x + x, y: state.view.y + y };
    applyView();
  }
}

/** Headers provide component navigation independently of contacts and source controls. */
export function createComponentNavigation(
  state,
  { applyView, isKeyboard, selectNode },
  root = document,
) {
  let lastOpened = null;
  let suppressReveal = false;
  function focusControl(value, { reveal = true } = {}) {
    if (!value) return false;
    if (value.kind === 'keypad') {
      const keypad = [...root.querySelectorAll('[data-keypad]')].find(
        (el) => el.dataset.keypad === value.node,
      );
      const key = [...(keypad?.querySelectorAll('[data-keypad-key]') || [])].find(
        (el) => el.dataset.keypadKey === value.key,
      );
      key?.focus({ preventScroll: true });
      return !!key;
    }
    const header = value.kind === 'header';
    const control = [
      ...root.querySelectorAll(header ? '[data-node-header]' : '[data-switch]'),
    ].find(
      (element) => (header ? element.dataset.nodeHeader : element.dataset.switch) === value.node,
    );
    suppressReveal = !reveal;
    try {
      control?.focus({ preventScroll: true });
    } finally {
      suppressReveal = false;
    }
    return !!control;
  }
  function captureFocus() {
    const active = root.activeElement;
    const keypadKey = active?.closest?.('[data-keypad-key]');
    if (keypadKey)
      return {
        kind: 'keypad',
        node: keypadKey.closest('[data-keypad]').dataset.keypad,
        key: keypadKey.dataset.keypadKey,
      };
    const header = active?.closest?.('[data-node-header]');
    if (header) return { kind: 'header', node: header.dataset.nodeHeader };
    const source = active?.closest?.('[data-switch]');
    return source ? { kind: 'source', node: source.dataset.switch } : null;
  }
  function bind(header) {
    const id = header.dataset.nodeHeader;
    const reveal = () => {
      const node = state.project.nodes.find((node) => node.id === id);
      if (node) revealComponent(header, node, state, applyView, root);
    };
    header.addEventListener('focus', () => {
      if (isKeyboard() && !suppressReveal) reveal();
    });
    header.addEventListener('click', (event) => {
      if (event.target.closest?.('input,textarea,select,[contenteditable]')) return;
      // Assistive technology can activate a button role without dispatching keyboard events.
      if (event.detail !== 0) return;
      event.stopPropagation();
      reveal();
      lastOpened = id;
      selectNode(id, { inspect: true });
    });
    header.addEventListener('keydown', (event) => {
      if (event.target.closest?.('input,textarea,select,[contenteditable]')) return;
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        reveal();
        lastOpened = id;
        selectNode(id, { inspect: true });
        return;
      }
      const navigation = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (navigation.includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const ids = state.project.nodes.map((node) => node.id);
        const current = ids.indexOf(id);
        const index =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? ids.length - 1
              : Math.max(
                  0,
                  Math.min(
                    ids.length - 1,
                    current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1),
                  ),
                );
        focusControl({ kind: 'header', node: ids[index] });
      } else if (['Delete', 'Backspace'].includes(event.key)) {
        // Focus alone does not select a node, so deleting could otherwise remove another node.
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
  return {
    bind,
    captureFocus,
    restoreFocus: focusControl,
    returnFocus: (id = lastOpened, options) => focusControl({ kind: 'header', node: id }, options),
  };
}

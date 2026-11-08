import { checkConnection } from '../circuits/connections.js';
import { zoomAt } from '../circuits/viewport.js';

export const contactEndpoint = (element) => ({
  node: element.dataset.node,
  port: element.dataset.pin,
  side: element.dataset.side,
});

export function contactTarget(project, pending, target) {
  if (!pending) return null;
  if (pending.node === target.node && pending.port === target.port && pending.side === target.side)
    return 'selected';
  if (pending.side === target.side) return 'incompatible';
  const from = pending.side === 'out' ? pending : target;
  const to = pending.side === 'in' ? pending : target;
  return checkConnection(project, from, to).ok ? 'compatible' : 'incompatible';
}

export function updateContactTargets(project, pending, root = document) {
  for (const element of root.querySelectorAll('.pin')) {
    const target = contactTarget(project, pending, contactEndpoint(element));
    element.classList.toggle('connecting', target === 'selected');
    element.classList.toggle('compatible-target', target === 'compatible');
    element.classList.toggle('incompatible-target', target === 'incompatible');
    element.setAttribute('aria-pressed', String(target === 'selected'));
  }
}

export function focusContact(endpoint, root = document) {
  const element = [...root.querySelectorAll('.pin')].find((pin) => {
    const value = contactEndpoint(pin);
    return (
      value.node === endpoint.node && value.port === endpoint.port && value.side === endpoint.side
    );
  });
  element?.focus({ preventScroll: true });
  return !!element;
}

/** Button keyboard activation enters the same validated transaction as pointer activation. */
export function activateContactKey(event, activate, beforeActivate = () => {}) {
  if (
    event.isComposing ||
    !['Enter', ' '].includes(event.key) ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return false;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat) return true;
  beforeActivate();
  const pin = event.currentTarget;
  const rect = (pin.querySelector('i') || pin).getBoundingClientRect();
  activate({
    currentTarget: pin,
    target: pin,
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    keyboard: true,
    preventDefault() {},
    stopPropagation() {},
  });
  return true;
}

/** Only keyboard navigation reveals contacts; pointer focus preserves the chosen canvas view. */
export function createContactNavigation(state, applyView, root = document) {
  let keyboard = false;
  root.addEventListener(
    'pointerdown',
    () => {
      keyboard = false;
    },
    { capture: true },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (!event.isComposing && !['Alt', 'Control', 'Meta'].includes(event.key)) keyboard = true;
    },
    { capture: true },
  );
  return {
    bind(pin, activate) {
      pin.addEventListener('pointerdown', (event) => {
        keyboard = false;
        activate(event);
      });
      pin.addEventListener('keydown', (event) =>
        activateContactKey(event, activate, () => {
          keyboard = true;
          revealContact(pin, state, applyView, root);
        }),
      );
      pin.addEventListener('focus', () => {
        if (keyboard) revealContact(pin, state, applyView, root);
      });
    },
  };
}

/** Dense contacts become readable when reached from the keyboard. */
export function revealContact(pin, state, applyView, root = document) {
  const viewport = root.querySelector('#viewport');
  const bounds = viewport.getBoundingClientRect();
  const center = () => {
    const rect = (pin.querySelector('i') || pin).getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - bounds.left,
      y: rect.top + rect.height / 2 - bounds.top,
    };
  };
  if (state.view.zoom < 0.85) {
    state.view = zoomAt(state.view, center(), 0.85 / state.view.zoom);
    applyView();
  }
  const point = center();
  const inset = 24;
  const x = Math.max(inset, Math.min(bounds.width - inset, point.x));
  const y = Math.max(inset, Math.min(bounds.height - inset, point.y));
  if (x !== point.x || y !== point.y) {
    state.view = { ...state.view, x: state.view.x + x - point.x, y: state.view.y + y - point.y };
    applyView();
  }
}

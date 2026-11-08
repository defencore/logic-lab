import { keypadFixture } from '../../application/fixtures/keypad.js';
import { bindKeypadControls, updateKeypadControls } from '../../../src/workbench/keypad-node.js';

/** Browser-like focus is significant: focusing the next key blurs the previous key. */
export function keypadDomFixture(t, mode = 'hold') {
  const cleanup = [];
  const f = keypadFixture({ after: (callback) => cleanup.push(callback) }, mode);
  const buttons = Array.from({ length: 12 }, (_, index) => {
    const button = new EventTarget();
    button.dataset = { keypadKey: String(index) };
    button.attributes = new Map();
    button.setAttribute = (key, value) => button.attributes.set(key, value);
    button.setPointerCapture = (id) => {
      button.captured = id;
    };
    button.closest = (selector) => (selector === '[data-keypad]' ? root : null);
    button.focus = () => {
      const previous = document.activeElement;
      if (previous === button) return;
      document.activeElement = button;
      previous?.dispatchEvent?.(Object.assign(new Event('blur'), { relatedTarget: button }));
      button.dispatchEvent(new Event('focus'));
    };
    return button;
  });
  const root = { querySelectorAll: () => buttons };
  const dispose = bindKeypadControls(root, f.node(), f.setKey);
  function send(index, type, values = {}) {
    const target =
      typeof index === 'number' ? buttons[index] : index === 'window' ? window : document;
    const event = Object.assign(new Event(type, { cancelable: true }), {
      button: 0,
      pointerId: 7,
      isPrimary: true,
      detail: 1,
      key: '',
      ...values,
    });
    target.dispatchEvent(event);
    return event;
  }
  function focusOutside() {
    const previous = document.activeElement;
    const outside = { closest: () => null };
    document.activeElement = outside;
    previous?.dispatchEvent?.(Object.assign(new Event('blur'), { relatedTarget: outside }));
  }
  const update = (locked = false) => updateKeypadControls(root, f.node(), locked);
  update();
  t.after(() => {
    dispose();
    cleanup.forEach((callback) => callback());
  });
  return { ...f, buttons, root, send, focusOutside, update, dispose };
}

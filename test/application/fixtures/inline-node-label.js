import { createInlineNodeLabel } from '../../../src/workbench/inline-node-label.js';
import { createComponentNavigation } from '../../../src/workbench/component-keyboard.js';
import { createCommands } from '../../../src/application/commands.js';
import { createHistory } from '../../../src/application/history.js';

class Element extends EventTarget {
  constructor(root, tag = 'DIV') {
    super();
    this.root = root;
    this.tagName = tag.toUpperCase();
    this.dataset = {};
    this.children = [];
    this.attributes = new Map();
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.selectionDirection = 'none';
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    };
  }
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  getAttribute(key) {
    return this.attributes.get(key) ?? null;
  }
  removeAttribute(key) {
    this.attributes.delete(key);
  }
  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }
  remove() {
    if (this.root.activeElement === this) {
      this.root.activeElement = null;
      this.dispatchEvent(new Event('blur'));
    }
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  closest(selector) {
    if (selector === 'input,textarea,select,[contenteditable]')
      return this.tagName === 'INPUT' ? this : null;
    if (selector === '[data-node-header]')
      return this.dataset.nodeHeader ? this : this.parentElement?.closest(selector);
    return null;
  }
  focus() {
    if (this.root.activeElement === this) return;
    const previous = this.root.activeElement;
    this.root.activeElement = this;
    previous?.dispatchEvent(new Event('blur'));
    this.dispatchEvent(new Event('focus'));
  }
  select() {
    this.setSelectionRange(0, this.value.length, 'none');
  }
  setSelectionRange(start, end, direction = 'none') {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  }
  getBoundingClientRect() {
    return { left: 40, top: 40, width: 160, height: 32 };
  }
}

export function inlineFixture(t, label = '') {
  const previous = globalThis.document;
  const root = { headers: [], activeElement: null };
  const elements = new Map();
  root.createElement = (tag) => new Element(root, tag);
  root.querySelectorAll = (selector) => (selector === '[data-node-header]' ? root.headers : []);
  root.querySelector = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new Element(root));
    return elements.get(selector);
  };
  root.querySelector('#viewport').getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  });
  globalThis.document = root;
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  let locked = false,
    cancellations = 0,
    opened = 0;
  const state = {
    project: {
      version: 1,
      name: 'Inline label',
      nodes: [{ id: 'source', type: 'switch', x: 0, y: 0, label, params: { value: 0 } }],
      wires: [],
    },
    view: { x: 20, y: 30, zoom: 0.58 },
    selected: new Set(['source']),
    undoStack: [],
    redoStack: [],
    pending: { node: 'source' },
    gesture: {},
    classroom: { isLocked: () => locked },
  };
  const calls = [];
  let editor;
  const services = { classroom: { allowEdit: () => !locked }, learning: { renderLesson() {} } };
  const actions = {
    cancelInteraction() {
      cancellations++;
      state.pending = null;
      state.gesture = null;
    },
    changed: () => render(),
    notify() {},
  };
  const context = { state, services, actions, t: (value) => value };
  Object.assign(actions, createHistory(context));
  const commands = createCommands(context);
  const navigation = createComponentNavigation(
    state,
    {
      applyView() {},
      isKeyboard: () => true,
      selectNode: () => opened++,
    },
    root,
  );
  editor = createInlineNodeLabel(
    state,
    {
      canEdit: () => !locked,
      renameNode: (id, value) => {
        calls.push([id, value]);
        return commands.renameNode(id, value);
      },
      beforeBegin: actions.cancelInteraction,
      restoreFocus: (id) => navigation.returnFocus(id, { reveal: false }),
      labelPlaceholder: () => 'Switch',
      editLabel: () => 'Label',
    },
    root,
  );
  function render() {
    editor.beforeRender();
    root.headers = state.project.nodes.map((node) => {
      const header = new Element(root);
      header.dataset.nodeHeader = node.id;
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      navigation.bind(header);
      editor.bind(header);
      return header;
    });
    editor.restoreAfterRender();
  }
  render();
  function event(element, type, values = {}) {
    const event = Object.assign(new Event(type, { cancelable: true, bubbles: true }), values);
    element.dispatchEvent(event);
    return event;
  }
  return {
    state,
    root,
    editor,
    calls,
    render,
    actions,
    get header() {
      return root.headers[0];
    },
    get input() {
      return root.headers[0]?.children[0];
    },
    get cancellations() {
      return cancellations;
    },
    get opened() {
      return opened;
    },
    locked: (value) => {
      locked = value;
    },
    begin() {
      return event(root.headers[0], 'dblclick');
    },
    type(value) {
      this.input.value = value;
      event(this.input, 'input');
    },
    event,
    key(key, values = {}) {
      return event(this.input, 'keydown', { key, ...values });
    },
  };
}

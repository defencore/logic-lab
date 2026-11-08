import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS } from '../../src/components/catalog/index.js';
import {
  componentHeaderMarkup,
  createComponentNavigation,
} from '../../src/workbench/component-keyboard.js';

function fixture() {
  const state = {
    project: {
      nodes: [
        { id: 'source', type: 'switch', x: 0, y: 0, params: {} },
        { id: 'memory', type: 'd_ff', x: 300, y: 0, params: {} },
        { id: 'background', type: 'group', x: 1200, y: 800, params: { width: 3000, height: 2000 } },
      ],
    },
    view: { x: 8, y: 10, zoom: 0.58 },
    selected: new Set(),
    undoStack: [],
  };
  let keyboard = false,
    updates = 0;
  let headers = [],
    sources = [];
  const selected = [];
  const root = {
    activeElement: null,
    querySelector: () => ({
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    }),
    querySelectorAll: (selector) => (selector === '[data-node-header]' ? headers : sources),
  };
  const navigation = createComponentNavigation(
    state,
    {
      applyView: () => updates++,
      isKeyboard: () => keyboard,
      selectNode: (...args) => {
        selected.push(args);
        state.selected = new Set([args[0]]);
      },
    },
    root,
  );
  function control(node, kind) {
    const element = new EventTarget();
    const field = kind === 'header' ? 'nodeHeader' : 'switch';
    element.dataset = { [field]: node.id };
    element.closest = (selector) =>
      selector === (kind === 'header' ? '[data-node-header]' : '[data-switch]') ? element : null;
    element.getBoundingClientRect = () => ({
      left: node.x * state.view.zoom + state.view.x,
      top: node.y * state.view.zoom + state.view.y,
      width: 160 * state.view.zoom,
      height: 32 * state.view.zoom,
    });
    element.focus = () => {
      if (root.activeElement === element) return;
      root.activeElement = element;
      element.dispatchEvent(new Event('focus'));
    };
    if (kind === 'header') navigation.bind(element);
    return element;
  }
  function render() {
    headers = state.project.nodes.map((node) => control(node, 'header'));
    sources = [control(state.project.nodes[0], 'source')];
  }
  render();
  return {
    state,
    root,
    navigation,
    selected,
    render,
    get headers() {
      return headers;
    },
    get source() {
      return sources[0];
    },
    get updates() {
      return updates;
    },
    keyboard: (value) => {
      keyboard = value;
    },
    key(header, key, options = {}) {
      const event = Object.assign(new Event('keydown', { cancelable: true }), { key, ...options });
      header.dispatchEvent(event);
      return event;
    },
  };
}

test('every catalog component has a separately named keyboard header without wrapping native controls', () => {
  for (const definition of COMPONENTS) {
    const markup = componentHeaderMarkup(
      { id: 'existing', type: definition.type },
      definition.label,
      'Properties',
    );
    assert.match(markup, /data-node-header="existing" tabindex="0" role="button"/);
    assert.match(markup, /aria-label=".+ · Properties"/);
    assert.match(markup, /aria-controls="inspector-content"/);
    assert.doesNotMatch(markup, /<button|<input/);
  }
  assert.match(
    componentHeaderMarkup({ id: 'test' }, '<My "gate">', 'Properties'),
    /&lt;My &quot;gate&quot;&gt;/,
  );
});

test('Enter and Space open the chosen component properties without changing circuit data or Undo', () => {
  const f = fixture();
  const original = JSON.stringify(f.state.project);
  for (const key of ['Enter', ' ']) {
    const event = f.key(f.headers[1], key);
    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(f.selected.at(-1), ['memory', { inspect: true }]);
    assert.deepEqual([...f.state.selected], ['memory']);
  }
  assert.equal(JSON.stringify(f.state.project), original);
  assert.equal(f.state.undoStack.length, 0);
  for (const options of [
    { repeat: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { isComposing: true },
  ])
    f.key(f.headers[1], 'Enter', options);
  assert.equal(f.selected.length, 2);
});

test('header arrows and Home/End navigate components without nudging or deleting another selection', () => {
  const f = fixture();
  f.keyboard(true);
  const original = JSON.stringify(f.state.project);
  f.headers[0].focus();
  assert.equal(f.key(f.headers[0], 'ArrowRight').defaultPrevented, true);
  assert.equal(f.root.activeElement, f.headers[1]);
  f.key(f.headers[1], 'End');
  assert.equal(f.root.activeElement, f.headers[2]);
  f.key(f.headers[2], 'Home');
  assert.equal(f.root.activeElement, f.headers[0]);
  for (const key of ['Delete', 'Backspace'])
    assert.equal(f.key(f.headers[0], key).defaultPrevented, true);
  assert.equal(f.key(f.headers[0], 'Tab').defaultPrevented, false);
  assert.equal(f.selected.length, 0);
  assert.equal(JSON.stringify(f.state.project), original);
});

test('keyboard focus reveals even a large group header while pointer focus preserves 58% view', () => {
  const f = fixture(),
    originalView = { ...f.state.view };
  f.headers[2].focus();
  assert.deepEqual(f.state.view, originalView);
  assert.equal(f.updates, 0);
  f.root.activeElement = null;
  f.keyboard(true);
  f.headers[2].focus();
  assert.equal(f.state.view.zoom, 0.85);
  const position = f.headers[2].getBoundingClientRect();
  assert.ok(position.left >= 24 && position.left < 800);
  assert.ok(position.top >= 24 && position.top < 600);
  assert.equal(f.selected.length, 0, 'focusing a header does not mutate or activate it');
});

test('header and source focus survive keyed rerenders, and closing properties can return to the component', () => {
  const f = fixture();
  for (const kind of ['header', 'source']) {
    const old = kind === 'header' ? f.headers[1] : f.source;
    old.focus();
    const remembered = f.navigation.captureFocus();
    f.render();
    assert.equal(f.navigation.restoreFocus(remembered), true);
    assert.notEqual(f.root.activeElement, old);
    assert.equal(f.root.activeElement, kind === 'header' ? f.headers[1] : f.source);
  }
  f.key(f.headers[1], 'Enter');
  f.root.activeElement = null;
  assert.equal(f.navigation.returnFocus(), true);
  assert.equal(f.root.activeElement, f.headers[1]);
  assert.equal(f.navigation.returnFocus('source'), true);
  assert.equal(f.root.activeElement, f.headers[0]);
  assert.equal(f.navigation.returnFocus('deleted'), false);
});

test('assistive activation opens properties once while ordinary pointer click leaves existing drag selection intact', () => {
  const f = fixture();
  f.headers[0].dispatchEvent(Object.assign(new Event('click'), { detail: 0 }));
  assert.deepEqual(f.selected, [['source', { inspect: true }]]);
  f.headers[0].dispatchEvent(Object.assign(new Event('click'), { detail: 1 }));
  assert.equal(f.selected.length, 1);
});

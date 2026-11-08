import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneLinks, scenePickedContact } from '../../src/workbench/scene-links.js';
import {
  inspectionMatches,
  inspectionTargets,
  tagSceneObject,
} from '../../src/scenes/common/inspection.js';

test('linked inspection highlights a physical scene contact without changing inputs, history or viewport; explicit picking reveals it', (t) => {
  const original = globalThis.document;
  const classes = () => ({
    values: new Set(),
    toggle(name, on) {
      on ? this.values.add(name) : this.values.delete(name);
    },
  });
  const plant = { dataset: { node: 'tank' }, classList: classes() };
  const wire = { dataset: { wire: 'feed' }, classList: classes() };
  const pin = {
    dataset: { node: 'tank', pin: 'pump', side: 'in' },
    classList: classes(),
    focus() {
      this.focused = true;
    },
  };
  const button = {
    dataset: { sceneNode: 'tank', sceneContact: 'pump', sceneSide: 'in' },
    setAttribute(key, value) {
      this[key] = value;
    },
  };
  const nodeRoot = {},
    wireRoot = {};
  globalThis.document = {
    querySelector(selector) {
      return selector === '#nodes'
        ? { firstElementChild: nodeRoot }
        : selector === '#wires'
          ? { firstElementChild: wireRoot }
          : selector === '#viewport'
            ? { clientWidth: 700, clientHeight: 400 }
            : null;
    },
    querySelectorAll(selector) {
      return selector === '.circuit-node'
        ? [plant]
        : selector === '.wire-group'
          ? [wire]
          : selector === '.pin'
            ? [pin]
            : selector === '[data-scene-contact]'
              ? [button]
              : [];
    },
  };
  t.after(() => {
    globalThis.document = original;
  });
  const project = {
    nodes: [
      { id: 'tank', type: 'water_tank', x: 300, y: 200, params: {} },
      { id: 'source', type: 'switch', x: 0, y: 0, params: { value: 1 } },
    ],
    wires: [
      { id: 'feed', from: { node: 'source', port: 'out' }, to: { node: 'tank', port: 'pump' } },
    ],
  };
  const before = structuredClone(project);
  const state = {
    project,
    selected: new Set(['source']),
    selectedWire: null,
    view: { x: 20, y: 30, zoom: 0.5 },
  };
  const viewBefore = { ...state.view },
    calls = [];
  const renderer = { select: (selection) => calls.push(selection) };
  const links = createSceneLinks(
    state,
    { setWorkspaceView() {}, selectionChanged() {}, applyView() {}, persist() {} },
    () => ({ type: 'water_tank', nodeId: 'tank' }),
    () => renderer,
  );
  links.inspect({ node: 'source', port: 'out', side: 'out' });
  assert.deepEqual(state.view, viewBefore);
  assert.deepEqual([...state.selected], ['source']);
  assert.deepEqual(calls.at(-1), { nodeId: 'tank', port: 'pump', side: 'in' });
  assert.equal(button['aria-pressed'], 'true');
  assert.equal(wire.classList.values.has('scene-linked-wire'), true);
  assert.equal(pin.classList.values.has('scene-linked-pin'), true);
  const object = tagSceneObject({ userData: {} }, { port: 'pump', side: 'in' });
  const target = inspectionTargets(object, 'tank')[0];
  assert.equal(
    inspectionMatches(target, calls.at(-1)),
    true,
    'the renderer can match the editor selection',
  );
  links.inspect(scenePickedContact(target), { reveal: true });
  assert.deepEqual([...state.selected], ['tank']);
  assert.equal(state.view.zoom, 0.75);
  assert.equal(pin.focused, true);
  assert.deepEqual(project, before);
  links.clear();
  assert.equal(button['aria-pressed'], 'false');
  assert.equal(wire.classList.values.has('scene-linked-wire'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { updateSceneMetadata } from '../../src/workbench/scene-metadata.js';

function textElement(text = '', dataset = {}) {
  return {
    dataset,
    textContent: text,
    set innerHTML(_value) {
      throw new Error('Metadata changes must not rebuild active controls.');
    },
  };
}

test('scene renames and keyboard binding changes patch labels while preserving numeric editing controls', () => {
  const state = {
    project: {
      nodes: [
        { id: 'tank', type: 'water_tank', label: 'Tank', params: {} },
        { id: 'key', type: 'hotkey', label: 'Pump key', params: { binding: 'KeyA' } },
        { id: 'clock', type: 'clock', label: 'Timer', params: { frequency: 1 } },
      ],
      wires: [],
    },
  };
  const heading = textElement('Tank'),
    group = textElement('Tank', { sceneGroupLabel: 'tank' }),
    option = Object.assign(textElement('Tank'), { value: 'tank' }),
    keyLabel = textElement('Pump key'),
    clockLabel = textElement('Timer'),
    binding = textElement('KeyA');
  const input = { value: '1e', selectionStart: 2, selectionEnd: 2, focused: true };
  const keySource = {
    dataset: { sceneSource: 'key' },
    querySelector: (selector) => (selector === 'kbd' ? binding : null),
  };
  const clockSource = {
    dataset: { sceneSource: 'clock' },
    querySelector: (selector) => (selector === 'input' ? input : null),
  };
  keyLabel.closest = () => keySource;
  clockLabel.closest = () => clockSource;
  const panel = {
    querySelector: (selector) => (selector === '[data-scene-title]' ? heading : null),
    querySelectorAll: (selector) =>
      selector === '[data-scene-group-label]'
        ? [group]
        : selector === '[data-scene-source-label]'
          ? [keyLabel, clockLabel]
          : selector === '#scene-select option'
            ? [option]
            : [],
    set innerHTML(_value) {
      throw new Error('The existing scene panel must be retained.');
    },
  };
  const entry = { id: 'tank', nodeId: 'tank', type: 'water_tank' };
  state.project.nodes[0].label = 'Reservoir <new>';
  state.project.nodes[1].label = 'Клавіша помпи';
  state.project.nodes[1].params.binding = 'Shift+KeyK';
  state.project.nodes[2].label = 'Clock renamed';
  const before = structuredClone(state.project);
  updateSceneMetadata(
    state,
    entry,
    (key) => key,
    (definition) => definition.label,
    panel,
  );
  assert.equal(heading.textContent, 'Reservoir <new>');
  assert.equal(group.textContent, 'Reservoir <new>');
  assert.equal(option.textContent, 'Reservoir <new>');
  assert.equal(keyLabel.textContent, 'Клавіша помпи');
  assert.equal(binding.textContent, 'Shift+KeyK');
  assert.equal(clockLabel.textContent, 'Clock renamed');
  assert.equal(clockSource.querySelector('input'), input);
  assert.deepEqual(input, { value: '1e', selectionStart: 2, selectionEnd: 2, focused: true });
  assert.deepEqual(state.project, before);

  state.project.nodes[1].label = '';
  state.project.nodes[1].params.binding = '';
  updateSceneMetadata(
    state,
    entry,
    (key) => key,
    (definition) => definition.ua,
    panel,
  );
  assert.equal(keyLabel.textContent, 'Hotkey · Клавіша клавіатури');
  assert.equal(binding.textContent, '—');
  assert.equal(clockSource.querySelector('input'), input);
  assert.equal(input.value, '1e');
});

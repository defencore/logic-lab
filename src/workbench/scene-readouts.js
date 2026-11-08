import { getDefinition } from '../components/catalog/index.js';
import { sceneHealth, sceneMessageKey, sceneActuatorValues } from '../scenes/data/scenarios.js';
import { $, $$, format, signalClass } from '../shared/ui.js';
import { icon } from '../shared/icons.js';
import { signalUnit } from './signal-unit.js';

const primarySignals = {
  aquarium: ['temperature', 'oxygen', 'alive', 'health'],
  greenhouse: ['temperature', 'moisture', 'growth', 'health'],
  smart_home: ['temperature', 'water', 'energy'],
  elevator: ['position', 'door_position', 'moving', 'fault'],
};

export function sceneInputValue(snapshot, pin) {
  if (snapshot.node.enabled === false) return 'Z';
  const physical = snapshot.physicalInputs?.[pin.id];
  // Aggregate X does not erase known pins. Only a wholly floating word uses its model default.
  if (
    pin.group &&
    physical !== undefined &&
    (physical !== 'Z' || snapshot.inputs[pin.group] !== 'Z')
  )
    return physical;
  const value = sceneActuatorValues(snapshot)[pin.group || pin.id];
  return pin.group && typeof value === 'number' ? (value >> pin.bit) & 1 : value;
}

export function updateSceneReadouts(state, entry, snapshot, t, links) {
  $$('[data-scene-contact]').forEach((button) => {
    const id = button.dataset.sceneNode;
    const side = button.dataset.sceneSide;
    const port = button.dataset.sceneContact;
    const node = state.project.nodes.find((node) => node.id === id);
    const definition = getDefinition(node?.type);
    const pin = definition?.[side === 'in' ? 'inputs' : 'outputs'].find((pin) => pin.id === port);
    const value =
      entry.type !== 'mechanics' && side === 'in'
        ? sceneInputValue(snapshot, pin)
        : state.runtime[side === 'in' ? 'inputs' : 'outputs']?.[id]?.[port];
    const readout = $('[data-scene-value]', button);
    const unit = pin && typeof value === 'number' ? signalUnit(node, pin, side, state.lang) : '';
    const text = `${format(value)}${unit ? ` ${unit}` : ''}`;
    if (readout.textContent !== text) readout.textContent = text;
    readout.className = `signal-value ${signalClass(value)}`;
  });
  const summary = $('#scene-summary');
  if (entry.type !== 'mechanics') {
    const definition = getDefinition(snapshot.node.type);
    const content = (primarySignals[snapshot.node.type] || [])
      .map((id) => {
        const port = definition.signals.outputs.find((port) => port.id === id);
        const unit = signalUnit(snapshot.node, port, 'out', state.lang);
        return `${port.label}: ${format(snapshot.outputs[id])}${unit ? ` ${unit}` : ''}`;
      })
      .join(' · ');
    if (summary.textContent !== content) summary.textContent = content;
    const health = sceneHealth(snapshot);
    const status = $('#scene-health');
    const message = t(sceneMessageKey(snapshot, health.reason));
    if (status.textContent !== message) status.textContent = message;
    status.dataset.status = health.status;
  }
  const label = links.describe() || t('sceneChooseObject');
  if ($('#scene-linked-contact').textContent !== label)
    $('#scene-linked-contact').textContent = label;
  if (!state.classroom?.isPlaying()) {
    const button = $('#motion-run');
    button.disabled = false;
    const label = t(state.running ? 'pause' : 'run');
    if (button.textContent !== label)
      button.innerHTML = icon(state.running ? 'pause' : 'play', 14) + `<span>${label}</span>`;
    $('#motion-reset').disabled = false;
  } else state.classroom.refreshTransport();
}

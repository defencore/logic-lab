import { icon } from '../shared/icons.js';
import { $, $$ } from '../shared/ui.js';
import { checkConnection } from '../circuits/connections.js';
import { uid } from './model.js';
export function createConnections(context) {
  const { state, services, actions, t } = context;
  function pinPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    $('#viewport').focus({ preventScroll: true });
    if (services.wiring.pinPointerDown(e)) return;
    if (services.classroom && !services.classroom.allowEdit()) return;
    const pin = e.currentTarget;
    const current = { node: pin.dataset.node, port: pin.dataset.pin, side: pin.dataset.side };
    if (state.pending) {
      actions.completeWire(current);
      return;
    }
    state.pending = { ...current, points: [], startX: e.clientX, startY: e.clientY };
    pin.classList.add('connecting');
    $('#canvas-tip').textContent = t('connect');
  }
  function completeWire(target) {
    if (!state.pending) return;
    if (state.project.wires.length >= 5000) {
      actions.notify(t('limitReached'));
      actions.cancelWire();
      return;
    }
    if (
      state.pending.node === target.node &&
      state.pending.port === target.port &&
      state.pending.side === target.side
    ) {
      actions.cancelWire();
      return;
    }
    if (state.pending.side === target.side) {
      actions.notify(t('connectHint'));
      return;
    }
    const source = state.pending.side === 'out' ? state.pending : target,
      destination = state.pending.side === 'in' ? state.pending : target;
    const check = checkConnection(state.project, source, destination);
    if (!check.ok) {
      if (check.reason === 'duplicate') actions.cancelWire();
      else actions.notify(t('incompatible'));
      return;
    }
    actions.checkpoint();
    const points =
      state.pending.side === 'out' ? state.pending.points : [...state.pending.points].reverse();
    state.project.wires.push({
      id: uid('w'),
      from: { node: source.node, port: source.port },
      to: { node: destination.node, port: destination.port },
      width: check.width,
      points,
    });
    actions.cancelWire();
    actions.changed();
    actions.notify(t('connection'));
  }
  function cancelWire() {
    state.pending = null;
    $('#draft').setAttribute('d', '');
    $$('.connecting').forEach((el) => el.classList.remove('connecting'));
    $('#canvas-tip').innerHTML =
      icon('wire', 15) + t(state.project.exampleId === 'half-adder' ? 'tutorial' : 'connectHint');
  }
  return { pinPointerDown, completeWire, cancelWire };
}

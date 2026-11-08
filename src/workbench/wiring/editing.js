import { $ } from '../../shared/ui.js';
import { checkConnection } from '../../circuits/connections.js';
import {
  wireVertices,
  nearestWireSegment,
  moveWireVertex,
  moveWireSegment,
  insertWirePoint,
  removeWireVertex,
  snap,
} from '../../circuits/geometry/index.js';
import { copyPoints, equalPoints } from './session.js';
export function createEditing(context) {
  const { state, options, commands, project, wire, position, t } = context;
  function refresh() {
    if (!wire()) {
      state.activeHandle = null;
      state.action = null;
    }
    commands.applyTrace();
    commands.renderEditor();
    commands.renderContext();
  }
  function commitPoints(points, target = null, kind = 'bend') {
    if (options.canEdit && !options.canEdit()) return false;
    const item = wire();
    if (!item || !points || equalPoints(item.points, points)) return false;
    if (points.length > 100) {
      options.notify(t('limitReached'));
      return false;
    }
    const before = options.snapshot();
    item.points = copyPoints(points);
    if (target) {
      const vertices = wireVertices(item, project());
      if (kind === 'segment') {
        const nearest = nearestWireSegment(vertices, target);
        state.activeHandle = nearest ? { kind: 'segment', index: nearest.index } : null;
      } else {
        const index = vertices.findIndex(
          (point) => Math.hypot(point.x - target.x, point.y - target.y) < 0.01,
        );
        state.activeHandle =
          index > 0 && index < vertices.length - 1 ? { kind: 'bend', index } : null;
      }
    }
    options.commit(before);
    return true;
  }
  function removeBend() {
    const item = wire();
    if (!item || state.activeHandle?.kind !== 'bend') return false;
    const points = removeWireVertex(wireVertices(item, project()), state.activeHandle.index);
    state.activeHandle = null;
    commands.commitPoints(points);
    commands.refresh();
    return true;
  }
  function addBend(point) {
    const item = wire();
    if (!item) return;
    state.action = null;
    const vertices = wireVertices(item, project());
    const nearest = nearestWireSegment(vertices, point);
    const target =
      nearest && nearest.distance * options.getView().zoom <= 10
        ? nearest.point
        : { x: snap(point.x), y: snap(point.y) };
    commands.commitPoints(insertWirePoint(vertices, target), target);
    commands.refresh();
  }
  function reconnect(pin) {
    if (options.canEdit && !options.canEdit()) return false;
    const item = wire();
    if (!item || pin.side !== state.action?.side) {
      options.notify(t('incompatible'));
      return false;
    }
    const from = pin.side === 'out' ? { node: pin.node, port: pin.port } : item.from;
    const to = pin.side === 'in' ? { node: pin.node, port: pin.port } : item.to;
    const check = checkConnection(project(), from, to, { excludeWire: item.id });
    if (!check.ok) {
      options.notify(t(check.reason === 'duplicate' ? 'wireDuplicate' : 'incompatible'));
      return false;
    }
    const before = options.snapshot();
    const same =
      item.from.node === from.node &&
      item.from.port === from.port &&
      item.to.node === to.node &&
      item.to.port === to.port;
    state.action = null;
    if (!same) {
      item.from = { ...from };
      item.to = { ...to };
      item.width = check.width;
      options.commit(before);
    }
    commands.refresh();
    return true;
  }
  function clear({ refreshInspector = true } = {}) {
    commands.cancelGesture();
    state.action = null;
    state.activeHandle = null;
    state.traceSeed = null;
    state.hoverSeed = null;
    commands.refresh();
    if (refreshInspector) options.refreshInspector();
  }
  function blankPointerDown(event) {
    $('#viewport').focus({ preventScroll: true });
    if (state.action?.kind === 'add') {
      event.preventDefault();
      commands.addBend(position(event));
      return true;
    }
    if (state.action?.kind === 'reconnect') {
      state.action = null;
      commands.refresh();
      return true;
    }
    if (options.getTool() === 'trace') {
      commands.clear();
      return true;
    }
    if (state.traceSeed) {
      state.traceSeed = null;
      commands.applyTrace();
      commands.renderContext();
    }
    return false;
  }
  function keyDown(event) {
    if (options.getTool() !== 'select') return false;
    if (
      state.drag &&
      ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      return true;
    }
    if (['Delete', 'Backspace'].includes(event.key) && state.action) {
      event.preventDefault();
      state.action = null;
      commands.refresh();
      return true;
    }
    if (
      ['Delete', 'Backspace'].includes(event.key) &&
      state.activeHandle &&
      state.activeHandle.kind !== 'bend'
    ) {
      event.preventDefault();
      state.activeHandle = null;
      commands.refresh();
      return true;
    }
    if (['Delete', 'Backspace'].includes(event.key) && state.activeHandle?.kind === 'bend') {
      event.preventDefault();
      commands.removeBend();
      return true;
    }
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
      !wire() ||
      !state.activeHandle
    )
      return false;
    const amount = event.shiftKey ? 100 : 20;
    const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
    const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
    const vertices = wireVertices(wire(), project());
    event.preventDefault();
    if (state.activeHandle.kind === 'bend') {
      const point = vertices[state.activeHandle.index];
      if (point)
        commands.commitPoints(
          moveWireVertex(vertices, state.activeHandle.index, { x: point.x + dx, y: point.y + dy }),
          { x: point.x + dx, y: point.y + dy },
        );
    } else if (state.activeHandle.kind === 'segment') {
      const a = vertices[state.activeHandle.index],
        b = vertices[state.activeHandle.index + 1];
      if (a && b) {
        const delta = a.y === b.y ? dy : dx;
        const target =
          a.y === b.y
            ? { x: (a.x + b.x) / 2, y: a.y + delta }
            : { x: a.x + delta, y: (a.y + b.y) / 2 };
        commands.commitPoints(
          moveWireSegment(vertices, state.activeHandle.index, delta),
          target,
          'segment',
        );
      }
    }
    return true;
  }
  return {
    refresh,
    commitPoints,
    removeBend,
    addBend,
    reconnect,
    clear,
    blankPointerDown,
    keyDown,
  };
}

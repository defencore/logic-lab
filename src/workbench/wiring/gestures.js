import { $ } from '../../shared/ui.js';
import {
  wireVertices,
  nearestWireSegment,
  moveWireVertex,
  moveWireSegment,
  snap,
} from '../../circuits/geometry/index.js';
import { copyPoints, equalPoints } from './session.js';
export function createGestures(context) {
  const { state, options, commands, project, wire, position, pinFromElement } = context;
  function startDrag(event, kind, index) {
    if (options.canEdit && !options.canEdit()) return;
    const item = wire();
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    $('#viewport').focus({ preventScroll: true });
    options.cancelConnection();
    state.action = null;
    const vertices = wireVertices(item, project());
    state.activeHandle = { kind, index };
    state.drag = {
      kind,
      index,
      side: kind === 'endpoint' ? index : null,
      wireId: item.id,
      vertices,
      points: copyPoints(item.points),
      before: options.snapshot(),
      previewPoints: null,
      start: position(event),
      screen: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
      moved: false,
    };
    $('#viewport').setPointerCapture(event.pointerId);
    commands.renderEditor();
    commands.renderContext();
  }
  function wirePointerDown(event) {
    const hit = event.target.closest('.wire-hit');
    if (!hit || event.button !== 0) return;
    $('#viewport').focus({ preventScroll: true });
    event.preventDefault();
    event.stopPropagation();
    if (state.action?.kind === 'add') {
      commands.addBend(position(event));
      return;
    }
    const hitPoint = position(event);
    const id = hit.closest('[data-wire]').dataset.wire;
    commands.setTrace({ wire: id });
    options.selectWire(id);
    if (options.getTool() !== 'select') return;
    const item = wire();
    const nearest = nearestWireSegment(wireVertices(item, project()), hitPoint);
    if (nearest) commands.startDrag(event, 'segment', nearest.index);
  }
  function pinPointerDown(event) {
    const pin = pinFromElement(event.currentTarget);
    if (state.action?.kind === 'reconnect') {
      event.preventDefault();
      event.stopPropagation();
      commands.reconnect(pin);
      return true;
    }
    if (options.getTool() === 'trace') {
      event.preventDefault();
      event.stopPropagation();
      commands.setTrace(pin);
      return true;
    }
    return false;
  }
  function pointerMove(event) {
    if (!state.drag) return false;
    if (event.pointerId !== state.drag.pointerId) return true;
    const item = project().wires.find((candidate) => candidate.id === state.drag.wireId);
    if (!item) {
      commands.cancelGesture();
      return true;
    }
    const point = position(event);
    const distance = Math.hypot(
      event.clientX - state.drag.screen.x,
      event.clientY - state.drag.screen.y,
    );
    if (distance < 3 && !state.drag.moved) return true;
    state.drag.moved = true;
    if (state.drag.kind === 'endpoint') {
      state.drag.point = point;
      commands.renderEditor();
      return true;
    }
    let points;
    if (state.drag.kind === 'bend') {
      const base = state.drag.vertices[state.drag.index];
      points = moveWireVertex(state.drag.vertices, state.drag.index, {
        x: base.x + snap(point.x - state.drag.start.x),
        y: base.y + snap(point.y - state.drag.start.y),
      });
    } else {
      const a = state.drag.vertices[state.drag.index],
        b = state.drag.vertices[state.drag.index + 1];
      const delta =
        a.y === b.y ? snap(point.y - state.drag.start.y) : snap(point.x - state.drag.start.x);
      points = moveWireSegment(state.drag.vertices, state.drag.index, delta);
    }
    state.drag.previewPoints = points && points.length <= 100 ? points : null;
    const preview = state.drag.previewPoints ? { ...item, points: state.drag.previewPoints } : item;
    const vertices = wireVertices(preview, project());
    if (state.drag.kind === 'bend') {
      const base = state.drag.vertices[state.drag.index];
      const target = {
        x: base.x + snap(point.x - state.drag.start.x),
        y: base.y + snap(point.y - state.drag.start.y),
      };
      let closest = 1;
      for (let i = 2; i < vertices.length - 1; i++)
        if (
          Math.hypot(vertices[i].x - target.x, vertices[i].y - target.y) <
          Math.hypot(vertices[closest].x - target.x, vertices[closest].y - target.y)
        )
          closest = i;
      state.activeHandle = { kind: 'bend', index: closest };
    } else {
      const a = state.drag.vertices[state.drag.index],
        b = state.drag.vertices[state.drag.index + 1];
      const target =
        a.y === b.y
          ? { x: (a.x + b.x) / 2, y: a.y + snap(point.y - state.drag.start.y) }
          : { x: a.x + snap(point.x - state.drag.start.x), y: (a.y + b.y) / 2 };
      const nearest = nearestWireSegment(vertices, target);
      state.activeHandle = nearest ? { kind: 'segment', index: nearest.index } : null;
    }
    commands.updateGeometry(preview);
    return true;
  }
  function releaseCapture(pointerId) {
    if ($('#viewport').hasPointerCapture(pointerId))
      $('#viewport').releasePointerCapture(pointerId);
  }
  function pointerUp(event) {
    if (!state.drag) return false;
    if (event.pointerId !== state.drag.pointerId) return true;
    const old = state.drag;
    state.drag = null;
    commands.releaseCapture(old.pointerId);
    const item = project().wires.find((candidate) => candidate.id === old.wireId);
    if (!item) return true;
    if (old.kind === 'endpoint') {
      state.action = { kind: 'reconnect', side: old.side };
      if (old.moved) {
        const hit = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest('.pin'))
          .find(Boolean);
        if (!hit || !commands.reconnect(pinFromElement(hit))) {
          state.action = null;
          commands.refresh();
        }
      } else commands.refresh();
    } else if (old.previewPoints && !equalPoints(old.points, old.previewPoints)) {
      item.points = copyPoints(old.previewPoints);
      options.commit(old.before);
      commands.refresh();
    } else {
      commands.updateGeometry(item);
      commands.refresh();
    }
    return true;
  }
  function cancelGesture() {
    if (!state.drag) return;
    const old = state.drag;
    state.drag = null;
    const item = project().wires.find((candidate) => candidate.id === old.wireId);
    if (item) {
      state.activeHandle = { kind: old.kind, index: old.index };
      commands.updateGeometry(item);
    }
    commands.releaseCapture(old.pointerId);
  }
  return {
    startDrag,
    wirePointerDown,
    pinPointerDown,
    pointerMove,
    releaseCapture,
    pointerUp,
    cancelGesture,
  };
}

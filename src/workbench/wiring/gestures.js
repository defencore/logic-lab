import { $ } from '../../shared/ui.js';
import {
  wireVertices,
  nearestWireSegment,
  wireSegmentSpan,
  moveWireVertex,
  moveWireSegmentTo,
} from '../../circuits/geometry/index.js';
import { nearestAlignment, segmentAlignment } from './alignment.js';
import { copyPoints, equalPoints } from './session.js';
export function createGestures(context) {
  const { state, options, commands, project, wire, position, pinFromElement } = context;
  function startDrag(event, kind, index) {
    if (options.canEdit && !options.canEdit()) return;
    const item = wire();
    if (!item) return;
    const vertices = wireVertices(item, project());
    const segment = kind === 'segment' ? wireSegmentSpan(vertices, index) : null;
    if (kind === 'segment' && !segment) return;
    event.preventDefault();
    event.stopPropagation();
    $('#viewport').focus({ preventScroll: true });
    options.cancelConnection();
    state.action = null;
    const cross = segment
      ? vertices[segment.start].y === vertices[segment.end].y
        ? 'y'
        : 'x'
      : null;
    state.activeHandle = { kind, index: segment?.start ?? index };
    state.drag = {
      kind,
      index: state.activeHandle.index,
      segment,
      cross,
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
    const drag = state.drag;
    if (!drag) return false;
    if (event.pointerId !== drag.pointerId) return true;
    const item = project().wires.find((candidate) => candidate.id === drag.wireId);
    if (!item) {
      commands.cancelGesture();
      return true;
    }
    const point = position(event);
    const dx = event.clientX - drag.screen.x;
    const dy = event.clientY - drag.screen.y;
    const distance = drag.cross ? Math.abs(drag.cross === 'x' ? dx : dy) : Math.hypot(dx, dy);
    if (distance < 3 && !drag.moved) return true;
    drag.moved = true;
    if (drag.kind === 'endpoint') {
      drag.point = point;
      commands.renderEditor();
      return true;
    }
    let target;
    let points;
    if (drag.kind === 'bend') {
      const base = drag.vertices[drag.index];
      target = {
        x: base.x + (point.x - drag.start.x),
        y: base.y + (point.y - drag.start.y),
      };
      points = moveWireVertex(drag.vertices, drag.index, target);
    } else {
      const { cross, vertices, segment } = drag;
      const a = vertices[segment.start];
      const b = vertices[segment.end];
      const delta = point[cross] - drag.start[cross];
      let coordinate = a[cross] + delta;
      drag.guide = null;
      if (delta && !event.altKey) {
        drag.alignment ??= segmentAlignment(project(), item, vertices, segment);
        drag.guide = nearestAlignment(drag.alignment, coordinate, options.getView().zoom);
        coordinate = drag.guide?.coordinate ?? coordinate;
      }
      target = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, [cross]: coordinate };
      points = moveWireSegmentTo(vertices, segment.start, coordinate);
      if (!points && coordinate !== a[cross]) drag.guide = null;
    }
    drag.previewPoints = points;
    const preview = points ? { ...item, points } : item;
    const vertices = wireVertices(preview, project());
    if (drag.kind === 'bend') {
      let closest = vertices.length > 2 ? 1 : null;
      for (let i = 2; i < vertices.length - 1; i++)
        if (
          Math.hypot(vertices[i].x - target.x, vertices[i].y - target.y) <
          Math.hypot(vertices[closest].x - target.x, vertices[closest].y - target.y)
        )
          closest = i;
      state.activeHandle = closest === null ? null : { kind: 'bend', index: closest };
    } else {
      const nearest = nearestWireSegment(vertices, target);
      const span = nearest && wireSegmentSpan(vertices, nearest.index);
      state.activeHandle = span ? { kind: 'segment', index: span.start } : null;
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
    if (old.moved && old.kind !== 'endpoint') commands.pointerMove(event);
    if (!state.drag) return true;
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

import { $, $$ } from '../shared/ui.js';
import {
  dimensions,
  portPoint,
  portDirection,
  route,
  wirePath,
  snap,
} from '../circuits/geometry/index.js';
import { panBy } from '../circuits/viewport.js';
import { applyNodeMovement, prepareNodeMovement } from './node-movement.js';
export function createGestures(context) {
  const { state, services, actions } = context;
  function nodePointerDown(e) {
    if (e.target.closest('button,input,textarea,select,.memory-map-scroll') || e.button !== 0)
      return;
    $('#viewport').focus({ preventScroll: true });
    services.wiring.clear();
    e.stopPropagation();
    const id = e.currentTarget.dataset.node;
    if (e.metaKey || e.ctrlKey) {
      state.selectedWire = null;
      if (e.shiftKey || state.selected.has(id)) state.selected.delete(id);
      else state.selected.add(id);
      actions.selectionChanged();
      return;
    }
    if (!state.selected.has(id)) {
      state.selected = new Set([id]);
      state.selectedWire = null;
      actions.selectionChanged();
    }
    const point = actions.worldPoint(e);
    if (services.classroom?.isLocked()) return;
    state.gesture = {
      kind: 'nodes',
      pointerId: e.pointerId,
      start: point,
      movement: prepareNodeMovement(state.project, state.selected),
      snapshot: actions.snapshot(),
      dx: 0,
      dy: 0,
      moved: false,
    };
  }
  function finishNodeMovement() {
    if (state.gesture?.kind !== 'nodes' || !state.gesture.moved) return;
    services.board?.updateWireRoutes();
    state.undoStack.push(state.gesture.snapshot);
    if (state.undoStack.length > 80) state.undoStack.shift();
    state.redoStack = [];
    actions.updateHistoryControls();
    actions.persist();
  }
  function cancelGesture() {
    services.wiring?.cancelGesture();
    finishNodeMovement();
    if (
      state.gesture?.kind === 'pan' &&
      $('#viewport')?.hasPointerCapture(state.gesture.pointerId)
    ) {
      $('#viewport').releasePointerCapture(state.gesture.pointerId);
    }
    state.gesture = null;
    state.suppressPanClick = false;
    $('#marquee')?.remove();
    $('#viewport')?.classList.remove('panning');
  }
  function cancelInteraction({ refreshInspector = true } = {}) {
    actions.cancelGesture();
    services.wiring?.clear({ refreshInspector });
    if ($('#draft')) actions.cancelWire();
  }
  function startPan(e) {
    $('#viewport').focus({ preventScroll: true });
    e.preventDefault();
    state.suppressPanClick = true;
    state.gesture = {
      kind: 'pan',
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      view: { ...state.view },
    };
    $('#viewport').classList.add('panning');
    $('#viewport').setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (services.wiring.pointerMove(e)) return;
    if (state.gesture && state.gesture.pointerId !== e.pointerId) return;
    if (state.pending) {
      const n = state.project.nodes.find((n) => n.id === state.pending.node);
      if (n) {
        const p = portPoint(n, state.pending.port, state.pending.side),
          end = actions.worldPoint(e);
        const d =
          state.pending.side === 'out'
            ? route(p, end, state.pending.points, state.project.wireStyle, null, {
                start: portDirection(n, state.pending.port, state.pending.side),
                end: { x: -1, y: 0 },
              })
            : route(end, p, [...state.pending.points].reverse(), state.project.wireStyle, null, {
                start: { x: 1, y: 0 },
                end: portDirection(n, state.pending.port, state.pending.side),
              });
        $('#draft').setAttribute('d', d);
      }
    }
    if (!state.gesture) return;
    if (state.gesture.kind === 'pan') {
      state.view = panBy(
        state.gesture.view,
        e.clientX - state.gesture.x,
        e.clientY - state.gesture.y,
      );
      actions.applyView();
      return;
    }
    if (state.gesture.kind === 'nodes') {
      const gesture = state.gesture;
      const p = actions.worldPoint(e),
        dx = snap(p.x - gesture.start.x),
        dy = snap(p.y - gesture.start.y);
      if (dx === gesture.dx && dy === gesture.dy) return;
      gesture.dx = dx;
      gesture.dy = dy;
      gesture.moved = applyNodeMovement(gesture.movement, dx, dy);
      for (const { node } of gesture.movement.nodes) {
        const el = $(`[data-node="${node.id}"].circuit-node`);
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
      }
      for (const { wire } of gesture.movement.wires) {
        const d = wirePath(wire, state.project);
        $$(`[data-wire="${wire.id}"] path`).forEach((path) => path.setAttribute('d', d));
      }
      return;
    }
    if (state.gesture.kind === 'marquee') {
      const p = actions.worldPoint(e);
      const box = $('#marquee');
      const x = Math.min(p.x, state.gesture.start.x),
        y = Math.min(p.y, state.gesture.start.y),
        w = Math.abs(p.x - state.gesture.start.x),
        h = Math.abs(p.y - state.gesture.start.y);
      Object.assign(box.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
      });
      state.gesture.end = p;
    }
  }
  function onPointerUp(e) {
    if (services.wiring.pointerUp(e)) return;
    if (state.gesture && state.gesture.pointerId !== e.pointerId) return;
    if (
      !state.gesture &&
      state.pending &&
      Math.hypot(e.clientX - state.pending.startX, e.clientY - state.pending.startY) > 5
    ) {
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((element) => element.closest('.pin'))
        .find(Boolean);
      if (hit)
        actions.completeWire({
          node: hit.dataset.node,
          port: hit.dataset.pin,
          side: hit.dataset.side,
        });
    }
    if (!state.gesture) return;
    if (state.gesture.kind === 'marquee') {
      const a = state.gesture.start,
        b = state.gesture.end || a,
        x = Math.min(a.x, b.x),
        y = Math.min(a.y, b.y),
        w = Math.abs(a.x - b.x),
        h = Math.abs(a.y - b.y);
      for (const n of state.project.nodes) {
        const dim = dimensions(n);
        if (n.x >= x && n.y >= y && n.x + dim.w <= x + w && n.y + dim.h <= y + h)
          state.selected.add(n.id);
      }
      $('#marquee')?.remove();
      actions.selectionChanged();
    }
    finishNodeMovement();
    if (state.gesture.kind === 'pan') {
      actions.persist();
      if ($('#viewport').hasPointerCapture(e.pointerId))
        $('#viewport').releasePointerCapture(e.pointerId);
      // Native clicks follow pointerup; consume the click belonging to a pan gesture.
      setTimeout(() => {
        state.suppressPanClick = false;
      }, 0);
    }
    state.gesture = null;
    $('#viewport').classList.remove('panning');
  }
  return {
    nodePointerDown,
    cancelGesture,
    cancelInteraction,
    startPan,
    onPointerMove,
    onPointerUp,
  };
}

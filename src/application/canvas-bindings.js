import { $ } from '../shared/ui.js';
import { snap } from '../circuits/geometry/index.js';
import { panBy, normalizeWheel, classifyWheel, wheelZoomFactor } from '../circuits/viewport.js';
import { boundCoordinate } from './model.js';
export function createCanvasBindings(context) {
  const { state, services, actions, t } = context;
  function bindCanvas() {
    const vp = $('#viewport');
    vp.oncontextmenu = (e) => e.preventDefault();
    // Capture forced pan before pins, sources and nodes can handle the pointer.
    vp.addEventListener(
      'pointerdown',
      (e) => {
        if (
          e.target.closest('.canvas-tools,.canvas-bottom,input,textarea,select,[contenteditable]')
        )
          return;
        if (state.gesture || services.wiring.busy) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (e.ctrlKey || e.metaKey) state.shiftHeld = false;
        else if (e.shiftKey) state.shiftHeld = true;
        actions.updateTool();
        const forcePan =
          e.button === 1 ||
          (e.button === 2 && !e.ctrlKey && !e.metaKey) ||
          state.spaceHeld ||
          state.shiftHeld ||
          state.tool === 'pan';
        if (!forcePan) return;
        e.stopImmediatePropagation();
        actions.startPan(e);
      },
      { capture: true },
    );
    vp.addEventListener(
      'click',
      (e) => {
        if (!state.suppressPanClick) return;
        e.preventDefault();
        e.stopPropagation();
      },
      { capture: true },
    );
    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.canvas-tools,.canvas-bottom,button') || e.button !== 0) return;
      if (services.wiring.blankPointerDown(e)) return;
      if (state.pending) {
        if (state.pending.points.length >= 100) {
          actions.notify(t('limitReached'));
          return;
        }
        state.pending.points.push({
          x: boundCoordinate(snap(actions.worldPoint(e).x)),
          y: boundCoordinate(snap(actions.worldPoint(e).y)),
        });
        return;
      }
      if (!e.ctrlKey && !e.metaKey) state.selected.clear();
      state.selectedWire = null;
      actions.selectionChanged();
      state.gesture = { kind: 'marquee', pointerId: e.pointerId, start: actions.worldPoint(e) };
      const box = document.createElement('div');
      box.id = 'marquee';
      box.className = 'marquee';
      $('#world').append(box);
    });
    vp.addEventListener(
      'wheel',
      (e) => {
        if (e.target.closest('.canvas-tools,.canvas-bottom')) return;
        e.preventDefault();
        if (state.gesture) return;
        const delta = normalizeWheel(e, vp.clientHeight);
        if (classifyWheel(e) === 'pan') {
          state.view = panBy(state.view, -delta.x, -delta.y);
          actions.applyView();
          actions.persist();
          return;
        }
        const r = vp.getBoundingClientRect();
        actions.zoomAt(e.clientX - r.left, e.clientY - r.top, wheelZoomFactor(delta.y));
      },
      { passive: false },
    );
    vp.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    vp.ondrop = (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/logic-lab');
      if (type) actions.addNode(type, actions.worldPoint(e));
    };
  }
  return { bindCanvas };
}

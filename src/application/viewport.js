import { $, $$ } from '../shared/ui.js';
import { dimensions, wireVertices } from '../circuits/geometry/index.js';
import {
  clampZoom,
  zoomAt as zoomViewportAt,
  screenToWorld,
  fitViewport,
} from '../circuits/viewport.js';
import { boundCoordinate } from './model.js';
export function createViewport(context) {
  const { state, services, actions } = context;
  function worldPoint(event) {
    const r = $('#viewport').getBoundingClientRect();
    return screenToWorld(state.view, { x: event.clientX - r.left, y: event.clientY - r.top });
  }
  function applyView() {
    state.view.x = boundCoordinate(state.view.x);
    state.view.y = boundCoordinate(state.view.y);
    state.view.zoom = clampZoom(state.view.zoom);
    $('#world').style.transform =
      `translate(${state.view.x}px,${state.view.y}px) scale(${state.view.zoom})`;
    $('#world').style.setProperty('--contact-scale', state.view.zoom);
    const contactHint = $('#contact-zoom-hint');
    if (contactHint) contactHint.hidden = state.view.zoom >= 0.75;
    // Keep the grid readable while preserving its alignment with circuit coordinates.
    const gridSize =
      20 * state.view.zoom * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (20 * state.view.zoom))));
    $('#viewport').style.backgroundSize = `${gridSize}px ${gridSize}px`;
    $('#viewport').style.backgroundPosition = `${state.view.x}px ${state.view.y}px`;
    $('#zoom-value').textContent = `${Math.round(state.view.zoom * 100)}%`;
    services.wiring?.renderEditor();
  }
  function fit({ readable = false, focusNode } = {}) {
    const target = state.project.nodes.find((node) => node.id === focusNode);
    const nodes = target ? [target] : state.project.nodes;
    if (!nodes.length) {
      state.view = { x: 80, y: 80, zoom: 1 };
      actions.applyView();
      actions.persist();
      return;
    }
    let minX = Math.min(...nodes.map((n) => n.x)),
      minY = Math.min(...nodes.map((n) => n.y)),
      maxX = Math.max(...nodes.map((n) => n.x + dimensions(n).w)),
      maxY = Math.max(...nodes.map((n) => n.y + dimensions(n).h));
    for (const wire of target ? [] : state.project.wires) {
      if (state.project.wireStyle === 'bezier' && !wire.points?.length) continue;
      for (const point of wireVertices(wire, state.project)) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    const el = $('#viewport');
    state.view =
      fitViewport(
        { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        { width: el.clientWidth, height: el.clientHeight },
      ) || state.view;
    if (readable && state.compactLayout.matches && state.view.zoom < 0.75) {
      const center = screenToWorld(state.view, { x: el.clientWidth / 2, y: el.clientHeight / 2 });
      state.view = {
        x: el.clientWidth / 2 - center.x * 0.75,
        y: el.clientHeight / 2 - center.y * 0.75,
        zoom: 0.75,
      };
    }
    actions.applyView();
    actions.persist();
  }
  function setTool(next) {
    actions.cancelInteraction();
    state.tool = next;
    actions.updateTool();
    services.wiring?.refresh();
  }
  function updateTool() {
    const active = state.spaceHeld || state.shiftHeld ? 'pan' : state.tool;
    $$('.canvas-tools [data-tool]').forEach((el) =>
      el.classList.toggle('active', el.dataset.tool === active),
    );
    $('#viewport').dataset.tool = active;
    $('#more-tools').classList.toggle('active', state.tool === 'trace');
  }
  function zoomAt(x, y, factor) {
    state.view = zoomViewportAt(state.view, { x, y }, factor);
    actions.applyView();
    actions.persist();
  }
  function zoomCenter(factor) {
    const el = $('#viewport');
    actions.zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  }
  function resetZoom() {
    actions.zoomCenter(1 / state.view.zoom);
  }
  function setLibraryOpen(open) {
    const library = $('#component-library');
    const wasOpen = library.classList.contains('mobile-open');
    library.classList.toggle('mobile-open', open);
    $('#library-toggle').setAttribute('aria-expanded', String(open));
    $('#library-backdrop').hidden = !open;
    if (open) {
      library.setAttribute('role', 'dialog');
      library.setAttribute('aria-modal', 'true');
      $('#search').focus();
    } else {
      library.removeAttribute('role');
      library.removeAttribute('aria-modal');
      if (wasOpen) $('#library-toggle').focus();
    }
  }
  function setToolsOpen(open) {
    $('.canvas-tools').classList.toggle('more-tools-open', open);
    $('#more-tools').setAttribute('aria-expanded', String(open));
  }
  function setWorkspaceView(next) {
    if (!['canvas', 'inspector', 'signals'].includes(next)) return;
    state.workspaceView = next;
    $('.main').dataset.workspaceView = next;
    $$('[data-workspace-view]', $('.workspace-tabs')).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.workspaceView === next));
    });
    if (next === 'signals') {
      state.monitorOpen = true;
      $('#monitor').classList.remove('collapsed');
    }
    requestAnimationFrame(() => {
      actions.applyView();
      services.monitor.draw();
    });
  }
  return {
    worldPoint,
    applyView,
    fit,
    setTool,
    updateTool,
    zoomAt,
    zoomCenter,
    resetZoom,
    setLibraryOpen,
    setToolsOpen,
    setWorkspaceView,
  };
}

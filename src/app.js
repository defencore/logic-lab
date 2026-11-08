import '../style.css';
import { getDefinition } from './catalog.js';
import { createRuntime, simulate } from './simulator.js';
import { EXAMPLES, createExample } from '../examples/index.js';
import { parseProject, serializeProject, loadProject, saveProject } from './project.js';
import { TEXT } from './i18n.js';
import { icon } from './icons.js';
import { $, $$, esc } from './ui-utils.js';
import { dimensions, portPoint, portDirection, route, wirePath, snap } from './geometry.js';
import './matrix-layout.css';
import { renderLibraryCategories, renderLibraryItems } from './catalog-ui.js';
import {
  clampZoom,
  zoomAt as zoomViewportAt,
  panBy,
  screenToWorld,
  normalizeWheel,
  classifyWheel,
  wheelZoomFactor,
  fitViewport,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
} from './navigation.js';
import { createSignalMonitor } from './workbench/signal-monitor.js';
import { SIMULATION_RATES, TIME_WINDOWS, frameSimulationDelta } from './simulation-time.js';
import { createWiringEditor } from './wiring-ui.js';
import { checkConnection } from './connections.js';
import { createBoardController } from './workbench/board-controller.js';
import { createClassroom } from './classroom-ui.js';
import { createSimulationRunner } from './workbench/simulation-runner.js';
import { createSceneController } from './workbench/scene-controller.js';
import { createInspectorController } from './workbench/inspector-controller.js';
import { createLearningController } from './workbench/learning-controller.js';
import { createDialogs, trapFocus } from './workbench/dialogs.js';
import { shellMarkup } from './workbench/shell-view.js';

let lang = 'en';
try {
  lang =
    localStorage.getItem('logic-lab.language') ||
    (navigator.language.startsWith('uk') ? 'ua' : 'en');
} catch {}
if (!TEXT[lang]) lang = 'en';
const t = (key) => TEXT[lang][key] || key;
const title = (def) => (lang === 'ua' ? def.ua || def.label : def.label);
let project = loadProject() || createExample('half-adder');
let timeBase = 1;
let simulationRate = 1;
let monitor;
let simulationRunner;
try {
  const settings = JSON.parse(localStorage.getItem('logic-lab.simulation') || '{}');
  if (SIMULATION_RATES.includes(settings.rate)) simulationRate = settings.rate;
  if (TIME_WINDOWS.includes(settings.timeBase)) timeBase = settings.timeBase;
} catch {}
function newRuntime() {
  simulationRunner?.discard();
  monitor?.stopCapture();
  const value = createRuntime();
  value.sampleInterval = timeBase / 255;
  return value;
}
let runtime = newRuntime();
let running = true;
let inspectorTab = 'properties';
let inspector;
let lessonOpen = true;
let compactLessonOpen = false;
let workspaceView = 'canvas';
const compactLayout = window.matchMedia('(max-width: 1200px), (max-height: 720px)');
let lessonStep = 0;
let highlighted = new Set();
let tool = 'select';
let spaceHeld = false;
let shiftHeld = false;
let suppressPanClick = false;
let category = 'all';
let query = '';
let selected = new Set();
let selectedWire = null;
let wiring;
let classroom;
let pending = null;
let gesture = null;
let view = project.viewport || { x: 0, y: 0, zoom: 1 };
let monitorOpen = true;
let dialogs;
let board;
let scenes;
let learning;
let undoStack = [];
let redoStack = [];
let storageTimer;
let toastTimer;
const boundCoordinate = (value) => Math.max(-1_000_000, Math.min(1_000_000, value));
const uid = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

function snapshot() {
  return JSON.stringify(project);
}
function checkpoint() {
  undoStack.push(snapshot());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
  updateHistoryControls();
}
function updateHistoryControls() {
  if ($('#undo')) $('#undo').disabled = !undoStack.length;
  if ($('#redo')) $('#redo').disabled = !redoStack.length;
}
function persist() {
  clearTimeout(storageTimer);
  storageTimer = setTimeout(() => {
    const editable = classroom?.projectToSave() || project;
    editable.viewport = { ...view };
    const ok = saveProject(editable);
    $('#save-state').innerHTML =
      icon(ok ? 'check' : 'help', 13) + esc(ok ? t('saved') : t('storageFailed'));
  }, 400);
}
function changed({ reset = false } = {}) {
  if (reset) runtime = newRuntime();
  simulate(project, runtime, 0);
  board.render();
  inspector.render();
  updateSignals();
  board.updateCounts();
  updateHistoryControls();
  classroom?.observeEdit();
  persist();
}
function notify(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}
function undo(redo = false) {
  if (classroom && !classroom.allowEdit()) return;
  cancelInteraction();
  const from = redo ? redoStack : undoStack,
    to = redo ? undoStack : redoStack;
  if (!from.length) return;
  to.push(snapshot());
  project = JSON.parse(from.pop());
  selected.clear();
  selectedWire = null;
  changed({ reset: true });
  $('#project-name').value = project.name;
  learning.renderLesson();
}
function worldPoint(event) {
  const r = $('#viewport').getBoundingClientRect();
  return screenToWorld(view, { x: event.clientX - r.left, y: event.clientY - r.top });
}
function applyView() {
  view.x = boundCoordinate(view.x);
  view.y = boundCoordinate(view.y);
  view.zoom = clampZoom(view.zoom);
  $('#world').style.transform = `translate(${view.x}px,${view.y}px) scale(${view.zoom})`;
  // Keep the grid readable while preserving its alignment with circuit coordinates.
  const gridSize = 20 * view.zoom * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (20 * view.zoom))));
  $('#viewport').style.backgroundSize = `${gridSize}px ${gridSize}px`;
  $('#viewport').style.backgroundPosition = `${view.x}px ${view.y}px`;
  $('#zoom-value').textContent = `${Math.round(view.zoom * 100)}%`;
  wiring?.renderEditor();
}
function fit({ readable = false } = {}) {
  const nodes = project.nodes;
  if (!nodes.length) {
    view = { x: 80, y: 80, zoom: 1 };
    applyView();
    persist();
    return;
  }
  let minX = Math.min(...nodes.map((n) => n.x)),
    minY = Math.min(...nodes.map((n) => n.y)),
    maxX = Math.max(...nodes.map((n) => n.x + dimensions(n).w)),
    maxY = Math.max(...nodes.map((n) => n.y + dimensions(n).h));
  for (const wire of project.wires) {
    for (const point of wire.points || []) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  const el = $('#viewport');
  view =
    fitViewport(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      { width: el.clientWidth, height: el.clientHeight },
    ) || view;
  if (readable && compactLayout.matches && view.zoom < 0.75) {
    const center = screenToWorld(view, { x: el.clientWidth / 2, y: el.clientHeight / 2 });
    view = {
      x: el.clientWidth / 2 - center.x * 0.75,
      y: el.clientHeight / 2 - center.y * 0.75,
      zoom: 0.75,
    };
  }
  applyView();
  persist();
}
function setTool(next) {
  cancelInteraction();
  tool = next;
  updateTool();
  wiring?.refresh();
}
function updateTool() {
  const active = spaceHeld || shiftHeld ? 'pan' : tool;
  $$('.canvas-tools [data-tool]').forEach((el) =>
    el.classList.toggle('active', el.dataset.tool === active),
  );
  $('#viewport').dataset.tool = active;
  $('#more-tools').classList.toggle('active', tool === 'trace');
}
function shell() {
  if (dialogs?.isOpen()) dialogs.close();
  wiring?.cancelGesture();
  document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
  document.title = t('pageTitle');
  $('#app').innerHTML = shellMarkup({
    project,
    t,
    lang,
    workspaceView,
    query,
    simulationRate,
    timeBase,
    tool,
    monitorOpen,
    formatRate: monitor.formatRate,
    formatWindow: monitor.formatWindow,
  });
  $('#zoom-out').innerHTML = '<span style="font-size:20px">−</span>';
  bindShell();
  updateHistoryControls();
  classroom?.mount();
  updateTool();
  renderLibrary();
  board.render();
  inspector.render();
  learning.renderLesson();
  setRunning(running);
  applyView();
  updateSignals();
  board.updateCounts();
}
function renderLibrary() {
  $('#library-categories').innerHTML = renderLibraryCategories(category, lang);
  const result = renderLibraryItems({ category, query, language: lang });
  $('#library-list').innerHTML = result.html;
  $('#library-result-count').textContent = result.count;
  $$('[data-category]').forEach((el) => {
    el.onclick = () => {
      category = el.dataset.category;
      renderLibrary();
      $('#library-list').scrollTop = 0;
      $('.library-category-browser summary').focus();
    };
  });
  $$('[data-read-guide]').forEach(
    (el) => (el.onclick = () => learning.openGuide(el.dataset.readGuide)),
  );
  $$('[data-component]').forEach((el) => {
    el.addEventListener('click', () => {
      addNode(el.dataset.component);
      setLibraryOpen(false);
    });
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/logic-lab', el.dataset.component);
      e.dataTransfer.effectAllowed = 'copy';
      requestAnimationFrame(() => setLibraryOpen(false));
    });
  });
}
function selectionChanged() {
  $$('.circuit-node').forEach((el) =>
    el.classList.toggle('selected', selected.has(el.dataset.node)),
  );
  $$('.wire-group').forEach((el) =>
    el.classList.toggle('selected', el.dataset.wire === selectedWire),
  );
  inspector.render();
  updateSignals();
  wiring?.refresh();
}
function updateSignals() {
  board.updateSignals();
  learning.updateGuideSignals();
  learning.updateLessonSignals();
  scenes?.update();
  $('#sim-time').textContent = (runtime.time || 0).toFixed(3);
  monitor.updateUi();
  const diagnostics = $('#diagnostics');
  diagnostics.hidden = !runtime.diagnostics?.length;
  diagnostics.textContent = `${runtime.diagnostics?.length || 0} ${t('diagnostics')}`;
  inspector.updateSignals();
  monitor.draw();
}
function addNode(type, point) {
  if (classroom && !classroom.allowEdit()) return;
  setWorkspaceView('canvas');
  if (project.nodes.length >= 1000) {
    notify(t('limitReached'));
    return;
  }
  const d = getDefinition(type);
  if (!d) return;
  checkpoint();
  const r = $('#viewport').getBoundingClientRect();
  const center = point || {
    x: (r.width / 2 - view.x) / view.zoom - 80,
    y: (r.height / 2 - view.y) / view.zoom - 50,
  };
  if (!point) {
    let offset = 0;
    while (
      project.nodes.some(
        (n) =>
          Math.abs(n.x - snap(center.x + offset)) < 30 &&
          Math.abs(n.y - snap(center.y + offset)) < 30,
      )
    )
      offset += 40;
    center.x += offset;
    center.y += offset;
  }
  const node = {
    id: uid('n'),
    type,
    x: boundCoordinate(snap(center.x)),
    y: boundCoordinate(snap(center.y)),
    label: '',
    enabled: true,
    params: structuredClone(d.defaults),
  };
  project.nodes.push(node);
  selected = new Set([node.id]);
  selectedWire = null;
  changed();
}
function deleteSelection() {
  if (classroom && !classroom.allowEdit()) return;
  cancelInteraction();
  if (!selected.size && !selectedWire) return;
  checkpoint();
  project.nodes = project.nodes.filter((n) => !selected.has(n.id));
  project.wires = project.wires.filter(
    (w) => w.id !== selectedWire && !selected.has(w.from.node) && !selected.has(w.to.node),
  );
  selected.clear();
  selectedWire = null;
  pending = null;
  changed();
  learning.renderLesson();
  notify(t('removed'));
}
function duplicateSelection() {
  if (classroom && !classroom.allowEdit()) return;
  if (!selected.size) return;
  const internal = project.wires.filter(
    (w) => selected.has(w.from.node) && selected.has(w.to.node),
  ).length;
  if (project.nodes.length + selected.size > 1000 || project.wires.length + internal > 5000) {
    notify(t('limitReached'));
    return;
  }
  checkpoint();
  const map = new Map();
  const nodes = project.nodes
    .filter((n) => selected.has(n.id))
    .map((n) => {
      const copy = structuredClone(n);
      copy.id = uid('n');
      copy.x = boundCoordinate(copy.x + 40);
      copy.y = boundCoordinate(copy.y + 40);
      map.set(n.id, copy.id);
      return copy;
    });
  const wires = project.wires
    .filter((w) => map.has(w.from.node) && map.has(w.to.node))
    .map((w) => ({
      ...structuredClone(w),
      id: uid('w'),
      from: { ...w.from, node: map.get(w.from.node) },
      to: { ...w.to, node: map.get(w.to.node) },
      points: (w.points || []).map((p) => ({
        x: boundCoordinate(p.x + 40),
        y: boundCoordinate(p.y + 40),
      })),
    }));
  project.nodes.push(...nodes);
  project.wires.push(...wires);
  selected = new Set(nodes.map((n) => n.id));
  changed();
}
function enableSelected(value) {
  if (classroom && !classroom.allowEdit()) return;
  checkpoint();
  project.nodes.filter((n) => selected.has(n.id)).forEach((n) => (n.enabled = value));
  changed();
}
function nodePointerDown(e) {
  if (e.target.closest('button,input,textarea,select') || e.button !== 0) return;
  $('#viewport').focus({ preventScroll: true });
  wiring.clear();
  e.stopPropagation();
  const id = e.currentTarget.dataset.node;
  if (e.metaKey || e.ctrlKey) {
    selectedWire = null;
    if (e.shiftKey || selected.has(id)) selected.delete(id);
    else selected.add(id);
    selectionChanged();
    return;
  }
  if (!selected.has(id)) {
    selected = new Set([id]);
    selectedWire = null;
    selectionChanged();
  }
  const point = worldPoint(e);
  if (classroom?.isLocked()) return;
  gesture = {
    kind: 'nodes',
    pointerId: e.pointerId,
    start: point,
    origins: project.nodes
      .filter((n) => selected.has(n.id))
      .map((n) => ({ id: n.id, x: n.x, y: n.y })),
    snapshot: snapshot(),
    moved: false,
  };
}
function pinPointerDown(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.button !== 0) return;
  $('#viewport').focus({ preventScroll: true });
  if (wiring.pinPointerDown(e)) return;
  if (classroom && !classroom.allowEdit()) return;
  const pin = e.currentTarget;
  const current = { node: pin.dataset.node, port: pin.dataset.pin, side: pin.dataset.side };
  if (pending) {
    completeWire(current);
    return;
  }
  pending = { ...current, points: [], startX: e.clientX, startY: e.clientY };
  pin.classList.add('connecting');
  $('#canvas-tip').textContent = t('connect');
}
function completeWire(target) {
  if (!pending) return;
  if (project.wires.length >= 5000) {
    notify(t('limitReached'));
    cancelWire();
    return;
  }
  if (
    pending.node === target.node &&
    pending.port === target.port &&
    pending.side === target.side
  ) {
    cancelWire();
    return;
  }
  if (pending.side === target.side) {
    notify(t('connectHint'));
    return;
  }
  const source = pending.side === 'out' ? pending : target,
    destination = pending.side === 'in' ? pending : target;
  const check = checkConnection(project, source, destination);
  if (!check.ok) {
    if (check.reason === 'duplicate') cancelWire();
    else notify(t('incompatible'));
    return;
  }
  checkpoint();
  const points = pending.side === 'out' ? pending.points : [...pending.points].reverse();
  project.wires.push({
    id: uid('w'),
    from: { node: source.node, port: source.port },
    to: { node: destination.node, port: destination.port },
    width: check.width,
    points,
  });
  cancelWire();
  changed();
  notify(t('connection'));
}
function cancelGesture() {
  wiring?.cancelGesture();
  if (gesture?.kind === 'pan' && $('#viewport')?.hasPointerCapture(gesture.pointerId)) {
    $('#viewport').releasePointerCapture(gesture.pointerId);
  }
  gesture = null;
  suppressPanClick = false;
  $('#marquee')?.remove();
  $('#viewport')?.classList.remove('panning');
}
function cancelInteraction() {
  cancelGesture();
  wiring?.clear();
  if ($('#draft')) cancelWire();
}
function cancelWire() {
  pending = null;
  $('#draft').setAttribute('d', '');
  $$('.connecting').forEach((el) => el.classList.remove('connecting'));
  $('#canvas-tip').innerHTML =
    icon('wire', 15) + t(project.exampleId === 'half-adder' ? 'tutorial' : 'connectHint');
}
function startPan(e) {
  $('#viewport').focus({ preventScroll: true });
  e.preventDefault();
  suppressPanClick = true;
  gesture = { kind: 'pan', pointerId: e.pointerId, x: e.clientX, y: e.clientY, view: { ...view } };
  $('#viewport').classList.add('panning');
  $('#viewport').setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  if (wiring.pointerMove(e)) return;
  if (gesture && gesture.pointerId !== e.pointerId) return;
  if (pending) {
    const n = project.nodes.find((n) => n.id === pending.node);
    if (n) {
      const p = portPoint(n, pending.port, pending.side),
        end = worldPoint(e);
      const d =
        pending.side === 'out'
          ? route(p, end, pending.points, project.wireStyle, null, {
              start: portDirection(n, pending.port, pending.side),
              end: { x: -1, y: 0 },
            })
          : route(end, p, [...pending.points].reverse(), project.wireStyle, null, {
              start: { x: 1, y: 0 },
              end: portDirection(n, pending.port, pending.side),
            });
      $('#draft').setAttribute('d', d);
    }
  }
  if (!gesture) return;
  if (gesture.kind === 'pan') {
    view = panBy(gesture.view, e.clientX - gesture.x, e.clientY - gesture.y);
    applyView();
    return;
  }
  if (gesture.kind === 'nodes') {
    const p = worldPoint(e),
      dx = snap(p.x - gesture.start.x),
      dy = snap(p.y - gesture.start.y);
    if (!dx && !dy && !gesture.moved) return;
    if (!gesture.moved) {
      undoStack.push(gesture.snapshot);
      redoStack = [];
      gesture.moved = true;
    }
    for (const old of gesture.origins) {
      const n = project.nodes.find((n) => n.id === old.id);
      n.x = boundCoordinate(old.x + dx);
      n.y = boundCoordinate(old.y + dy);
      const el = $(`[data-node="${n.id}"].circuit-node`);
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
    }
    for (const w of project.wires) {
      const d = wirePath(w, project);
      $$(`[data-wire="${w.id}"] path`).forEach((path) => path.setAttribute('d', d));
    }
    wiring.refresh();
    return;
  }
  if (gesture.kind === 'marquee') {
    const p = worldPoint(e);
    const box = $('#marquee');
    const x = Math.min(p.x, gesture.start.x),
      y = Math.min(p.y, gesture.start.y),
      w = Math.abs(p.x - gesture.start.x),
      h = Math.abs(p.y - gesture.start.y);
    Object.assign(box.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    gesture.end = p;
  }
}
function onPointerUp(e) {
  if (wiring.pointerUp(e)) return;
  if (gesture && gesture.pointerId !== e.pointerId) return;
  if (
    gesture?.kind !== 'pan' &&
    pending &&
    Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) > 5
  ) {
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((element) => element.closest('.pin'))
      .find(Boolean);
    if (hit)
      completeWire({ node: hit.dataset.node, port: hit.dataset.pin, side: hit.dataset.side });
  }
  if (!gesture) return;
  if (gesture.kind === 'marquee') {
    const a = gesture.start,
      b = gesture.end || a,
      x = Math.min(a.x, b.x),
      y = Math.min(a.y, b.y),
      w = Math.abs(a.x - b.x),
      h = Math.abs(a.y - b.y);
    for (const n of project.nodes) {
      const dim = dimensions(n);
      if (n.x >= x && n.y >= y && n.x + dim.w <= x + w && n.y + dim.h <= y + h) selected.add(n.id);
    }
    $('#marquee')?.remove();
    selectionChanged();
  }
  if (gesture.kind === 'nodes' && gesture.moved) persist();
  if (gesture.kind === 'pan') {
    persist();
    if ($('#viewport').hasPointerCapture(e.pointerId))
      $('#viewport').releasePointerCapture(e.pointerId);
    // Native clicks follow pointerup; consume the click belonging to a pan gesture.
    setTimeout(() => {
      suppressPanClick = false;
    }, 0);
  }
  gesture = null;
  $('#viewport').classList.remove('panning');
}
function exportProject() {
  try {
    const blob = new Blob([serializeProject(project)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'circuit'}.logic.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(t('exported'));
  } catch (error) {
    notify(error.message);
  }
}
function setRunning(next) {
  if (next && classroom?.isPlaying()) return;
  const wasRunning = running;
  running = next;
  if (wasRunning && !next) simulationRunner?.discard();
  $('#run').innerHTML =
    icon(next ? 'pause' : 'play', 14) + `<span>${t(next ? 'pause' : 'run')}</span><kbd>R</kbd>`;
  $('#run').classList.toggle('running', next);
  $('#simulation-badge').innerHTML = `<i></i>${t(next ? 'live' : 'paused')}`;
  $('#simulation-badge').classList.toggle('live', next);
  monitor.updateUi();
  classroom?.onSimulationStateChanged?.(next);
  inspector?.updateSignals();
}
function replaceProject(next) {
  if (classroom && !classroom.allowEdit()) return;
  setWorkspaceView('canvas');
  cancelInteraction();
  checkpoint();
  project = next;
  cancelWire();
  runtime = newRuntime();
  selected.clear();
  selectedWire = null;
  pending = null;
  lessonStep = 0;
  lessonOpen = true;
  highlighted.clear();
  setRunning(true);
  $('#project-name').value = project.name;
  changed();
  learning.renderLesson();
  fit({ readable: !project.viewport });
  dialogs.close();
}
function confirmReplace(next) {
  dialogs.open(
    `<div class="modal-icon">${icon('folder', 28)}</div><h2>${t('replaceTitle')}</h2><p>${t('replaceText')}</p><div class="modal-actions"><button class="soft-btn" id="cancel-replace">${t('cancel')}</button><button class="primary-btn" id="confirm-replace">${t('replace')}</button></div>`,
  );
  $('#cancel-replace').onclick = dialogs.close;
  $('#confirm-replace').onclick = () => replaceProject(typeof next === 'function' ? next() : next);
}
function bindLiveText(input, apply) {
  let editing = false;
  input.oninput = () => {
    if (!editing) {
      checkpoint();
      editing = true;
    }
    apply(input.value);
  };
  input.onblur = () => {
    editing = false;
  };
}
function resetSimulation() {
  if (classroom && !classroom.allowEdit()) return;
  runtime = newRuntime();
  simulate(project, runtime, 0);
  updateSignals();
}
function toggleSource(id) {
  if (classroom && !classroom.allowInput()) return;
  const node = project.nodes.find((item) => item.id === id && item.type === 'switch');
  if (!node) return;
  checkpoint();
  node.params.value = node.params.value ? 0 : 1;
  changed();
  classroom?.inputChanged(node.id, 'value', node.params.value);
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
  workspaceView = next;
  $('.main').dataset.workspaceView = next;
  $$('[data-workspace-view]', $('.workspace-tabs')).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.workspaceView === next));
  });
  if (next === 'signals') {
    monitorOpen = true;
    $('#monitor').classList.remove('collapsed');
  }
  requestAnimationFrame(() => {
    applyView();
    monitor.draw();
  });
}
function bindShell() {
  wiring.bind();
  $('#more-tools').onclick = () =>
    setToolsOpen(!$('.canvas-tools').classList.contains('more-tools-open'));
  $('#secondary-tools').onclick = () => setToolsOpen(false);
  $$('[data-workspace-view]', $('.workspace-tabs')).forEach((button) => {
    button.onclick = () => setWorkspaceView(button.dataset.workspaceView);
  });
  $('#library-toggle').onclick = () =>
    setLibraryOpen(!$('#component-library').classList.contains('mobile-open'));
  $('#close-library').onclick = () => setLibraryOpen(false);
  $('#library-backdrop').onclick = () => setLibraryOpen(false);
  $('#close-inspector').onclick = () => {
    setWorkspaceView('canvas');
    selected.clear();
    selectedWire = null;
    selectionChanged();
  };
  $('#search').oninput = (e) => {
    query = e.target.value;
    renderLibrary();
  };
  bindLiveText($('#project-name'), (value) => {
    project.name = value.trim() || t('newName');
    board.updateCounts();
    persist();
  });
  $('#language').onclick = () => {
    lang = lang === 'en' ? 'ua' : 'en';
    try {
      localStorage.setItem('logic-lab.language', lang);
    } catch {}
    shell();
    setRunning(running);
  };
  $('#diagnostics').onclick = learning.openDiagnostics;
  $('#run').onclick = () => setRunning(!running);
  $('#step').onclick = () => {
    if (classroom?.isPlaying()) return;
    if (running) setRunning(false);
    advance(0.01 * simulationRate);
    updateSignals();
  };
  $('#reset').onclick = resetSimulation;
  $('#undo').onclick = () => undo();
  $('#redo').onclick = () => undo(true);
  $('#fit').onclick = () => fit();
  $('#zoom-value').onclick = resetZoom;
  $('#zoom-in').onclick = () => zoomCenter(ZOOM_IN_FACTOR);
  $('#zoom-out').onclick = () => zoomCenter(ZOOM_OUT_FACTOR);
  $('#export').onclick = () => {
    $('.project-files').open = false;
    exportProject();
  };
  $('#import').onclick = () => {
    $('.project-files').open = false;
    $('#import-file').click();
  };
  $('#examples').onclick = () => learning.openExamples();
  $('#motion').onclick = () => scenes.open();
  $('#lesson-toggle').onclick = () => {
    if (compactLayout.matches) {
      compactLessonOpen = !compactLessonOpen;
      if (compactLessonOpen) lessonOpen = true;
      setWorkspaceView('canvas');
    } else lessonOpen = !lessonOpen;
    learning.renderLesson();
  };
  $('#help').onclick = learning.openHelp;
  $('#inspector-help').onclick = learning.openHelp;
  $('#add-note').onclick = () => addNode('note');
  $('#add-group').onclick = () => addNode('group');
  $$('.canvas-tools [data-tool]').forEach((el) => (el.onclick = () => setTool(el.dataset.tool)));
  $('#simulation-rate').onchange = (e) => {
    const value = Number(e.target.value);
    if (!SIMULATION_RATES.includes(value)) return;
    simulationRate = value;
    monitor.saveSettings();
  };
  $('#record-toggle').onclick = monitor.toggleRecording;
  $('#record-download').onclick = monitor.downloadRecording;
  $('#trace-image').onclick = monitor.downloadImage;
  monitor.updateUi();
  $('#time-base').onchange = (e) => {
    const value = Number(e.target.value);
    if (monitor.isRecording() || !TIME_WINDOWS.includes(value)) return;
    timeBase = value;
    monitor.saveSettings();
    runtime.sampleInterval = timeBase / 255;
    runtime.history = Object.create(null);
    runtime.historyTimes = [];
    runtime.sampleElapsed = 0;
    runtime.lastSampleTime = runtime.time;
    monitor.draw();
  };
  $('#monitor-toggle').onclick = () => {
    if (compactLayout.matches) return setWorkspaceView('canvas');
    monitorOpen = !monitorOpen;
    $('#monitor').classList.toggle('collapsed', !monitorOpen);
    requestAnimationFrame(monitor.draw);
  };
  const vp = $('#viewport');
  vp.oncontextmenu = (e) => e.preventDefault();
  // Capture forced pan before pins, sources and nodes can handle the pointer.
  vp.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target.closest('.canvas-tools,.canvas-bottom')) return;
      if (gesture || wiring.busy) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (e.ctrlKey || e.metaKey) shiftHeld = false;
      else if (e.shiftKey) shiftHeld = true;
      updateTool();
      const forcePan =
        e.button === 1 ||
        (e.button === 2 && !e.ctrlKey && !e.metaKey) ||
        spaceHeld ||
        shiftHeld ||
        tool === 'pan';
      if (!forcePan) return;
      e.stopImmediatePropagation();
      startPan(e);
    },
    { capture: true },
  );
  vp.addEventListener(
    'click',
    (e) => {
      if (!suppressPanClick) return;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );
  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.canvas-tools,.canvas-bottom,button') || e.button !== 0) return;
    if (wiring.blankPointerDown(e)) return;
    if (pending) {
      if (pending.points.length >= 100) {
        notify(t('limitReached'));
        return;
      }
      pending.points.push({
        x: boundCoordinate(snap(worldPoint(e).x)),
        y: boundCoordinate(snap(worldPoint(e).y)),
      });
      return;
    }
    if (!e.ctrlKey && !e.metaKey) selected.clear();
    selectedWire = null;
    selectionChanged();
    gesture = { kind: 'marquee', pointerId: e.pointerId, start: worldPoint(e) };
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
      if (gesture) return;
      const delta = normalizeWheel(e, vp.clientHeight);
      if (classifyWheel(e) === 'pan') {
        view = panBy(view, -delta.x, -delta.y);
        applyView();
        persist();
        return;
      }
      const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, wheelZoomFactor(delta.y));
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
    if (type) addNode(type, worldPoint(e));
  };
}
function zoomAt(x, y, factor) {
  view = zoomViewportAt(view, { x, y }, factor);
  applyView();
  persist();
}
function zoomCenter(factor) {
  const el = $('#viewport');
  zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
}
function resetZoom() {
  zoomCenter(1 / view.zoom);
}
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('pointercancel', (e) => {
  if (gesture && gesture.pointerId !== e.pointerId) return;
  cancelGesture();
  persist();
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.project-files')) $('.project-files').open = false;
  if (!event.target.closest('.canvas-tools')) setToolsOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.defaultPrevented) return;
  if (e.key === 'Escape') {
    if ($('.project-files').open) {
      $('.project-files').open = false;
      $('.project-files summary').focus();
    } else if ($('.canvas-tools').classList.contains('more-tools-open')) {
      setToolsOpen(false);
      $('#more-tools').focus();
    } else if (dialogs.isOpen()) dialogs.close();
    else if ($('#component-library').classList.contains('mobile-open')) setLibraryOpen(false);
    else cancelInteraction();
    return;
  }
  if (dialogs.handleKey(e)) return;
  if ($('.project-files').open || $('.canvas-tools').classList.contains('more-tools-open')) return;
  if ($('#component-library').classList.contains('mobile-open')) {
    trapFocus(e, $('#component-library'));
    return;
  }
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  if (e.ctrlKey || e.metaKey) {
    shiftHeld = false;
    updateTool();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    exportProject();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo(e.shiftKey);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    duplicateSelection();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (wiring.keyDown(e)) return;
  if (e.key === ' ') {
    if (e.target.closest('button,a,summary')) return;
    e.preventDefault();
    spaceHeld = true;
    updateTool();
    return;
  }
  if (['Backspace', 'Delete'].includes(e.key)) {
    e.preventDefault();
    deleteSelection();
  }
  if (e.key.toLowerCase() === 'r' && !e.repeat) setRunning(!running);
  if (e.key === 'Shift') {
    shiftHeld = !e.ctrlKey && !e.metaKey;
    updateTool();
  }
  if (e.key.toLowerCase() === 'f' || e.key === 'Home') {
    e.preventDefault();
    fit();
  }
  if (e.key === '0') {
    e.preventDefault();
    resetZoom();
  }
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    zoomCenter(ZOOM_IN_FACTOR);
  }
  if (e.key === '-') {
    e.preventDefault();
    zoomCenter(ZOOM_OUT_FACTOR);
  }
  if (e.key === '/') {
    e.preventDefault();
    if (compactLayout.matches) setLibraryOpen(true);
    else $('#search').focus();
  }
  if (e.key === 'v') setTool('select');
  if (e.key === 'h') setTool('pan');
  if (e.key === 'w') setTool('wire');
  if (e.key.toLowerCase() === 't') setTool('trace');
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!selected.size || tool === 'pan' || spaceHeld || shiftHeld) {
      const distance = e.shiftKey ? 100 : 40;
      view = panBy(view, -dx * distance, -dy * distance);
      applyView();
      persist();
      return;
    }
    if (classroom && !classroom.allowEdit()) return;
    checkpoint();
    for (const n of project.nodes.filter((n) => selected.has(n.id))) {
      n.x = boundCoordinate(n.x + dx * 20);
      n.y = boundCoordinate(n.y + dy * 20);
    }
    changed();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ') spaceHeld = false;
  if (e.key === 'Shift') shiftHeld = false;
  if (e.key === 'Control' || e.key === 'Meta') {
    shiftHeld =
      e.shiftKey &&
      !dialogs.isOpen() &&
      !e.target.closest('input,textarea,select,[contenteditable]');
  }
  updateTool();
});
window.addEventListener('blur', () => {
  spaceHeld = false;
  shiftHeld = false;
  suppressPanClick = false;
  cancelGesture();
  updateTool();
  persist();
});
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw Error('Project file exceeds 10 MB');
    const next = parseProject(await file.text());
    confirmReplace(next);
  } catch (error) {
    notify(`${t('invalid')}: ${error.message}`);
  }
  e.target.value = '';
});
compactLayout.addEventListener('change', () => {
  setLibraryOpen(false);
  setToolsOpen(false);
  learning.renderLesson();
  setWorkspaceView(workspaceView);
});
window.addEventListener('resize', () => {
  applyView();
  monitor.draw();
});
window.addEventListener('beforeunload', () => {
  const editable = classroom?.projectToSave() || project;
  editable.viewport = { ...view };
  saveProject(editable);
});
function advance(dt) {
  const pending = simulationRunner.pendingSeconds();
  const allowed = classroom?.recordingDelta(dt + pending) ?? dt + pending;
  simulationRunner.queue(Math.max(0, allowed - pending));
  drainSimulation();
}
function drainSimulation() {
  try {
    simulationRunner.process();
  } catch (error) {
    simulationRunner.discard();
    monitor.stopCapture();
    classroom?.stopRecording();
    setRunning(false);
    notify(error.message);
  }
}
let lastFrame = null;
function tick(now) {
  const elapsed = frameSimulationDelta(now, lastFrame, simulationRate);
  if (classroom?.isPlaying()) {
    simulationRunner.discard();
    classroom.tick(elapsed);
  } else if (running) {
    advance(elapsed);
    updateSignals();
    classroom?.tick(0);
  } else if (simulationRunner.pendingSeconds() > 0) {
    drainSimulation();
    updateSignals();
    classroom?.tick(0);
  }
  lastFrame = now;
  requestAnimationFrame(tick);
}
const workbenchState = {
  get project() {
    return project;
  },
  get runtime() {
    return runtime;
  },
  get lang() {
    return lang;
  },
  get running() {
    return running;
  },
  get selected() {
    return selected;
  },
  set selected(value) {
    selected = value;
  },
  get lessonStep() {
    return lessonStep;
  },
  set lessonStep(value) {
    lessonStep = value;
  },
  get lessonOpen() {
    return lessonOpen;
  },
  set lessonOpen(value) {
    lessonOpen = value;
  },
  get compactLessonOpen() {
    return compactLessonOpen;
  },
  set compactLessonOpen(value) {
    compactLessonOpen = value;
  },
  get highlighted() {
    return highlighted;
  },
  set highlighted(value) {
    highlighted = value;
  },
  get compactLayout() {
    return compactLayout;
  },
  get selectedWire() {
    return selectedWire;
  },
  set selectedWire(value) {
    selectedWire = value;
  },
  get inspectorTab() {
    return inspectorTab;
  },
  set inspectorTab(value) {
    inspectorTab = value;
  },
  get classroom() {
    return classroom;
  },
  get wiring() {
    return wiring;
  },
  get timeBase() {
    return timeBase;
  },
  get simulationRate() {
    return simulationRate;
  },
  get monitorOpen() {
    return monitorOpen;
  },
  set monitorOpen(value) {
    monitorOpen = value;
  },
};
dialogs = createDialogs({
  t,
  beforeOpen: () => {
    spaceHeld = false;
    shiftHeld = false;
    cancelInteraction();
    updateTool();
    setLibraryOpen(false);
    setToolsOpen(false);
    $('.project-files').open = false;
  },
  disposeContent: () => scenes?.dispose(),
});
board = createBoardController(workbenchState, {
  t,
  title,
  applyView,
  nodePointerDown,
  pinPointerDown,
  toggleSource,
  openScene: (id) => scenes.open(id),
  primarySignal: (node) => monitor.primarySignal(node),
});
learning = createLearningController(workbenchState, {
  t,
  title,
  showModal: dialogs.open,
  closeModal: dialogs.close,
  confirmReplace,
  addNode,
  selectionChanged,
  setWorkspaceView,
  primarySignal: (node) => monitor.primarySignal(node),
});
monitor = createSignalMonitor(workbenchState, { t, title, notify, setWorkspaceView });
simulationRunner = createSimulationRunner({
  getProject: () => project,
  getRuntime: () => runtime,
  onStep: () => monitor.capture(),
});
inspector = createInspectorController(workbenchState, {
  t,
  title,
  checkpoint,
  notify,
  changed,
  renderBoard: board.render,
  updateSignals,
  persist,
  bindLiveText,
  bindLearningActions: learning.bindActions,
  updateGuideSignals: learning.updateGuideSignals,
  deleteSelection,
  duplicateSelection,
  enableSelected,
});
scenes = createSceneController(workbenchState, {
  t,
  title,
  showModal: dialogs.open,
  closeModal: dialogs.close,
  setRunning,
  resetSimulation,
  toggleSource,
  confirmReplace,
  bindLiveText,
  renderBoard: board.render,
  updateSignals,
  persist,
});
wiring = createWiringEditor({
  getProject: () => project,
  getView: () => view,
  getTool: () => tool,
  getLanguage: () => lang,
  getSelectedWire: () => selectedWire,
  t,
  canEdit: () => !classroom || classroom.allowEdit(),
  worldPoint,
  snapshot,
  notify,
  cancelConnection: cancelWire,
  refreshInspector: inspector.render,
  showInspector: () => setWorkspaceView('inspector'),
  showCanvas: () => setWorkspaceView('canvas'),
  activateSelect: () => {
    tool = 'select';
    updateTool();
  },
  selectWire: (id) => {
    selected.clear();
    selectedWire = id;
    board.render();
    inspector.render();
    updateSignals();
  },
  commit: (before) => {
    undoStack.push(before);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
    changed();
  },
  revealNode: (id) => {
    const node = project.nodes.find((item) => item.id === id);
    if (!node) return;
    setWorkspaceView('canvas');
    selected = new Set([id]);
    selectedWire = null;
    board.render();
    inspector.render();
    updateSignals();
    const size = dimensions(node),
      viewport = $('#viewport');
    view.zoom = Math.max(0.75, view.zoom);
    view.x = viewport.clientWidth / 2 - (node.x + size.w / 2) * view.zoom;
    view.y = viewport.clientHeight / 2 - (node.y + size.h / 2) * view.zoom;
    applyView();
    persist();
  },
});
classroom = createClassroom({
  getProject: () => project,
  getRuntime: () => runtime,
  getLanguage: () => lang,
  isRunning: () => running,
  getExample: () => EXAMPLES.find((example) => example.id === project.exampleId),
  showModal: dialogs.open,
  closeModal: dialogs.close,
  notify,
  setRunning: (next) => {
    if (!next) simulationRunner.discard();
    setRunning(next);
  },
  resetForSequence: () => {
    cancelInteraction();
    runtime = newRuntime();
    simulate(project, runtime, 0);
    updateSignals();
  },
  adoptPlayback: (nextProject, nextRuntime) => {
    cancelInteraction();
    project = nextProject;
    runtime = nextRuntime;
    selected.clear();
    selectedWire = null;
    $('#project-name').value = project.name;
    board.render();
    inspector.render();
    learning.renderLesson();
    board.updateCounts();
    updateSignals();
  },
  refreshPlayback: (nextProject, nextRuntime, redraw = true) => {
    if (nextProject) project = nextProject;
    if (nextRuntime) runtime = nextRuntime;
    if (redraw) board.render();
    updateSignals();
    persist();
  },
  loadProject: replaceProject,
});
simulate(project, runtime, 0);
shell();
requestAnimationFrame(() => {
  if (!project.viewport) fit({ readable: true });
  requestAnimationFrame(tick);
});

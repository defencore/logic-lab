import '../style.css';
import { COMPONENTS, getDefinition } from './catalog.js';
import { createRuntime, simulate } from './simulator.js';
import { EXAMPLES, createExample } from '../examples/index.js';
import { parseProject, serializeProject, loadProject, saveProject } from './project.js';
import { TEXT } from './i18n.js';
import { icon, gateIcon } from './icons.js';
import { $, $$, esc, format, safeColor, signalClass } from './ui-utils.js';
import { dimensions, portPoint, route, wirePath, snap } from './geometry.js';
import { guideMarkup, exampleCards, filterExamples, exampleCatalogShell } from './learning-ui.js';
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
import { drawMini, paintTraces } from './waveforms.js';
import { getMotionState } from './motion-data.js';
import { truthTableMarkup } from './truth-tables.js';

let lang = 'en';
try {
  lang =
    localStorage.getItem('logic-lab.language') ||
    (navigator.language.startsWith('uk') ? 'ua' : 'en');
} catch {}
if (!TEXT[lang]) lang = 'en';
const t = (key) => TEXT[lang][key] || key;
const title = (def) => (lang === 'ua' ? def.ua || def.label : def.label);
let project = loadProject() || createExample(EXAMPLES[0].id);
let timeBase = 1;
function newRuntime() {
  const value = createRuntime();
  value.sampleInterval = timeBase / 255;
  return value;
}
let runtime = newRuntime();
let running = true;
let inspectorTab = 'properties';
let lastInspectorKey = '';
let lessonOpen = true;
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
let pending = null;
let gesture = null;
let view = project.viewport || { x: 0, y: 0, zoom: 1 };
let monitorOpen = true;
let modal = null;
let modalOpener = null;
let motionView = null;
let motionViewToken = 0;
let undoStack = [];
let redoStack = [];
let storageTimer;
let toastTimer;
const boundCoordinate = (value) => Math.max(-1_000_000, Math.min(1_000_000, value));
const uid = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
const button = (id, name, label, extra = '') =>
  `<button id="${id}" class="icon-btn ${extra}" title="${esc(label)}" aria-label="${esc(label)}">${icon(name)}</button>`;

function snapshot() {
  return JSON.stringify(project);
}
function checkpoint() {
  undoStack.push(snapshot());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
}
function persist() {
  clearTimeout(storageTimer);
  storageTimer = setTimeout(() => {
    project.viewport = { ...view };
    const ok = saveProject(project);
    $('#save-state').innerHTML =
      icon(ok ? 'check' : 'help', 13) + esc(ok ? t('saved') : t('storageFailed'));
  }, 400);
}
function changed({ reset = false } = {}) {
  if (reset) runtime = newRuntime();
  simulate(project, runtime, 0);
  renderBoard();
  renderInspector();
  updateSignals();
  updateCounts();
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
  renderLesson();
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
}
function fit() {
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
  applyView();
  persist();
}
function setTool(next) {
  tool = next;
  updateTool();
}
function updateTool() {
  const active = spaceHeld || shiftHeld ? 'pan' : tool;
  $$('.canvas-tools [data-tool]').forEach((el) =>
    el.classList.toggle('active', el.dataset.tool === active),
  );
  $('#viewport').dataset.tool = active;
}
function shell() {
  document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
  document.title = t('pageTitle');
  $('#app').innerHTML = `
    <header class="app-header"><a class="brand" href="./" aria-label="Logic Lab"><img src="./favicon.svg?v=logic-lab-1" alt=""><span>logic<span class="brand-light">lab</span><small>${esc(t('workbench'))}</small></span></a>
    <div class="header-divider"></div><div class="project-heading">${icon('folder', 16)}<input id="project-name" aria-label="${t('namePlaceholder')}" value="${esc(project.name)}" maxlength="100"><span class="project-tag">.logic</span></div>
    <div class="header-actions"><span id="save-state" class="save-state">${icon('check', 13)}${t('saved')}</span>${button('import', 'upload', t('open'))}${button('export', 'download', t('save'))}<span class="divider"></span><button id="motion" class="soft-btn" aria-label="${t('motionView')}" title="${t('motionView')}">${icon('box', 15)}<span>3D</span></button><button id="examples" class="soft-btn" aria-label="${t('examples')}">${icon('grid', 15)}<span>${t('examples')}</span></button><button id="language" class="language-btn" aria-label="Language">${lang === 'en' ? 'EN' : 'UA'}${icon('down', 12)}</button>${button('help', 'help', t('help'))}</div></header>
    <div class="app-body"><aside class="library" aria-label="${t('componentLibrary')}"><div class="panel-title"><h2>${t('componentLibrary')}</h2><span class="count-badge">${COMPONENTS.length}</span></div><div class="search-wrap">${icon('search', 16)}<input id="search" type="search" aria-label="${t('searchAllComponents')}" placeholder="${t('searchAllComponents')}" value="${esc(query)}" autocomplete="off"><kbd>/</kbd></div><div class="library-browse-heading">${t('browseCategories')}</div><div id="library-categories"></div><div class="library-results-heading"><span>${t('catalogResults')}</span><span id="library-result-count"></span></div><div id="library-list" class="library-list"></div><div class="library-footer"><span class="dot green"></span>${t('browserOnly')}<small>${t('dragHint')}</small></div></aside>
    <main class="main"><div class="workspace-toolbar"><div class="workspace-title"><span class="breadcrumb">${t('workspace')}</span><span class="slash">/</span><span id="canvas-name">${esc(project.name)}</span></div><div class="simulation-controls">${button('lesson-toggle', 'note', t('showLesson'))}${button('reset', 'reset', t('reset'))}${button('step', 'step', t('step'))}<button id="run" class="run-btn" title="${t('runKeyboard')}">${icon('play', 14)}<span>${t('run')}</span><kbd>R</kbd></button></div></div>
    <section id="lesson-panel" class="lesson-panel" hidden></section>
    <section id="viewport" class="viewport" aria-label="${t('workspace')}" tabindex="0"><div class="canvas-heading"><span class="eyebrow">LOGIC LAB / 01</span><h1>${t('learn')}</h1><p>${t('learnDesc')}</p></div><div id="world" class="world"><svg id="wires" class="wire-layer" aria-label="${t('wires')}"></svg><div id="nodes" class="node-layer"></div><svg id="draft-layer" class="draft-layer"><path id="draft"/></svg></div><div id="empty-hint" class="empty-hint" hidden>${icon('plus', 32)}<p>${t('dragHint')}</p></div>
    <div class="canvas-tools"><div class="tool-group">${['select', 'pan', 'wire'].map((x, i) => `<button data-tool="${x}" class="icon-btn ${tool === x ? 'active' : ''}" title="${x === 'pan' ? t('panHint') : t(x)}" aria-label="${t(x)}">${icon(['mouse', 'hand', 'wire'][i])}</button>`).join('')}<span class="divider"></span>${button('add-note', 'note', t('note'))}${button('add-group', 'layers', t('group'))}</div><div class="tool-group">${button('undo', 'undo', t('undo'))}${button('redo', 'redo', t('redo'))}</div></div>
    <div class="canvas-bottom" title="${t('navigationHint')}"><div id="canvas-tip" class="canvas-tip">${icon('wire', 15)}${project.name === 'Half adder' ? t('tutorial') : t('connectHint')}</div><span class="navigation-hint">${t('navigationShort')}</span><div class="zoom-tools">${button('zoom-out', 'minus', t('zoom'))}<button id="zoom-value" class="zoom-value" title="${t('resetZoom')}" aria-label="${t('resetZoom')}">100%</button><button id="zoom-in" class="icon-btn" aria-label="${t('zoom')}">${icon('plus', 16)}</button><span class="divider"></span>${button('fit', 'fit', t('fit'))}</div></div></section>
    <div class="monitor-controls"><span>${t('traceSelection')}</span><label>${t('timeWindow')} <select id="time-base" aria-label="${t('timeWindow')}">${[0.25, 1, 5].map((value) => `<option value="${value}" ${timeBase === value ? 'selected' : ''}>≈ ${value} ${t('seconds')}</option>`).join('')}</select></label></div>
    <section id="monitor" class="monitor ${monitorOpen ? '' : 'collapsed'}"><button id="monitor-toggle" class="monitor-heading"><span>${icon('signal', 17)}<strong>${t('timing')}</strong><span class="monitor-sub">${t('scopeHint')}</span></span><span id="simulation-badge" class="simulation-badge"><i></i>${t('paused')}</span>${icon('down', 15)}</button><div class="monitor-body"><div id="trace-labels" class="trace-labels"></div><canvas id="trace-canvas" aria-label="${t('trace')}"></canvas></div></section>
    <footer class="status-bar"><span><i class="dot green"></i>${t('status')}</span><button id="diagnostics" class="text-btn" hidden></button><span id="counts"></span><span class="time-label">t = <b id="sim-time">0.000</b> s</span></footer></main>
    <aside class="inspector"><div class="panel-title"><h2>${t('inspector')}</h2><span class="inspector-desktop-icon">${icon('layers', 16)}</span>${button('close-inspector', 'close', t('cancel'))}</div><div id="inspector-content"></div><div class="inspector-footer"><span class="legend"><i class="dot green"></i>1 <i class="dot gray"></i>0 <i class="dot amber"></i>X <span class="z-legend">Z</span></span><button id="inspector-help" class="text-btn">${t('help')}${icon('chevron', 12)}</button></div></aside></div><div id="modal-root"></div>`;
  $('#zoom-out').innerHTML = '<span style="font-size:20px">−</span>';
  bindShell();
  updateTool();
  renderLibrary();
  renderBoard();
  renderInspector();
  renderLesson();
  setRunning(running);
  applyView();
  updateSignals();
  updateCounts();
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
    };
  });
  $$('[data-read-guide]').forEach(
    (el) => (el.onclick = () => showComponentGuide(el.dataset.readGuide)),
  );
  $$('[data-component]').forEach((el) => {
    el.addEventListener('click', () => addNode(el.dataset.component));
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/logic-lab', el.dataset.component);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}
function nodeBody(node) {
  const d = getDefinition(node.type);
  switch (node.type) {
    case 'switch':
      return `<button class="switch-control ${node.params.value ? 'is-on' : ''}" data-switch="${node.id}" aria-label="${esc(node.label || title(d))}" aria-pressed="${!!node.params.value}"><span class="switch-track"><i></i></span><span class="switch-value">${node.params.value ? '1' : '0'}</span></button>`;
    case 'led':
      return '<div class="led-view"><i class="led-bulb"></i><span class="led-text">0</span></div>';
    case 'gnd':
    case 'vcc':
      return `<div class="constant-value">${node.type === 'vcc' ? '1' : '0'}<span>${node.type === 'vcc' ? 'VCC' : 'GND'}</span></div>`;
    case 'scope':
    case 'am':
    case 'fm':
      return `<canvas class="mini-scope" width="210" height="65"></canvas>${node.type !== 'scope' ? '<span class="node-readout"></span>' : ''}`;
    case 'servo':
      return `<div class="servo-bank">${[1, 2, 3, 4].map((i) => `<div class="servo-unit"><div class="servo-disc"><div class="servo-arm" data-servo="${i}"></div></div><span>S${i} <b data-angle="${i}">0°</b></span></div>`).join('')}</div>`;
    case 'stepper':
      return `<div class="stepper-widget"><div class="stepper-body"><div class="stepper-rotor"></div></div><strong class="node-readout"></strong><button data-motion-open class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
    case 'limit_switch':
    case 'position_sensor':
      return `<div class="sensor-widget"><span class="sensor-light"></span><strong class="node-readout"></strong><span class="sensor-status"></span></div>`;
    case 'sevenseg':
      return `<div class="seven-seg">${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].map((id) => `<i class="segment segment-${id}" data-segment="${id}"></i>`).join('')}</div>`;
    case 'matrix':
      return `<div class="led-matrix">${Array.from({ length: 64 }, (_, i) => `<i data-pixel="${i}"></i>`).join('')}</div>`;
    case 'pwm':
      return '<div class="pwm-view"><svg viewBox="0 0 120 30"><path d="M0 25H10V5H45V25H70V5H105V25H120"/></svg><span class="node-readout"></span></div>';
    default:
      return ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(node.type)
        ? `<div class="gate-view">${gateIcon(node.type, 48)}</div>`
        : `<div class="chip-view"><span>${esc(d.symbol || d.type.toUpperCase().replaceAll('_', ' '))}</span><strong class="node-readout"></strong></div>`;
  }
}
function renderBoard() {
  $('#nodes').innerHTML = project.nodes
    .map((n) => {
      const d = getDefinition(n.type),
        { w, h } = dimensions(n),
        special = ['note', 'group'].includes(n.type);
      return `<div class="circuit-node ${selected.has(n.id) ? 'selected' : ''} ${highlighted.has(n.id) ? 'lesson-highlight' : ''} ${n.enabled === false ? 'disabled' : ''} type-${n.type}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${w}px;height:${h}px;${special ? `--note-color:${safeColor(n.params.color)};` : ''}" role="group" aria-label="${esc(n.label || title(d))}"><div class="node-header"><span class="node-type-dot"></span><span>${esc(n.label || title(d))}</span><small>${special ? '' : esc(d.type.toUpperCase().replaceAll('_', ' '))}</small></div>${special ? `<div class="note-content">${esc(n.params.text || '')}</div>` : `<div class="node-content">${nodeBody(n)}</div>${['in', 'out'].map((side) => (side === 'in' ? d.inputs : d.outputs).map((p, i) => `<button class="pin pin-${side} ${p.width > 1 ? 'bus-pin' : ''} ${p.analog ? 'analog-pin' : ''}" data-pin="${esc(p.id)}" data-side="${side}" data-node="${n.id}" style="top:${58 + i * 25}px" title="${esc(p.label || p.id)}${p.width > 1 ? ' [' + p.width + ']' : ''}${p.analog ? ' · analog' : ''}" aria-label="${esc(n.label || title(d))} ${side} ${esc(p.label || p.id)}"><i></i><span>${esc(p.label || p.id)}${p.width > 1 ? `<em>${p.width}</em>` : ''}</span></button>`).join('')).join('')}`}</div>`;
    })
    .join('');
  $('#wires').innerHTML = project.wires
    .map(
      (w) =>
        `<g data-wire="${w.id}" class="wire-group ${selectedWire === w.id ? 'selected' : ''}"><path class="wire-hit" d="${wirePath(w, project)}"/><path class="wire-line ${w.width > 1 ? 'bus-line' : ''}" d="${wirePath(w, project)}"/>${w.width > 1 ? busLabel(w) : ''}</g>`,
    )
    .join('');
  $('#empty-hint').hidden = project.nodes.length > 0;
  $('#draft').setAttribute('d', '');
  $$('.circuit-node').forEach((el) => el.addEventListener('pointerdown', nodePointerDown));
  $$('.pin').forEach((el) => el.addEventListener('pointerdown', pinPointerDown));
  $$('[data-switch]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSource(el.dataset.switch);
    }),
  );
  $$('[data-motion-open]').forEach((el) => (el.onclick = () => showMotionView()));
  $$('.wire-hit').forEach((el) =>
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selected.clear();
      selectedWire = el.parentElement.dataset.wire;
      renderBoard();
      renderInspector();
      updateSignals();
    }),
  );
  applyView();
}
function busLabel(w) {
  const n = project.nodes.find((n) => n.id === w.from.node);
  if (!n) return '';
  const p = portPoint(n, w.from.port, 'out');
  return `<text x="${p.x + 30}" y="${p.y - 8}" class="bus-label">/${w.width}</text>`;
}
function selectionChanged() {
  $$('.circuit-node').forEach((el) =>
    el.classList.toggle('selected', selected.has(el.dataset.node)),
  );
  $$('.wire-group').forEach((el) =>
    el.classList.toggle('selected', el.dataset.wire === selectedWire),
  );
  renderInspector();
  updateSignals();
}
function renderInspector() {
  const el = $('#inspector-content');
  const key = `${[...selected].join(',')}|${selectedWire}|${inspectorTab}`;
  if (lastInspectorKey !== key) {
    el.scrollTop = 0;
    lastInspectorKey = key;
  }
  el.closest('.inspector').classList.toggle('mobile-open', !!selectedWire || selected.size > 0);
  if (selectedWire) {
    const w = project.wires.find((w) => w.id === selectedWire);
    if (!w) {
      selectedWire = null;
      return renderInspector();
    }
    el.innerHTML = `<div class="inspector-selected"><span class="inspector-symbol">${icon('wire', 28)}</span><h3>${t('wireProperties')}</h3><p>${w.width > 1 ? t('bus') : t('digital')} · ${w.width || 1} bit</p></div><div class="property-section"><h4>${t('properties')}</h4><label>${t('source')}<input disabled value="${esc(w.from.node + '.' + w.from.port)}"></label><label>${t('destination')}<input disabled value="${esc(w.to.node + '.' + w.to.port)}"></label></div><button class="danger-btn" id="delete-node">${icon('trash', 15)}${t('removeWire')}</button>`;
    $('#delete-node').onclick = deleteSelection;
    return;
  }
  if (!selected.size) {
    el.innerHTML = `<div class="inspector-empty"><span class="empty-icon">${icon('mouse', 29)}</span><h3>${t('nothing')}</h3><p>${t('nothingDesc')}</p></div><div class="workspace-settings"><h4>${t('view')}</h4><label>${t('wireStyle')}<select id="routing"><option value="orthogonal">${t('orthogonal')}</option><option value="bezier" ${project.wireStyle === 'bezier' ? 'selected' : ''}>${t('bezier')}</option></select></label><div class="signal-legend"><span><i class="dot green"></i>${t('one')}</span><span><i class="dot gray"></i>${t('zero')}</span><span><i class="dot amber"></i>${t('unknown')}</span><span><i class="dot dashed"></i>${t('floating')}</span></div></div>`;
    $('#routing').onchange = (e) => {
      checkpoint();
      project.wireStyle = e.target.value;
      changed();
    };
    return;
  }
  if (selected.size > 1) {
    el.innerHTML = `<div class="inspector-selected"><span class="inspector-symbol">${icon('layers', 28)}</span><h3>${selected.size} ${t('selected')}</h3></div><div class="multi-actions"><button id="multi-enable" class="soft-btn">${t('enableAll')}</button><button id="multi-disable" class="soft-btn">${t('disableAll')}</button><button id="duplicate-node" class="soft-btn">${t('duplicate')}</button><button id="delete-node" class="danger-btn">${t('delete')}</button></div>`;
    $('#multi-enable').onclick = () => enableSelected(true);
    $('#multi-disable').onclick = () => enableSelected(false);
    $('#duplicate-node').onclick = duplicateSelection;
    $('#delete-node').onclick = deleteSelection;
    return;
  }
  const n = project.nodes.find((n) => selected.has(n.id));
  if (!n) {
    selected.clear();
    return renderInspector();
  }
  const d = getDefinition(n.type);
  const params = { ...d.defaults, ...n.params };
  const header = `<div class="inspector-selected"><span class="inspector-symbol">${['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(n.type) ? gateIcon(n.type, 36) : icon('box', 28)}</span><span class="eyebrow">${esc(n.type.toUpperCase().replaceAll('_', ' '))}</span><h3>${esc(title(d))}</h3><p>${esc(lang === 'ua' ? d.descriptionUa || d.description : d.description)}</p></div>`;
  const tabs = `<div class="inspector-tabs" role="tablist"><button role="tab" aria-selected="${inspectorTab === 'properties'}" data-inspector-tab="properties">${t('properties')}</button><button role="tab" aria-selected="${inspectorTab === 'guide'}" data-inspector-tab="guide">${icon('help', 13)}${t('usageGuide')}</button></div>`;
  if (inspectorTab === 'guide') {
    el.innerHTML = header + tabs + guideMarkup(n.type, lang, n.id);
    bindInspectorTabs();
    bindLearningActions(el);
    updateGuideSignals();
    return;
  }
  el.innerHTML = `${header}${tabs}<div class="property-section"><h4>${t('properties')}</h4><label>${t('label')}<input id="node-label" value="${esc(n.label || '')}" placeholder="${esc(title(d))}" maxlength="100"></label><label class="toggle-row">${t('enabled')}<input type="checkbox" id="node-enabled" class="toggle-input" ${n.enabled !== false ? 'checked' : ''}></label></div>${
    Object.keys(params).length
      ? `<div class="property-section"><h4>${t('parameters')}</h4>${Object.entries(params)
          .map(([key, value]) => parameterField(key, value, n.type))
          .join('')}</div>`
      : ''
  }<div class="property-section"><h4>${t('signalState')}</h4><div id="inspector-signals"></div></div><div class="inspector-node-actions"><button id="duplicate-node" class="soft-btn">${icon('layers', 15)}${t('duplicate')}</button><button id="delete-node" class="danger-btn" title="${t('delete')}">${icon('trash', 15)}</button></div>${truthTableMarkup(n.type, lang, n.id)}`;
  bindInspectorTabs();
  bindLiveText($('#node-label'), (value) => {
    n.label = value;
    renderBoard();
    updateSignals();
    persist();
  });
  $('#node-enabled').onchange = (e) => {
    checkpoint();
    n.enabled = e.target.checked;
    changed();
  };
  $$('[data-param],[data-slider]').forEach((input) => {
    let editing = false;
    const commit = () => {
      const key = input.dataset.param || input.dataset.slider;
      if (input.type === 'number' && input.value === '') return;
      let value =
        input.type === 'checkbox'
          ? input.checked
          : ['number', 'range'].includes(input.type)
            ? Number(input.value)
            : input.value;
      if (input.dataset.array) {
        try {
          value = JSON.parse(input.value);
          if (!Array.isArray(value) || value.some((v) => !Number.isFinite(v))) throw Error();
        } catch {
          return;
        }
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return;
        if (input.min !== '') value = Math.max(Number(input.min), value);
        if (input.max !== '') value = Math.min(Number(input.max), value);
      }
      if (!editing) {
        checkpoint();
        editing = true;
      }
      if (n.params[key] === value) return;
      n.params[key] = value;
      if (key === 'initial') delete runtime.state[n.id];
      const companion = $(`[data-${input.dataset.slider ? 'param' : 'slider'}="${key}"]`);
      if (companion) companion.value = value;
      simulate(project, runtime, 0);
      renderBoard();
      updateSignals();
      persist();
    };
    input.oninput = commit;
    input.onchange = commit;
    input.onblur = () => {
      editing = false;
      if (input.type === 'number') input.value = n.params[input.dataset.param];
    };
  });
  $('#duplicate-node').onclick = duplicateSelection;
  $('#delete-node').onclick = deleteSelection;
  updateInspectorSignals();
  updateGuideSignals();
}
const PARAM_NAMES = {
  frequency: ['Frequency (Hz)', 'Частота (Гц)'],
  duty: ['Duty cycle (0–1)', 'Коефіцієнт заповнення (0–1)'],
  carrier: ['Carrier (Hz)', 'Несуча (Гц)'],
  depth: ['Modulation depth', 'Глибина модуляції'],
  amplitude: ['Amplitude (V)', 'Амплітуда (В)'],
  vcc: ['Supply voltage (V)', 'Напруга живлення (В)'],
  initial: ['Initial value', 'Початкове значення'],
  value: ['Value', 'Значення'],
  range: ['Range', 'Діапазон'],
  minDuty: ['Minimum duty', 'Мінімальне заповнення'],
  maxDuty: ['Maximum duty', 'Максимальне заповнення'],
  text: ['Text', 'Текст'],
  color: ['Color', 'Колір'],
  stepsPerRevolution: ['Full steps / revolution', 'Повних кроків на оберт'],
  microsteps: ['Microsteps / full step', 'Мікрокроків на повний крок'],
  lead: ['Travel / revolution (mm)', 'Хід за оберт (мм)'],
  min: ['Minimum position (mm)', 'Мінімальна позиція (мм)'],
  max: ['Maximum position (mm)', 'Максимальна позиція (мм)'],
  threshold: ['Trip / target position (mm)', 'Поріг / цільова позиція (мм)'],
  tolerance: ['Position tolerance (mm)', 'Допуск позиції (мм)'],
  mode: ['Detection mode', 'Режим виявлення'],
  normallyClosed: ['Normally closed contact (NC)', 'Нормально замкнений контакт (NC)'],
  duration: ['Pulse duration (s)', 'Тривалість імпульсу (с)'],
  low: ['Low threshold', 'Нижній поріг'],
  high: ['High threshold', 'Верхній поріг'],
  data: ['Memory bytes (comma-separated)', 'Байти пам’яті (через кому)'],
  width: ['Width', 'Ширина'],
  height: ['Height', 'Висота'],
};
function parameterField(key, value, componentType) {
  const label =
    PARAM_NAMES[key]?.[lang === 'ua' ? 1 : 0] ||
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  if (key === 'text')
    return `<label>${label}<textarea data-param="${key}" rows="3" maxlength="16384">${esc(value)}</textarea></label>`;
  const type =
    typeof value === 'boolean'
      ? 'checkbox'
      : typeof value === 'number'
        ? 'number'
        : key === 'color'
          ? 'color'
          : 'text';
  if (key === 'mode' && ['limit_switch', 'position_sensor'].includes(componentType)) {
    const options =
      componentType === 'limit_switch' ? ['below', 'above'] : ['below', 'above', 'window'];
    return `<label>${esc(label)}<select data-param="mode">${options.map((option) => `<option value="${option}" ${value === option ? 'selected' : ''}>${t(option)}</option>`).join('')}</select></label>`;
  }
  const bounds = {
    duty: [0, 1, 0.01],
    depth: [0, 1, 0.01],
    minDuty: [0, 1, 0.01],
    maxDuty: [0, 1, 0.01],
    stepsPerRevolution: [1, 10000, 1],
    microsteps: [1, 256, 1],
    lead: [0.001, 1000, 0.1],
    min: [-1000000, 1000000, 0.1],
    max: [-1000000, 1000000, 0.1],
    threshold: [-1000000, 1000000, 0.1],
    tolerance: [0, 1000000, 0.1],
    frequency: [0, 1000, 0.1],
    carrier: [0, 1000, 0.1],
    duration: [0.0005, 1000, 0.01],
    width: [100, 3000, 20],
    height: [100, 3000, 20],
    vcc: [0.01, 1000, 0.1],
  };
  const limits = bounds[key];
  const attributes =
    type === 'number'
      ? limits
        ? `min="${limits[0]}" max="${limits[1]}" step="${limits[2]}"`
        : `step="${Number.isInteger(value) ? 1 : 0.01}"`
      : 'maxlength="16384"';
  return `<label ${type === 'checkbox' ? 'class="toggle-row"' : ''}>${esc(label)}<input data-param="${esc(key)}" type="${type}" ${attributes} ${Array.isArray(value) ? 'data-array="true"' : ''} ${type === 'checkbox' ? (value ? 'checked' : '') : `value="${esc(Array.isArray(value) ? JSON.stringify(value) : value)}"`}>${key === 'duty' ? `<input class="duty-slider" data-slider="duty" type="range" aria-label="${esc(label)}" min="0" max="1" step="0.01" value="${esc(value)}">` : ''}</label>`;
}

function updateInspectorSignals() {
  const el = $('#inspector-signals');
  if (!el) return;
  const n = project.nodes.find((n) => selected.has(n.id));
  if (!n) return;
  const d = getDefinition(n.type);
  el.innerHTML = [
    ['in', d.inputs],
    ['out', d.outputs],
  ]
    .map(([side, ports]) =>
      ports
        .map((p) => {
          const v = runtime[side === 'in' ? 'inputs' : 'outputs']?.[n.id]?.[p.id];
          return `<div class="signal-row"><span>${side === 'in' ? '↳' : '↗'} ${esc(p.label || p.id)}${p.width > 1 ? ` <small>[${p.width}]</small>` : ''}</span><b class="signal-value ${signalClass(v)}">${format(v)}${p.unit && typeof v === 'number' ? ' ' + esc(p.unit) : p.analog && typeof v === 'number' ? (n.type === 'servo' && side === 'out' ? '°' : n.type === 'servo' || n.type === 'pwm' ? '' : ' V') : ''}</b></div>`;
        })
        .join(''),
    )
    .join('');
}
function updateSignals() {
  for (const n of project.nodes) {
    const el = $(`[data-node="${n.id}"].circuit-node`);
    if (!el) continue;
    const ins = runtime.inputs?.[n.id] || {},
      outs = runtime.outputs?.[n.id] || {};
    $$('.pin', el).forEach((pin) => {
      const v = (pin.dataset.side === 'in' ? ins : outs)[pin.dataset.pin];
      pin.classList.remove('high', 'low', 'unknown', 'floating');
      pin.classList.add(signalClass(v));
    });
    const readout = $('.node-readout', el);
    if (readout) {
      const first = Object.values(outs)[0];
      readout.textContent =
        n.type === 'pwm'
          ? `${Math.round(Number(outs.duty ?? n.params.duty ?? 0.5) * 100)}% · ${n.params.frequency ?? 105} Hz`
          : format(first);
    }
    if (n.type === 'led') {
      const v = ins.in;
      const lamp = $('.led-bulb', el);
      lamp.style.setProperty('--led-color', safeColor(n.params.color || '#72b66e'));
      lamp.className = `led-bulb ${signalClass(v)}`;
      $('.led-text', el).textContent = v === 1 ? t('one') : v === 0 ? t('zero') : format(v);
    }
    if (n.type === 'stepper') {
      const rotor = $('.stepper-rotor', el);
      rotor.style.transform = `rotate(${typeof outs.angle === 'number' ? outs.angle % 360 : 0}deg)`;
      $('.node-readout', el).textContent = `${format(outs.position)} mm`;
    }
    if (['limit_switch', 'position_sensor'].includes(n.type)) {
      const value = outs.out;
      $('.sensor-light', el).className = `sensor-light ${signalClass(value)}`;
      $('.node-readout', el).textContent =
        n.type === 'position_sensor' ? `${format(outs.position)} mm` : format(value);
      $('.sensor-status', el).textContent =
        value === 1 ? t('sensorHigh') : value === 0 ? t('sensorLow') : t('unknown');
    }
    if (n.type === 'servo')
      for (let i = 1; i <= 4; i++) {
        const a = Number(outs[`a${i}`]) || 0;
        $(`[data-servo="${i}"]`, el).style.transform = `rotate(${a}deg)`;
        $(`[data-angle="${i}"]`, el).textContent = `${a.toFixed(0)}°`;
      }
    if (n.type === 'sevenseg') {
      let v = Number(ins.in ?? ins.data ?? ins.segments) || 0;
      $$('[data-segment]', el).forEach((s, i) => s.classList.toggle('lit', !!(v & (1 << i))));
    }
    if (n.type === 'matrix') {
      const rows = Number(ins.rows) || 0,
        cols = Number(ins.cols) || 0;
      $$('[data-pixel]', el).forEach((p, i) =>
        p.classList.toggle('lit', !!(rows & (1 << (i >> 3))) && !!(cols & (1 << i % 8))),
      );
    }
    const canvas = $('.mini-scope', el);
    if (canvas) drawMini(canvas, runtime.history?.[n.id] || [], n);
  }
  for (const w of project.wires) {
    const el = $(`[data-wire="${w.id}"] .wire-line`);
    if (!el) continue;
    const v = runtime.wireValues?.[w.id] ?? runtime.outputs?.[w.from.node]?.[w.from.port];
    el.setAttribute('class', `wire-line ${signalClass(v)} ${w.width > 1 ? 'bus-line' : ''}`);
  }
  updateGuideSignals();
  updateLessonSignals();
  updateMotionView();
  $('#sim-time').textContent = (runtime.time || 0).toFixed(3);
  const diagnostics = $('#diagnostics');
  diagnostics.hidden = !runtime.diagnostics?.length;
  diagnostics.textContent = `${runtime.diagnostics?.length || 0} ${t('diagnostics')}`;
  updateInspectorSignals();
  drawMonitor();
}
const traceColors = ['#258461', '#9474c0', '#cb9151', '#5386bd'];
function traceNodes() {
  const signals = project.nodes.filter(
    (n) => getDefinition(n.type).inputs.length || getDefinition(n.type).outputs.length,
  );
  const priority = [
    ...signals.filter((n) => selected.has(n.id)),
    ...signals.filter((n) => n.type === 'scope'),
    ...signals.filter((n) =>
      [
        'led',
        'clock',
        'counter',
        'pwm',
        'dac',
        'am',
        'fm',
        'servo',
        'stepper',
        'position_sensor',
        'limit_switch',
      ].includes(n.type),
    ),
  ];
  return [...new Map(priority.map((n) => [n.id, n])).values()].slice(0, 4);
}
function primarySignal(node) {
  const definition = getDefinition(node.type);
  return Object.values(
    definition.outputs.length ? runtime.outputs?.[node.id] || {} : runtime.inputs?.[node.id] || {},
  )[0];
}
function drawMonitor() {
  if (!monitorOpen) return;
  const canvas = $('#trace-canvas');
  if (!canvas) return;
  const nodes = traceNodes();
  $('#trace-labels').innerHTML = nodes.length
    ? nodes
        .map(
          (node, index) =>
            `<div class="trace-label" style="--trace:${traceColors[index]}"><i></i><span>${esc(node.label || title(getDefinition(node.type)))}</span><b>${format(primarySignal(node))}</b></div>`,
        )
        .join('')
    : `<p class="no-traces">${t('noTraces')}</p>`;
  paintTraces(
    canvas,
    nodes.map((node, index) => ({
      history: runtime.history[node.id] || [],
      current: primarySignal(node),
      color: traceColors[index],
      stepped: ['led', 'clock', 'pwm'].includes(node.type),
    })),
  );
}
function updateCounts() {
  $('#counts').textContent =
    `${project.nodes.length} ${t('nodes')} · ${project.wires.length} ${t('wires')}`;
  $('#canvas-name').textContent = project.name;
}
function addNode(type, point) {
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
  renderLesson();
  notify(t('removed'));
}
function duplicateSelection() {
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
  checkpoint();
  project.nodes.filter((n) => selected.has(n.id)).forEach((n) => (n.enabled = value));
  changed();
}
function nodePointerDown(e) {
  if (e.target.closest('button,input,textarea,select') || e.button !== 0) return;
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
  const sn = project.nodes.find((n) => n.id === source.node),
    dn = project.nodes.find((n) => n.id === destination.node);
  if (!sn || !dn) return cancelWire();
  const sp = getDefinition(sn.type).outputs.find((p) => p.id === source.port),
    dp = getDefinition(dn.type).inputs.find((p) => p.id === destination.port);
  if (!dp.acceptAny && ((sp.width || 1) !== (dp.width || 1) || !!sp.analog !== !!dp.analog)) {
    notify(t('incompatible'));
    return;
  }
  if (
    project.wires.some(
      (w) =>
        w.from.node === source.node &&
        w.from.port === source.port &&
        w.to.node === destination.node &&
        w.to.port === destination.port,
    )
  ) {
    cancelWire();
    return;
  }
  checkpoint();
  const points = pending.side === 'out' ? pending.points : [...pending.points].reverse();
  project.wires.push({
    id: uid('w'),
    from: { node: source.node, port: source.port },
    to: { node: destination.node, port: destination.port },
    width: sp.width || 1,
    points,
  });
  cancelWire();
  changed();
  notify(t('connection'));
}
function cancelGesture() {
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
  e.preventDefault();
  suppressPanClick = true;
  gesture = { kind: 'pan', pointerId: e.pointerId, x: e.clientX, y: e.clientY, view: { ...view } };
  $('#viewport').classList.add('panning');
  $('#viewport').setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  if (gesture && gesture.pointerId !== e.pointerId) return;
  if (pending) {
    const n = project.nodes.find((n) => n.id === pending.node);
    if (n) {
      const p = portPoint(n, pending.port, pending.side),
        end = worldPoint(e);
      const d =
        pending.side === 'out'
          ? route(p, end, pending.points, project.wireStyle)
          : route(end, p, [...pending.points].reverse(), project.wireStyle);
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
  if (gesture && gesture.pointerId !== e.pointerId) return;
  if (
    gesture?.kind !== 'pan' &&
    pending &&
    Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) > 5
  ) {
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pin');
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
  running = next;
  $('#run').innerHTML =
    icon(next ? 'pause' : 'play', 14) + `<span>${t(next ? 'pause' : 'run')}</span><kbd>R</kbd>`;
  $('#run').classList.toggle('running', next);
  $('#simulation-badge').innerHTML = `<i></i>${t(next ? 'live' : 'paused')}`;
  $('#simulation-badge').classList.toggle('live', next);
}
function replaceProject(next) {
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
  renderLesson();
  fit();
  closeModal();
}
function confirmReplace(next) {
  showModal(
    `<div class="modal-icon">${icon('folder', 28)}</div><h2>${t('replaceTitle')}</h2><p>${t('replaceText')}</p><div class="modal-actions"><button class="soft-btn" id="cancel-replace">${t('cancel')}</button><button class="primary-btn" id="confirm-replace">${t('replace')}</button></div>`,
  );
  $('#cancel-replace').onclick = closeModal;
  $('#confirm-replace').onclick = () => replaceProject(typeof next === 'function' ? next() : next);
}
function showExamples(filters = {}) {
  const state = { query: '', category: 'all', level: 'all', ...filters };
  showModal(exampleCatalogShell(lang, state), true);
  $('.modal').classList.add('catalog-modal');
  const refresh = () => {
    state.query = $('#example-search').value;
    state.level = $('#example-level').value;
    const matches = filterExamples(EXAMPLES, state);
    $('#example-results').innerHTML = exampleCards(matches, lang);
    $('#catalog-count').textContent = `${t('examplesCount')}: ${matches.length}`;
    $$('[data-topic]').forEach((el) => {
      const active = el.dataset.topic === state.category;
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', active);
    });
    $$('[data-example]').forEach(
      (el) => (el.onclick = () => confirmReplace(() => createExample(el.dataset.example))),
    );
    $$('[data-lab-guide]').forEach(
      (el) => (el.onclick = () => showLaboratory(el.dataset.labGuide)),
    );
  };
  $('#example-search').oninput = refresh;
  $('#example-level').onchange = refresh;
  $$('[data-topic]').forEach((el) => {
    el.onclick = () => {
      state.category = el.dataset.topic;
      refresh();
    };
  });
  $('#empty-project').onclick = () =>
    confirmReplace(() => ({ version: 1, name: t('newName'), nodes: [], wires: [] }));
  refresh();
}
function showComponentGuide(type, nodeId = null) {
  const definition = getDefinition(type);
  if (!definition) return;
  showModal(
    `<span class="eyebrow">${t('guideFor')}</span><h2>${esc(title(definition))}</h2>${guideMarkup(type, lang, nodeId)}<button class="primary-btn" id="guide-add">${icon('plus', 15)}${t('addComponent')}</button>`,
    true,
  );
  $('#guide-add').onclick = () => {
    closeModal();
    addNode(type);
  };
  bindLearningActions($('#modal-root'));
  updateGuideSignals();
}
function bindInspectorTabs() {
  $$('[data-inspector-tab]').forEach(
    (el) =>
      (el.onclick = () => {
        inspectorTab = el.dataset.inspectorTab;
        renderInspector();
      }),
  );
}
function bindLearningActions(root) {
  $$('[data-learn-example]', root).forEach(
    (el) => (el.onclick = () => confirmReplace(() => createExample(el.dataset.learnExample))),
  );
}
function updateGuideSignals() {
  $$('[data-guide-node]').forEach((el) => {
    const value =
      runtime[el.dataset.guideDirection]?.[el.dataset.guideNode]?.[el.dataset.guidePort];
    el.textContent = format(value);
    el.className = `signal-value ${signalClass(value)}`;
  });
  $$('[data-truth-node]').forEach((section) => {
    const node = project.nodes.find((item) => item.id === section.dataset.truthNode);
    if (!node) return;
    const definition = getDefinition(node.type);
    const inputs = definition.inputs.map((port) => runtime.inputs?.[node.id]?.[port.id]);
    const outputs = definition.outputs.map((port) => runtime.outputs?.[node.id]?.[port.id]);
    const known =
      node.enabled !== false &&
      [...inputs, ...outputs].every((value) => value === 0 || value === 1);
    const key = inputs.join('');
    $$('[data-truth-inputs]', section).forEach((row) => {
      const active = known && row.dataset.truthInputs === key;
      row.classList.toggle('current-row', active);
      if (active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    const describe = (ports, values) =>
      ports.map((port, index) => `${port.label || port.id}=${format(values[index])}`).join(', ');
    const status = $('[data-truth-status]', section);
    if (status) {
      const message =
        node.enabled === false
          ? t('truthInactive')
          : known
            ? `${t('truthCurrent')}: ${describe(definition.inputs, inputs)} → ${describe(definition.outputs, outputs)}`
            : t('truthPending');
      if (status.textContent !== message) status.textContent = message;
    }
  });
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
function currentLesson() {
  const example = EXAMPLES.find((ex) => ex.id === project.exampleId);
  return example ? { example, lesson: example.lesson[lang] } : null;
}
function renderLesson() {
  const panel = $('#lesson-panel'),
    current = currentLesson();
  highlighted.clear();
  $('#lesson-toggle').hidden = !current;
  if (!current) {
    panel.hidden = true;
    return;
  }
  const { example, lesson } = current;
  lessonStep = Math.max(0, Math.min(lesson.steps.length - 1, lessonStep));
  const step = lesson.steps[lessonStep];
  panel.hidden = !lessonOpen;
  $('#lesson-toggle').title = t(lessonOpen ? 'hideLesson' : 'showLesson');
  $('#lesson-toggle').setAttribute('aria-label', t(lessonOpen ? 'hideLesson' : 'showLesson'));
  if (!lessonOpen) {
    $$('.lesson-highlight').forEach((el) => el.classList.remove('lesson-highlight'));
    return;
  }
  highlighted = new Set(step.nodes || []);
  panel.innerHTML = `<div class="lesson-heading"><span class="eyebrow">${t('lesson')} · ${esc(title(example))}</span><button id="lesson-close" class="icon-btn" aria-label="${t('hideLesson')}">${icon('close', 14)}</button></div><div class="lesson-content"><div><p class="lesson-goal">${esc(lesson.goal)}</p><strong>${lessonStep + 1}. ${esc(step.title)}</strong><p>${esc(step.text)}</p><div id="lesson-live" class="lesson-live"></div></div><div class="lesson-navigation"><span>${t('stepOf')} ${lessonStep + 1} ${t('of')} ${lesson.steps.length}</span><div><button id="lesson-prev" class="icon-btn" ${lessonStep === 0 ? 'disabled' : ''} aria-label="${t('previousStep')}">${icon('chevron', 15)}</button><button id="lesson-next" class="icon-btn" ${lessonStep === lesson.steps.length - 1 ? 'disabled' : ''} aria-label="${t('nextStep')}">${icon('chevron', 15)}</button></div><button id="lesson-inspect" class="text-btn">${t('inspectStep')}${icon('chevron', 12)}</button></div></div>${lessonStep === lesson.steps.length - 1 ? `<div class="lesson-result"><b>${t('expectedResult')}</b> ${esc(lesson.expected)}</div>` : ''}`;
  $('#lesson-close').onclick = () => {
    lessonOpen = false;
    renderLesson();
  };
  $('#lesson-prev').onclick = () => {
    lessonStep--;
    renderLesson();
  };
  $('#lesson-next').onclick = () => {
    lessonStep++;
    renderLesson();
  };
  $('#lesson-inspect').onclick = () => {
    const node = project.nodes.find((n) => highlighted.has(n.id));
    if (node) {
      selected = new Set([node.id]);
      selectedWire = null;
      inspectorTab = 'properties';
      selectionChanged();
    }
  };
  $$('.circuit-node').forEach((el) =>
    el.classList.toggle('lesson-highlight', highlighted.has(el.dataset.node)),
  );
  updateLessonSignals();
}
function updateLessonSignals() {
  const el = $('#lesson-live');
  if (!el || !lessonOpen) return;
  el.innerHTML = project.nodes
    .filter((n) => highlighted.has(n.id))
    .slice(0, 4)
    .map((n) => {
      const definition = getDefinition(n.type),
        ports = definition.outputs.length ? runtime.outputs?.[n.id] : runtime.inputs?.[n.id];
      const value = Object.values(ports || {})[0];
      return `<span>${esc(n.label || title(definition))} <b class="${signalClass(value)}">${format(value)}</b></span>`;
    })
    .join('');
}
function resetSimulation() {
  runtime = newRuntime();
  simulate(project, runtime, 0);
  updateSignals();
}
function toggleSource(id) {
  const node = project.nodes.find((item) => item.id === id && item.type === 'switch');
  if (!node) return;
  checkpoint();
  node.params.value = node.params.value ? 0 : 1;
  changed();
}
function disposeMotionView() {
  motionViewToken++;
  motionView?.dispose();
  motionView = null;
}
async function showMotionView() {
  const motors = project.nodes.filter((node) => node.type === 'stepper');
  if (!motors.length) {
    showModal(
      `<span class="eyebrow">${t('motionView')}</span><h2>${t('motionEmptyTitle')}</h2><p>${t('motionEmptyText')}</p><div class="related-examples"><button class="primary-btn" data-learn-example="stepper-basics">${t('openStepperLab')}${icon('chevron', 14)}</button><button class="soft-btn" data-learn-example="printer-homing">${t('openHomingLab')}</button></div>`,
    );
    bindLearningActions($('#modal-root'));
    return;
  }
  const switches = project.nodes.filter((node) => node.type === 'switch');
  const clocks = project.nodes.filter((node) => node.type === 'clock');
  const values = project.nodes.filter((node) => node.type === 'bus_input');
  showModal(
    `<span class="eyebrow">${t('motionView')}</span><h2>${t('motionTitle')}</h2><div class="motion-toolbar"><div class="camera-views">${['perspective', 'front', 'top'].map((view, index) => `<button class="soft-btn ${index === 0 ? 'active' : ''}" data-camera-view="${view}">${t(view)}</button>`).join('')}<button id="motion-camera-reset" class="icon-btn" aria-label="${t('resetCamera')}">${icon('fit', 16)}</button></div><div><button id="motion-reset" class="icon-btn" aria-label="${t('reset')}">${icon('reset', 16)}</button><button id="motion-run" class="primary-btn"></button></div></div>
    <div class="motion-layout"><div><div id="motion-stage" class="motion-stage" role="img" aria-label="${t('motionScene')}"></div><p class="motion-orbit-help">${t('orbitHelp')}</p><p id="motion-status" class="motion-status">${t('loading3d')}</p></div><aside class="motion-sidebar"><section><h3>${t('axisReadouts')}</h3><div id="motion-readouts"></div></section><section><h3>${t('sensorReadouts')}</h3><div id="motion-sensors"></div></section>${switches.length ? `<section><h3>${t('circuitControls')}</h3><p>${t('circuitControlsHint')}</p><div class="motion-switches">${switches.map((node) => `<button class="motion-source" data-motion-switch="${node.id}"><span>${esc(node.label || title(getDefinition(node.type)))}</span><b>0</b></button>`).join('')}</div></section>` : ''}${clocks.length ? `<section><h3>${t('clockSettings')}</h3>${clocks.map((node) => `<label>${esc(node.label || title(getDefinition(node.type)))} <small>Hz</small><input data-motion-clock="${node.id}" type="number" min="0" max="1000" step="1" value="${esc(node.params.frequency ?? getDefinition(node.type).defaults.frequency)}"></label>`).join('')}</section>` : ''}${values.length ? `<section><h3>${t('inputValues')}</h3>${values.map((node) => `<label>${esc(node.label || title(getDefinition(node.type)))}<input data-motion-value="${node.id}" type="number" min="0" max="255" step="1" value="${esc(node.params.value ?? 0)}"></label>`).join('')}</section>` : ''}</aside></div>`,
    true,
  );
  $('.modal').classList.add('motion-modal');
  $('#motion-run').onclick = () => {
    setRunning(!running);
    updateMotionView();
  };
  $('#motion-reset').onclick = resetSimulation;
  $$('[data-motion-switch]').forEach(
    (button) => (button.onclick = () => toggleSource(button.dataset.motionSwitch)),
  );
  $$('[data-motion-clock],[data-motion-value]').forEach((input) =>
    bindLiveText(input, (value) => {
      if (value === '') return;
      const frequency = Number(value);
      if (!Number.isFinite(frequency)) return;
      const isByte = !!input.dataset.motionValue;
      const node = project.nodes.find(
        (item) => item.id === (input.dataset.motionValue || input.dataset.motionClock),
      );
      node.params[isByte ? 'value' : 'frequency'] = isByte
        ? Math.round(Math.min(255, Math.max(0, frequency)))
        : Math.min(1000, Math.max(0, frequency));
      simulate(project, runtime, 0);
      renderBoard();
      updateSignals();
      persist();
    }),
  );
  const token = motionViewToken;
  try {
    const { createMotionView } = await import('./motion-view.js');
    if (token !== motionViewToken || !$('#motion-stage')) return;
    motionView = createMotionView($('#motion-stage'), {
      language: lang,
      onStatus: (message) => {
        const status = $('#motion-status');
        if (status) {
          status.textContent = message;
          status.hidden = !message;
        }
      },
    });
    $$('[data-camera-view]').forEach(
      (button) =>
        (button.onclick = () => {
          motionView.setView(button.dataset.cameraView);
          $$('[data-camera-view]').forEach((item) =>
            item.classList.toggle('active', item === button),
          );
        }),
    );
    $('#motion-camera-reset').onclick = () => motionView.resetCamera();
    motionView.resize();
    updateMotionView();
  } catch {
    if (token === motionViewToken && $('#motion-status'))
      $('#motion-status').textContent = t('motionUnavailable');
  }
}
function updateMotionView() {
  const readouts = $('#motion-readouts');
  if (!readouts) return;
  const state = getMotionState(project, runtime);
  motionView?.update(state);
  readouts.innerHTML = state.motors
    .map(
      (motor, index) =>
        `<div class="axis-readout"><span class="axis-letter">${['X', 'Y', 'Z'][index] || index + 1}</span><div><strong>${esc(motor.label)}</strong><span>${format(motor.position)} mm <small>· ${format(motor.angle)}°</small></span></div><i class="dot ${motor.moving ? 'green' : 'gray'}" title="${t(motor.enabled ? 'enabled' : 'disabled')}"></i></div>`,
    )
    .join('');
  $('#motion-sensors').innerHTML = state.sensors.length
    ? state.sensors
        .map(
          (sensor) =>
            `<div class="motion-sensor-row"><i class="dot ${sensor.triggered === null ? 'amber' : sensor.triggered ? 'green' : 'gray'}"></i><span>${esc(sensor.label)}</span><b>${format(sensor.signal)}</b></div>`,
        )
        .join('')
    : `<p>${t('noSensors')}</p>`;
  $$('[data-motion-switch]').forEach((button) => {
    const node = project.nodes.find((item) => item.id === button.dataset.motionSwitch);
    const value = !!node?.params.value;
    button.setAttribute('aria-pressed', String(value));
    $('b', button).textContent = value ? '1' : '0';
  });
  $('#motion-run').innerHTML = icon(running ? 'pause' : 'play', 14) + t(running ? 'pause' : 'run');
}
function showLaboratory(id) {
  const example = EXAMPLES.find((item) => item.id === id);
  if (!example?.lab) return;
  const sections = ['objectives', 'tasks', 'questions', 'deliverables'];
  showModal(
    `<span class="eyebrow">${t('laboratory')} · ${example.lab.duration} ${t('minutes')}</span><h2>${esc(title(example))}</h2><p>${esc(lang === 'ua' ? example.descriptionUa : example.description)}</p><div class="lab-resource-actions"><button id="start-lab" class="primary-btn">${icon('play', 15)}${t('startLab')}</button><a class="soft-btn" href="${example.circuitPath}" download="${id}.logic.json">${icon('download', 14)}${t('downloadCircuit')}</a><a class="soft-btn" href="${example.labPath}" download="${id}-lab.md">${icon('note', 14)}${t('downloadWorksheet')}</a></div><div class="lab-sheet">${sections.map((section) => `<section class="guide-section"><h4>${t(section)}</h4><ol>${example.lab[section][lang].map((item) => `<li>${esc(item)}</li>`).join('')}</ol></section>`).join('')}</div>`,
    true,
  );
  $('#start-lab').onclick = () => confirmReplace(() => createExample(id));
}

function showDiagnostics() {
  const messages = (runtime.diagnostics || []).slice(0, 50).map((d) => {
    const n = project.nodes.find((n) => n.id === d.node);
    const name = n?.label || (n ? title(getDefinition(n.type)) : '');
    if (lang === 'en') return d.message;
    if (d.code === 'invalid_motion')
      return `${name}: задайте додатні цілі кроки на оберт і мікрокроки, додатний хід та межі Min ≤ Max.`;
    if (d.code === 'motion_unknown')
      return `${name}: позиція невідома після невизначеного керувального сигналу. Подайте Reset для відновлення початкової позиції.`;
    return d.code === 'oscillation'
      ? 'Схема не стабілізувалася. Перевірте комбінаційний зворотний зв’язок.'
      : d.code === 'invalid_sr'
        ? `${name}: S та R не можуть одночасно мати високий рівень.`
        : d.code === 'floating'
          ? `${name}: ${d.port || ''} має високий імпеданс (Z).`
          : `${name}: ${d.port || ''} має невідомий або конфліктний сигнал (X).`;
  });
  showModal(
    `<span class="eyebrow">LOGIC LAB</span><h2>${t('diagnostics')}</h2><div class="diagnostic-messages">${messages.map((m) => `<p>${esc(m)}</p>`).join('')}</div>`,
  );
}
function showHelp() {
  showModal(
    `<span class="eyebrow">${lang === 'ua' ? 'ВІТАЄМО В ЛАБОРАТОРІЇ' : 'HELLO, CURIOUS MIND'}</span><h2>${t('guideTitle')}</h2><p>${t('guideBody')}</p><div class="guide-rows">${[
      ['plus', 'guideAdd', 'guideAddText'],
      ['wire', 'guideWire', 'guideWireText'],
      ['play', 'guideSim', 'guideSimText'],
      ['mouse', 'guideKeys', 'guideKeysText'],
    ]
      .map(
        ([ico, a, b]) =>
          `<div class="guide-row"><span>${icon(ico, 21)}</span><div><h3>${t(a)}</h3><p>${esc(t(b)).replaceAll('\n', '<br>')}</p></div></div>`,
      )
      .join(
        '',
      )}</div><button id="got-it" class="primary-btn">${t('gotIt')}${icon('check', 16)}</button>`,
  );
  $('#got-it').onclick = closeModal;
}
function showModal(html, wide = false) {
  spaceHeld = false;
  shiftHeld = false;
  cancelInteraction();
  updateTool();
  if (!modal) modalOpener = document.activeElement;
  disposeMotionView();
  modal = true;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button id="close-modal" class="icon-btn modal-close" aria-label="${t('cancel')}">${icon('close')}</button>${html}</section></div>`;
  $('#close-modal').onclick = closeModal;
  $('.modal-backdrop').onclick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  };
  const heading = $('.modal h2');
  if (heading) heading.id = 'modal-title';
  $('.modal button')?.focus();
}
function closeModal() {
  disposeMotionView();
  modal = null;
  $('#modal-root').innerHTML = '';
  if (modalOpener?.isConnected) modalOpener.focus();
  modalOpener = null;
}
function bindShell() {
  $('#close-inspector').onclick = () => {
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
    updateCounts();
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
  $('#diagnostics').onclick = showDiagnostics;
  $('#run').onclick = () => setRunning(!running);
  $('#step').onclick = () => {
    setRunning(false);
    advance(0.01);
    updateSignals();
  };
  $('#reset').onclick = resetSimulation;
  $('#undo').onclick = () => undo();
  $('#redo').onclick = () => undo(true);
  $('#fit').onclick = fit;
  $('#zoom-value').onclick = resetZoom;
  $('#zoom-in').onclick = () => zoomCenter(ZOOM_IN_FACTOR);
  $('#zoom-out').onclick = () => zoomCenter(ZOOM_OUT_FACTOR);
  $('#export').onclick = exportProject;
  $('#import').onclick = () => $('#import-file').click();
  $('#examples').onclick = () => showExamples();
  $('#motion').onclick = () => showMotionView();
  $('#lesson-toggle').onclick = () => {
    lessonOpen = !lessonOpen;
    renderLesson();
  };
  $('#help').onclick = showHelp;
  $('#inspector-help').onclick = showHelp;
  $('#add-note').onclick = () => addNode('note');
  $('#add-group').onclick = () => addNode('group');
  $$('.canvas-tools [data-tool]').forEach((el) => (el.onclick = () => setTool(el.dataset.tool)));
  $('#time-base').onchange = (e) => {
    timeBase = Number(e.target.value);
    runtime.sampleInterval = timeBase / 255;
    runtime.history = Object.create(null);
    runtime.lastSampleTime = runtime.time;
    drawMonitor();
  };
  $('#monitor-toggle').onclick = () => {
    monitorOpen = !monitorOpen;
    $('#monitor').classList.toggle('collapsed', !monitorOpen);
    requestAnimationFrame(drawMonitor);
  };
  const vp = $('#viewport');
  vp.oncontextmenu = (e) => e.preventDefault();
  // Capture forced pan before pins, sources and nodes can handle the pointer.
  vp.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target.closest('.canvas-tools,.canvas-bottom')) return;
      if (gesture) {
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
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.defaultPrevented) return;
  if (e.key === 'Escape') {
    if (modal) closeModal();
    else cancelInteraction();
    return;
  }
  if (modal) {
    if (e.key === 'Tab') {
      const focusable = $$('button,input,select,textarea,a[href]', $('.modal')).filter(
        (el) => !el.disabled,
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
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
    $('#search').focus();
  }
  if (e.key === 'v') setTool('select');
  if (e.key === 'h') setTool('pan');
  if (e.key === 'w') setTool('wire');
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
      e.shiftKey && !modal && !e.target.closest('input,textarea,select,[contenteditable]');
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
window.addEventListener('resize', () => {
  applyView();
  drawMonitor();
});
window.addEventListener('beforeunload', () => {
  project.viewport = { ...view };
  saveProject(project);
});
function advance(dt) {
  const steps = Math.ceil(dt / 0.0005);
  for (let i = 0; i < steps; i++) simulate(project, runtime, dt / steps);
}
let lastFrame = 0;
function tick(now) {
  if (running) {
    const elapsed = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    advance(elapsed);
    updateSignals();
  }
  lastFrame = now;
  requestAnimationFrame(tick);
}
simulate(project, runtime, 0);
shell();
requestAnimationFrame(() => {
  if (!project.viewport) fit();
  requestAnimationFrame(tick);
});

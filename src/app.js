import { COMPONENTS, CATEGORIES, getDefinition } from './catalog.js';
import { createRuntime, simulate } from './simulator.js';
import { EXAMPLES, createExample } from './examples.js';
import { parseProject, serializeProject, loadProject, saveProject } from './project.js';
import { TEXT } from './i18n.js';
import { icon, gateIcon } from './icons.js';
import { $, $$, esc, format, safeColor, signalClass } from './ui-utils.js';
import { dimensions, portPoint, route, wirePath, snap } from './geometry.js';
import { guideMarkup, exampleCards, filterExamples } from './learning-ui.js';
import { drawMini, paintTraces } from './waveforms.js';

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
  return {
    x: (event.clientX - r.left - view.x) / view.zoom,
    y: (event.clientY - r.top - view.y) / view.zoom,
  };
}
function applyView() {
  view.x = boundCoordinate(view.x);
  view.y = boundCoordinate(view.y);
  $('#world').style.transform = `translate(${view.x}px,${view.y}px) scale(${view.zoom})`;
  $('#viewport').style.backgroundSize = `${20 * view.zoom}px ${20 * view.zoom}px`;
  $('#viewport').style.backgroundPosition = `${view.x}px ${view.y}px`;
  $('#zoom-value').textContent = `${Math.round(view.zoom * 100)}%`;
}
function fit() {
  const nodes = project.nodes.filter((n) => !['note', 'group'].includes(n.type));
  if (!nodes.length) {
    view = { x: 80, y: 80, zoom: 1 };
    applyView();
    return;
  }
  const minX = Math.min(...nodes.map((n) => n.x)) - 65,
    minY = Math.min(...project.nodes.map((n) => n.y)) - 65;
  const maxX = Math.max(...project.nodes.map((n) => n.x + dimensions(n).w)) + 65,
    maxY = Math.max(...project.nodes.map((n) => n.y + dimensions(n).h)) + 65;
  const el = $('#viewport');
  const zoom = Math.min(
    1.1,
    Math.max(0.2, Math.min(el.clientWidth / (maxX - minX), el.clientHeight / (maxY - minY))),
  );
  view = {
    zoom,
    x: (el.clientWidth - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: (el.clientHeight - (maxY - minY) * zoom) / 2 - minY * zoom,
  };
  applyView();
  persist();
}
function setTool(next) {
  tool = next;
  $$('[data-tool]').forEach((el) => el.classList.toggle('active', el.dataset.tool === tool));
  $('#viewport').dataset.tool = tool;
}
function shell() {
  document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
  document.title = t('pageTitle');
  $('#app').innerHTML = `
    <header class="app-header"><a class="brand" href="./" aria-label="Logic Lab"><img src="./favicon.svg?v=logic-lab-1" alt=""><span>logic<span class="brand-light">lab</span><small>${esc(t('workbench'))}</small></span></a>
    <div class="header-divider"></div><div class="project-heading">${icon('folder', 16)}<input id="project-name" aria-label="${t('namePlaceholder')}" value="${esc(project.name)}" maxlength="100"><span class="project-tag">.logic</span></div>
    <div class="header-actions"><span id="save-state" class="save-state">${icon('check', 13)}${t('saved')}</span>${button('import', 'upload', t('open'))}${button('export', 'download', t('save'))}<span class="divider"></span><button id="examples" class="soft-btn" aria-label="${t('examples')}">${icon('grid', 15)}<span>${t('examples')}</span></button><button id="language" class="language-btn" aria-label="Language">${lang === 'en' ? 'EN' : 'UA'}${icon('down', 12)}</button>${button('help', 'help', t('help'))}</div></header>
    <div class="app-body"><aside class="library"><div class="panel-title"><h2>${t('library')}</h2><span class="count-badge">${COMPONENTS.length}</span></div><div class="search-wrap">${icon('search', 16)}<input id="search" type="search" placeholder="${t('search')}" value="${esc(query)}" autocomplete="off"><kbd>/</kbd></div><div class="category-wrap"><select id="category" aria-label="${t('library')}"><option value="all">${t('all')}</option>${CATEGORIES.map((c) => `<option value="${c.id}" ${category === c.id ? 'selected' : ''}>${esc(title(c))}</option>`).join('')}</select></div><div id="library-list" class="library-list"></div><div class="library-footer"><span class="dot green"></span>${t('browserOnly')}<small>${t('dragHint')}</small></div></aside>
    <main class="main"><div class="workspace-toolbar"><div class="workspace-title"><span class="breadcrumb">${t('workspace')}</span><span class="slash">/</span><span id="canvas-name">${esc(project.name)}</span></div><div class="simulation-controls">${button('lesson-toggle', 'note', t('showLesson'))}${button('reset', 'reset', t('reset'))}${button('step', 'step', t('step'))}<button id="run" class="run-btn">${icon('play', 14)}<span>${t('run')}</span><kbd>Space</kbd></button></div></div>
    <section id="lesson-panel" class="lesson-panel" hidden></section>
    <section id="viewport" class="viewport" aria-label="${t('workspace')}" tabindex="0"><div class="canvas-heading"><span class="eyebrow">LOGIC LAB / 01</span><h1>${t('learn')}</h1><p>${t('learnDesc')}</p></div><div id="world" class="world"><svg id="wires" class="wire-layer" aria-label="${t('wires')}"></svg><div id="nodes" class="node-layer"></div><svg id="draft-layer" class="draft-layer"><path id="draft"/></svg></div><div id="empty-hint" class="empty-hint" hidden>${icon('plus', 32)}<p>${t('dragHint')}</p></div>
    <div class="canvas-tools"><div class="tool-group">${['select', 'pan', 'wire'].map((x, i) => `<button data-tool="${x}" class="icon-btn ${tool === x ? 'active' : ''}" title="${t(x)}" aria-label="${t(x)}">${icon(['mouse', 'hand', 'wire'][i])}</button>`).join('')}<span class="divider"></span>${button('add-note', 'note', t('note'))}${button('add-group', 'layers', t('group'))}</div><div class="tool-group">${button('undo', 'undo', t('undo'))}${button('redo', 'redo', t('redo'))}</div></div>
    <div class="canvas-bottom"><div id="canvas-tip" class="canvas-tip">${icon('wire', 15)}${project.name === 'Half adder' ? t('tutorial') : t('connectHint')}</div><div class="zoom-tools">${button('zoom-out', 'minus', t('zoom'))}<button id="zoom-value" class="zoom-value">100%</button><button id="zoom-in" class="icon-btn" aria-label="${t('zoom')}">${icon('plus', 16)}</button><span class="divider"></span>${button('fit', 'fit', t('fit'))}</div></div></section>
    <div class="monitor-controls"><span>${t('traceSelection')}</span><label>${t('timeWindow')} <select id="time-base" aria-label="${t('timeWindow')}">${[0.25, 1, 5].map((value) => `<option value="${value}" ${timeBase === value ? 'selected' : ''}>≈ ${value} ${t('seconds')}</option>`).join('')}</select></label></div>
    <section id="monitor" class="monitor ${monitorOpen ? '' : 'collapsed'}"><button id="monitor-toggle" class="monitor-heading"><span>${icon('signal', 17)}<strong>${t('timing')}</strong><span class="monitor-sub">${t('scopeHint')}</span></span><span id="simulation-badge" class="simulation-badge"><i></i>${t('paused')}</span>${icon('down', 15)}</button><div class="monitor-body"><div id="trace-labels" class="trace-labels"></div><canvas id="trace-canvas" aria-label="${t('trace')}"></canvas></div></section>
    <footer class="status-bar"><span><i class="dot green"></i>${t('status')}</span><button id="diagnostics" class="text-btn" hidden></button><span id="counts"></span><span class="time-label">t = <b id="sim-time">0.000</b> s</span></footer></main>
    <aside class="inspector"><div class="panel-title"><h2>${t('inspector')}</h2><span class="inspector-desktop-icon">${icon('layers', 16)}</span>${button('close-inspector', 'close', t('cancel'))}</div><div id="inspector-content"></div><div class="inspector-footer"><span class="legend"><i class="dot green"></i>1 <i class="dot gray"></i>0 <i class="dot amber"></i>X <span class="z-legend">Z</span></span><button id="inspector-help" class="text-btn">${t('help')}${icon('chevron', 12)}</button></div></aside></div><div id="modal-root"></div>`;
  $('#zoom-out').innerHTML = '<span style="font-size:20px">−</span>';
  bindShell();
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
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = COMPONENTS.filter(
    (d) =>
      (category === 'all' || d.category === category) &&
      terms.every((term) =>
        `${d.type} ${d.label} ${d.ua} ${d.description} ${d.descriptionUa}`
          .toLowerCase()
          .includes(term),
      ),
  );
  const groups = CATEGORIES.filter((c) => matches.some((d) => d.category === c.id));
  $('#library-list').innerHTML = matches.length
    ? groups
        .map(
          (c) =>
            `<section class="component-category"><div class="category-label">${esc(title(c))}<span>${matches.filter((d) => d.category === c.id).length}</span></div>${matches
              .filter((d) => d.category === c.id)
              .map(
                (d) =>
                  `<div class="library-row"><button class="library-item" draggable="true" data-component="${d.type}" title="${esc(lang === 'ua' ? d.descriptionUa || d.description : d.description)}"><span class="component-symbol cat-${esc(c.id)}">${['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(d.type) ? gateIcon(d.type) : icon(d.type === 'scope' ? 'signal' : d.type === 'note' ? 'note' : d.type === 'group' ? 'layers' : 'box', 20)}</span><span class="component-info"><strong>${esc(title(d))}</strong><small>${esc(d.type.toUpperCase().replaceAll('_', ' '))}</small></span><span class="item-plus">+</span></button><button class="library-guide" data-read-guide="${d.type}" title="${esc(t('readGuide'))}: ${esc(title(d))}" aria-label="${esc(t('usageGuide'))}: ${esc(title(d))}">${icon('help', 14)}</button></div>`,
              )
              .join('')}</section>`,
        )
        .join('')
    : `<div class="no-results">${icon('search', 24)}<p>${t('noResults')}</p></div>`;
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
      checkpoint();
      const n = project.nodes.find((n) => n.id === el.dataset.switch);
      n.params.value = n.params.value ? 0 : 1;
      changed();
    }),
  );
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
          .map(([key, value]) => parameterField(key, value))
          .join('')}</div>`
      : ''
  }<div class="property-section"><h4>${t('signalState')}</h4><div id="inspector-signals"></div></div><div class="inspector-node-actions"><button id="duplicate-node" class="soft-btn">${icon('layers', 15)}${t('duplicate')}</button><button id="delete-node" class="danger-btn" title="${t('delete')}">${icon('trash', 15)}</button></div>${['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'half_adder', 'full_adder'].includes(n.type) ? truthTable(n) : ''}`;
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
  duration: ['Pulse duration (s)', 'Тривалість імпульсу (с)'],
  low: ['Low threshold', 'Нижній поріг'],
  high: ['High threshold', 'Верхній поріг'],
  data: ['Memory bytes (comma-separated)', 'Байти пам’яті (через кому)'],
  width: ['Width', 'Ширина'],
  height: ['Height', 'Висота'],
};
function parameterField(key, value) {
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
  const bounds = {
    duty: [0, 1, 0.01],
    depth: [0, 1, 0.01],
    minDuty: [0, 1, 0.01],
    maxDuty: [0, 1, 0.01],
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
function truthTable(n) {
  const d = getDefinition(n.type);
  const count = d.inputs.length;
  if (count > 3) return '';
  let rows = '';
  for (let i = 0; i < 2 ** count; i++) {
    const values = d.inputs.map((p, j) => (i >> (count - 1 - j)) & 1);
    const nodes = values.map((value, j) => ({
      id: `input${j}`,
      type: 'switch',
      params: { value },
      enabled: true,
    }));
    const target = { ...n, id: 'target', enabled: true, params: { ...n.params } };
    const sample = {
      nodes: [...nodes, target],
      wires: values.map((v, j) => ({
        id: `wire${j}`,
        from: { node: `input${j}`, port: 'out' },
        to: { node: 'target', port: d.inputs[j].id },
        width: 1,
      })),
    };
    const rt = createRuntime();
    simulate(sample, rt, 0);
    rows += `<tr>${values.map((v) => `<td>${v}</td>`).join('')}${d.outputs.map((p) => `<td class="${signalClass(rt.outputs.target?.[p.id])}">${format(rt.outputs.target?.[p.id])}</td>`).join('')}</tr>`;
  }
  return `<div class="property-section"><h4>${t('truthTable')}</h4><table class="truth-table"><thead><tr>${[...d.inputs, ...d.outputs].map((p) => `<th>${esc(p.label || p.id)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
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
          return `<div class="signal-row"><span>${side === 'in' ? '↳' : '↗'} ${esc(p.label || p.id)}${p.width > 1 ? ` <small>[${p.width}]</small>` : ''}</span><b class="signal-value ${signalClass(v)}">${format(v)}${p.analog && typeof v === 'number' ? (n.type === 'servo' && side === 'out' ? '°' : n.type === 'servo' || n.type === 'pwm' ? '' : ' V') : ''}</b></div>`;
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
      ['led', 'clock', 'counter', 'pwm', 'dac', 'am', 'fm', 'servo'].includes(n.type),
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
  if (tool === 'pan') return startPan(e);
  if (e.shiftKey || e.metaKey || e.ctrlKey) {
    selectedWire = null;
    if (selected.has(id)) selected.delete(id);
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
function cancelInteraction() {
  gesture = null;
  $('#marquee')?.remove();
  $('#viewport')?.classList.remove('panning');
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
  gesture = { kind: 'pan', x: e.clientX, y: e.clientY, view: { ...view } };
  $('#viewport').classList.add('panning');
}
function onPointerMove(e) {
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
    view.x = gesture.view.x + e.clientX - gesture.x;
    view.y = gesture.view.y + e.clientY - gesture.y;
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
  if (pending && Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) > 5) {
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
  if (gesture.kind === 'pan') persist();
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
    icon(next ? 'pause' : 'play', 14) + `<span>${t(next ? 'pause' : 'run')}</span><kbd>Space</kbd>`;
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
  showModal(
    `<span class="eyebrow">${t('examples')}</span><h2>${t('examplesTitle')}</h2><p>${t('examplesDesc')}</p>
    <div class="catalog-controls"><div class="search-wrap">${icon('search', 16)}<input id="example-search" type="search" placeholder="${t('searchExamples')}" value="${esc(filters.query || '')}"></div>
    <select id="example-category" aria-label="${t('allTopics')}"><option value="all">${t('allTopics')}</option>${['basics', 'sequential', 'mixed', 'architecture', 'physical'].map((topic) => `<option value="${topic}" ${filters.category === topic ? 'selected' : ''}>${t(topic)}</option>`).join('')}</select>
    <select id="example-level" aria-label="${t('allLevels')}"><option value="all">${t('allLevels')}</option>${['beginner', 'intermediate'].map((level) => `<option value="${level}">${t(level)}</option>`).join('')}</select></div>
    <div class="catalog-count" id="catalog-count"></div><div id="example-results" class="example-grid"></div><button id="empty-project" class="text-btn">${icon('plus', 14)}${t('clear')}</button>`,
    true,
  );
  const refresh = () => {
    const matches = filterExamples(EXAMPLES, {
      query: $('#example-search').value,
      category: $('#example-category').value,
      level: $('#example-level').value,
    });
    $('#example-results').innerHTML = exampleCards(matches, lang);
    $('#catalog-count').textContent = `${t('examplesCount')}: ${matches.length}`;
    $$('[data-example]').forEach(
      (el) => (el.onclick = () => confirmReplace(() => createExample(el.dataset.example))),
    );
  };
  $('#example-search').oninput = refresh;
  $('#example-category').onchange = refresh;
  $('#example-level').onchange = refresh;
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
function showDiagnostics() {
  const messages = (runtime.diagnostics || []).slice(0, 50).map((d) => {
    const n = project.nodes.find((n) => n.id === d.node);
    const name = n?.label || (n ? title(getDefinition(n.type)) : '');
    if (lang === 'en') return d.message;
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
  if (!modal) modalOpener = document.activeElement;
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
  $('#category').onchange = (e) => {
    category = e.target.value;
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
  $('#reset').onclick = () => {
    runtime = newRuntime();
    simulate(project, runtime, 0);
    updateSignals();
  };
  $('#undo').onclick = () => undo();
  $('#redo').onclick = () => undo(true);
  $('#fit').onclick = fit;
  $('#zoom-value').onclick = fit;
  const zoomCenter = (factor) => {
    const el = $('#viewport');
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  };
  $('#zoom-in').onclick = () => zoomCenter(1.2);
  $('#zoom-out').onclick = () => zoomCenter(1 / 1.2);
  $('#export').onclick = exportProject;
  $('#import').onclick = () => $('#import-file').click();
  $('#examples').onclick = () => showExamples();
  $('#lesson-toggle').onclick = () => {
    lessonOpen = !lessonOpen;
    renderLesson();
  };
  $('#help').onclick = showHelp;
  $('#inspector-help').onclick = showHelp;
  $('#add-note').onclick = () => addNode('note');
  $('#add-group').onclick = () => addNode('group');
  $$('[data-tool]').forEach((el) => (el.onclick = () => setTool(el.dataset.tool)));
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
  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.canvas-tools,.canvas-bottom,button')) return;
    if (e.button === 1 || tool === 'pan') {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
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
    if (e.shiftKey) {
      selectedWire = null;
      selectionChanged();
      gesture = { kind: 'marquee', start: worldPoint(e) };
      const box = document.createElement('div');
      box.id = 'marquee';
      box.className = 'marquee';
      $('#world').append(box);
      return;
    }
    selected.clear();
    selectedWire = null;
    selectionChanged();
  });
  vp.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
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
  const next = Math.max(0.2, Math.min(4, view.zoom * factor));
  const world = { x: (x - view.x) / view.zoom, y: (y - view.y) / view.zoom };
  view.x = x - world.x * next;
  view.y = y - world.y * next;
  view.zoom = next;
  applyView();
  persist();
}
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('pointercancel', () => {
  cancelInteraction();
  persist();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal) closeModal();
    else cancelWire();
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
  if (e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) setRunning(!running);
  }
  if (['Backspace', 'Delete'].includes(e.key)) {
    e.preventDefault();
    deleteSelection();
  }
  if (e.key.toLowerCase() === 'f') fit();
  if (e.key === '/') {
    e.preventDefault();
    $('#search').focus();
  }
  if (e.key === 'v') setTool('select');
  if (e.key === 'h') setTool('pan');
  if (e.key === 'w') setTool('wire');
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selected.size) {
    e.preventDefault();
    checkpoint();
    for (const n of project.nodes.filter((n) => selected.has(n.id))) {
      n.x = boundCoordinate(n.x + (e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0));
      n.y = boundCoordinate(n.y + (e.key === 'ArrowUp' ? -20 : e.key === 'ArrowDown' ? 20 : 0));
    }
    changed();
  }
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

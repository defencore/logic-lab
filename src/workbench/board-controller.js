import { getDefinition } from '../components/catalog/index.js';
import { $, $$, esc, format, safeColor, signalClass } from '../shared/ui.js';
import { icon, gateIcon } from '../shared/icons.js';
import { dimensions, wirePath } from '../circuits/geometry/index.js';
import { componentPins } from '../components/pins.js';
import { getSceneEntries, getSceneSnapshot, sceneHealth } from '../scenes/data/scenarios.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';
import { drawMini } from '../signals/waveforms.js';
import { componentHeaderMarkup, createComponentNavigation } from './component-keyboard.js';
import { hotkeyNodeMarkup } from './hotkey-node.js';
import { createInlineNodeLabel } from './inline-node-label.js';
import { isAudioNode, audioNodeMarkup, updateAudioNode } from './audio-node.js';
import {
  contactEndpoint,
  createContactNavigation,
  focusContact,
  updateContactTargets,
} from './contact-interaction.js';

export function createBoardController(
  state,
  {
    t,
    title,
    applyView,
    nodePointerDown,
    pinPointerDown,
    toggleSource,
    openScene,
    primarySignal,
    selectNode,
    canRenameNode,
    renameNode,
    cancelInteraction,
  },
) {
  const contacts = createContactNavigation(state, applyView);
  const components = createComponentNavigation(state, {
    applyView,
    isKeyboard: contacts.isKeyboard,
    selectNode,
  });
  const labels = createInlineNodeLabel(state, {
    canEdit: canRenameNode,
    renameNode,
    beforeBegin: cancelInteraction,
    restoreFocus: (id) => components.returnFocus(id, { reveal: false }),
    labelPlaceholder: (node) => title(getDefinition(node.type)),
    editLabel: () => t('label'),
  });
  function nodeBody(node) {
    const d = getDefinition(node.type);
    switch (node.type) {
      case 'active_buzzer':
      case 'passive_buzzer':
        return audioNodeMarkup();
      case 'hotkey':
        return hotkeyNodeMarkup(node, state.lang);
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
      case 'traffic_light':
        return `<div class="scene-node-widget"><div class="traffic-mini">${['red', 'yellow', 'green'].map((color) => `<i data-lamp="${color}" class="lamp-${color}"></i>`).join('')}</div><strong class="node-readout"></strong><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
      case 'traffic_junction':
      case 'railway':
      case 'animal_feeder':
      case 'water_tank':
      case 'aquarium':
      case 'greenhouse':
      case 'smart_home':
        return `<div class="scene-node-widget"><span class="scene-node-icon">${icon(node.type === 'railway' ? 'wire' : node.type === 'traffic_junction' ? 'grid' : 'box', 32)}</span><strong class="node-readout"></strong><span class="scene-node-state"></span><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
      case 'stepper':
        return `<div class="stepper-widget"><div class="stepper-body"><div class="stepper-rotor"></div></div><strong class="node-readout"></strong><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
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
    const editingLabel = labels.beforeRender();
    const focused = document.activeElement?.closest?.('.pin');
    const focusedEndpoint = focused ? contactEndpoint(focused) : null;
    const focusedControl = editingLabel ? null : components.captureFocus();
    $('#nodes').innerHTML = state.project.nodes
      .map((n) => {
        const d = getDefinition(n.type),
          { w, h } = dimensions(n),
          special = ['note', 'group'].includes(n.type);
        return `<div class="circuit-node ${state.selected.has(n.id) ? 'selected' : ''} ${state.highlighted.has(n.id) ? 'lesson-highlight' : ''} ${n.enabled === false ? 'disabled' : ''} type-${n.type}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${w}px;height:${h}px;${special ? `--note-color:${safeColor(n.params.color)};` : ''}" role="group" aria-label="${esc(n.label || title(d))}">${componentHeaderMarkup(n, n.label || title(d), t('properties'), special ? '' : d.type.toUpperCase().replaceAll('_', ' '))}${special ? `<div class="note-content">${esc(n.params.text || '')}</div>` : `<div class="node-content">${nodeBody(n)}</div>${componentPins(n, { label: n.label || title(d), inputLabel: t('inputs'), outputLabel: t('outputs') })}`}</div>`;
      })
      .join('');
    $('#wires').innerHTML = state.project.wires
      .map(
        (w) =>
          `<g data-wire="${w.id}" class="wire-group ${state.selectedWire === w.id ? 'selected' : ''}"><path class="wire-hit" d="${wirePath(w, state.project)}"/><path class="wire-line" d="${wirePath(w, state.project)}"/><path class="wire-net-halo" d="${wirePath(w, state.project)}"/><path class="wire-net-trace" d="${wirePath(w, state.project)}"/></g>`,
      )
      .join('');
    $('#empty-hint').hidden = state.project.nodes.length > 0;
    $('.canvas-heading').hidden = state.project.nodes.length > 0;
    $('#draft').setAttribute('d', '');
    $$('.circuit-node').forEach((el) => el.addEventListener('pointerdown', nodePointerDown));
    $$('[data-node-header]').forEach(components.bind);
    $$('[data-node-header]').forEach(labels.bind);
    $$('.pin').forEach((el) => {
      el.style.setProperty('--contact-gap', `${el.dataset.contactGap}px`);
      contacts.bind(el, pinPointerDown);
    });
    $$('[data-switch]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSource(el.dataset.switch);
      }),
    );
    $$('[data-motion-open]').forEach((el) => (el.onclick = () => openScene(el.dataset.sceneNode)));
    applyView();
    updateContactTargets(state.project, state.pending);
    if (focusedEndpoint) focusContact(focusedEndpoint);
    else if (focusedControl) components.restoreFocus(focusedControl);
    labels.restoreAfterRender();
    state.wiring?.refresh();
  }
  function updateBoardSignals() {
    for (const n of state.project.nodes) {
      const el = $(`[data-node="${n.id}"].circuit-node`);
      if (!el) continue;
      const ins = state.runtime.inputs?.[n.id] || {},
        outs = state.runtime.outputs?.[n.id] || {};
      const signalOutputs = state.runtime.signals.outputs[n.id] || {};
      if (isAudioNode(n)) updateAudioNode(el, n, state.runtime, state.lang);
      $$('.pin', el).forEach((pin) => {
        const v = (pin.dataset.side === 'in' ? ins : outs)[pin.dataset.pin];
        pin.classList.remove('high', 'low', 'unknown', 'floating');
        pin.classList.add(signalClass(v));
      });
      const readout = $('.node-readout', el);
      if (n.type === 'hotkey') {
        $('.hotkey-widget', el).classList.toggle('is-pressed', n.params.value === 1);
        $('.hotkey-widget', el).classList.toggle('is-high', signalOutputs.out === 1);
      }
      if (readout) {
        const first = primarySignal(n);
        readout.textContent =
          n.type === 'pwm'
            ? `${typeof outs.duty === 'number' ? `${Math.round(outs.duty * 100)}%` : format(outs.duty)} · ${n.params.frequency ?? 105} Hz`
            : n.type === 'splitter'
              ? `D: ${format(state.runtime.signals.inputs[n.id]?.in)}`
              : n.type === 'demux'
                ? getDefinition(n.type)
                    .signals.outputs.map(
                      (port) => `${port.label}: ${format(signalOutputs[port.id])}`,
                    )
                    .join(' · ')
                : format(first);
      }
      if (n.type === 'led') {
        const v = ins.in;
        const lamp = $('.led-bulb', el);
        lamp.style.setProperty('--led-color', safeColor(n.params.color || '#72b66e'));
        lamp.className = `led-bulb ${signalClass(v)}`;
        $('.led-text', el).textContent = v === 1 ? t('one') : v === 0 ? t('zero') : format(v);
      }
      if (SCENARIO_TYPES.includes(n.type)) {
        const health = sceneHealth(
          getSceneSnapshot(state.project, state.runtime, { nodeId: n.id, type: n.type }),
        );
        el.dataset.sceneHealth = health.status;
        const readout = $('.node-readout', el);
        readout.textContent =
          n.type === 'aquarium'
            ? `${t('sceneAlive')}: ${format(signalOutputs.alive)} · ${format(outs.temperature)} °C`
            : n.type === 'greenhouse'
              ? `${t('sceneGrowth')}: ${format(outs.growth)}%`
              : n.type === 'smart_home'
                ? `${format(outs.temperature)} °C · ${format(outs.energy)} kWh`
                : n.type === 'water_tank'
                  ? `${format(outs.level)}%`
                  : n.type === 'animal_feeder'
                    ? `${format(outs.level)} g`
                    : n.type === 'traffic_light'
                      ? `${t('signalState')}: ${format(outs.valid)}`
                      : `${t('scenePassed')}: ${format(signalOutputs.passed)}`;
        const status = $('.scene-node-state', el);
        if (status)
          status.textContent =
            health.status === 'fault'
              ? t('sceneAlarm')
              : health.status === 'disabled'
                ? t('disabled')
                : health.status === 'unknown'
                  ? 'X'
                  : '';
        $$('[data-lamp]', el).forEach((lamp) =>
          lamp.classList.toggle('lit', ins[lamp.dataset.lamp] === 1 && n.enabled !== false),
        );
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
          const angle = outs[`a${i}`];
          const known = typeof angle === 'number' && Number.isFinite(angle);
          const arm = $(`[data-servo="${i}"]`, el);
          arm.hidden = !known;
          arm.style.transform = known ? `rotate(${angle}deg)` : '';
          $(`[data-angle="${i}"]`, el).textContent = known ? `${angle.toFixed(0)}°` : format(angle);
        }
      if (n.type === 'sevenseg') {
        $$('[data-segment]', el).forEach((segment, bit) =>
          segment.classList.toggle('lit', ins[`in${bit}`] === 1),
        );
      }
      if (n.type === 'matrix') {
        $$('[data-pixel]', el).forEach((pixel, index) =>
          pixel.classList.toggle(
            'lit',
            ins[`rows${index >> 3}`] === 1 && ins[`cols${index % 8}`] === 1,
          ),
        );
      }
      const canvas = $('.mini-scope', el);
      if (canvas)
        drawMini(canvas, state.runtime.history?.[n.id] || [], n, state.runtime.historyTimes);
    }
    for (const w of state.project.wires) {
      const el = $(`[data-wire="${w.id}"] .wire-line`);
      if (!el) continue;
      const v =
        state.runtime.wireValues?.[w.id] ?? state.runtime.outputs?.[w.from.node]?.[w.from.port];
      el.setAttribute('class', `wire-line ${signalClass(v)}`);
    }
  }
  function updateCounts() {
    $('#motion').hidden = getSceneEntries(state.project).length === 0;
    $('#counts').textContent =
      `${state.project.nodes.length} ${t('nodes')} · ${state.project.wires.length} ${t('wires')}`;
    $('#canvas-name').textContent = state.project.name;
  }

  return {
    render: renderBoard,
    updateSignals: updateBoardSignals,
    updateCounts,
    restoreComponentFocus: components.returnFocus,
  };
}

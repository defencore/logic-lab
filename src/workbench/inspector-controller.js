import { isKeypad } from '../components/keypad.js';
import { getDefinition } from '../components/catalog/index.js';
import { $, $$, esc, format, signalClass } from '../shared/ui.js';
import { icon, gateIcon } from '../shared/icons.js';
import { guideMarkup } from '../learning/views/guides.js';
import { truthTableMarkup } from '../learning/truth-tables.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { parameterField } from './component-parameters.js';
import { bindInspectorParameters } from './inspector-parameters.js';
import { createHotkeyProperties, hotkeyPropertiesMarkup } from './hotkey-properties.js';
import { audioParameterHelp } from './audio-node.js';
import { inspectionMarkup } from './state-inspection/markup.js';
import { updateStateInspection } from './state-inspection/update.js';
import { signalUnit } from './signal-unit.js';
import { keypadNodeMarkup, bindKeypadControls, updateKeypadControls } from './keypad-node.js';

export function createInspectorController(state, actions) {
  let lastInspectorKey = '';
  const {
    t,
    title,
    checkpoint,
    changed,
    renderBoard,
    updateSignals,
    persist,
    bindLiveText,
    bindLearningActions,
    updateGuideSignals,
    deleteSelection,
    duplicateSelection,
    enableSelected,
  } = actions;
  const hotkeys = createHotkeyProperties(state, actions);
  let disposeKeypad = () => {};
  function renderInspector() {
    hotkeys.cancel();
    disposeKeypad();
    disposeKeypad = () => {};
    renderInspectorContent();
    state.wiring?.decorateInspector();
  }
  function updateRoutingControls(locked = !!state.classroom?.isLocked()) {
    const routing = $('#routing');
    const automatic = $('#auto-routing');
    if (routing) routing.disabled = locked;
    if (automatic) automatic.disabled = locked || state.project.wireStyle === 'bezier';
  }
  function renderInspectorContent() {
    const el = $('#inspector-content');
    const key = `${[...state.selected].join(',')}|${state.selectedWire}|${state.inspectorTab}`;
    if (lastInspectorKey !== key) {
      el.scrollTop = 0;
      lastInspectorKey = key;
    }
    el.closest('.inspector').classList.toggle(
      'mobile-open',
      !!state.selectedWire || state.selected.size > 0,
    );
    if (state.selectedWire) {
      const w = state.project.wires.find((w) => w.id === state.selectedWire);
      if (!w) {
        state.selectedWire = null;
        return renderInspectorContent();
      }
      el.innerHTML = `<div class="inspector-selected"><span class="inspector-symbol">${icon('wire', 28)}</span><h3>${t('wireProperties')}</h3><p>${t(getDefinition(state.project.nodes.find((node) => node.id === w.from.node).type).outputs.find((pin) => pin.id === w.from.port)?.analog ? 'analog' : 'digital')}</p></div><div class="property-section"><h4>${t('properties')}</h4><label>${t('source')}<input disabled value="${esc(w.from.node + '.' + w.from.port)}"></label><label>${t('destination')}<input disabled value="${esc(w.to.node + '.' + w.to.port)}"></label></div><button class="danger-btn" id="delete-node">${icon('trash', 15)}${t('removeWire')}</button>`;
      $('#delete-node').onclick = deleteSelection;
      return;
    }
    if (!state.selected.size) {
      const curved = state.project.wireStyle === 'bezier';
      el.innerHTML = `<div class="inspector-empty"><span class="empty-icon">${icon('mouse', 29)}</span><h3>${t('nothing')}</h3><p>${t('nothingDesc')}</p></div><div class="workspace-settings"><h4>${t('view')}</h4><label>${t('wireStyle')}<select id="routing"><option value="orthogonal">${t('orthogonal')}</option><option value="bezier" ${curved ? 'selected' : ''}>${t('bezier')}</option></select></label><label class="toggle-row">${t('automaticRouting')}<input id="auto-routing" class="toggle-input" type="checkbox" aria-describedby="auto-routing-help" ${state.project.autoRouting !== false ? 'checked' : ''}></label><p id="auto-routing-help" class="parameter-help">${t('automaticRoutingHelp')}</p><div class="signal-legend"><span><i class="dot green"></i>${t('one')}</span><span><i class="dot gray"></i>${t('zero')}</span><span><i class="dot amber"></i>${t('unknown')}</span><span><i class="dot dashed"></i>${t('floating')}</span></div></div>`;
      updateRoutingControls();
      $('#routing').onchange = (e) => {
        if (state.classroom && !state.classroom.allowEdit()) return;
        checkpoint();
        state.project.wireStyle = e.target.value;
        changed();
      };
      const automatic = $('#auto-routing');
      automatic.onchange = () => {
        if (state.classroom && !state.classroom.allowEdit()) {
          automatic.checked = state.project.autoRouting !== false;
          return;
        }
        checkpoint();
        state.project.autoRouting = automatic.checked;
        changed();
        $('#auto-routing')?.focus({ preventScroll: true });
      };
      return;
    }
    if (state.selected.size > 1) {
      el.innerHTML = `<div class="inspector-selected"><span class="inspector-symbol">${icon('layers', 28)}</span><h3>${state.selected.size} ${t('selected')}</h3></div><div class="multi-actions"><button id="multi-enable" class="soft-btn">${t('enableAll')}</button><button id="multi-disable" class="soft-btn">${t('disableAll')}</button><button id="duplicate-node" class="soft-btn">${t('duplicate')}</button><button id="delete-node" class="danger-btn">${t('delete')}</button></div>`;
      $('#multi-enable').onclick = () => enableSelected(true);
      $('#multi-disable').onclick = () => enableSelected(false);
      $('#duplicate-node').onclick = duplicateSelection;
      $('#delete-node').onclick = deleteSelection;
      return;
    }
    const n = state.project.nodes.find((n) => state.selected.has(n.id));
    if (!n) {
      state.selected.clear();
      return renderInspectorContent();
    }
    const d = getDefinition(n.type);
    const params = { ...d.defaults, ...n.params };
    const parameterEntries = ['hotkey', 'button'].includes(n.type)
      ? []
      : Object.entries(params).filter(
          ([key]) =>
            !(isKeypad(n.type) && key === 'keys') &&
            !(n.type === 'contact_switch' && key === 'value'),
        );
    const header = `<div class="inspector-selected"><span class="inspector-symbol">${['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(n.type) ? gateIcon(n.type, 36) : icon('box', 28)}</span><span class="eyebrow">${esc(n.type.toUpperCase().replaceAll('_', ' '))}</span><h3>${esc(title(d))}</h3><p>${esc(state.lang === 'ua' ? d.descriptionUa || d.description : d.description)}</p></div>`;
    const tabs = `<div class="inspector-tabs" role="tablist"><button role="tab" aria-selected="${state.inspectorTab === 'properties'}" data-inspector-tab="properties">${t('properties')}</button><button role="tab" aria-selected="${state.inspectorTab === 'guide'}" data-inspector-tab="guide">${icon('help', 13)}${t('usageGuide')}</button></div>`;
    if (state.inspectorTab === 'guide') {
      el.innerHTML =
        header + tabs + inspectionMarkup(n, state.lang) + guideMarkup(n.type, state.lang, n.id);
      bindInspectorTabs();
      bindLearningActions(el);
      updateGuideSignals();
      updateInspectorSignals();
      return;
    }
    el.innerHTML = `${header}${tabs}${inspectionMarkup(n, state.lang)}${isKeypad(n.type) ? keypadNodeMarkup(n, state.lang) : ''}<div class="property-section"><h4>${t('properties')}</h4><label>${t('label')}<input id="node-label" value="${esc(n.label || '')}" placeholder="${esc(title(d))}" maxlength="100"></label><label class="toggle-row">${t('enabled')}<input type="checkbox" id="node-enabled" class="toggle-input" ${n.enabled !== false ? 'checked' : ''}></label></div>${
      parameterEntries.length
        ? `<div class="property-section"><h4>${t('parameters')}</h4>${audioParameterHelp(n.type, state.lang)}${SCENARIO_TYPES.includes(n.type) ? `<p class="parameter-help">${t('sceneParamReset')}</p>` : ''}${parameterEntries
            .map(([key, value]) => parameterField(key, value, n.type, state.lang, t, params))
            .join('')}</div>`
        : ''
    }${hotkeyPropertiesMarkup(n, state.lang)}<div class="property-section"><h4>${t('signalState')}</h4><div id="inspector-signals"></div></div><div class="inspector-node-actions"><button id="duplicate-node" class="soft-btn">${icon('layers', 15)}${t('duplicate')}</button><button id="delete-node" class="danger-btn" title="${t('delete')}">${icon('trash', 15)}</button></div>${truthTableMarkup(n.type, state.lang, n.id)}`;
    bindInspectorTabs();
    hotkeys.bind(n);
    if (isKeypad(n.type)) disposeKeypad = bindKeypadControls(el, n, actions.setKeypadKey);
    bindLiveText($('#node-label'), (value) => {
      if (state.classroom?.isPlaying()) {
        state.classroom.allowEdit();
        $('#node-label').value = n.label || '';
        return;
      }
      n.label = value;
      renderBoard();
      updateSignals();
      state.wiring.decorateInspector();
      persist();
    });
    $('#node-enabled').onchange = (e) => {
      if (state.classroom && !state.classroom.allowEdit()) {
        e.target.checked = n.enabled !== false;
        return;
      }
      checkpoint();
      n.enabled = e.target.checked;
      changed();
    };
    bindInspectorParameters(el, n, state, actions);
    $('#duplicate-node').onclick = duplicateSelection;
    $('#delete-node').onclick = deleteSelection;
    updateInspectorSignals();
    updateGuideSignals();
  }
  function updateInspectorSignals() {
    hotkeys.update();
    const playback = !!state.classroom?.isPlaying();
    const recording = !!state.classroom?.isRecording();
    const selectedNode = state.project.nodes.find((node) => state.selected.has(node.id));
    updateKeypadControls(
      $('#inspector-content'),
      selectedNode,
      playback || (!!state.classroom?.isLocked() && !recording),
      { running: state.running, ...actions.getKeypadStatus?.(selectedNode?.id) },
    );
    updateStateInspection(
      $('#inspector-content'),
      selectedNode,
      state.project,
      state.runtime,
      state.lang,
    );
    if ($('#node-label')) $('#node-label').disabled = playback;
    if ($('#node-enabled')) $('#node-enabled').disabled = !!state.classroom?.isLocked();
    $$('[data-param],[data-slider]').forEach((input) => {
      input.disabled =
        playback ||
        (recording &&
          !SOURCE_PARAMETERS[selectedNode?.type]?.[input.dataset.param || input.dataset.slider]);
    });
    if (selectedNode?.type === 'potentiometer') {
      const field = $('#inspector-content [data-param="value"]');
      if (field && document.activeElement !== field)
        field.value = selectedNode.params.value ?? getDefinition('potentiometer').defaults.value;
    }
    const el = $('#inspector-signals');
    if (!el) return;
    const n = state.project.nodes.find((n) => state.selected.has(n.id));
    if (!n) return;
    const d = getDefinition(n.type);
    el.innerHTML = [
      ['in', d.inputs],
      ['out', d.outputs],
    ]
      .map(([side, ports]) =>
        ports
          .map((p) => {
            const v = state.runtime[side === 'in' ? 'inputs' : 'outputs']?.[n.id]?.[p.id];
            const unit = typeof v === 'number' ? signalUnit(n, p, side, state.lang) : '';
            return `<div class="signal-row"><span>${side === 'in' ? '↳' : '↗'} ${esc(p.label || p.id)}</span><b class="signal-value ${signalClass(v)}">${format(v)}${unit ? ' ' + esc(unit) : ''}</b></div>`;
          })
          .join(''),
      )
      .join('');
  }
  function bindInspectorTabs() {
    $$('[data-inspector-tab]').forEach(
      (el) =>
        (el.onclick = () => {
          state.inspectorTab = el.dataset.inspectorTab;
          renderInspector();
        }),
    );
  }

  return { render: renderInspector, updateSignals: updateInspectorSignals, updateRoutingControls };
}

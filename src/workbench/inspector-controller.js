import { getDefinition } from '../components/catalog/index.js';
import { simulate } from '../simulation/index.js';
import { $, $$, esc, format, signalClass } from '../shared/ui.js';
import { icon, gateIcon } from '../shared/icons.js';
import { guideMarkup } from '../learning/views/guides.js';
import { truthTableMarkup } from '../learning/truth-tables.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { parameterField, memoryBytes } from './component-parameters.js';

export function createInspectorController(state, actions) {
  let lastInspectorKey = '';
  const {
    t,
    title,
    checkpoint,
    notify,
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
  function renderInspector() {
    renderInspectorContent();
    state.wiring?.decorateInspector();
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
      el.innerHTML = `<div class="inspector-empty"><span class="empty-icon">${icon('mouse', 29)}</span><h3>${t('nothing')}</h3><p>${t('nothingDesc')}</p></div><div class="workspace-settings"><h4>${t('view')}</h4><label>${t('wireStyle')}<select id="routing"><option value="orthogonal">${t('orthogonal')}</option><option value="bezier" ${state.project.wireStyle === 'bezier' ? 'selected' : ''}>${t('bezier')}</option></select></label><div class="signal-legend"><span><i class="dot green"></i>${t('one')}</span><span><i class="dot gray"></i>${t('zero')}</span><span><i class="dot amber"></i>${t('unknown')}</span><span><i class="dot dashed"></i>${t('floating')}</span></div></div>`;
      $('#routing').disabled = !!state.classroom?.isLocked();
      $('#routing').onchange = (e) => {
        if (state.classroom && !state.classroom.allowEdit()) return;
        checkpoint();
        state.project.wireStyle = e.target.value;
        changed();
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
    const header = `<div class="inspector-selected"><span class="inspector-symbol">${['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(n.type) ? gateIcon(n.type, 36) : icon('box', 28)}</span><span class="eyebrow">${esc(n.type.toUpperCase().replaceAll('_', ' '))}</span><h3>${esc(title(d))}</h3><p>${esc(state.lang === 'ua' ? d.descriptionUa || d.description : d.description)}</p></div>`;
    const tabs = `<div class="inspector-tabs" role="tablist"><button role="tab" aria-selected="${state.inspectorTab === 'properties'}" data-inspector-tab="properties">${t('properties')}</button><button role="tab" aria-selected="${state.inspectorTab === 'guide'}" data-inspector-tab="guide">${icon('help', 13)}${t('usageGuide')}</button></div>`;
    if (state.inspectorTab === 'guide') {
      el.innerHTML = header + tabs + guideMarkup(n.type, state.lang, n.id);
      bindInspectorTabs();
      bindLearningActions(el);
      updateGuideSignals();
      return;
    }
    el.innerHTML = `${header}${tabs}<div class="property-section"><h4>${t('properties')}</h4><label>${t('label')}<input id="node-label" value="${esc(n.label || '')}" placeholder="${esc(title(d))}" maxlength="100"></label><label class="toggle-row">${t('enabled')}<input type="checkbox" id="node-enabled" class="toggle-input" ${n.enabled !== false ? 'checked' : ''}></label></div>${
      Object.keys(params).length
        ? `<div class="property-section"><h4>${t('parameters')}</h4>${SCENARIO_TYPES.includes(n.type) ? `<p class="parameter-help">${t('sceneParamReset')}</p>` : ''}${Object.entries(
            params,
          )
            .map(([key, value]) => parameterField(key, value, n.type, state.lang, t))
            .join('')}</div>`
        : ''
    }<div class="property-section"><h4>${t('signalState')}</h4><div id="inspector-signals"></div></div><div class="inspector-node-actions"><button id="duplicate-node" class="soft-btn">${icon('layers', 15)}${t('duplicate')}</button><button id="delete-node" class="danger-btn" title="${t('delete')}">${icon('trash', 15)}</button></div>${truthTableMarkup(n.type, state.lang, n.id)}`;
    bindInspectorTabs();
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
        if (input.dataset.memoryBytes) {
          try {
            value = memoryBytes(value);
            input.removeAttribute('aria-invalid');
          } catch {
            input.setAttribute('aria-invalid', 'true');
            return;
          }
        }
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
          if (input.dataset.integer === 'true' && !Number.isInteger(value)) {
            input.setAttribute('aria-invalid', 'true');
            return;
          }
          input.removeAttribute('aria-invalid');
        }
        if (n.params[key] === value) return;
        if (state.classroom?.isLocked()) {
          if (!state.classroom.allowInput()) return;
          if (!SOURCE_PARAMETERS[n.type]?.[key] && !state.classroom.allowEdit()) return;
          const rule = SOURCE_PARAMETERS[n.type]?.[key];
          if (
            rule &&
            (typeof value !== 'number' ||
              value < rule[0] ||
              value > rule[1] ||
              (rule[2] && !Number.isInteger(value)))
          ) {
            notify(
              state.lang === 'ua'
                ? `Для запису задайте значення від ${rule[0]} до ${rule[1]}.`
                : `For recording, enter a value between ${rule[0]} and ${rule[1]}.`,
            );
            input.value = n.params[key];
            return;
          }
        }
        if (!editing) {
          checkpoint();
          editing = true;
        }
        n.params[key] = value;
        if (key === 'initial' || SCENARIO_TYPES.includes(n.type)) delete state.runtime.state[n.id];
        const companion = $(`[data-${input.dataset.slider ? 'param' : 'slider'}="${key}"]`);
        if (companion) companion.value = value;
        simulate(state.project, state.runtime, 0);
        renderBoard();
        updateSignals();
        if (SOURCE_PARAMETERS[n.type]?.[key]) state.classroom?.inputChanged(n.id, key, value);
        state.classroom?.observeEdit();
        persist();
      };
      input.oninput = commit;
      input.onchange = commit;
      input.onblur = () => {
        editing = false;
        const key = input.dataset.param || input.dataset.slider;
        const value = n.params[key] ?? d.defaults[key];
        if (input.type === 'number') {
          if (input.getAttribute('aria-invalid') === 'true')
            notify(
              state.lang === 'ua'
                ? 'Для цього параметра потрібне ціле значення.'
                : 'This parameter requires a whole number.',
            );
          input.value = value;
          input.removeAttribute('aria-invalid');
        }
        if (input.dataset.memoryBytes) {
          if (input.getAttribute('aria-invalid') === 'true')
            notify(
              state.lang === 'ua'
                ? 'Введіть байти від 0 до 255, розділені комами.'
                : 'Enter bytes from 0 to 255, separated by commas.',
            );
          input.value = Array.isArray(value) ? value.join(', ') : value;
          input.removeAttribute('aria-invalid');
        }
      };
    });
    $('#duplicate-node').onclick = duplicateSelection;
    $('#delete-node').onclick = deleteSelection;
    updateInspectorSignals();
    updateGuideSignals();
  }
  function updateInspectorSignals() {
    const playback = !!state.classroom?.isPlaying();
    const recording = !!state.classroom?.isRecording();
    const selectedNode = state.project.nodes.find((node) => state.selected.has(node.id));
    if ($('#node-label')) $('#node-label').disabled = playback;
    if ($('#node-enabled')) $('#node-enabled').disabled = !!state.classroom?.isLocked();
    $$('[data-param],[data-slider]').forEach((input) => {
      input.disabled =
        playback ||
        (recording &&
          !SOURCE_PARAMETERS[selectedNode?.type]?.[input.dataset.param || input.dataset.slider]);
    });
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
            return `<div class="signal-row"><span>${side === 'in' ? '↳' : '↗'} ${esc(p.label || p.id)}</span><b class="signal-value ${signalClass(v)}">${format(v)}${p.unit && typeof v === 'number' ? ' ' + esc(p.unit) : p.analog && typeof v === 'number' ? (n.type === 'servo' && side === 'out' ? '°' : n.type === 'servo' || n.type === 'pwm' ? '' : ' V') : ''}</b></div>`;
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

  return { render: renderInspector, updateSignals: updateInspectorSignals };
}

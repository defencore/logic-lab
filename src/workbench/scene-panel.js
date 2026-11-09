import { isKeypad } from '../components/keypad.js';
import { getDefinition } from '../components/catalog/index.js';
import { relatedSceneSources, sceneNodeIds } from '../circuits/scene-links.js';
import { esc } from '../shared/ui.js';
import { icon } from '../shared/icons.js';
import { keypadNodeMarkup } from './keypad-node.js';

export function sceneName(state, entry, t, title) {
  if (entry.type === 'mechanics') return t('mechanics3d');
  const node = state.project.nodes.find((node) => node.id === entry.nodeId);
  return node?.label || title(getDefinition(entry.type));
}

function contactRows(state, entry, title) {
  return sceneNodeIds(state.project, entry)
    .map((id) => {
      const node = state.project.nodes.find((item) => item.id === id);
      if (!node) return '';
      const definition = getDefinition(node.type);
      return `<section class="scene-contact-group"><h4 data-scene-group-label="${esc(id)}">${esc(node.label || title(definition))}</h4>${[
        ['in', definition.inputs],
        ['out', definition.outputs],
      ]
        .map(([side, ports]) =>
          ports
            .map(
              (port) =>
                `<button type="button" class="scene-contact-row" data-scene-node="${esc(id)}" data-scene-contact="${esc(port.id)}" data-scene-side="${side}" aria-pressed="false"><span>${side === 'in' ? '→' : '←'} ${esc(port.label)}</span><b data-scene-value>—</b></button>`,
            )
            .join(''),
        )
        .join('')}</section>`;
    })
    .join('');
}

function controlsMarkup(state, entry, t, title) {
  const sources = relatedSceneSources(state.project, entry);
  return (
    sources
      .map((node) => {
        const label = esc(node.label || title(getDefinition(node.type)));
        if (isKeypad(node.type))
          return `<div class="scene-keypad-controls" data-scene-source="${esc(node.id)}"><h4 data-scene-source-label>${label}</h4>${keypadNodeMarkup(node, state.lang)}</div>`;
        if (node.type === 'button')
          return `<button type="button" class="motion-source momentary-source" data-scene-source="${esc(node.id)}" data-motion-button="${esc(node.id)}" aria-pressed="false"><span data-scene-source-label>${label}</span><b>0</b></button>`;
        if (node.type === 'switch')
          return `<button type="button" class="motion-source" data-motion-switch="${esc(node.id)}" aria-pressed="false"><span data-scene-source-label>${label}</span><b>0</b></button>`;
        if (node.type === 'hotkey')
          return `<p class="scene-hotkey-source" data-scene-source="${esc(node.id)}"><span data-scene-source-label>${label}</span> <kbd>${esc(node.params.binding || '—')}</kbd></p>`;
        const byte = node.type === 'bus_input';
        return `<label data-scene-source="${esc(node.id)}"><span data-scene-source-label>${label}</span>${byte ? '' : ' · Hz'}<input data-motion-${byte ? 'value' : 'clock'}="${esc(node.id)}" type="number" min="0" max="${byte ? 255 : 1000}" step="${byte ? 1 : 'any'}" value="${esc(byte ? (node.params.value ?? 0) : (node.params.frequency ?? 1))}"></label>`;
      })
      .join('') || `<p>${t('sceneNoSources')}</p>`
  );
}

export function scenePickerMarkup(state, entries, entry, t, title) {
  return entries.length > 1
    ? `<label class="scene-picker">${t('sceneObject')}<select id="scene-select">${entries.map((item) => `<option value="${esc(item.id)}" ${item.id === entry.id ? 'selected' : ''}>${esc(sceneName(state, item, t, title))}</option>`).join('')}</select></label>`
    : '';
}

export function sceneInspectionMarkup(state, entry, t, title) {
  return `<div class="scene-panel-tabs" role="tablist" aria-label="${t('scenePanelTabs')}"><button type="button" role="tab" data-scene-tab="controls" aria-selected="true" aria-controls="scene-controls-panel">${t('sceneControlsTab')}</button><button type="button" role="tab" data-scene-tab="signals" aria-selected="false" aria-controls="scene-signals-panel">${t('sceneSignalsTab')}</button></div><section role="tabpanel" id="scene-controls-panel" class="motion-sidebar scene-related-controls" data-scene-section="controls"><p>${t('sceneRelatedControlsHint')}</p><div class="motion-switches">${controlsMarkup(state, entry, t, title)}</div></section><section role="tabpanel" id="scene-signals-panel" class="scene-signals" data-scene-section="signals" hidden><p>${t('sceneSignalsHint')}</p>${contactRows(state, entry, title)}</section>`;
}

export function scenePanelMarkup(state, entries, entry, t, title) {
  return `<div class="scene-panel-header"><div><span class="eyebrow">${t('sceneAndCircuit')}</span><h2 data-scene-title>${esc(sceneName(state, entry, t, title))}</h2></div><button type="button" id="scene-close" class="icon-btn" aria-label="${t('closeScenePanel')}">${icon('close', 17)}</button></div>
    <div id="scene-picker-slot">${scenePickerMarkup(state, entries, entry, t, title)}</div>
    <div class="motion-toolbar"><div class="camera-views">${['perspective', 'front', 'top'].map((view, index) => `<button type="button" class="soft-btn ${index === 0 ? 'active' : ''}" data-camera-view="${view}">${t(view)}</button>`).join('')}<button id="motion-camera-reset" class="icon-btn" aria-label="${t('resetCamera')}">${icon('fit', 15)}</button></div><div><button id="motion-reset" class="icon-btn" aria-label="${t('reset')}">${icon('reset', 15)}</button><button id="motion-run" class="soft-btn"></button></div></div>
    <div id="motion-stage" class="motion-stage" role="region" aria-label="${esc(sceneName(state, entry, t, title))}"></div><p id="motion-status" class="motion-status" role="status">${t('loading3d')}</p>
    <p class="scene-link-help">${t('sceneLinkHint')}</p><p id="scene-linked-contact" class="scene-linked-contact" role="status" aria-live="polite"></p><button id="scene-clear-link" class="text-btn" type="button">${t('sceneClearLink')}</button>
    <div class="scene-summary" id="scene-summary"></div>${entry.type === 'mechanics' ? '' : '<p id="scene-health" class="scene-health" role="status"></p>'}
    <div class="scene-panel-inspection">${sceneInspectionMarkup(state, entry, t, title)}</div>`;
}

export function mountScenePanel(html) {
  document.querySelector('#scene-panel')?.remove();
  const panel = document.createElement('aside');
  panel.id = 'scene-panel';
  panel.className = 'scene-panel';
  panel.innerHTML = html;
  document.querySelector('.editor-workspace').appendChild(panel);
  document.querySelector('.editor-workspace').classList.add('has-scene-panel');
  document.querySelector('.main').classList.add('scene-open');
  return panel;
}

export function removeScenePanel() {
  document.querySelector('#scene-panel')?.remove();
  document.querySelector('.editor-workspace')?.classList.remove('has-scene-panel');
  document.querySelector('.main')?.classList.remove('scene-open');
}

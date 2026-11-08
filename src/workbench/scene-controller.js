import { getDefinition } from '../components/catalog/index.js';
import { createExample } from '../../examples/index.js';
import { simulate } from '../simulation/index.js';
import { $, $$, esc, format, signalClass } from '../shared/ui.js';
import { icon } from '../shared/icons.js';
import {
  getSceneEntries,
  getSceneSnapshot,
  sceneHealth,
  sceneMessageKey,
  sceneControlSwitch,
  sceneActuatorValues,
} from '../scenes/data/scenarios.js';

export function createSceneController(state, actions) {
  let motionView = null;
  let activeSceneEntry = null;
  let motionViewToken = 0;
  const {
    t,
    title,
    showModal,
    closeModal,
    setRunning,
    resetSimulation,
    toggleSource,
    confirmReplace,
    bindLiveText,
    renderBoard,
    updateSignals,
    persist,
  } = actions;
  function disposeMotionView() {
    motionViewToken++;
    motionView?.dispose();
    motionView = null;
    activeSceneEntry = null;
  }
  function sceneName(entry) {
    if (entry.type === 'mechanics') return t('mechanics3d');
    const node = state.project.nodes.find((item) => item.id === entry.nodeId);
    return node?.label || title(getDefinition(entry.type));
  }
  function scenePointsMarkup(entry) {
    if (entry.type !== 'railway') return '';
    return `<section class="railway-controls"><h3>${t('railwayPoints')}</h3><p>${t('railwayPointsHint')}</p>${[
      'points',
      'exit_points',
    ]
      .map((port) => {
        const source = sceneControlSwitch(state.project, entry.nodeId, port);
        return `<button type="button" class="soft-btn railway-point-control" data-point-control="${port}" ${source ? `data-point-source="${esc(source)}"` : 'disabled'}><span>${t(port === 'points' ? 'nearPoints' : 'farPoints')}<small>${t(source ? 'clickToSwitch' : 'circuitControlled')}</small></span><b data-point-state="${port}">0</b></button>`;
      })
      .join(
        '',
      )}<button type="button" id="manual-railway-lab" class="text-btn">${t('manualRailwayLab')}${icon('chevron', 12)}</button></section>`;
  }
  function sceneControlsMarkup() {
    const switches = state.project.nodes.filter((node) => node.type === 'switch');
    const clocks = state.project.nodes.filter((node) => node.type === 'clock');
    const values = state.project.nodes.filter((node) => node.type === 'bus_input');
    return `${switches.length ? `<section><h3>${t('circuitControls')}</h3><p>${t('circuitControlsHint')}</p><div class="motion-switches">${switches.map((node) => `<button class="motion-source" data-motion-switch="${node.id}"><span>${esc(node.label || title(getDefinition(node.type)))}</span><b>0</b></button>`).join('')}</div></section>` : ''}${clocks.length ? `<section><h3>${t('clockSettings')}</h3>${clocks.map((node) => `<label>${esc(node.label || title(getDefinition(node.type)))} <small>Hz</small><input data-motion-clock="${node.id}" type="number" min="0" max="1000" step="any" value="${esc(node.params.frequency ?? getDefinition(node.type).defaults.frequency)}"></label>`).join('')}</section>` : ''}${values.length ? `<section><h3>${t('inputValues')}</h3>${values.map((node) => `<label>${esc(node.label || title(getDefinition(node.type)))}<input data-motion-value="${node.id}" type="number" min="0" max="255" step="1" value="${esc(node.params.value ?? 0)}"></label>`).join('')}</section>` : ''}`;
  }
  async function showMotionView(requestedId = null) {
    const entries = getSceneEntries(state.project);
    if (!entries.length) return;
    const preferred = requestedId || [...state.selected][0];
    const entry =
      entries.find((item) => item.id === preferred || item.nodeIds.includes(preferred)) ||
      entries[0];
    const mechanics = entry.type === 'mechanics';
    showModal(
      `<span class="eyebrow">${t('motionView')}</span><h2>${esc(sceneName(entry))}</h2>${entries.length > 1 ? `<label class="scene-picker">${t('sceneObject')}<select id="scene-select">${entries.map((item) => `<option value="${esc(item.id)}" ${item.id === entry.id ? 'selected' : ''}>${esc(sceneName(item))}</option>`).join('')}</select></label>` : ''}<div class="motion-toolbar"><div class="camera-views">${['perspective', 'front', 'top'].map((view, index) => `<button class="soft-btn ${index === 0 ? 'active' : ''}" data-camera-view="${view}">${t(view)}</button>`).join('')}<button id="motion-camera-reset" class="icon-btn" aria-label="${t('resetCamera')}">${icon('fit', 16)}</button></div><div><button id="motion-reset" class="icon-btn" aria-label="${t('reset')}">${icon('reset', 16)}</button><button id="motion-run" class="primary-btn"></button></div></div>
    <div class="motion-layout"><div><div id="motion-stage" class="motion-stage" role="img" aria-label="${mechanics ? t('motionScene') : esc(sceneName(entry))}"></div><p class="motion-orbit-help">${t('orbitHelp')}</p><div id="scene-summary" class="scene-summary"></div><p id="motion-status" class="motion-status">${t('loading3d')}</p>${mechanics ? '' : '<p id="scene-health" class="scene-health" aria-live="polite"></p>'}</div><aside class="motion-sidebar">${scenePointsMarkup(entry)}${mechanics ? '' : sceneControlsMarkup()}${mechanics ? `<section><h3>${t('axisReadouts')}</h3><div id="motion-readouts"></div></section><section><h3>${t('sensorReadouts')}</h3><div id="motion-sensors"></div></section>` : `<section><p class="scene-purpose">${esc(state.lang === 'ua' ? getDefinition(entry.type).descriptionUa : getDefinition(entry.type).description)}</p><details class="scene-actuators"><summary>${t('sceneActuators')}</summary><div id="scene-actuators"></div></details><h3>${t('sceneOutputs')}</h3><div id="scene-readouts"></div></section>`}${mechanics ? sceneControlsMarkup() : ''}</aside></div>`,
      true,
    );
    activeSceneEntry = entry;
    $('.modal').classList.add('motion-modal');
    if ($('#scene-select'))
      $('#scene-select').onchange = (event) => showMotionView(event.target.value);
    $('#motion-run').onclick = () => {
      if (state.classroom?.isPlaying()) state.classroom.togglePlaybackRunning();
      else setRunning(!state.running);
      updateMotionView();
    };
    $('#motion-reset').onclick = resetSimulation;
    $$('[data-motion-switch]').forEach(
      (button) => (button.onclick = () => toggleSource(button.dataset.motionSwitch)),
    );
    $$('[data-point-source]').forEach((button) => {
      button.onclick = () => toggleSource(button.dataset.pointSource);
    });
    if ($('#manual-railway-lab'))
      $('#manual-railway-lab').onclick = () =>
        confirmReplace(() => createExample('railway-dispatch'));
    $$('[data-motion-clock],[data-motion-value]').forEach((input) =>
      bindLiveText(
        input,
        (value) => {
          if (value === '') return;
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          const isByte = !!input.dataset.motionValue;
          const node = state.project.nodes.find(
            (item) => item.id === (input.dataset.motionValue || input.dataset.motionClock),
          );
          if (state.classroom && !state.classroom.allowInput()) return;
          node.params[isByte ? 'value' : 'frequency'] = isByte
            ? Math.round(Math.min(255, Math.max(0, number)))
            : Math.min(1000, Math.max(0, number));
          simulate(state.project, state.runtime, 0);
          renderBoard();
          updateSignals();
          state.classroom?.inputChanged(
            node.id,
            isByte ? 'value' : 'frequency',
            node.params[isByte ? 'value' : 'frequency'],
          );
          state.classroom?.observeEdit();
          persist();
        },
        { canApply: () => !state.classroom || state.classroom.allowInput() },
      ),
    );
    const token = motionViewToken;
    const onStatus = (message) => {
      if (token !== motionViewToken) return;
      const status = $('#motion-status');
      if (status) {
        status.textContent = message;
        status.hidden = !message;
      }
    };
    updateMotionView();
    try {
      const renderer = mechanics
        ? await import('../scenes/views/mechanics/index.js')
        : await import('../scenes/views/scenarios/index.js');
      if (token !== motionViewToken || !$('#motion-stage')) return;
      motionView = mechanics
        ? renderer.createMotionView($('#motion-stage'), { language: state.lang, onStatus })
        : renderer.createScenarioView($('#motion-stage'), {
            type: entry.type,
            nodeId: entry.nodeId,
            language: state.lang,
            onStatus,
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
    } catch (error) {
      console.error('The 3D scene could not initialize.', error);
      onStatus(t('motionUnavailable'));
    }
  }
  function updateMotionView() {
    if (!activeSceneEntry || !$('#motion-stage')) return;
    const snapshot = getSceneSnapshot(state.project, state.runtime, activeSceneEntry);
    if (!snapshot) {
      closeModal();
      return;
    }
    motionView?.update(snapshot);
    if (activeSceneEntry.type === 'mechanics') {
      $('#motion-readouts').innerHTML = snapshot.motors
        .map(
          (motor, index) =>
            `<div class="axis-readout"><span class="axis-letter">${['X', 'Y', 'Z'][index] || index + 1}</span><div><strong>${esc(motor.label)}</strong><span>${format(motor.position)} mm <small>· ${format(motor.angle)}°</small></span></div><i class="dot ${motor.moving ? 'green' : 'gray'}" title="${t(motor.enabled ? 'enabled' : 'disabled')}"></i></div>`,
        )
        .join('');
      $('#motion-sensors').innerHTML = snapshot.sensors.length
        ? snapshot.sensors
            .map(
              (sensor) =>
                `<div class="motion-sensor-row"><i class="dot ${sensor.triggered === null ? 'amber' : sensor.triggered ? 'green' : 'gray'}"></i><span>${esc(sensor.label)}</span><b>${format(sensor.signal)}</b></div>`,
            )
            .join('')
        : `<p>${t('noSensors')}</p>`;
    } else {
      const definition = getDefinition(snapshot.node.type);
      const primary =
        {
          aquarium: [
            ['temperature', 'sceneTemperature'],
            ['oxygen', 'sceneOxygen'],
            ['alive', 'sceneAlive'],
            ['health', 'sceneHealthLabel'],
          ],
          greenhouse: [
            ['temperature', 'sceneTemperature'],
            ['moisture', 'sceneMoisture'],
            ['growth', 'sceneGrowth'],
            ['health', 'sceneHealthLabel'],
          ],
          smart_home: [
            ['temperature', 'sceneTemperature'],
            ['water', 'sceneWater'],
            ['energy', 'sceneEnergy'],
          ],
        }[snapshot.node.type] || [];
      $('#scene-summary').innerHTML = primary
        .map(([id, label]) => {
          const port = definition.signals.outputs.find((item) => item.id === id);
          return `<div><span>${t(label)}</span><strong>${format(snapshot.outputs[id])}${port.unit ? ` <small>${esc(port.unit)}</small>` : ''}</strong></div>`;
        })
        .join('');
      const actuators = sceneActuatorValues(snapshot);
      $('#scene-actuators').innerHTML = definition.signals.inputs
        .filter((port) => !['run', 'reset'].includes(port.id))
        .map((port) => {
          const actual = actuators[port.id];
          return `<div class="scene-signal-row"><span>${esc(port.label)}</span><b class="signal-value ${signalClass(actual)}">${format(actual)}</b></div>`;
        })
        .join('');
      $$('[data-point-state]').forEach((readout) => {
        const value = snapshot.outputs[`${readout.dataset.pointState}_state`];
        readout.textContent = format(value);
        readout.closest('button').setAttribute('aria-pressed', String(value === 1));
      });
      $('#scene-readouts').innerHTML = definition.signals.outputs
        .map(
          (port) =>
            `<div class="scene-signal-row"><span>${esc(port.label || port.id)}</span><b class="signal-value ${signalClass(snapshot.outputs[port.id])}">${format(snapshot.outputs[port.id])}${port.unit ? ` <small>${esc(port.unit)}</small>` : ''}</b></div>`,
        )
        .join('');
      const health = sceneHealth(snapshot);
      const reasonKey = sceneMessageKey(snapshot, health.reason);
      const status = $('#scene-health');
      const message = t(reasonKey);
      if (status.textContent !== message) status.textContent = message;
      status.dataset.status = health.status;
    }
    $$('[data-motion-switch]').forEach((button) => {
      const node = state.project.nodes.find((item) => item.id === button.dataset.motionSwitch);
      const value = !!node?.params.value;
      button.setAttribute('aria-pressed', String(value));
      $('b', button).textContent = value ? '1' : '0';
    });
    $('#motion-run').innerHTML =
      icon(state.running ? 'pause' : 'play', 14) + t(state.running ? 'pause' : 'run');
  }

  return { open: showMotionView, update: updateMotionView, dispose: disposeMotionView };
}

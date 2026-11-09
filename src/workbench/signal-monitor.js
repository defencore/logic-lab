import { samplingAdvice } from '../signals/sampling.js';
import { TIME_WINDOWS } from '../signals/time.js';
import { getDefinition } from '../components/catalog/index.js';
import { $, esc, format } from '../shared/ui.js';
import { paintTraces } from '../signals/waveforms.js';
import { createLogicAnalyzer, readLogicChannel } from '../signals/logic-analyzer.js';
import { openLogicAnalyzer } from './logic-analyzer-panel.js';
import { waveformPng } from '../signals/export.js';
import {
  createRecording,
  appendRecording,
  stopRecording,
  recordingCsv,
} from '../signals/recording.js';

export function createSignalMonitor(state, { t, title, notify, setWorkspaceView, open, close }) {
  const analyzer = createLogicAnalyzer();
  let recording = null;
  let recordingSources = [];
  const traceColors = [
    '#258461',
    '#9474c0',
    '#ad6525',
    '#386ca7',
    '#086f76',
    '#497b25',
    '#356d74',
    '#745338',
  ];
  function traceNodes() {
    const signals = state.project.nodes.filter(
      (n) => getDefinition(n.type).inputs.length || getDefinition(n.type).outputs.length,
    );
    const priority = [
      ...signals.filter((n) => state.selected.has(n.id)),
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
  function primarySignal(node, runtime = state.runtime) {
    const definition = getDefinition(node.type);
    return Object.values(
      definition.outputs.length
        ? runtime.signals.outputs[node.id] || {}
        : runtime.signals.inputs[node.id] || {},
    )[0];
  }
  const logicChannels = () => analyzer.channels(state.project);
  const recordingValues = (runtime = state.runtime) =>
    recording.eventDriven
      ? recordingSources.map((channel) => readLogicChannel(runtime, channel))
      : recordingSources.map((node) => primarySignal(node, runtime));
  function monitorTraces() {
    const channels = logicChannels();
    if (channels.length)
      return channels.map((channel, index) => ({
        id: channel.id,
        label: channel.label,
        displayLabel: channel.displayLabel,
        color: traceColors[index],
        history: [],
        transitions: analyzer.transitions(state.project, index),
        current: readLogicChannel(state.runtime, channel),
        timeWindow: state.timeBase,
        endTime: state.runtime.time,
      }));
    const nodes = recording?.active ? recordingSources : traceNodes();
    return nodes.map((node, index) => {
      const definition = getDefinition(node.type);
      const port = definition.signals.outputs[0] || definition.signals.inputs[0];
      return {
        id: node.id,
        label: recording?.active ? recording.traces[index].label : node.label || title(definition),
        color: traceColors[index],
        history: state.runtime.history[node.id] || [],
        current: primarySignal(node),
        stepped: !port?.analog && !port?.acceptAny,
        sampleTimes: state.runtime.historyTimes,
        timeWindow: state.timeBase,
        endTime: state.runtime.time,
      };
    });
  }
  function formatRate(rate) {
    return `${new Intl.NumberFormat(state.lang === 'ua' ? 'uk' : 'en').format(rate)}×`;
  }
  function formatWindow(seconds) {
    return seconds < 1 ? `${seconds * 1000} ${t('milliseconds')}` : `${seconds} ${t('seconds')}`;
  }
  function saveSimulationSettings() {
    try {
      localStorage.setItem(
        'logic-lab.simulation',
        JSON.stringify({ rate: state.simulationRate, timeBase: state.timeBase }),
      );
    } catch {}
  }
  function toggleRecording() {
    if (recording?.active) {
      appendRecording(recording, state.runtime.time, recordingValues(), {
        force: true,
      });
      stopRecording(recording);
    } else {
      const channels = logicChannels();
      recordingSources = channels.length ? channels : traceNodes();
      if (!recordingSources.length) return notify(t('noTraces'));
      recording = createRecording({
        name: state.project.name,
        traces: monitorTraces().map(({ id, label }) => ({ id, label })),
        eventDriven: channels.length > 0,
        startedAt: state.runtime.time,
        sampleInterval: state.runtime.sampleInterval,
      });
      appendRecording(recording, state.runtime.time, recordingValues());
      state.monitorOpen = true;
      $('#monitor').classList.remove('collapsed');
    }
    setWorkspaceView('signals');
    updateRecordingUi();
    drawMonitor();
  }
  function updateRecordingUi() {
    updateSamplingUi();
    const active = !!recording?.active;
    const toggle = $('#record-toggle');
    if (!toggle) return;
    const text = t(active ? 'recordStop' : recording ? 'recordNew' : 'recordStart');
    toggle.textContent = text;
    toggle.classList.toggle('recording', active);
    $('[data-workspace-view="signals"]', $('.workspace-tabs')).classList.toggle(
      'has-recording',
      active,
    );
    toggle.setAttribute('aria-pressed', String(active));
    toggle.setAttribute('aria-label', text);
    toggle.disabled = !active && !logicChannels().length && !traceNodes().length;
    const analyzerButton = $('#logic-analyzer');
    if (analyzerButton) {
      const count = logicChannels().length;
      const label = t('logicAnalyzer');
      const caption = count ? `${label} · ${count}` : label;
      if (analyzerButton.textContent !== caption) analyzerButton.textContent = caption;
      analyzerButton.disabled = active;
      const description = $('#monitor-description');
      const text = t(count ? 'logicAnalyzerHint' : 'scopeHint');
      if (description.textContent !== text) description.textContent = text;
    }
    $('#time-base').disabled = active;
    $('#record-download').disabled = !recording?.samples.length;
    $('#record-download').title = t('recordDownload');
    $('#record-download').setAttribute('aria-label', t('recordDownload'));
    $('#trace-image').disabled = !monitorTraces().length;
    $('#trace-image').setAttribute('aria-label', t('saveWaveformImage'));
    const statusText = recording
      ? `${t(active ? (state.running ? 'recordActive' : 'recordPaused') : 'recordSaved')} · ${(recording.samples.at(-1)?.time || 0).toFixed(3)} ${t('seconds')} · ${new Intl.NumberFormat(state.lang === 'ua' ? 'uk' : 'en').format(recording.samples.length)} ${t('recordSamples')}`
      : '';
    if ($('#record-status').textContent !== statusText)
      $('#record-status').textContent = statusText;
  }
  function setTimeWindow(value) {
    if (recording?.active || !TIME_WINDOWS.includes(value)) return;
    state.timeBase = value;
    state.runtime.sampleInterval = value / 255;
    state.runtime.history = Object.create(null);
    state.runtime.historyTimes = [];
    state.runtime.sampleElapsed = 0;
    state.runtime.lastSampleTime = state.runtime.time;
    saveSimulationSettings();
    if ($('#time-base')) $('#time-base').value = String(value);
    updateSamplingUi();
    drawMonitor();
  }
  function updateSamplingUi() {
    const notice = $('#sampling-notice');
    if (!notice) return;
    if (logicChannels().length) {
      notice.hidden = true;
      return;
    }
    const { adequate, target } = samplingAdvice(state.project, state.runtime, state.timeBase);
    notice.hidden = adequate;
    $('#sampling-message').textContent = t('samplingNotice');
    const fit = $('#fit-time-window');
    fit.textContent = `${t('fitTimeWindow')} · ${formatWindow(target)}`;
    fit.disabled = !!recording?.active || target === state.timeBase;
    fit.onclick = () => setTimeWindow(target);
  }
  function downloadBlob(blob, name, extension) {
    const filename = name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'waveforms';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.waveforms.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function downloadRecording() {
    if (!recording?.samples.length) return;
    downloadBlob(
      new Blob([recordingCsv(recording)], { type: 'text/csv;charset=utf-8' }),
      recording.name,
      'csv',
    );
    notify(t('recordExported'));
  }
  async function downloadWaveformImage() {
    const traces = monitorTraces().map((trace) => ({
      ...trace,
      history: [...trace.history],
      ...(trace.transitions && { transitions: [...trace.transitions] }),
    }));
    if (!traces.length) return;
    const logic = !!traces[0].transitions;
    const times = logic ? [] : state.runtime.historyTimes;
    const endTime = times.at(-1) ?? state.runtime.time;
    const startTime = logic ? Math.max(0, endTime - state.timeBase) : (times[0] ?? endTime);
    try {
      const blob = await waveformPng(traces, {
        title: state.project.name,
        startTime,
        endTime,
        sampleTimes: [...times],
        timeLabel: `${t('time')} (${t('seconds')})`,
      });
      downloadBlob(blob, state.project.name, 'png');
      notify(t('imageExported'));
    } catch {
      notify(t('imageExportFailed'));
    }
  }
  function drawMonitor() {
    if (!state.monitorOpen) return;
    const canvas = $('#trace-canvas');
    if (!canvas) return;
    const traces = monitorTraces();
    $('#trace-labels').classList.toggle('has-logic-axis', !!traces[0]?.transitions);
    $('#trace-labels').innerHTML = traces.length
      ? traces
          .map(
            (trace) =>
              `<div class="trace-label" style="--trace:${trace.color}"><i></i><span title="${esc(trace.label)}">${esc(trace.displayLabel || trace.label)}</span><b>${format(trace.current)}</b></div>`,
          )
          .join('')
      : `<p class="no-traces">${t('noTraces')}</p>`;
    paintTraces(canvas, traces);
  }

  function capture(project = state.project, runtime = state.runtime) {
    analyzer.capture(project, runtime);
    if (!recording?.active) return;
    appendRecording(recording, runtime.time, recordingValues(runtime));
    if (recording.limitReached) notify(t('recordLimit'));
  }
  function stopCapture() {
    if (recording?.active) stopRecording(recording);
  }
  function configureAnalyzer() {
    if (recording?.active) return;
    openLogicAnalyzer({
      state,
      analyzer,
      open,
      close,
      onApply() {
        analyzer.capture(state.project, state.runtime);
        state.monitorOpen = true;
        $('#monitor').classList.remove('collapsed');
        setWorkspaceView('signals');
        updateRecordingUi();
        drawMonitor();
      },
    });
  }
  return {
    configureAnalyzer,
    resetTrace: () => analyzer.reset(state.project),
    inheritTrace: (project) => analyzer.inherit(state.project, project, state.lang),
    primarySignal,
    formatRate,
    formatWindow,
    saveSettings: saveSimulationSettings,
    setTimeWindow,
    toggleRecording,
    updateUi: updateRecordingUi,
    downloadRecording,
    downloadImage: downloadWaveformImage,
    draw: drawMonitor,
    capture,
    stopCapture,
    isRecording: () => !!recording?.active,
  };
}

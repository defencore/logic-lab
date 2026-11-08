import { getDefinition } from '../components/catalog/index.js';
import { $, esc, format } from '../shared/ui.js';
import { paintTraces } from '../signals/waveforms.js';
import { waveformPng } from '../signals/export.js';
import {
  createRecording,
  appendRecording,
  stopRecording,
  recordingCsv,
} from '../signals/recording.js';

export function createSignalMonitor(state, { t, title, notify, setWorkspaceView }) {
  let recording = null;
  let recordingSources = [];
  const traceColors = ['#258461', '#9474c0', '#cb9151', '#5386bd'];
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
  function primarySignal(node) {
    const definition = getDefinition(node.type);
    return Object.values(
      definition.outputs.length
        ? state.runtime.signals.outputs[node.id] || {}
        : state.runtime.signals.inputs[node.id] || {},
    )[0];
  }
  function monitorTraces() {
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
      appendRecording(recording, state.runtime.time, recordingSources.map(primarySignal), {
        force: true,
      });
      stopRecording(recording);
    } else {
      recordingSources = traceNodes();
      if (!recordingSources.length) return notify(t('noTraces'));
      recording = createRecording({
        name: state.project.name,
        traces: recordingSources.map((node) => ({
          id: node.id,
          label: node.label || title(getDefinition(node.type)),
        })),
        startedAt: state.runtime.time,
        sampleInterval: state.runtime.sampleInterval,
      });
      appendRecording(recording, state.runtime.time, recordingSources.map(primarySignal));
      state.monitorOpen = true;
      $('#monitor').classList.remove('collapsed');
    }
    setWorkspaceView('signals');
    updateRecordingUi();
    drawMonitor();
  }
  function updateRecordingUi() {
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
    toggle.disabled = !active && !traceNodes().length;
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
    const traces = monitorTraces().map((trace) => ({ ...trace, history: [...trace.history] }));
    if (!traces.length) return;
    const times = state.runtime.historyTimes;
    const startTime = times[0] ?? state.runtime.time;
    const endTime = times.at(-1) ?? state.runtime.time;
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
    $('#trace-labels').innerHTML = traces.length
      ? traces
          .map(
            (trace) =>
              `<div class="trace-label" style="--trace:${trace.color}"><i></i><span title="${esc(trace.label)}">${esc(trace.label)}</span><b>${format(trace.current)}</b></div>`,
          )
          .join('')
      : `<p class="no-traces">${t('noTraces')}</p>`;
    paintTraces(canvas, traces);
  }

  function capture() {
    if (!recording?.active) return;
    appendRecording(recording, state.runtime.time, recordingSources.map(primarySignal));
    if (recording.limitReached) notify(t('recordLimit'));
  }
  function stopCapture() {
    if (recording?.active) stopRecording(recording);
  }
  return {
    primarySignal,
    formatRate,
    formatWindow,
    saveSettings: saveSimulationSettings,
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

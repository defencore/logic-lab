import { $, $$ } from '../shared/ui.js';
import { ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR } from '../circuits/viewport.js';
import { SIMULATION_RATES } from '../signals/time.js';
export function createShellBindings(context) {
  const { state, services, actions, t } = context;
  function bindShell() {
    services.wiring.bind();
    $('#more-tools').onclick = () =>
      actions.setToolsOpen(!$('.canvas-tools').classList.contains('more-tools-open'));
    $('#secondary-tools').onclick = () => actions.setToolsOpen(false);
    $$('[data-workspace-view]', $('.workspace-tabs')).forEach((button) => {
      button.onclick = () => actions.setWorkspaceView(button.dataset.workspaceView);
    });
    $('#library-toggle').onclick = () =>
      actions.setLibraryOpen(!$('#component-library').classList.contains('mobile-open'));
    $('#close-library').onclick = () => actions.setLibraryOpen(false);
    $('#library-backdrop').onclick = () => actions.setLibraryOpen(false);
    $('#close-inspector').onclick = () => {
      actions.setWorkspaceView('canvas');
      state.selected.clear();
      state.selectedWire = null;
      actions.selectionChanged();
    };
    $('#search').oninput = (e) => {
      state.query = e.target.value;
      actions.renderLibrary();
    };
    actions.bindLiveText($('#project-name'), (value) => {
      state.project.name = value.trim() || t('newName');
      services.board.updateCounts();
      actions.persist();
    });
    $('#language').onclick = () => {
      state.lang = state.lang === 'en' ? 'ua' : 'en';
      try {
        localStorage.setItem('logic-lab.language', state.lang);
      } catch {}
      actions.shell();
      actions.setRunning(state.running);
    };
    $('#diagnostics').onclick = services.learning.openDiagnostics;
    $('#run').onclick = () => actions.setRunning(!state.running);
    $('#step').onclick = () => {
      if (services.classroom?.isPlaying()) return;
      if (state.running) actions.setRunning(false);
      actions.advance(0.01 * state.simulationRate);
      actions.updateSignals();
    };
    $('#reset').onclick = actions.resetSimulation;
    $('#undo').onclick = () => actions.undo();
    $('#redo').onclick = () => actions.undo(true);
    $('#fit').onclick = () => actions.fit();
    $('#zoom-value').onclick = actions.resetZoom;
    $('#zoom-in').onclick = () => actions.zoomCenter(ZOOM_IN_FACTOR);
    $('#zoom-out').onclick = () => actions.zoomCenter(ZOOM_OUT_FACTOR);
    $('#export').onclick = () => {
      $('.project-files').open = false;
      actions.exportProject();
    };
    $('#import').onclick = () => {
      $('.project-files').open = false;
      $('#import-file').click();
    };
    $('#examples').onclick = () => services.learning.openExamples();
    $('#motion').onclick = () => services.scenes.open();
    $('#lesson-toggle').onclick = () => {
      if (state.compactLayout.matches) {
        state.compactLessonOpen = !state.compactLessonOpen;
        if (state.compactLessonOpen) state.lessonOpen = true;
        actions.setWorkspaceView('canvas');
      } else state.lessonOpen = !state.lessonOpen;
      services.learning.renderLesson();
    };
    $('#help').onclick = services.learning.openHelp;
    $('#inspector-help').onclick = services.learning.openHelp;
    $('#add-note').onclick = () => actions.addNode('note');
    $('#add-group').onclick = () => actions.addNode('group');
    $$('.canvas-tools [data-tool]').forEach(
      (el) => (el.onclick = () => actions.setTool(el.dataset.tool)),
    );
    $('#simulation-rate').onchange = (e) => {
      const value = Number(e.target.value);
      if (!SIMULATION_RATES.includes(value)) return;
      state.simulationRate = value;
      services.monitor.saveSettings();
    };
    $('#record-toggle').onclick = services.monitor.toggleRecording;
    $('#record-download').onclick = services.monitor.downloadRecording;
    $('#trace-image').onclick = services.monitor.downloadImage;
    services.monitor.updateUi();
    $('#time-base').onchange = (event) =>
      services.monitor.setTimeWindow(Number(event.target.value));
    $('#monitor-toggle').onclick = () => {
      if (state.compactLayout.matches) return actions.setWorkspaceView('canvas');
      state.monitorOpen = !state.monitorOpen;
      $('#monitor').classList.toggle('collapsed', !state.monitorOpen);
      requestAnimationFrame(services.monitor.draw);
    };
  }
  return { bindShell };
}

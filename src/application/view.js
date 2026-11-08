import { simulate } from '../simulation/index.js';
import { $, $$ } from '../shared/ui.js';
import { renderLibraryCategories, renderLibraryItems } from '../learning/views/catalog.js';
import { shellMarkup } from '../workbench/shell-view.js';
export function createView(context) {
  const { state, services, actions, t } = context;
  function changed({ reset = false } = {}) {
    if (reset) state.runtime = actions.newRuntime();
    services.hotkeys?.reconcile();
    simulate(state.project, state.runtime, 0);
    services.board.render();
    services.inspector.render();
    actions.updateSignals();
    services.board.updateCounts();
    actions.updateHistoryControls();
    services.classroom?.observeEdit();
    actions.persist();
  }
  function shell() {
    if (services.dialogs?.isOpen()) services.dialogs.close();
    services.wiring?.cancelGesture();
    document.documentElement.lang = state.lang === 'ua' ? 'uk' : 'en';
    document.title = t('pageTitle');
    $('#app').innerHTML = shellMarkup({
      project: state.project,
      t,
      lang: state.lang,
      workspaceView: state.workspaceView,
      query: state.query,
      simulationRate: state.simulationRate,
      timeBase: state.timeBase,
      tool: state.tool,
      monitorOpen: state.monitorOpen,
      formatRate: services.monitor.formatRate,
      formatWindow: services.monitor.formatWindow,
    });
    $('#zoom-out').innerHTML = '<span style="font-size:20px">−</span>';
    actions.bindShell();
    services.audio?.mount();
    actions.bindCanvas();
    actions.updateHistoryControls();
    services.classroom?.mount();
    actions.updateTool();
    actions.renderLibrary();
    services.board.render();
    services.inspector.render();
    services.learning.renderLesson();
    actions.setRunning(state.running);
    actions.applyView();
    actions.updateSignals();
    services.board.updateCounts();
    services.recovery?.mount();
  }
  function renderLibrary() {
    $('#library-categories').innerHTML = renderLibraryCategories(state.category, state.lang);
    const result = renderLibraryItems({
      category: state.category,
      query: state.query,
      language: state.lang,
    });
    $('#library-list').innerHTML = result.html;
    $('#library-result-count').textContent = result.count;
    $$('[data-category]').forEach((el) => {
      el.onclick = () => {
        state.category = el.dataset.category;
        renderLibrary();
        $('#library-list').scrollTop = 0;
        $('.library-category-browser summary').focus();
      };
    });
    $$('[data-read-guide]').forEach(
      (el) => (el.onclick = () => services.learning.openGuide(el.dataset.readGuide)),
    );
    $$('[data-component]').forEach((el) => {
      el.addEventListener('click', () => {
        actions.addNode(el.dataset.component);
        actions.setLibraryOpen(false);
      });
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/logic-lab', el.dataset.component);
        e.dataTransfer.effectAllowed = 'copy';
        requestAnimationFrame(() => actions.setLibraryOpen(false));
      });
    });
  }
  function selectionChanged() {
    $$('.circuit-node').forEach((el) =>
      el.classList.toggle('selected', state.selected.has(el.dataset.node)),
    );
    $$('.wire-group').forEach((el) =>
      el.classList.toggle('selected', el.dataset.wire === state.selectedWire),
    );
    services.inspector.render();
    actions.updateSignals();
    services.wiring?.refresh();
  }
  function updateSignals() {
    services.board.updateSignals();
    services.learning.updateGuideSignals();
    services.learning.updateLessonSignals();
    services.scenes?.update();
    $('#sim-time').textContent = (state.runtime.time || 0).toFixed(3);
    services.monitor.updateUi();
    const diagnostics = $('#diagnostics');
    diagnostics.hidden = !state.runtime.diagnostics?.length;
    diagnostics.textContent = `${state.runtime.diagnostics?.length || 0} ${t('diagnostics')}`;
    services.inspector.updateSignals();
    services.monitor.draw();
    services.audio?.sync();
  }
  return { changed, shell, renderLibrary, selectionChanged, updateSignals };
}

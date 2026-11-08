import { saveProject } from '../circuits/project.js';
import { icon } from '../shared/icons.js';
import { $, esc } from '../shared/ui.js';
export function createHistory(context) {
  const { state, services, actions, t } = context;
  function snapshot() {
    return JSON.stringify(state.project);
  }
  function checkpoint() {
    state.undoStack.push(actions.snapshot());
    if (state.undoStack.length > 80) state.undoStack.shift();
    state.redoStack = [];
    actions.updateHistoryControls();
  }
  function updateHistoryControls() {
    if ($('#undo')) $('#undo').disabled = !state.undoStack.length;
    if ($('#redo')) $('#redo').disabled = !state.redoStack.length;
  }
  function persist() {
    clearTimeout(state.storageTimer);
    state.storageTimer = setTimeout(() => {
      const editable = services.classroom?.projectToSave() || state.project;
      editable.viewport = { ...state.view };
      const ok = saveProject(editable);
      $('#save-state').innerHTML =
        icon(ok ? 'check' : 'help', 13) + esc(ok ? t('saved') : t('storageFailed'));
    }, 400);
  }
  function notify(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
  }
  function undo(redo = false) {
    if (services.classroom && !services.classroom.allowEdit()) return;
    actions.cancelInteraction();
    const from = redo ? state.redoStack : state.undoStack,
      to = redo ? state.undoStack : state.redoStack;
    if (!from.length) return;
    to.push(actions.snapshot());
    state.project = JSON.parse(from.pop());
    state.selected.clear();
    state.selectedWire = null;
    actions.changed({ reset: true });
    $('#project-name').value = state.project.name;
    services.learning.renderLesson();
  }
  function bindLiveText(input, apply) {
    let editing = false;
    input.oninput = () => {
      if (!editing) {
        actions.checkpoint();
        editing = true;
      }
      apply(input.value);
    };
    input.onblur = () => {
      editing = false;
    };
  }
  return { snapshot, checkpoint, updateHistoryControls, persist, notify, undo, bindLiveText };
}

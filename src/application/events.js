import { protectUnsavedKeys } from './unload-guard.js';
import { parseProject, saveProject } from '../circuits/project.js';
import { $ } from '../shared/ui.js';
import { panBy, ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR } from '../circuits/viewport.js';
import { trapFocus } from '../workbench/dialogs.js';
import { boundCoordinate } from './model.js';
import { focusContact } from '../workbench/contact-interaction.js';
export function bindApplicationEvents(context) {
  const { state, services, actions, t } = context;
  document.addEventListener('pointermove', actions.onPointerMove);
  document.addEventListener('pointerup', actions.onPointerUp);
  document.addEventListener('pointercancel', (e) => {
    if (state.gesture && state.gesture.pointerId !== e.pointerId) return;
    actions.cancelGesture();
    actions.persist();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.project-files')) $('.project-files').open = false;
    if (!event.target.closest('.canvas-tools')) actions.setToolsOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if ($('.project-files').open) {
        $('.project-files').open = false;
        $('.project-files summary').focus();
      } else if ($('.canvas-tools').classList.contains('more-tools-open')) {
        actions.setToolsOpen(false);
        $('#more-tools').focus();
      } else if (services.dialogs.isOpen()) services.dialogs.close();
      else if ($('#component-library').classList.contains('mobile-open'))
        actions.setLibraryOpen(false);
      else {
        const origin = state.pending;
        actions.cancelInteraction();
        if (origin) focusContact(origin);
      }
      return;
    }
    if (services.dialogs.handleKey(e)) return;
    if ($('.project-files').open || $('.canvas-tools').classList.contains('more-tools-open'))
      return;
    if ($('#component-library').classList.contains('mobile-open')) {
      trapFocus(e, $('#component-library'));
      return;
    }
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.ctrlKey || e.metaKey) {
      state.shiftHeld = false;
      actions.updateTool();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      actions.exportProject();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      actions.undo(e.shiftKey);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      actions.duplicateSelection();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (services.wiring.keyDown(e)) return;
    if (e.key === ' ') {
      if (e.target.closest('button,a,summary')) return;
      e.preventDefault();
      state.spaceHeld = true;
      actions.updateTool();
      return;
    }
    if (['Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault();
      actions.deleteSelection();
    }
    if (e.key.toLowerCase() === 'r' && !e.repeat) actions.toggleRunning();
    if (e.key === 'Shift') {
      state.shiftHeld = !e.ctrlKey && !e.metaKey;
      actions.updateTool();
    }
    if (e.key.toLowerCase() === 'f' || e.key === 'Home') {
      e.preventDefault();
      actions.fit();
    }
    if (e.key === '0') {
      e.preventDefault();
      actions.resetZoom();
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      actions.zoomCenter(ZOOM_IN_FACTOR);
    }
    if (e.key === '-') {
      e.preventDefault();
      actions.zoomCenter(ZOOM_OUT_FACTOR);
    }
    if (e.key === '/') {
      e.preventDefault();
      if (state.compactLayout.matches) actions.setLibraryOpen(true);
      else $('#search').focus();
    }
    if (e.key === 'v') actions.setTool('select');
    if (e.key === 'h') actions.setTool('pan');
    if (e.key === 'w') actions.setTool('wire');
    if (e.key.toLowerCase() === 't') actions.setTool('trace');
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!state.selected.size || state.tool === 'pan' || state.spaceHeld || state.shiftHeld) {
        const distance = e.shiftKey ? 100 : 40;
        state.view = panBy(state.view, -dx * distance, -dy * distance);
        actions.applyView();
        actions.persist();
        return;
      }
      if (services.classroom && !services.classroom.allowEdit()) return;
      actions.checkpoint();
      for (const n of state.project.nodes.filter((n) => state.selected.has(n.id))) {
        n.x = boundCoordinate(n.x + dx * 20);
        n.y = boundCoordinate(n.y + dy * 20);
      }
      actions.changed();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') state.spaceHeld = false;
    if (e.key === 'Shift') state.shiftHeld = false;
    if (e.key === 'Control' || e.key === 'Meta') {
      state.shiftHeld =
        e.shiftKey &&
        !services.dialogs.isOpen() &&
        !e.target.closest('input,textarea,select,[contenteditable]');
    }
    actions.updateTool();
  });
  window.addEventListener('blur', () => {
    state.spaceHeld = false;
    state.shiftHeld = false;
    state.suppressPanClick = false;
    actions.cancelGesture();
    actions.updateTool();
    actions.persist();
  });
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw Error('Project file exceeds 10 MB');
      const next = parseProject(await file.text());
      actions.confirmReplace(next);
    } catch (error) {
      actions.notify(`${t('invalid')}: ${error.message}`);
    }
    e.target.value = '';
  });
  state.compactLayout.addEventListener('change', () => {
    actions.setLibraryOpen(false);
    actions.setToolsOpen(false);
    services.learning.renderLesson();
    actions.setWorkspaceView(state.workspaceView);
  });
  window.addEventListener('resize', () => {
    actions.applyView();
    services.monitor.draw();
  });
  window.addEventListener('beforeunload', (event) => {
    protectUnsavedKeys(event, services.classroom);
    const editable = services.classroom?.projectToSave() || state.project;
    editable.viewport = { ...(services.classroom?.viewportToSave?.() || state.view) };
    saveProject(editable);
  });
}

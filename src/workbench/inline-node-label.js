/** Label drafts stay outside the project until a single guarded rename transaction commits. */
export function createInlineNodeLabel(
  state,
  { canEdit, renameNode, beforeBegin, restoreFocus, labelPlaceholder, editLabel },
  root = document,
) {
  let active = null;
  const headerFor = (id) =>
    [...root.querySelectorAll('[data-node-header]')].find(
      (header) => header.dataset.nodeHeader === id,
    );
  const currentNode = (edit) => state.project.nodes.find((node) => node.id === edit.id);
  const valid = (edit) =>
    state.project === edit.project && !!currentNode(edit) && !state.classroom?.isLocked();
  function detach(edit) {
    edit.header.classList.remove('is-label-editing');
    edit.header.setAttribute('role', 'button');
    edit.header.setAttribute('tabindex', '0');
    edit.input.remove();
  }
  function finish(commit, focus = false) {
    const edit = active;
    if (!edit) return false;
    active = null;
    const value = edit.input.value;
    detach(edit);
    if (commit && valid(edit) && canEdit() && value !== (currentNode(edit).label || ''))
      renameNode(edit.id, value);
    if (focus && state.project === edit.project) restoreFocus(edit.id);
    return true;
  }
  function mount(edit, header, select = false) {
    const node = currentNode(edit),
      input = root.createElement('input');
    edit.header = header;
    edit.input = input;
    input.type = 'text';
    input.className = 'node-label-editor';
    input.maxLength = 100;
    input.value = edit.draft;
    input.placeholder = labelPlaceholder(node);
    input.setAttribute('aria-label', `${editLabel()}: ${input.placeholder}`);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    header.classList.add('is-label-editing');
    header.setAttribute('role', 'group');
    header.removeAttribute('tabindex');
    for (const type of [
      'pointerdown',
      'pointerup',
      'click',
      'dblclick',
      'contextmenu',
      'wheel',
      'dragover',
      'drop',
    ])
      input.addEventListener(type, (event) => event.stopPropagation());
    input.addEventListener('input', () => {
      if (active === edit) edit.draft = input.value;
    });
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        finish(event.key === 'Enter', true);
      }
    });
    input.addEventListener('blur', () => {
      if (active === edit && edit.input === input && !edit.suspended) finish(true);
    });
    header.append(input);
    if (edit.focused) {
      input.focus({ preventScroll: true });
      if (select) input.select();
      else input.setSelectionRange(...edit.selection);
    }
  }
  function begin(header) {
    const id = header.dataset.nodeHeader;
    if (!canEdit()) return false;
    if (active) finish(true);
    const node = state.project.nodes.find((node) => node.id === id);
    header = headerFor(id);
    if (!node || !header) return false;
    beforeBegin();
    active = {
      id,
      project: state.project,
      draft: node.label || '',
      focused: true,
      suspended: false,
    };
    mount(active, header, true);
    return true;
  }
  return {
    bind(header) {
      header.addEventListener('dblclick', (event) => {
        if (event.target.closest('input,textarea,select,[contenteditable]')) return;
        event.preventDefault();
        event.stopPropagation();
        begin(header);
      });
    },
    beforeRender() {
      if (!active) return false;
      const focused = root.activeElement === active.input;
      if (!valid(active)) {
        finish(false);
        return focused;
      }
      active.focused = focused;
      active.draft = active.input.value;
      active.selection = [
        active.input.selectionStart,
        active.input.selectionEnd,
        active.input.selectionDirection,
      ];
      active.suspended = true;
      return focused;
    },
    restoreAfterRender() {
      if (!active) return;
      const header = headerFor(active.id);
      if (!header || !valid(active)) {
        finish(false);
        return;
      }
      mount(active, header);
      active.suspended = false;
    },
  };
}

import { $ } from '../../shared/ui.js';
export function createBindings(context) {
  const { state, options, commands, pinFromElement } = context;
  function bind() {
    $('#wires').addEventListener('pointerdown', commands.wirePointerDown);
    $('#wire-edit-layer').addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle) return;
      if (state.action?.kind === 'reconnect') {
        const pin = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest('.pin'))
          .find(Boolean);
        if (pin) {
          event.preventDefault();
          event.stopPropagation();
          commands.reconnect(pinFromElement(pin));
          return;
        }
      }
      const kind = handle.dataset.wireHandle;
      commands.startDrag(
        event,
        kind,
        kind === 'endpoint' ? handle.dataset.index : Number(handle.dataset.index),
      );
    });
    $('#wire-edit-layer').addEventListener('focusin', (event) => {
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle) return;
      state.activeHandle = {
        kind: handle.dataset.wireHandle,
        index:
          handle.dataset.wireHandle === 'endpoint'
            ? handle.dataset.index
            : Number(handle.dataset.index),
      };
      commands.renderContext();
    });
    $('#wire-edit-layer').addEventListener('keydown', (event) => {
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      state.activeHandle = { kind: handle.dataset.wireHandle, index: Number(handle.dataset.index) };
      if (handle.dataset.wireHandle === 'endpoint')
        state.action = { kind: 'reconnect', side: handle.dataset.index };
      commands.refresh();
    });
    $('#wire-context').onclick = (event) => {
      const button = event.target.closest('[data-wire-action]');
      if (!button) return;
      const command = button.dataset.wireAction;
      if (command === 'clear') commands.clear();
      if (command === 'details') options.showInspector();
      if (command === 'remove') commands.removeBend();
      if (command === 'add') {
        options.cancelConnection();
        state.action = state.action?.kind === 'add' ? null : { kind: 'add' };
        commands.renderContext();
      }
    };
    $('#nodes').addEventListener('pointerover', (event) => {
      const pin = event.target.closest('.pin');
      if (!pin || state.traceSeed || state.drag || state.action) return;
      state.hoverSeed = pinFromElement(pin);
      commands.applyTrace();
    });
    $('#nodes').addEventListener('pointerout', (event) => {
      if (
        !event.target.closest('.pin') ||
        event.relatedTarget?.closest?.('.pin') === event.target.closest('.pin')
      )
        return;
      state.hoverSeed = null;
      commands.applyTrace();
    });
  }
  return { bind };
}

import { simulate } from '../simulation/index.js';
import { $, $$ } from '../shared/ui.js';
import { bindMomentaryButton } from './momentary-button.js';
import { bindKeypadControls, updateKeypadControls } from './keypad-node.js';

export function bindSceneControls(state, actions, links, open) {
  const disposers = [];
  const tabs = $$('[data-scene-tab]');
  const activateTab = (button) => {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab === button)));
    $$('[data-scene-section]').forEach((section) => {
      section.hidden = section.dataset.sceneSection !== button.dataset.sceneTab;
    });
  };
  tabs.forEach((button, index) => {
    button.onclick = () => activateTab(button);
    button.onkeydown = (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const next =
        event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[1 - index];
      activateTab(next);
      next.focus();
    };
  });
  const select = $('#scene-select');
  if (select) select.onchange = (event) => open(event.target.value);
  $('#motion-run').onclick = () => {
    if (state.classroom?.isPlaying()) state.classroom.togglePlaybackRunning();
    else actions.setRunning(!state.running);
    actions.updateSignals();
  };
  $('#motion-reset').onclick = actions.resetSimulation;
  $$('[data-scene-contact]').forEach((button) => {
    button.onclick = () =>
      links.inspect(
        {
          node: button.dataset.sceneNode,
          port: button.dataset.sceneContact,
          side: button.dataset.sceneSide,
        },
        { reveal: true },
      );
  });
  $$('[data-motion-switch]').forEach((button) => {
    button.onclick = () => actions.toggleSource(button.dataset.motionSwitch);
  });
  $$('[data-motion-button]').forEach((button) => {
    const id = button.dataset.motionButton;
    disposers.push(
      bindMomentaryButton(button, {
        press: () => actions.setMomentarySource(id, 1),
        release: () => actions.setMomentarySource(id, 0),
        blocked: () => button.disabled,
      }),
    );
  });
  $$('.scene-keypad-controls').forEach((root) => {
    const node = state.project.nodes.find((node) => node.id === root.dataset.sceneSource);
    if (node) disposers.push(bindKeypadControls(root, node, actions.setKeypadKey));
  });
  $$('[data-motion-clock],[data-motion-value]').forEach((input) =>
    actions.bindLiveText(
      input,
      (value) => {
        if (value === '') return;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return;
        const byte = !!input.dataset.motionValue;
        const node = state.project.nodes.find(
          (node) => node.id === (input.dataset.motionValue || input.dataset.motionClock),
        );
        if (!node || (state.classroom && !state.classroom.allowInput())) return;
        const key = byte ? 'value' : 'frequency';
        node.params[key] = byte
          ? Math.round(Math.min(255, Math.max(0, parsed)))
          : Math.min(1000, Math.max(0, parsed));
        simulate(state.project, state.runtime, 0);
        actions.renderBoard();
        actions.updateSignals();
        state.classroom?.inputChanged(node.id, key, node.params[key]);
        state.classroom?.observeEdit();
        actions.persist();
      },
      { canApply: () => !state.classroom || state.classroom.allowInput() },
    ),
  );
  return () => disposers.forEach((dispose) => dispose());
}

export function updateSceneControls(state) {
  const locked =
    !!state.classroom?.isPlaying() ||
    (!!state.classroom?.isLocked() && !state.classroom?.isRecording());
  $$('.scene-keypad-controls').forEach((root) => {
    const node = state.project.nodes.find((node) => node.id === root.dataset.sceneSource);
    updateKeypadControls(root, node, locked);
  });
  $$('[data-motion-switch],[data-motion-button]').forEach((button) => {
    const node = state.project.nodes.find(
      (node) => node.id === (button.dataset.motionSwitch || button.dataset.motionButton),
    );
    const value = !!node?.params.value;
    button.disabled = locked || !node || node.enabled === false;
    button.setAttribute('aria-pressed', String(value));
    $('b', button).textContent = value ? '1' : '0';
  });
  $$('[data-motion-clock],[data-motion-value]').forEach((input) => {
    input.disabled = locked;
    const byte = !!input.dataset.motionValue;
    const node = state.project.nodes.find(
      (node) => node.id === (input.dataset.motionValue || input.dataset.motionClock),
    );
    if (node && document.activeElement !== input)
      input.value = node.params[byte ? 'value' : 'frequency'] ?? (byte ? 0 : 1);
  });
}

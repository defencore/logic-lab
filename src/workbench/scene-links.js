import { linkedCircuitPath, sceneContactFor } from '../circuits/scene-links.js';
import { getDefinition } from '../components/catalog/index.js';
import { portPoint, dimensions } from '../circuits/geometry/index.js';
import { focusContact } from './contact-interaction.js';

export const scenePickedContact = ({ nodeId, port, side }) => ({ node: nodeId, port, side });

export function createSceneLinks(state, actions, getEntry, getView) {
  let selected = null;
  let choosing = false;
  let last = null;
  function decorate() {
    const valid = selected && state.project.nodes.some((node) => node.id === selected.node);
    if (!valid) selected = null;
    const key = JSON.stringify(selected);
    const nodesRoot = document.querySelector('#nodes')?.firstElementChild;
    const wiresRoot = document.querySelector('#wires')?.firstElementChild;
    const view = getView();
    if (
      last &&
      last.key === key &&
      last.nodesRoot === nodesRoot &&
      last.wiresRoot === wiresRoot &&
      last.view === view &&
      last.project === state.project
    )
      return;
    last = { key, nodesRoot, wiresRoot, view, project: state.project };
    const path = selected?.port
      ? linkedCircuitPath(state.project, selected)
      : { nodes: [], wires: [] };
    for (const element of document.querySelectorAll('.circuit-node'))
      element.classList.toggle('scene-linked-node', path.nodes.includes(element.dataset.node));
    for (const element of document.querySelectorAll('.wire-group'))
      element.classList.toggle('scene-linked-wire', path.wires.includes(element.dataset.wire));
    for (const pin of document.querySelectorAll('.pin'))
      pin.classList.toggle(
        'scene-linked-pin',
        !!selected &&
          pin.dataset.node === selected.node &&
          pin.dataset.pin === selected.port &&
          pin.dataset.side === selected.side,
      );
    for (const button of document.querySelectorAll('[data-scene-contact]'))
      button.setAttribute(
        'aria-pressed',
        String(
          !!selected &&
            button.dataset.sceneNode === selected.node &&
            button.dataset.sceneContact === selected.port &&
            button.dataset.sceneSide === selected.side,
        ),
      );
    getView()?.select(
      selected ? { nodeId: selected.node, port: selected.port, side: selected.side } : null,
    );
  }
  function inspect(contact, { reveal = false } = {}) {
    if (!getEntry() || choosing) return;
    selected = sceneContactFor(state.project, getEntry(), contact);
    decorate();
    if (!reveal || !selected) return;
    const node = state.project.nodes.find((item) => item.id === selected.node);
    if (!node) return;
    choosing = true;
    try {
      actions.setWorkspaceView('canvas');
      state.selected = new Set([node.id]);
      state.selectedWire = null;
      state.inspectorTab = 'properties';
      actions.selectionChanged();
      const viewport = document.querySelector('#viewport');
      const point = selected.port
        ? portPoint(node, selected.port, selected.side)
        : { x: node.x + dimensions(node).w / 2, y: node.y + 40 };
      state.view.zoom = Math.max(0.75, state.view.zoom);
      state.view.x = viewport.clientWidth / 2 - point.x * state.view.zoom;
      state.view.y = viewport.clientHeight / 2 - point.y * state.view.zoom;
      actions.applyView();
      if (selected.port) focusContact(selected);
      actions.persist();
    } finally {
      choosing = false;
    }
  }
  function selectionChanged() {
    if (choosing || !getEntry() || state.selected.size !== 1) return;
    const node = state.project.nodes.find((node) => state.selected.has(node.id));
    if (!node) return;
    if (node.id === getEntry().nodeId) return;
    inspect({ node: node.id });
  }
  return {
    inspect,
    selectionChanged,
    decorate,
    clear() {
      selected = null;
      decorate();
    },
    describe() {
      if (!selected) return '';
      const node = state.project.nodes.find((item) => item.id === selected.node);
      const port = getDefinition(node?.type)?.[selected.side === 'in' ? 'inputs' : 'outputs'].find(
        (port) => port.id === selected.port,
      );
      return [node?.label || node?.id, port?.label].filter(Boolean).join(' · ');
    },
  };
}

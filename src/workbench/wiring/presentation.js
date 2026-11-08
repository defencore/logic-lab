import { $, $$, esc } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import {
  wireVertices,
  wirePath,
  portPoint,
  portDirection,
  route,
} from '../../circuits/geometry/index.js';
export function createPresentation(context) {
  const { state, options, commands, project, wire, t } = context;
  function endpoint(item, side) {
    const pin = side === 'out' ? item.from : item.to;
    const node = project().nodes.find((candidate) => candidate.id === pin.node);
    return portPoint(node, pin.port, side);
  }
  function updateGeometry(item) {
    const d = wirePath(item, project());
    $$('path', $(`[data-wire="${item.id}"]`, $('#wires'))).forEach((path) =>
      path.setAttribute('d', d),
    );
    commands.renderEditor();
  }
  function marker(point, kind, index, selected = false) {
    const shape =
      kind === 'bend'
        ? '<path class="wire-handle-marker" d="M0 -5 5 0 0 5 -5 0Z"/>'
        : `<circle class="wire-handle-marker" r="${kind === 'endpoint' ? 5 : 3.5}"/>`;
    const text = t(
      kind === 'bend' ? 'wireBend' : kind === 'segment' ? 'wireSegment' : 'wireEndpoint',
    );
    return `<g class="wire-handle ${selected ? 'active' : ''}" data-wire-handle="${kind}" data-index="${index}" transform="translate(${point.x} ${point.y}) scale(${1 / options.getView().zoom})" role="button" tabindex="0" aria-label="${esc(text)}"><title>${esc(text)}</title><circle class="wire-handle-hit" r="11"/>${shape}</g>`;
  }
  function renderEditor() {
    const layer = $('#wire-edit-layer');
    const item = wire();
    if (!layer) return;
    if (!item || options.getTool() !== 'select') {
      layer.innerHTML = '';
      return;
    }
    const preview =
      state.drag?.wireId === item.id && state.drag.previewPoints
        ? { ...item, points: state.drag.previewPoints }
        : item;
    const vertices = wireVertices(preview, project());
    if (vertices.length < 2) {
      layer.innerHTML = '';
      return;
    }
    let markup =
      project().wireStyle === 'bezier' && !item.points?.length
        ? `<path class="wire-edit-plan" d="${vertices.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ')}"/>`
        : '';
    markup += vertices
      .slice(1, -1)
      .map((point, offset) =>
        commands.marker(
          point,
          'bend',
          offset + 1,
          state.activeHandle?.kind === 'bend' && state.activeHandle.index === offset + 1,
        ),
      )
      .join('');
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i],
        b = vertices[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) * options.getView().zoom < 24) continue;
      markup += commands.marker(
        { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        'segment',
        i,
        state.activeHandle?.kind === 'segment' && state.activeHandle.index === i,
      );
    }
    markup += commands.marker(vertices[0], 'endpoint', 'out', state.action?.side === 'out');
    markup += commands.marker(vertices.at(-1), 'endpoint', 'in', state.action?.side === 'in');
    if (state.drag?.kind === 'endpoint' && state.drag.point) {
      const a = state.drag.side === 'out' ? state.drag.point : commands.endpoint(item, 'out');
      const b = state.drag.side === 'in' ? state.drag.point : commands.endpoint(item, 'in');
      const sourceNode = project().nodes.find((node) => node.id === item.from.node);
      const targetNode = project().nodes.find((node) => node.id === item.to.node);
      markup += `<path class="wire-edit-preview" d="${route(
        a,
        b,
        item.points,
        project().wireStyle,
        null,
        {
          start:
            state.drag.side === 'out'
              ? { x: 1, y: 0 }
              : portDirection(sourceNode, item.from.port, 'out'),
          end:
            state.drag.side === 'in'
              ? { x: -1, y: 0 }
              : portDirection(targetNode, item.to.port, 'in'),
        },
      )}"/>`;
    }
    layer.innerHTML = markup;
  }
  function renderContext() {
    const context = $('#wire-context');
    if (!context) return;
    const item = wire();
    context.innerHTML = `${item && options.getTool() === 'select' ? `<button class="soft-btn" data-wire-action="add" aria-pressed="${state.action?.kind === 'add'}">${icon('plus', 13)}${t('wireAddBend')}</button>${state.activeHandle?.kind === 'bend' ? `<button class="soft-btn" data-wire-action="remove">${icon('trash', 13)}${t('wireRemoveBend')}</button>` : ''}` : ''}${state.traceSeed ? `<button class="soft-btn" data-wire-action="details">${icon('wire', 13)}${t('netConnections')} (${state.net.nodes.length})</button><button class="icon-btn" data-wire-action="clear" aria-label="${t('netClear')}" title="${t('netClear')}">${icon('close', 14)}</button>` : ''}${state.action ? `<span class="wire-action-hint">${t(state.action.kind === 'add' ? 'wireAddHint' : 'wireReconnectHint')}</span>` : ''}`;
    $('#viewport').dataset.wireAction = state.action?.kind || '';
  }
  return { endpoint, updateGeometry, marker, renderEditor, renderContext };
}

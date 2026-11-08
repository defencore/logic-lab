import { getDefinition } from './catalog.js';
import { $, $$, esc } from './ui-utils.js';
import { icon } from './icons.js';
import { traceNet } from './continuity.js';
import { checkConnection } from './connections.js';
import {
  wireVertices,
  wirePath,
  nearestWireSegment,
  moveWireVertex,
  moveWireSegment,
  insertWirePoint,
  removeWireVertex,
  portPoint,
  portDirection,
  route,
  snap,
} from './geometry.js';

const copyPoints = (points = []) => points.map(({ x, y }) => ({ x, y }));
const emptyNet = () => ({ wires: [], pins: [], nodes: [] });
const equalPoints = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);

/** Canvas gestures are previews until pointerup; only commits enter project history. */
export function createWiringEditor(options) {
  let drag = null;
  let action = null;
  let activeHandle = null;
  let traceSeed = null;
  let hoverSeed = null;
  let net = emptyNet();
  const t = options.t;
  const project = options.getProject;
  const wire = () => project().wires.find((item) => item.id === options.getSelectedWire());
  const position = (event) => options.worldPoint(event);
  const label = (node) => {
    const definition = getDefinition(node.type);
    return node.label || (options.getLanguage() === 'ua' ? definition.ua : definition.label);
  };
  const pinFromElement = (element) => ({
    node: element.dataset.node,
    port: element.dataset.pin,
    side: element.dataset.side,
  });
  function endpoint(item, side) {
    const pin = side === 'out' ? item.from : item.to;
    const node = project().nodes.find((candidate) => candidate.id === pin.node);
    return portPoint(node, pin.port, side);
  }
  function setTrace(seed) {
    traceSeed = seed;
    hoverSeed = null;
    applyTrace();
    renderContext();
    options.refreshInspector();
  }
  function applyTrace() {
    net = traceNet(project(), traceSeed || hoverSeed);
    if (traceSeed && !net.pins.length) traceSeed = null;
    const wireIds = new Set(net.wires),
      nodeIds = new Set(net.nodes);
    const pins = new Set(net.pins.map((pin) => `${pin.node}:${pin.side}:${pin.port}`));
    $('#world').classList.toggle('net-tracing', !!net.pins.length);
    $$('.wire-group').forEach((group) =>
      group.classList.toggle('net-traced', wireIds.has(group.dataset.wire)),
    );
    $$('.circuit-node').forEach((node) =>
      node.classList.toggle('net-connected', nodeIds.has(node.dataset.node)),
    );
    $$('.pin').forEach((pin) =>
      pin.classList.toggle(
        'net-contact',
        pins.has(`${pin.dataset.node}:${pin.dataset.side}:${pin.dataset.pin}`),
      ),
    );
  }
  function updateGeometry(item) {
    const d = wirePath(item, project());
    $$('path', $(`[data-wire="${item.id}"]`, $('#wires'))).forEach((path) =>
      path.setAttribute('d', d),
    );
    renderEditor();
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
      drag?.wireId === item.id && drag.previewPoints
        ? { ...item, points: drag.previewPoints }
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
        marker(
          point,
          'bend',
          offset + 1,
          activeHandle?.kind === 'bend' && activeHandle.index === offset + 1,
        ),
      )
      .join('');
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i],
        b = vertices[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) * options.getView().zoom < 24) continue;
      markup += marker(
        { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        'segment',
        i,
        activeHandle?.kind === 'segment' && activeHandle.index === i,
      );
    }
    markup += marker(vertices[0], 'endpoint', 'out', action?.side === 'out');
    markup += marker(vertices.at(-1), 'endpoint', 'in', action?.side === 'in');
    if (drag?.kind === 'endpoint' && drag.point) {
      const a = drag.side === 'out' ? drag.point : endpoint(item, 'out');
      const b = drag.side === 'in' ? drag.point : endpoint(item, 'in');
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
            drag.side === 'out' ? { x: 1, y: 0 } : portDirection(sourceNode, item.from.port, 'out'),
          end: drag.side === 'in' ? { x: -1, y: 0 } : portDirection(targetNode, item.to.port, 'in'),
        },
      )}"/>`;
    }
    layer.innerHTML = markup;
  }
  function renderContext() {
    const context = $('#wire-context');
    if (!context) return;
    const item = wire();
    context.innerHTML = `${item && options.getTool() === 'select' ? `<button class="soft-btn" data-wire-action="add" aria-pressed="${action?.kind === 'add'}">${icon('plus', 13)}${t('wireAddBend')}</button>${activeHandle?.kind === 'bend' ? `<button class="soft-btn" data-wire-action="remove">${icon('trash', 13)}${t('wireRemoveBend')}</button>` : ''}` : ''}${traceSeed ? `<button class="soft-btn" data-wire-action="details">${icon('wire', 13)}${t('netConnections')} (${net.nodes.length})</button><button class="icon-btn" data-wire-action="clear" aria-label="${t('netClear')}" title="${t('netClear')}">${icon('close', 14)}</button>` : ''}${action ? `<span class="wire-action-hint">${t(action.kind === 'add' ? 'wireAddHint' : 'wireReconnectHint')}</span>` : ''}`;
    $('#viewport').dataset.wireAction = action?.kind || '';
  }
  function refresh() {
    if (!wire()) {
      activeHandle = null;
      action = null;
    }
    applyTrace();
    renderEditor();
    renderContext();
  }
  function commitPoints(points, target = null, kind = 'bend') {
    if (options.canEdit && !options.canEdit()) return false;
    const item = wire();
    if (!item || !points || equalPoints(item.points, points)) return false;
    if (points.length > 100) {
      options.notify(t('limitReached'));
      return false;
    }
    const before = options.snapshot();
    item.points = copyPoints(points);
    if (target) {
      const vertices = wireVertices(item, project());
      if (kind === 'segment') {
        const nearest = nearestWireSegment(vertices, target);
        activeHandle = nearest ? { kind: 'segment', index: nearest.index } : null;
      } else {
        const index = vertices.findIndex(
          (point) => Math.hypot(point.x - target.x, point.y - target.y) < 0.01,
        );
        activeHandle = index > 0 && index < vertices.length - 1 ? { kind: 'bend', index } : null;
      }
    }
    options.commit(before);
    return true;
  }
  function removeBend() {
    const item = wire();
    if (!item || activeHandle?.kind !== 'bend') return false;
    const points = removeWireVertex(wireVertices(item, project()), activeHandle.index);
    activeHandle = null;
    commitPoints(points);
    refresh();
    return true;
  }
  function startDrag(event, kind, index) {
    if (options.canEdit && !options.canEdit()) return;
    const item = wire();
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    $('#viewport').focus({ preventScroll: true });
    options.cancelConnection();
    action = null;
    const vertices = wireVertices(item, project());
    activeHandle = { kind, index };
    drag = {
      kind,
      index,
      side: kind === 'endpoint' ? index : null,
      wireId: item.id,
      vertices,
      points: copyPoints(item.points),
      before: options.snapshot(),
      previewPoints: null,
      start: position(event),
      screen: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
      moved: false,
    };
    $('#viewport').setPointerCapture(event.pointerId);
    renderEditor();
    renderContext();
  }
  function wirePointerDown(event) {
    const hit = event.target.closest('.wire-hit');
    if (!hit || event.button !== 0) return;
    $('#viewport').focus({ preventScroll: true });
    event.preventDefault();
    event.stopPropagation();
    if (action?.kind === 'add') {
      addBend(position(event));
      return;
    }
    const hitPoint = position(event);
    const id = hit.closest('[data-wire]').dataset.wire;
    setTrace({ wire: id });
    options.selectWire(id);
    if (options.getTool() !== 'select') return;
    const item = wire();
    const nearest = nearestWireSegment(wireVertices(item, project()), hitPoint);
    if (nearest) startDrag(event, 'segment', nearest.index);
  }
  function addBend(point) {
    const item = wire();
    if (!item) return;
    action = null;
    const vertices = wireVertices(item, project());
    const nearest = nearestWireSegment(vertices, point);
    const target =
      nearest && nearest.distance * options.getView().zoom <= 10
        ? nearest.point
        : { x: snap(point.x), y: snap(point.y) };
    commitPoints(insertWirePoint(vertices, target), target);
    refresh();
  }
  function reconnect(pin) {
    if (options.canEdit && !options.canEdit()) return false;
    const item = wire();
    if (!item || pin.side !== action?.side) {
      options.notify(t('incompatible'));
      return false;
    }
    const from = pin.side === 'out' ? { node: pin.node, port: pin.port } : item.from;
    const to = pin.side === 'in' ? { node: pin.node, port: pin.port } : item.to;
    const check = checkConnection(project(), from, to, { excludeWire: item.id });
    if (!check.ok) {
      options.notify(t(check.reason === 'duplicate' ? 'wireDuplicate' : 'incompatible'));
      return false;
    }
    const before = options.snapshot();
    const same =
      item.from.node === from.node &&
      item.from.port === from.port &&
      item.to.node === to.node &&
      item.to.port === to.port;
    action = null;
    if (!same) {
      item.from = { ...from };
      item.to = { ...to };
      item.width = check.width;
      options.commit(before);
    }
    refresh();
    return true;
  }
  function pinPointerDown(event) {
    const pin = pinFromElement(event.currentTarget);
    if (action?.kind === 'reconnect') {
      event.preventDefault();
      event.stopPropagation();
      reconnect(pin);
      return true;
    }
    if (options.getTool() === 'trace') {
      event.preventDefault();
      event.stopPropagation();
      setTrace(pin);
      return true;
    }
    return false;
  }
  function pointerMove(event) {
    if (!drag) return false;
    if (event.pointerId !== drag.pointerId) return true;
    const item = project().wires.find((candidate) => candidate.id === drag.wireId);
    if (!item) {
      cancelGesture();
      return true;
    }
    const point = position(event);
    const distance = Math.hypot(event.clientX - drag.screen.x, event.clientY - drag.screen.y);
    if (distance < 3 && !drag.moved) return true;
    drag.moved = true;
    if (drag.kind === 'endpoint') {
      drag.point = point;
      renderEditor();
      return true;
    }
    let points;
    if (drag.kind === 'bend') {
      const base = drag.vertices[drag.index];
      points = moveWireVertex(drag.vertices, drag.index, {
        x: base.x + snap(point.x - drag.start.x),
        y: base.y + snap(point.y - drag.start.y),
      });
    } else {
      const a = drag.vertices[drag.index],
        b = drag.vertices[drag.index + 1];
      const delta = a.y === b.y ? snap(point.y - drag.start.y) : snap(point.x - drag.start.x);
      points = moveWireSegment(drag.vertices, drag.index, delta);
    }
    drag.previewPoints = points && points.length <= 100 ? points : null;
    const preview = drag.previewPoints ? { ...item, points: drag.previewPoints } : item;
    const vertices = wireVertices(preview, project());
    if (drag.kind === 'bend') {
      const base = drag.vertices[drag.index];
      const target = {
        x: base.x + snap(point.x - drag.start.x),
        y: base.y + snap(point.y - drag.start.y),
      };
      let closest = 1;
      for (let i = 2; i < vertices.length - 1; i++)
        if (
          Math.hypot(vertices[i].x - target.x, vertices[i].y - target.y) <
          Math.hypot(vertices[closest].x - target.x, vertices[closest].y - target.y)
        )
          closest = i;
      activeHandle = { kind: 'bend', index: closest };
    } else {
      const a = drag.vertices[drag.index],
        b = drag.vertices[drag.index + 1];
      const target =
        a.y === b.y
          ? { x: (a.x + b.x) / 2, y: a.y + snap(point.y - drag.start.y) }
          : { x: a.x + snap(point.x - drag.start.x), y: (a.y + b.y) / 2 };
      const nearest = nearestWireSegment(vertices, target);
      activeHandle = nearest ? { kind: 'segment', index: nearest.index } : null;
    }
    updateGeometry(preview);
    return true;
  }
  function releaseCapture(pointerId) {
    if ($('#viewport').hasPointerCapture(pointerId))
      $('#viewport').releasePointerCapture(pointerId);
  }
  function pointerUp(event) {
    if (!drag) return false;
    if (event.pointerId !== drag.pointerId) return true;
    const old = drag;
    drag = null;
    releaseCapture(old.pointerId);
    const item = project().wires.find((candidate) => candidate.id === old.wireId);
    if (!item) return true;
    if (old.kind === 'endpoint') {
      action = { kind: 'reconnect', side: old.side };
      if (old.moved) {
        const hit = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest('.pin'))
          .find(Boolean);
        if (!hit || !reconnect(pinFromElement(hit))) {
          action = null;
          refresh();
        }
      } else refresh();
    } else if (old.previewPoints && !equalPoints(old.points, old.previewPoints)) {
      item.points = copyPoints(old.previewPoints);
      options.commit(old.before);
      refresh();
    } else {
      updateGeometry(item);
      refresh();
    }
    return true;
  }
  function cancelGesture() {
    if (!drag) return;
    const old = drag;
    drag = null;
    const item = project().wires.find((candidate) => candidate.id === old.wireId);
    if (item) {
      activeHandle = { kind: old.kind, index: old.index };
      updateGeometry(item);
    }
    releaseCapture(old.pointerId);
  }
  function clear() {
    cancelGesture();
    action = null;
    activeHandle = null;
    traceSeed = null;
    hoverSeed = null;
    refresh();
    options.refreshInspector();
  }
  function blankPointerDown(event) {
    $('#viewport').focus({ preventScroll: true });
    if (action?.kind === 'add') {
      event.preventDefault();
      addBend(position(event));
      return true;
    }
    if (action?.kind === 'reconnect') {
      action = null;
      refresh();
      return true;
    }
    if (options.getTool() === 'trace') {
      clear();
      return true;
    }
    if (traceSeed) {
      traceSeed = null;
      applyTrace();
      renderContext();
    }
    return false;
  }
  function keyDown(event) {
    if (options.getTool() !== 'select') return false;
    if (
      drag &&
      ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      return true;
    }
    if (['Delete', 'Backspace'].includes(event.key) && action) {
      event.preventDefault();
      action = null;
      refresh();
      return true;
    }
    if (
      ['Delete', 'Backspace'].includes(event.key) &&
      activeHandle &&
      activeHandle.kind !== 'bend'
    ) {
      event.preventDefault();
      activeHandle = null;
      refresh();
      return true;
    }
    if (['Delete', 'Backspace'].includes(event.key) && activeHandle?.kind === 'bend') {
      event.preventDefault();
      removeBend();
      return true;
    }
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
      !wire() ||
      !activeHandle
    )
      return false;
    const amount = event.shiftKey ? 100 : 20;
    const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
    const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
    const vertices = wireVertices(wire(), project());
    event.preventDefault();
    if (activeHandle.kind === 'bend') {
      const point = vertices[activeHandle.index];
      if (point)
        commitPoints(
          moveWireVertex(vertices, activeHandle.index, { x: point.x + dx, y: point.y + dy }),
          { x: point.x + dx, y: point.y + dy },
        );
    } else if (activeHandle.kind === 'segment') {
      const a = vertices[activeHandle.index],
        b = vertices[activeHandle.index + 1];
      if (a && b) {
        const delta = a.y === b.y ? dy : dx;
        const target =
          a.y === b.y
            ? { x: (a.x + b.x) / 2, y: a.y + delta }
            : { x: a.x + delta, y: (a.y + b.y) / 2 };
        commitPoints(moveWireSegment(vertices, activeHandle.index, delta), target, 'segment');
      }
    }
    return true;
  }
  function decorateInspector() {
    const container = $('#inspector-content');
    $('.net-inspector', container)?.remove();
    $('.wire-route-actions', container)?.remove();
    const item = wire();
    if (item) {
      container.insertAdjacentHTML(
        'beforeend',
        `<section class="property-section wire-route-actions"><h4>${t('wireEdit')}</h4><div class="wire-inspector-buttons"><button class="soft-btn" data-wire-inspector="add">${t('wireAddBend')}</button><button class="soft-btn" data-wire-inspector="out">${t('wireReconnectSource')}</button><button class="soft-btn" data-wire-inspector="in">${t('wireReconnectTarget')}</button><button class="soft-btn" data-wire-inspector="reset">${t('wireAutoRoute')}</button></div><p>${t('wireEditHint')}</p></section>`,
      );
      $$('[data-wire-inspector]', container).forEach(
        (button) =>
          (button.onclick = () => {
            const command = button.dataset.wireInspector;
            if (command === 'reset') {
              activeHandle = null;
              action = null;
              commitPoints([]);
            } else {
              options.cancelConnection();
              options.activateSelect();
              action = command === 'add' ? { kind: 'add' } : { kind: 'reconnect', side: command };
              options.showCanvas();
            }
            refresh();
          }),
      );
    }
    if (!traceSeed) return;
    const traced = traceNet(project(), traceSeed);
    const nodeMap = new Map(project().nodes.map((node) => [node.id, node]));
    const entries = [...traced.pins]
      .sort(
        (a, b) =>
          (a.side === b.side ? 0 : a.side === 'out' ? -1 : 1) ||
          label(nodeMap.get(a.node)).localeCompare(
            label(nodeMap.get(b.node)),
            options.getLanguage() === 'ua' ? 'uk' : 'en',
          ) ||
          a.port.localeCompare(b.port),
      )
      .map((pin) => {
        const node = project().nodes.find((item) => item.id === pin.node);
        const definition = getDefinition(node.type);
        const port = (pin.side === 'out' ? definition.outputs : definition.inputs).find(
          (item) => item.id === pin.port,
        );
        return `<button type="button" class="net-contact-row" data-net-node="${esc(node.id)}"><span>${esc(label(node))}</span><code>${pin.side === 'out' ? '→' : '←'} ${esc(port.label || port.id)}</code></button>`;
      })
      .join('');
    container.insertAdjacentHTML(
      'afterbegin',
      `<section class="net-inspector"><div class="net-inspector-heading"><h3>${t('netTrace')}</h3><button class="icon-btn" data-net-clear aria-label="${t('netClear')}">${icon('close', 14)}</button></div><p>${traced.nodes.length} ${t('nodes')} · ${traced.wires.length} ${t('wires')}</p><div class="net-contact-list">${entries}</div></section>`,
    );
    $('[data-net-clear]', container).onclick = clear;
    $$('[data-net-node]', container).forEach(
      (button) => (button.onclick = () => options.revealNode(button.dataset.netNode)),
    );
  }
  function bind() {
    $('#wires').addEventListener('pointerdown', wirePointerDown);
    $('#wire-edit-layer').addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle) return;
      if (action?.kind === 'reconnect') {
        const pin = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest('.pin'))
          .find(Boolean);
        if (pin) {
          event.preventDefault();
          event.stopPropagation();
          reconnect(pinFromElement(pin));
          return;
        }
      }
      const kind = handle.dataset.wireHandle;
      startDrag(
        event,
        kind,
        kind === 'endpoint' ? handle.dataset.index : Number(handle.dataset.index),
      );
    });
    $('#wire-edit-layer').addEventListener('focusin', (event) => {
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle) return;
      activeHandle = {
        kind: handle.dataset.wireHandle,
        index:
          handle.dataset.wireHandle === 'endpoint'
            ? handle.dataset.index
            : Number(handle.dataset.index),
      };
      renderContext();
    });
    $('#wire-edit-layer').addEventListener('keydown', (event) => {
      const handle = event.target.closest('[data-wire-handle]');
      if (!handle || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      activeHandle = { kind: handle.dataset.wireHandle, index: Number(handle.dataset.index) };
      if (handle.dataset.wireHandle === 'endpoint')
        action = { kind: 'reconnect', side: handle.dataset.index };
      refresh();
    });
    $('#wire-context').onclick = (event) => {
      const button = event.target.closest('[data-wire-action]');
      if (!button) return;
      const command = button.dataset.wireAction;
      if (command === 'clear') clear();
      if (command === 'details') options.showInspector();
      if (command === 'remove') removeBend();
      if (command === 'add') {
        options.cancelConnection();
        action = action?.kind === 'add' ? null : { kind: 'add' };
        renderContext();
      }
    };
    $('#nodes').addEventListener('pointerover', (event) => {
      const pin = event.target.closest('.pin');
      if (!pin || traceSeed || drag || action) return;
      hoverSeed = pinFromElement(pin);
      applyTrace();
    });
    $('#nodes').addEventListener('pointerout', (event) => {
      if (
        !event.target.closest('.pin') ||
        event.relatedTarget?.closest?.('.pin') === event.target.closest('.pin')
      )
        return;
      hoverSeed = null;
      applyTrace();
    });
  }
  return {
    bind,
    refresh,
    renderEditor,
    decorateInspector,
    pinPointerDown,
    pointerMove,
    pointerUp,
    blankPointerDown,
    keyDown,
    cancelGesture,
    clear,
    get busy() {
      return !!drag;
    },
  };
}

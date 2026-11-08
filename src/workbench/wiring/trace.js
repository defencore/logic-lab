import { getDefinition } from '../../components/catalog/index.js';
import { $, $$, esc } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { traceNet } from '../../circuits/continuity.js';
export function createTrace(context) {
  const { state, options, commands, project, wire, label, t } = context;
  function setTrace(seed) {
    state.traceSeed = seed;
    state.hoverSeed = null;
    commands.applyTrace();
    commands.renderContext();
    options.refreshInspector();
  }
  function applyTrace() {
    state.net = traceNet(project(), state.traceSeed || state.hoverSeed);
    if (state.traceSeed && !state.net.pins.length) state.traceSeed = null;
    const wireIds = new Set(state.net.wires),
      nodeIds = new Set(state.net.nodes);
    const pins = new Set(state.net.pins.map((pin) => `${pin.node}:${pin.side}:${pin.port}`));
    $('#world').classList.toggle('net-tracing', !!state.net.pins.length);
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
              state.activeHandle = null;
              state.action = null;
              commands.commitPoints([]);
            } else {
              options.cancelConnection();
              options.activateSelect();
              state.action =
                command === 'add' ? { kind: 'add' } : { kind: 'reconnect', side: command };
              options.showCanvas();
            }
            commands.refresh();
          }),
      );
    }
    if (!state.traceSeed) return;
    const traced = traceNet(project(), state.traceSeed);
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
    $('[data-net-clear]', container).onclick = commands.clear;
    $$('[data-net-node]', container).forEach(
      (button) => (button.onclick = () => options.revealNode(button.dataset.netNode)),
    );
  }
  return { setTrace, applyTrace, decorateInspector };
}

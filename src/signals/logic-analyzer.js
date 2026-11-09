import { getDefinition } from '../components/catalog/index.js';

const MAX_TRANSITIONS = 4096;

export const logicChannelId = ({ node, side, port }) => `${node}:${side}:${port}`;

export function logicChannelChoices(project, language) {
  const input = language === 'ua' ? 'вхід' : 'in';
  const output = language === 'ua' ? 'вихід' : 'out';
  return project.nodes.flatMap((node) => {
    const definition = getDefinition(node.type);
    const typeLabel = language === 'ua' ? definition.ua : definition.label;
    const nodeLabel = node.label || typeLabel;
    return ['outputs', 'inputs'].flatMap((side) =>
      definition[side]
        .filter((pin) => !pin.analog && !pin.acceptAny)
        .map((pin) => ({
          node: node.id,
          side,
          port: pin.id,
          label: `${nodeLabel} · ${pin.label} (${side === 'inputs' ? input : output})`,
          displayLabel: `${pin.label} · ${nodeLabel}`,
          nodeLabel,
          typeLabel,
        })),
    );
  });
}

export function readLogicChannel(runtime, { node, side, port }) {
  const value = runtime[side]?.[node]?.[port] ?? 'Z';
  return value === 0 || value === 1 || value === 'Z' ? value : 'X';
}

/** Record settled digital transitions at their actual simulation times, including paused inputs. */
export function createLogicAnalyzer() {
  const projects = new WeakMap();
  function configure(project, channels) {
    projects.set(project, {
      channels: channels.map((channel) => ({ ...channel, id: logicChannelId(channel) })),
      traces: channels.map(() => []),
      runtime: null,
      steps: -1,
      time: 0,
    });
  }
  function capture(project, runtime) {
    const current = projects.get(project);
    if (!current?.channels.length) return;
    if (current.runtime === runtime && current.steps === runtime.steps) return;
    if (runtime.time < current.time) reset(project);
    current.runtime = runtime;
    current.steps = runtime.steps;
    current.time = runtime.time;
    current.channels.forEach((channel, index) => {
      const trace = current.traces[index];
      const value = readLogicChannel(runtime, channel);
      if (trace.at(-1)?.value === value) return;
      trace.push({ at: runtime.time, value });
      // Discard old transitions in batches to keep frequent edges inexpensive.
      if (trace.length > MAX_TRANSITIONS + 512) trace.splice(0, 512);
    });
  }
  function reset(project) {
    const current = projects.get(project);
    if (!current) return;
    current.runtime = null;
    current.steps = -1;
    current.time = 0;
    current.traces.forEach((trace) => (trace.length = 0));
  }
  function inherit(previous, next, language) {
    const oldChannels = projects.get(previous)?.channels;
    if (!oldChannels?.length || projects.has(next)) return;
    const previousTypes = new Map(previous.nodes.map((node) => [node.id, node.type]));
    const sameType = new Set(
      next.nodes.filter((node) => previousTypes.get(node.id) === node.type).map((node) => node.id),
    );
    const chosen = new Set(oldChannels.map(logicChannelId));
    configure(
      next,
      logicChannelChoices(next, language).filter(
        (channel) => sameType.has(channel.node) && chosen.has(logicChannelId(channel)),
      ),
    );
  }
  return {
    configure,
    inherit,
    reset,
    capture,
    channels: (project) => projects.get(project)?.channels ?? [],
    transitions(project, index) {
      return projects.get(project)?.traces[index] ?? [];
    },
  };
}

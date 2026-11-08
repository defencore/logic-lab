import { getDefinition } from '../components/catalog/index.js';

/** Record every semantic output; passive indicators expose their measured inputs instead. */
export function availableProbes(project) {
  return project.nodes
    .filter((node) => !['note', 'group'].includes(node.type))
    .flatMap((node) => {
      const definition = getDefinition(node.type);
      const side = definition.signals.outputs.length ? 'outputs' : 'inputs';
      return definition.signals[side].map((port) => ({ node: node.id, port: port.id, side }));
    });
}
export const probeId = (probe) => `${probe.node}:${probe.side || 'outputs'}:${probe.port}`;

/** Imported criteria may observe an input on a component which also has outputs. */
export function hasProbe(project, probe) {
  const node = project.nodes.find((node) => node.id === probe?.node);
  return (
    !!node &&
    !!getDefinition(node.type)?.signals[probe.side || 'outputs']?.some(
      (port) => port.id === probe.port,
    )
  );
}
export function probeChoices(project, preferred = []) {
  const choices = availableProbes(project),
    ids = new Set(choices.map(probeId));
  for (const probe of preferred) {
    if (hasProbe(project, probe) && !ids.has(probeId(probe))) {
      choices.push({ node: probe.node, port: probe.port, side: probe.side || 'outputs' });
      ids.add(probeId(probe));
    }
  }
  return choices;
}
export function recommendedProbes(project, preferred = [], limit = 32) {
  if (preferred.length > limit)
    throw Object.assign(
      new Error(`Choose at most ${limit} observed signals; no selection was truncated.`),
      { code: 'teacher_probe_limit' },
    );
  const valid = preferred.filter((probe) => hasProbe(project, probe));
  const unique = [...new Map(valid.map((probe) => [probeId(probe), probe])).values()];
  return unique.length ? unique : availableProbes(project).slice(0, limit);
}

export function recordingProbeOptions(project, { assignment, example } = {}) {
  const preferred = assignment ? assignment.probes || [] : example?.actionProbes || [];
  const defaults = recommendedProbes(project, preferred);
  const choices = probeChoices(project, preferred),
    ids = new Set(choices.map(probeId));
  for (const probe of preferred) {
    if (!ids.has(probeId(probe))) {
      choices.push({ ...probe, missing: true });
      ids.add(probeId(probe));
    }
  }
  return {
    choices,
    // Missing task interfaces require correction, not replacement by unrelated early outputs.
    recommended: preferred.length ? preferred : defaults,
    preferred,
  };
}

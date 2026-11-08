import { getDefinition } from './catalog.js';

/** Validate a directed pin connection without changing the circuit or its history. */
export function checkConnection(project, from, to, { excludeWire = null } = {}) {
  if (
    !Array.isArray(project?.nodes) ||
    typeof from?.node !== 'string' ||
    typeof from?.port !== 'string' ||
    typeof to?.node !== 'string' ||
    typeof to?.port !== 'string'
  )
    return { ok: false, reason: 'missing' };

  const source = project.nodes.find((node) => node?.id === from.node);
  const target = project.nodes.find((node) => node?.id === to.node);
  const output = getDefinition(source?.type)?.outputs.find((port) => port.id === from.port);
  const input = getDefinition(target?.type)?.inputs.find((port) => port.id === to.port);
  if (!output || !input) return { ok: false, reason: 'missing' };

  if (!input.acceptAny && !!output.analog !== !!input.analog)
    return { ok: false, reason: 'incompatible' };

  if (
    (project.wires || []).some(
      (wire) =>
        wire?.id !== excludeWire &&
        wire?.from?.node === from.node &&
        wire.from.port === from.port &&
        wire?.to?.node === to.node &&
        wire.to.port === to.port,
    )
  )
    return { ok: false, reason: 'duplicate' };
  return { ok: true, width: 1 };
}

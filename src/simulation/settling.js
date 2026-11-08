import { getDefinition } from '../components/catalog/index.js';
import { signalValues } from './signals.js';
import { evaluate } from './models.js';
import { readInputs, outputContacts } from './contacts.js';
import { advanceAsynchronous } from './asynchronous.js';
import { advanceSequential } from './sequential.js';

function settleCombinational(nodes, incoming, runtime, limit) {
  for (let iteration = 0; iteration < limit; iteration++) {
    readInputs(nodes, incoming, runtime);
    const updates = new Map();
    let changed = false;
    for (const node of nodes) {
      const output = outputContacts(node, evaluate(node, runtime, incoming), runtime, incoming);
      updates.set(node, output);
      if (
        Object.entries(output).some(([port, value]) => runtime.outputs[node.id]?.[port] !== value)
      )
        changed = true;
    }
    for (const [node, output] of updates) {
      runtime.outputs[node.id] = output;
      runtime.signals.outputs[node.id] = signalValues(
        getDefinition(node.type).signals.outputs,
        output,
      );
    }
    if (!changed) return true;
  }
  readInputs(nodes, incoming, runtime);
  return false;
}

function settleAsynchronous(nodes, incoming, runtime, limit) {
  for (let iteration = 0; iteration < limit; iteration++) {
    if (!settleCombinational(nodes, incoming, runtime, limit)) return false;
    if (!advanceAsynchronous(nodes, runtime, incoming)) return true;
  }
  return false;
}

/** Resolve asynchronous controls, then clock events, without advancing physical time. */
export function settleEvents(nodes, incoming, runtime) {
  const limit = Math.min(512, Math.max(32, nodes.length * 3));
  if (!settleAsynchronous(nodes, incoming, runtime, limit)) return false;
  for (let wave = 0; wave < limit; wave++) {
    const changed = advanceSequential(nodes, runtime, incoming);
    if (!settleAsynchronous(nodes, incoming, runtime, limit)) return false;
    if (!changed) return true;
  }
  return false;
}

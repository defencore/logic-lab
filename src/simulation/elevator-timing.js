import { getDefinition } from '../components/catalog/index.js';
import {
  FLOOR_ZONE,
  ELEVATOR_DEFAULTS,
  elevatorParameterError,
} from '../scenes/models/elevator/config.js';

// These models settle from current signals or explicit clock edges. New models
// retain the general physics step until their timing requirements are reviewed.
const ELEVATOR_LOGIC = new Set([
  'elevator',
  'and',
  'or',
  'nand',
  'nor',
  'xor',
  'xnor',
  'not',
  'gnd',
  'vcc',
  'switch',
  'button',
  'hotkey',
  'keypad',
  'bus_input',
  'clock',
  'led',
  'matrix',
  'sevenseg',
  'scope',
  'mux',
  'demux',
  'half_adder',
  'full_adder',
  'comparator',
  'decoder',
  'encoder',
  'sr_latch',
  'd_ff',
  'jk_ff',
  't_ff',
  'register',
  'shift_register',
  'counter',
  'ram',
  'rom',
  'register_file',
  'dac',
  'alu',
  'tristate',
  'priority_encoder',
  'splitter',
  'merger',
  'open_drain',
  'pullup',
  'pulldown',
  'schmitt',
  'monostable',
  'position_sensor',
  'note',
  'group',
]);

/** null preserves the general physics cap; a bound only applies to eligible lift circuits. */
export function elevatorStepBound(project) {
  let found = false,
    bound = 0.005;
  for (const node of project.nodes) {
    if (node.enabled === false) continue;
    if (!ELEVATOR_LOGIC.has(node.type)) return null;
    if (node.type === 'elevator') {
      if (elevatorParameterError(node)) return null;
      found = true;
      const speed = node.params?.travelSpeed ?? ELEVATOR_DEFAULTS.travelSpeed;
      // At most half a complete alignment zone per step, even with an off-grid start.
      bound = Math.min(bound, FLOOR_ZONE / speed);
    } else if (node.type === 'monostable') {
      const duration = node.params?.duration ?? getDefinition('monostable').defaults.duration;
      if (typeof duration !== 'number' || !Number.isFinite(duration)) return null;
      if (duration > 0) {
        const pulseStep = duration / 2;
        if (!(pulseStep > 0)) return null;
        bound = Math.min(bound, pulseStep);
      }
    } else if (node.type === 'position_sensor') {
      const p = { ...getDefinition('position_sensor').defaults, ...node.params };
      // Preserve existing custom stop circuits whose external window is narrower
      // than the plant's native alignment sensor, including exact-position tests.
      if (
        p.mode === 'window' &&
        (typeof p.tolerance !== 'number' ||
          !Number.isFinite(p.tolerance) ||
          p.tolerance < FLOOR_ZONE)
      )
        return null;
    }
  }
  return found ? bound : null;
}

import { LCD_COLUMNS } from '../simulation/lcd1602.js';

const isByte = (value) => Number.isInteger(value) && value >= 0 && value <= 255;
const isTransfer = (entry) => (entry?.rs === 0 || entry?.rs === 1) && isByte(entry.byte);

export function createLcdLabTransmitter({ state, services, actions, writeValue }) {
  return function send(transfers) {
    let sent = 0;
    const fail = (error) => ({ sent, error });
    if (
      !Array.isArray(transfers) ||
      !transfers.length ||
      transfers.length > LCD_COLUMNS + 1 ||
      !Array.from(transfers).every(isTransfer)
    )
      return fail('input');
    const { project, runtime } = state;
    if (project.exampleId !== 'lcd1602-parallel') return fail('wiring');
    const find = (id, type) =>
      project.nodes.find((node) => node.id === id && node.type === type && node.enabled !== false);
    const lcd = find('lcd', 'lcd1602');
    const data = find('byte', 'bus_input');
    const select = find('rs', 'switch');
    const enable = find('enable', 'button');
    if (!lcd || !data || !select || !enable) return fail('wiring');
    if (services.classroom && !services.classroom.allowInput()) return fail('busy');
    if (runtime.state.lcd?.dataBits !== 8) return fail('mode');
    const inputs = () => runtime.signals.inputs.lcd ?? {};
    if (
      inputs().rw !== 0 ||
      !isByte(inputs().d) ||
      ![0, 1].includes(inputs().rs) ||
      ![0, 1].includes(inputs().e)
    )
      return fail('wiring');
    if (inputs().e !== 0 || enable.params.value === 1) return fail('busy');

    actions.checkpoint();
    const write = (node, value) => {
      if (node.params.value !== value) writeValue(node, value);
    };
    let error;
    for (const { rs, byte } of transfers) {
      if (runtime.state.lcd?.dataBits !== 8) {
        error = 'mode';
        break;
      }
      write(select, rs);
      write(data, byte);
      const pins = inputs();
      if (pins.d !== byte || pins.rs !== rs || pins.rw !== 0 || pins.e !== 0) {
        error = 'wiring';
        break;
      }
      write(enable, 1);
      const raised = inputs().e === 1;
      write(enable, 0);
      if (!raised || inputs().e !== 0 || runtime.state.lcd?.fault) {
        error = 'transfer';
        break;
      }
      sent++;
    }
    // Keep ordinary source cards and inspector fields in sync with panel operations.
    actions.changed();
    return error ? fail(error) : { sent };
  };
}

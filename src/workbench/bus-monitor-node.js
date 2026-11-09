import { byteFormats } from './state-inspection/model.js';

export const isBusMonitor = (type) => type === 'bus_monitor_4' || type === 'bus_monitor_8';

export function busMonitorMarkup() {
  return `<dl class="bus-monitor-widget"><div><dt>HEX</dt><dd data-bus-hex>—</dd></div>
    <div><dt>DEC</dt><dd data-bus-dec>—</dd></div><div><dt>BIN</dt><dd data-bus-bin>—</dd></div></dl>`;
}

export function updateBusMonitor(root, node, runtime) {
  const width = node.type === 'bus_monitor_4' ? 4 : 8;
  const inputs = runtime.inputs[node.id];
  const bits = Array.from({ length: width }, (_, bit) =>
    node.enabled === false ? 'Z' : (inputs?.[`in${bit}`] ?? 'Z'),
  );
  const value = byteFormats(bits);
  if (width === 4) value.hex = `0x${value.hex.at(-1)}`;
  for (const [key, text] of Object.entries(value)) {
    const field = root.querySelector(`[data-bus-${key}]`);
    if (field && field.textContent !== text) field.textContent = text;
  }
}

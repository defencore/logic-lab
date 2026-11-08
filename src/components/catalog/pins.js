const pin = (id, label = id.toUpperCase(), width = 1, analog = false) => ({
  id,
  label,
  width,
  ...(analog ? { analog } : {}),
});
export const bit = (id, label) => pin(id, label);
export const word = (id, label, width = 8) => pin(id, label, width);
export const analog = (id, label) => pin(id, label, 1, true);

export function contacts(type, direction, signals) {
  return signals.flatMap((signal) => {
    if (signal.width === 1) return [{ ...signal }];
    return Array.from({ length: signal.width }, (_, index) => ({
      id: `${signal.id}${index}`,
      label:
        type === 'sevenseg' && direction === 'inputs'
          ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'][index]
          : /\d$/.test(signal.label)
            ? `${signal.label}[${index}]`
            : `${type === 'bus_input' && signal.id === 'out' ? 'D' : signal.label}${index}`,
      width: 1,
      group: signal.id,
      bit: index,
      groupWidth: signal.width,
    }));
  });
}

/** Draw levels until the next edge; the first observed level starts at its actual timestamp. */
export function paintLogicTrace(
  context,
  transitions,
  { left = 0, width, top, height, start, end, color },
) {
  if (!transitions.length || end <= start) return;
  const x = (time) =>
    left + ((Math.max(start, Math.min(end, time)) - start) / (end - start)) * width;
  const y = (value) => top + height * (value === 1 ? 0.2 : value === 0 ? 0.8 : 0.5);
  const styles = [
    [color, [], (value) => value === 0 || value === 1],
    ['#687481', [2, 3], (value) => value === 'Z'],
    ['#b04545', [5, 2], (value) => value === 'X'],
  ];
  for (const [stroke, dash, matches] of styles) {
    context.strokeStyle = stroke;
    context.setLineDash(dash);
    context.beginPath();
    for (let index = 0; index < transitions.length; index++) {
      const { at, value } = transitions[index];
      const next = transitions[index + 1];
      const until = next?.at ?? end;
      if (!matches(value) || until < start || at > end) continue;
      context.moveTo(x(at), y(value));
      context.lineTo(x(until), y(value));
      if (next && next.at <= end && matches(next.value)) context.lineTo(x(until), y(next.value));
    }
    context.stroke();
  }
  context.setLineDash([]);
}

export const copyPoints = (points = []) => points.map(({ x, y }) => ({ x, y }));
export const emptyNet = () => ({ wires: [], pins: [], nodes: [] });
export const equalPoints = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
export const createWireSession = () => ({
  drag: null,
  action: null,
  activeHandle: null,
  traceSeed: null,
  hoverSeed: null,
  net: emptyNet(),
});

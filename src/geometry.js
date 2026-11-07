import { getDefinition } from './catalog.js';
export const GRID = 20;
export const snap = (value) => Math.round(value / GRID) * GRID;

export function dimensions(node) {
  const d = getDefinition(node.type);
  if (node.type === 'group')
    return {
      w: Math.max(100, Math.min(3000, Number(node.params.width) || 420)),
      h: Math.max(100, Math.min(3000, Number(node.params.height) || 260)),
    };
  if (node.type === 'note') return { w: 240, h: 130 };
  return {
    w: ['scope', 'servo', 'matrix', 'am', 'fm', 'stepper'].includes(node.type)
      ? 228
      : node.type === 'sevenseg'
        ? 164
        : 160,
    h: Math.max(
      100,
      54 + Math.max(d.inputs.length, d.outputs.length) * 25,
      ['scope', 'servo', 'matrix', 'sevenseg', 'am', 'fm', 'stepper'].includes(node.type) ? 190 : 0,
    ),
  };
}
export function portPoint(node, port, side) {
  const d = getDefinition(node.type),
    pins = side === 'out' ? d.outputs : d.inputs;
  const i = pins.findIndex((p) => p.id === port),
    { w } = dimensions(node);
  return { x: node.x + (side === 'out' ? w : 0), y: node.y + 58 + i * 25 };
}
export function wirePath(wire, project) {
  const a = project.nodes.find((n) => n.id === wire.from.node),
    b = project.nodes.find((n) => n.id === wire.to.node);
  if (!a || !b) return '';
  return route(
    portPoint(a, wire.from.port, 'out'),
    portPoint(b, wire.to.port, 'in'),
    wire.points,
    project.wireStyle,
  );
}
export function route(a, b, points = [], style = 'orthogonal') {
  if (style === 'bezier' && !points.length) {
    const dx = Math.max(55, Math.abs(b.x - a.x) * 0.5);
    return `M${a.x},${a.y}C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  }
  let coordinates = [a, { x: a.x + 24, y: a.y }];
  let previous = coordinates[1];
  for (const p of points || []) {
    coordinates.push({ x: p.x, y: previous.y }, p);
    previous = p;
  }
  if (b.x - 24 > previous.x) {
    const mx = snap((previous.x + b.x - 24) / 2);
    coordinates.push({ x: mx, y: previous.y }, { x: mx, y: b.y });
  } else {
    const lane = Math.min(a.y, b.y) - 40;
    coordinates.push(
      { x: previous.x + 20, y: previous.y },
      { x: previous.x + 20, y: lane },
      { x: b.x - 24, y: lane },
      { x: b.x - 24, y: b.y },
    );
  }
  coordinates.push({ x: b.x - 24, y: b.y }, b);
  return coordinates.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

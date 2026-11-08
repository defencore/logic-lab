import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, getDefinition } from '../../src/components/catalog/index.js';
import { validateProject } from '../../src/circuits/project.js';
import {
  createFragment,
  serializeFragment,
  parseFragment,
  instantiateFragment,
  FragmentError,
} from '../../src/circuits/fragments.js';

const node = (id, type = 'switch', x = 0, y = 0, params = {}) => ({
  id,
  type,
  x,
  y,
  enabled: true,
  label: id,
  params: { ...structuredClone(getDefinition(type).defaults), ...params },
});
const project = (nodes = [], wires = []) => ({ version: 1, name: 'Clipboard test', nodes, wires });
const wire = (id, from, to, points) => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port: 'a' },
  width: 1,
  ...(points ? { points } : {}),
});
const generator = () => {
  let serial = 0;
  return (prefix) => `${prefix}_copy_${++serial}`;
};
const fragment = (nodes) => createFragment(project(nodes), new Set(nodes.map((item) => item.id)));

test('copy exports only live selected elements and internal connections as independent portable data', () => {
  const source = project(
    [node('a'), node('b', 'and', 300), node('outside', 'and', 600)],
    [wire('inside', 'a', 'b', [{ x: 200, y: 80 }]), wire('external', 'a', 'outside')],
  );
  assert.equal(createFragment(source, new Set()), null);
  assert.equal(createFragment(source, new Set(['missing'])), null);
  const copied = createFragment(source, new Set(['a', 'b', 'stale-id']));
  assert.equal(copied.kind, 'logic-lab-fragment');
  assert.deepEqual(
    copied.nodes.map((item) => item.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    copied.wires.map((item) => item.id),
    ['inside'],
  );
  const pasted = instantiateFragment(parseFragment(serializeFragment(copied)), source, {
    uid: generator(),
  });
  assert.deepEqual(
    pasted.nodes.map((item) => item.x),
    [40, 340],
  );
  assert.deepEqual(pasted.wires[0].points, [{ x: 240, y: 120 }]);
  assert.equal(pasted.wires[0].from.node, pasted.nodes[0].id);
  assert.equal(pasted.wires[0].to.node, pasted.nodes[1].id);
  assert.notEqual(pasted.nodes[0].id, source.nodes[0].id);
  assert.notEqual(pasted.wires[0].id, source.wires[0].id);
  pasted.nodes[0].params.value = 1;
  pasted.wires[0].points[0].x = 900;
  assert.equal(source.nodes[0].params.value, 0);
  assert.equal(copied.nodes[0].params.value, 0);
  assert.equal(source.wires[0].points[0].x, 200);
});

test('all catalog types and actual physical output contacts survive copying without changing memory or annotation data', () => {
  const nodes = COMPONENTS.map((definition, index) =>
    node(`source_${index}`, definition.type, index * 20),
  );
  const scope = nodes.find((item) => item.type === 'scope');
  const rom = nodes.find((item) => item.type === 'rom');
  rom.params.data = [5, 10, 255];
  const wires = nodes.flatMap((item) =>
    getDefinition(item.type).outputs.map((port, index) => ({
      id: `${item.id}_${index}`,
      from: { node: item.id, port: port.id },
      to: { node: scope.id, port: getDefinition('scope').inputs[0].id },
      width: 1,
    })),
  );
  const source = project(nodes, wires),
    copy = createFragment(source, new Set(nodes.map((item) => item.id)));
  const pasted = instantiateFragment(copy, project(), { uid: generator(), dx: 100, dy: 200 });
  assert.equal(pasted.nodes.length, COMPONENTS.length);
  assert.deepEqual(
    pasted.wires.map((item) => item.from.port),
    wires.map((item) => item.from.port),
  );
  assert.equal(validateProject(project(pasted.nodes, pasted.wires)).wires.length, wires.length);
  pasted.nodes.find((item) => item.type === 'rom').params.data[0] = 0;
  assert.deepEqual(rom.params.data, [5, 10, 255]);
  assert.deepEqual(copy.nodes.find((item) => item.type === 'rom').params.data, [5, 10, 255]);
});

test('held and toggle states reset without changing originals, and only conflicting target hotkeys lose their bindings', () => {
  const nodes = [
    node('a', 'hotkey', 0, 0, { binding: 'KeyA', mode: 'hold', value: 1 }),
    node('k', 'hotkey', 200, 0, { binding: 'Shift+KeyK', mode: 'toggle', value: 1 }),
  ];
  const source = project(nodes),
    copy = createFragment(source, new Set(['a', 'k']));
  assert.deepEqual(
    copy.nodes.map((item) => item.params.value),
    [0, 0],
  );
  assert.deepEqual(
    source.nodes.map((item) => item.params.value),
    [1, 1],
  );
  const target = project([
    node('existing', 'hotkey', 0, 0, { binding: 'KeyA', mode: 'inverted', value: 1 }),
  ]);
  const pasted = instantiateFragment(copy, target, { uid: generator() });
  assert.equal(pasted.clearedHotkeys, 1);
  assert.deepEqual(
    pasted.nodes.map((item) => item.params.binding),
    ['', 'Shift+KeyK'],
  );
  assert.equal(target.nodes[0].params.value, 1);
  const duplicate = instantiateFragment(copy, source, { uid: generator() });
  assert.equal(duplicate.clearedHotkeys, 2);
  const separate = instantiateFragment(copy, project(), { uid: generator() });
  assert.equal(separate.clearedHotkeys, 0);
  assert.deepEqual(
    separate.nodes.map((item) => item.params.binding),
    ['KeyA', 'Shift+KeyK'],
  );
});

test('malformed, unsafe, unknown and oversized fragments are rejected before they can become a project', () => {
  const valid = fragment([node('a')]);
  for (const value of [
    null,
    [],
    project(),
    { ...valid, kind: 'logic-lab-assignment' },
    { ...valid, version: 2 },
    { ...valid, unexpected: 'data' },
    { ...valid, nodes: [] },
  ])
    assert.throws(() => parseFragment(JSON.stringify(value)), { code: 'fragment_format' });
  for (const source of [
    '{',
    '{"kind":"logic-lab-fragment","version":1,"nodes":[],"wires":[],"__proto__":{}}',
  ])
    assert.throws(() => parseFragment(source), { code: 'fragment_format' });
  assert.throws(() => parseFragment(' '.repeat(10_000_001)), { code: 'fragment_too_large' });
  const unknown = structuredClone(valid);
  unknown.nodes[0].type = 'unknown';
  assert.throws(() => parseFragment(JSON.stringify(unknown)), { code: 'fragment_invalid' });
  const dangling = structuredClone(valid);
  dangling.wires = [wire('bad', 'a', 'missing')];
  assert.throws(() => parseFragment(JSON.stringify(dangling)), { code: 'fragment_invalid' });
  const badPort = fragment([node('a'), node('b', 'and')]);
  badPort.wires = [wire('bad', 'a', 'b')];
  badPort.wires[0].from.port = 'out7';
  assert.throws(() => serializeFragment(badPort), { code: 'fragment_invalid' });
});

test('translation moves the whole group and its routes together at coordinate boundaries', () => {
  const source = project(
    [node('a', 'switch', 999980, 10), node('b', 'and', 999990, 20)],
    [wire('route', 'a', 'b', [{ x: 999995, y: 30 }])],
  );
  const copy = createFragment(source, new Set(['a', 'b']));
  const pasted = instantiateFragment(copy, project(), { uid: generator() });
  assert.deepEqual(
    pasted.nodes.map((item) => [item.x, item.y]),
    [
      [999985, 50],
      [999995, 60],
    ],
  );
  assert.deepEqual(pasted.wires[0].points, [{ x: 1000000, y: 70 }]);
  assert.equal(pasted.nodes[1].x - pasted.nodes[0].x, 10);
  assert.throws(() => instantiateFragment(copy, project(), { uid: generator(), dx: NaN }), {
    code: 'fragment_position',
  });
  const noRoom = fragment([
    node('min', 'switch', -1000000, -1000000),
    node('max', 'switch', 1000000, 1000000),
  ]);
  assert.throws(() => instantiateFragment(noRoom, project(), { uid: generator() }), {
    code: 'fragment_position',
  });
});

function routedProject(count, withPoints = false) {
  const nodes = [
    ...Array.from({ length: 50 }, (_, index) => node(`s${index}`)),
    ...Array.from({ length: 100 }, (_, index) => node(`g${index}`, 'and')),
  ];
  const points = Array.from({ length: 100 }, (_, index) => ({ x: index, y: index % 2 }));
  const wires = Array.from({ length: count }, (_, index) =>
    wire(
      `wire${index}`,
      `s${Math.floor(index / 100)}`,
      `g${index % 100}`,
      withPoints ? points : undefined,
    ),
  );
  return project(nodes, wires);
}

test('large valid routed fragments compute bounds iteratively instead of spreading 140000 points into function arguments', () => {
  const source = routedProject(1400, true),
    copy = createFragment(source, new Set(source.nodes.map((item) => item.id)));
  const pasted = instantiateFragment(copy, project(), { uid: generator() });
  assert.equal(pasted.wires.length, 1400);
  assert.deepEqual(pasted.wires.at(-1).points.at(-1), { x: 139, y: 41 });
  assert.deepEqual(source.wires.at(-1).points.at(-1), { x: 99, y: 1 });
});

test('combined project limits and broken ID generators reject insertion without mutating either input', () => {
  const copy = fragment([node('copy')]);
  const target = project(Array.from({ length: 1000 }, (_, index) => node(`existing_${index}`)));
  const before = structuredClone(target);
  assert.throws(() => instantiateFragment(copy, target, { uid: generator() }), {
    code: 'fragment_limits',
  });
  assert.deepEqual(target, before);
  const connected = createFragment(
    project([node('a'), node('b', 'and')], [wire('inside', 'a', 'b')]),
    new Set(['a', 'b']),
  );
  assert.throws(() => instantiateFragment(connected, routedProject(5000), { uid: generator() }), {
    code: 'fragment_limits',
  });
  assert.throws(() => instantiateFragment(copy, project(), { uid: () => 'copy' }), {
    code: 'fragment_ids',
  });
  assert.throws(() => instantiateFragment(copy, project(), { uid: () => '__proto__' }), {
    code: 'fragment_ids',
  });
  assert.throws(
    () =>
      instantiateFragment(copy, project(), {
        uid: () => {
          throw new Error('Random unavailable');
        },
      }),
    FragmentError,
  );
  let attempts = 0;
  const pasted = instantiateFragment(copy, project(), {
    uid: (prefix) => (++attempts === 1 ? 'copy' : `${prefix}_fresh`),
  });
  assert.equal(pasted.nodes[0].id, 'n_fresh');
  assert.equal(copy.nodes[0].id, 'copy');
});

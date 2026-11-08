import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import {
  STORAGE_KEY,
  validateProject,
  parseProject,
  serializeProject,
  loadProject,
  saveProject,
} from '../src/project.js';
import { EXAMPLES, createExample } from '../examples/index.js';

function fixture() {
  return {
    version: 1,
    name: 'Truth table',
    nodes: [
      { id: 'source', type: 'switch', x: 0, y: 0, label: 'A', enabled: true, params: { value: 1 } },
      { id: 'gate', type: 'and', x: 240, y: 0, label: 'AND', enabled: true, params: {} },
    ],
    wires: [
      {
        id: 'wire-1',
        from: { node: 'source', port: getDefinition('switch').outputs[0].id },
        to: { node: 'gate', port: getDefinition('and').inputs[0].id },
        width: 1,
      },
    ],
  };
}

test('JSON round trip preserves routes, viewport, and circuit state', () => {
  const project = fixture();
  project.wireStyle = 'bezier';
  project.exampleId = 'half-adder';
  project.viewport = { x: -40, y: 100, zoom: 1.25 };
  project.wires[0].points = [
    { x: 100, y: 60 },
    { x: 100, y: 100 },
  ];
  assert.deepEqual(parseProject(serializeProject(project)), project);
});

test('projects preserve the complete navigation zoom range', () => {
  for (const zoom of [0.01, 0.1, 1, 4]) {
    const project = fixture();
    project.viewport = { x: -100, y: 80, zoom };
    assert.deepEqual(parseProject(serializeProject(project)).viewport, project.viewport);
  }
  for (const zoom of [0.009, 4.001]) {
    assert.throws(() => validateProject({ ...fixture(), viewport: { x: 0, y: 0, zoom } }));
  }
});

test('validation rejects unsafe, malformed, and oversized imports', () => {
  assert.throws(() => parseProject('{ broken'), /valid JSON/);
  assert.throws(() => parseProject(' '.repeat(5_000_001)), /too large/);
  for (const [mutate, pattern] of [
    [
      (p) => {
        p.version = 2;
      },
      /version/,
    ],
    [
      (p) => {
        p.nodes[0].id = '__proto__';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].id = 'toString';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].id = 'hasOwnProperty';
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes[0].x = Infinity;
      },
      /finite number/,
    ],
    [
      (p) => {
        p.nodes.push({ ...p.nodes[0] });
      },
      /Duplicate component/,
    ],
    [
      (p) => {
        p.nodes[0].type = 'unknown';
      },
      /Unknown component/,
    ],
    [
      (p) => {
        p.nodes[0].params = { nested: { value: 1 } };
      },
      /only finite/,
    ],
    [
      (p) => {
        p.nodes[0].params = JSON.parse('{"__proto__": 1}');
      },
      /unsupported characters/,
    ],
    [
      (p) => {
        p.nodes = Array(1001).fill(p.nodes[0]);
      },
      /at most 1000/,
    ],
    [
      (p) => {
        p.viewport = { x: 0, y: 0, zoom: 0 };
      },
      /between/,
    ],
    [
      (p) => {
        p.exampleId = '../half-adder';
      },
      /Example ID/,
    ],
    [
      (p) => {
        p.exampleId = '__proto__';
      },
      /Example ID/,
    ],
    [
      (p) => {
        p.exampleId = 42;
      },
      /Example ID/,
    ],
  ]) {
    const project = fixture();
    mutate(project);
    assert.throws(() => validateProject(project), pattern);
  }
});

test('component parameter types reject malformed controls and preserve valid ROM data', () => {
  for (const [type, params, pattern] of [
    ['pwm', { duty: '" onfocus="alert(1)' }, /duty must be a finite number/],
    ['clock', { frequency: '10' }, /frequency must be a finite number/],
    ['note', { text: ['unexpected', 'array'] }, /text must be text/],
    ['note', { color: '#aabbcc;background:url(https://example.com)' }, /hexadecimal color/],
    ['rom', { data: [0, 'not a byte'] }, /array of finite numbers/],
  ]) {
    const project = fixture();
    project.nodes = [{ ...project.nodes[0], type, params }];
    project.wires = [];
    assert.throws(() => validateProject(project), pattern);
  }
  const project = fixture();
  project.nodes = [{ ...project.nodes[0], type: 'rom', params: { data: [0, 1, 255] } }];
  project.wires = [];
  assert.deepEqual(parseProject(serializeProject(project)), project);
});

test('export never produces a project too large for its own importer', () => {
  const project = fixture();
  project.nodes = Array.from({ length: 310 }, (_, index) => ({
    id: `note-${index}`,
    type: 'note',
    x: 0,
    y: 0,
    label: '',
    enabled: true,
    params: { text: 'A'.repeat(16384) },
  }));
  project.wires = [];
  assert.throws(() => serializeProject(project), /too large/);
  project.nodes = project.nodes
    .slice(0, 250)
    .map((node) => ({ ...node, params: { text: '界'.repeat(16384) } }));
  assert.ok(JSON.stringify(project).length < 5_000_000);
  assert.throws(
    () => serializeProject(project),
    /too large/,
    'UTF-8 files also respect the upload byte limit',
  );
});

test('validation catches invalid connections and preserves multiple drivers', () => {
  for (const [mutate, pattern] of [
    [
      (p) => {
        p.wires[0].from.node = 'missing';
      },
      /missing component/,
    ],
    [
      (p) => {
        p.wires[0].from.port = 'missing';
      },
      /Unknown output/,
    ],
    [
      (p) => {
        p.wires[0].to.port = getDefinition('and').outputs[0].id;
      },
      /Unknown input/,
    ],
    [
      (p) => {
        p.wires[0].width = 8;
      },
      /width must match/,
    ],
    [
      (p) => {
        p.wires.push({ ...p.wires[0], id: 'wire-2' });
      },
      /duplicates an existing/,
    ],
    [
      (p) => {
        p.wires.push({ ...p.wires[0] });
      },
      /Duplicate wire/,
    ],
  ]) {
    const project = fixture();
    mutate(project);
    assert.throws(() => validateProject(project), pattern);
  }
  const project = fixture();
  project.nodes.push({ ...project.nodes[0], id: 'source-2' });
  project.wires.push({
    ...project.wires[0],
    id: 'wire-2',
    from: { ...project.wires[0].from, node: 'source-2' },
  });
  assert.equal(validateProject(project).wires.length, 2);
});

test('counter bits connect directly to scalar pins and packed group endpoints are rejected', () => {
  const project = fixture();
  project.nodes[0].type = 'counter';
  project.wires[0].from.port = 'out7';
  assert.equal(validateProject(project).wires[0].width, 1);
  project.wires[0].from.port = 'out';
  assert.throws(() => validateProject(project), /Unknown output port/);
});

test('analog pins reject digital mismatches but scopes accept either signal type', () => {
  const project = fixture();
  project.nodes[0].type = 'dac';
  project.wires[0].from.port = getDefinition('dac').outputs[0].id;
  assert.throws(() => validateProject(project), /analog and digital/);
  project.nodes[1].type = 'scope';
  project.wires[0].to.port = getDefinition('scope').inputs[0].id;
  assert.equal(validateProject(project).wires.length, 1);
  project.nodes[0].type = 'counter';
  project.wires[0].from.port = getDefinition('counter').outputs[0].id;
  assert.equal(validateProject(project).wires[0].width, 1);
  project.wires[0].width = 8;
  assert.throws(() => validateProject(project), /single signal line/);
});

test('independently routed byte lines survive export without merging contacts or routes', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'dac';
  project.wires = Array.from({ length: 8 }, (_, bit) => ({
    id: `data-${bit}`,
    from: { node: 'source', port: `out${bit}` },
    to: { node: 'gate', port: `in${bit}` },
    width: 1,
    points: [{ x: 180 + bit * 20, y: 100 + bit * 25 }],
  }));
  assert.deepEqual(parseProject(serializeProject(project)), project);
  project.wires[3].to.port = 'in';
  assert.throws(() => validateProject(project), /Unknown input port/);
});

test('import expands saved grouped connections once and preserves node values and routing', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[0].params.value = 173;
  project.nodes[1].type = 'dac';
  project.wires[0] = {
    id: 'byte-route',
    from: { node: 'source', port: 'out' },
    to: { node: 'gate', port: 'in' },
    width: 8,
    points: [{ x: 200, y: 160 }],
  };
  const restored = parseProject(JSON.stringify(project));
  assert.deepEqual(restored.nodes, project.nodes);
  assert.equal(restored.wires.length, 8);
  for (const [bit, wire] of restored.wires.entries()) {
    assert.deepEqual(wire.from, { node: 'source', port: `out${bit}` });
    assert.deepEqual(wire.to, { node: 'gate', port: `in${bit}` });
    assert.equal(wire.width, 1);
    assert.deepEqual(wire.points, project.wires[0].points);
  }
  assert.deepEqual(validateProject(restored), restored);
  assert.deepEqual(parseProject(serializeProject(restored)), restored);
  assert.throws(() => validateProject(project), /Unknown output port/);
});

test('saved grouped scope connections become a single bit trace without a packed contact', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'scope';
  project.wires[0].from.port = 'nibble';
  project.wires[0].to.port = 'in';
  project.wires[0].width = 4;
  const restored = parseProject(JSON.stringify(project));
  assert.equal(restored.wires.length, 1);
  assert.equal(restored.wires[0].from.port, 'nibble0');
  assert.equal(restored.wires[0].to.port, 'in');
  assert.equal(restored.wires[0].width, 1);
});

test('grouped import conversion does not hide invalid widths, types, or duplicate wire IDs', () => {
  const saved = fixture();
  saved.nodes[0].type = 'bus_input';
  saved.nodes[1].type = 'dac';
  saved.wires[0].from.port = 'out';
  saved.wires[0].to.port = 'in';
  saved.wires[0].width = 8;
  for (const [mutate, pattern] of [
    [
      (project) => {
        project.wires[0].width = 4;
      },
      /width must match/,
    ],
    [
      (project) => {
        project.nodes[1].type = 'adc';
      },
      /analog and digital/,
    ],
    [
      (project) => {
        project.nodes[1].type = 'decoder';
      },
      /different bit widths/,
    ],
    [
      (project) => {
        project.wires.push(structuredClone(project.wires[0]));
      },
      /Duplicate wire ID/,
    ],
    [
      (project) => {
        project.wires[0].id = 'constructor';
      },
      /unsupported characters/,
    ],
    [
      (project) => {
        project.wires[0].points = [{ x: Infinity, y: 0 }];
      },
      /finite number/,
    ],
  ]) {
    const project = structuredClone(saved);
    mutate(project);
    assert.throws(() => parseProject(JSON.stringify(project)), pattern);
  }
});

test('expanded import IDs stay within limits and cannot collide with saved scalar wires', () => {
  const project = fixture();
  project.nodes[0].type = 'bus_input';
  project.nodes[1].type = 'dac';
  project.nodes.push(
    { ...fixture().nodes[0], id: 'scalar' },
    { ...fixture().nodes[1], id: 'sink' },
  );
  project.wires[0] = {
    id: 'byte',
    from: { node: 'source', port: 'out' },
    to: { node: 'gate', port: 'in' },
    width: 8,
  };
  project.wires.push({
    id: 'byte-b0',
    from: { node: 'scalar', port: 'out' },
    to: { node: 'sink', port: 'a' },
    width: 1,
  });
  let restored = parseProject(JSON.stringify(project));
  assert.equal(new Set(restored.wires.map((wire) => wire.id)).size, 9);
  assert.equal(restored.wires.at(-1).id, 'byte-b0');
  project.wires[0].id = 'long'.repeat(25);
  restored = parseProject(JSON.stringify(project));
  assert.ok(restored.wires.every((wire) => wire.id.length <= 100));
});

test('every bundled example is valid and survives project serialization', () => {
  for (const example of EXAMPLES) {
    const project = createExample(example.id);
    assert.equal(
      project.exampleId,
      example.id,
      'Example factories retain their lesson association',
    );
    assert.deepEqual(parseProject(serializeProject(project)), project, example.id);
  }
});

test('local storage handles normal writes, corrupt data, and denied access', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
      },
    });
    assert.equal(loadProject(), null);
    assert.equal(saveProject(fixture()), true);
    assert.deepEqual(loadProject(), fixture());
    const previous = data.get(STORAGE_KEY);
    assert.equal(saveProject({ ...fixture(), version: 999 }), false);
    assert.equal(
      data.get(STORAGE_KEY),
      previous,
      'An invalid save does not replace the last valid project',
    );
    data.set(STORAGE_KEY, '{ broken');
    assert.equal(loadProject(), null);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage denied');
      },
    });
    assert.equal(loadProject(), null);
    assert.equal(saveProject(fixture()), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

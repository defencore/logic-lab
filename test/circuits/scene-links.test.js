import test from 'node:test';
import assert from 'node:assert/strict';
import {
  linkedCircuitPath,
  relatedSceneSources,
  sceneContactFor,
} from '../../src/circuits/scene-links.js';
import { scenePanelMarkup } from '../../src/workbench/scene-panel.js';
import { TEXT } from '../../src/locales/index.js';

function circuit() {
  const node = (id, type) => ({ id, type, params: {}, x: 0, y: 0 });
  const wire = (id, from, output, to, input) => ({
    id,
    from: { node: from, port: output },
    to: { node: to, port: input },
  });
  return {
    nodes: [
      node('tank', 'water_tank'),
      node('other', 'water_tank'),
      node('gate', 'and'),
      node('source', 'switch'),
      node('permission', 'hotkey'),
      node('unrelated', 'switch'),
      node('memory', 'sr_latch'),
    ],
    wires: [
      wire('request', 'source', 'out', 'gate', 'a'),
      wire('allow', 'permission', 'out', 'gate', 'b'),
      wire('pump', 'gate', 'out', 'tank', 'pump'),
      wire('foreign', 'unrelated', 'out', 'other', 'pump'),
      wire('sense', 'tank', 'low', 'memory', 's'),
      wire('feedback', 'memory', 'q', 'gate', 'a'),
    ],
  };
}
const entry = { id: 'tank', nodeId: 'tank', nodeIds: ['tank'], type: 'water_tank' };

test('scene sources and structural paths follow the selected plant without including another copied installation', () => {
  const project = circuit(),
    before = structuredClone(project);
  assert.deepEqual(
    relatedSceneSources(project, entry).map((node) => node.id),
    ['source', 'permission'],
  );
  const path = linkedCircuitPath(project, { node: 'tank', port: 'pump', side: 'in' });
  assert.deepEqual(new Set(path.wires), new Set(['request', 'allow', 'pump', 'sense', 'feedback']));
  assert.equal(path.nodes.includes('other'), false);
  assert.deepEqual(project, before);
});

test('a source pin maps to the actual scene command, while feedback and disconnected contacts stay distinct', () => {
  const project = circuit();
  assert.deepEqual(sceneContactFor(project, entry, { node: 'source', port: 'out', side: 'out' }), {
    node: 'tank',
    port: 'pump',
    side: 'in',
  });
  assert.deepEqual(sceneContactFor(project, entry, { node: 'tank', port: 'low', side: 'out' }), {
    node: 'tank',
    port: 'low',
    side: 'out',
  });
  assert.equal(
    sceneContactFor(project, entry, { node: 'unrelated', port: 'out', side: 'out' }),
    null,
  );
  assert.equal(
    sceneContactFor(project, entry, { node: 'tank', port: 'missing', side: 'out' }),
    null,
  );
  assert.deepEqual(linkedCircuitPath(project, { node: 'missing', port: 'out', side: 'out' }), {
    nodes: [],
    wires: [],
  });
});

test('the dock exposes keyboard-accessible command/sensor links and only related source controls in both languages', () => {
  const state = { project: circuit() };
  for (const lang of ['en', 'ua']) {
    const html = scenePanelMarkup(
      state,
      [entry],
      entry,
      (key) => TEXT[lang][key] || key,
      (definition) => definition.label,
    );
    assert.match(html, /data-scene-node="tank" data-scene-contact="pump" data-scene-side="in"/);
    assert.match(html, /data-scene-contact="low" data-scene-side="out"/);
    assert.match(html, /data-motion-switch="source"/);
    assert.doesNotMatch(html, /data-motion-switch="unrelated"/);
    assert.match(html, /id="motion-stage"/);
    assert.match(html, /id="scene-close"/);
    assert.doesNotMatch(html, /aria-modal="true"/);
    assert.match(html, /data-scene-contact="pump"[^>]+aria-pressed="false"/);
  }
});

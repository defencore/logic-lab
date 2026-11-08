import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { assertModuleSize, assertDomainDependency } from '../../scripts/architecture.mjs';
import { assertAcyclic, moduleReferences, styleReferences } from '../../scripts/module-graph.mjs';

test('module budgets reject huge files by lines and bytes independently', () => {
  assert.doesNotThrow(() => assertModuleSize('line\n'.repeat(350), 'module.js'));
  assert.throws(() => assertModuleSize('line\n'.repeat(351), 'module.js'), /exceeds/);
  assert.throws(() => assertModuleSize('x'.repeat(24 * 1024 + 1), 'module.js'), /exceeds/);
});

test('dependency inspection includes reexports and lazy views but ignores prose', () => {
  assert.deepEqual(
    moduleReferences(`
    import { value } from './data.js';
    export { value } from './public.js';
    export * from './types.js';
    const prose = "import('./unrelated.js')";
    const view = () => import('./scene.js');
  `),
    ['./data.js', './public.js', './types.js', './scene.js'],
  );
});

test('cycle checks distinguish shared dependencies from actual circular imports', () => {
  const a = resolve('a.js'),
    b = resolve('b.js'),
    c = resolve('c.js');
  assert.doesNotThrow(() =>
    assertAcyclic(
      new Map([
        [a, [b, c]],
        [b, [c]],
        [c, []],
      ]),
      process.cwd(),
    ),
  );
  assert.throws(
    () =>
      assertAcyclic(
        new Map([
          [a, [b]],
          [b, [c]],
          [c, [a]],
        ]),
        process.cwd(),
      ),
    /a.js → b.js → c.js → a.js/,
  );
});

test('simulation and assessment cannot acquire UI dependencies', () => {
  for (const from of [
    'simulation/models.js',
    'assessment/replay.js',
    'scenes/models/automation/aquarium.js',
  ]) {
    assert.throws(() => assertDomainDependency(from, 'workbench/dialogs.js'), /must not depend/);
    assert.throws(
      () => assertDomainDependency(from, 'scenes/views/automation/index.js'),
      /must not depend/,
    );
    assert.doesNotThrow(() => assertDomainDependency(from, 'components/catalog/index.js'));
  }
  assert.doesNotThrow(() => assertDomainDependency('workbench/board.js', 'simulation/index.js'));
});

test('CSS dependency inspection accepts URL imports and skips commented examples', () => {
  assert.deepEqual(
    styleReferences(`
    /* @import './comment.css'; */
    @import './plain.css';
    @import url("./quoted.css") screen;
    @import url(./unquoted.css);
    @import "./file with spaces.css";
  `),
    ['./plain.css', './quoted.css', './unquoted.css', './file with spaces.css'],
  );
});

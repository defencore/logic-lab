import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { buildOptions, renderBuiltHtml, cleanOutput } from '../scripts/site.mjs';

const source =
  '<link rel="stylesheet" href="./style.css"><script type="module" src="./src/app.js"></script>';

test('generated HTML references actual hashed entry and CSS outputs and updates after content changes', async (t) => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'logic-lab-site-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'src'));
  await writeFile(
    join(directory, 'src/app.js'),
    'import "../style.css"; console.log("initial"); export const lazy = () => import("./lazy.js");',
  );
  await writeFile(join(directory, 'src/lazy.js'), 'export const value = 1;');
  await writeFile(join(directory, 'style.css'), 'body { color: red }');
  const options = {
    ...buildOptions(),
    absWorkingDir: directory,
    plugins: [],
    write: false,
    logLevel: 'silent',
  };
  const compile = async () => {
    const result = await build(options);
    const html = renderBuiltHtml(source, result.metafile, {
      workingDirectory: directory,
      outputDirectory: join(directory, 'dist'),
    });
    const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(urls.length, 2);
    for (const url of urls) {
      assert.match(url, /^\.\/assets\/app-[A-Z0-9]+\.(?:js|css)$/);
      assert.ok(
        result.outputFiles.some(({ path }) => path === resolve(directory, 'dist', url)),
        `Missing emitted asset: ${url}`,
      );
    }
    assert.ok(Object.keys(result.metafile.outputs).some((path) => path.includes('/chunks/')));
    assert.ok(!html.includes('./src/app.js') && !html.includes('./style.css'));
    return urls;
  };
  const original = await compile();
  await writeFile(
    join(directory, 'src/app.js'),
    'import "../style.css"; console.log("updated"); export const lazy = () => import("./lazy.js");',
  );
  await writeFile(join(directory, 'style.css'), 'body { color: blue }');
  const updated = await compile();
  assert.notEqual(updated[0], original[0], 'A stylesheet update must change its public URL.');
  assert.notEqual(updated[1], original[1], 'An application update must change its public URL.');
  await writeFile(join(directory, 'src/lazy.js'), 'export const value = 2;');
  const lazyUpdated = await compile();
  assert.notEqual(
    lazyUpdated[1],
    updated[1],
    'A changed lazy chunk must update the entry URL that imports it.',
  );
});

test('HTML generation rejects incomplete entry metadata instead of emitting broken asset URLs', () => {
  assert.throws(() => renderBuiltHtml(source, { outputs: {} }), /missing from the build/);
  assert.throws(
    () =>
      renderBuiltHtml(source, {
        outputs: { 'dist/assets/app-A.js': { entryPoint: 'src/app.js' } },
      }),
    /CSS bundle/,
  );
  assert.throws(
    () => renderBuiltHtml('<script src="other.js"></script>', { outputs: {} }),
    /HTML application/,
  );
});

test('preview builds emit complete asset URLs in their own directory without changing release paths', async (t) => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'logic-lab-preview-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'src'));
  await writeFile(join(directory, 'src/app.js'), 'import "../style.css"; export const value=1;');
  await writeFile(join(directory, 'style.css'), 'body { color: green }');
  const preview = buildOptions({ outputDirectory: '.cache/preview' });
  const result = await build({
    ...preview,
    absWorkingDir: directory,
    plugins: [],
    write: false,
    logLevel: 'silent',
  });
  const html = renderBuiltHtml(source, result.metafile, {
    workingDirectory: directory,
    outputDirectory: join(directory, '.cache/preview'),
  });
  for (const match of html.matchAll(/(?:href|src)="([^\"]+)"/g))
    assert.ok(
      result.outputFiles.some(
        (file) => file.path === resolve(directory, '.cache/preview', match[1]),
      ),
    );
  assert.ok(
    result.outputFiles.every((file) => file.path.startsWith(join(directory, '.cache/preview'))),
  );
  assert.equal(buildOptions().outdir, 'dist/assets');
});

test('build cleanup rejects source, repository and unrelated directories before touching files', async () => {
  for (const directory of ['.', '..', 'src', '.git', '/private/tmp'])
    await assert.rejects(cleanOutput(directory), /build directories/);
});

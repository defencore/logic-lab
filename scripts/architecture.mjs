import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { sourceFiles, createModuleGraph, assertAcyclic } from './module-graph.mjs';

export const MODULE_LIMITS = Object.freeze({ lines: 350, bytes: 24 * 1024 });
const presentation = /^(application|workbench|classroom|locales|styles|shared)\//;
const pureDomain =
  /^(simulation|assessment|circuits|experiments|components\/catalog|scenes\/models|scenes\/transport)\//;

export function assertModuleSize(source, name, limits = MODULE_LIMITS) {
  const lines = source.split('\n').length - Number(source.endsWith('\n'));
  const bytes = Buffer.byteLength(source);
  if (lines > limits.lines || bytes > limits.bytes)
    throw new Error(
      `${name}: ${lines} lines / ${bytes} bytes exceeds ${limits.lines} lines / ${limits.bytes} bytes`,
    );
  return { lines, bytes };
}

export function assertDomainDependency(from, to) {
  if (!pureDomain.test(from)) return;
  if (presentation.test(to) || /^learning\/views\//.test(to) || /^scenes\/views\//.test(to))
    throw new Error(`Domain module ${from} must not depend on presentation module ${to}`);
}

export function checkArchitecture(root = process.cwd()) {
  const files = ['src', 'test', 'scripts', 'examples'].flatMap((directory) =>
    sourceFiles(resolve(root, directory)),
  );
  files.push(resolve(root, 'style.css'));
  let largest = { lines: 0 };
  for (const file of files) {
    const name = relative(root, file);
    const size = assertModuleSize(readFileSync(file, 'utf8'), name);
    if (size.lines > largest.lines) largest = { name, ...size };
    if (/^src\/[^/]+\.(js|css)$/.test(name) && name !== 'src/app.js')
      throw new Error(
        `${name} belongs in its feature directory; src/app.js is the only root source entry.`,
      );
  }
  const graph = createModuleGraph(files, root);
  assertAcyclic(graph, root);
  const srcRoot = resolve(root, 'src');
  for (const [file, dependencies] of graph) {
    if (!file.startsWith(srcRoot + '/')) continue;
    for (const target of dependencies)
      assertDomainDependency(relative(srcRoot, file), relative(srcRoot, target));
  }
  return { modules: files.length, largest, limits: MODULE_LIMITS };
}

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { parsers } from 'prettier/plugins/babel';
import { parsers as cssParsers } from 'prettier/plugins/postcss';

export function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(m?js|css)$/.test(path) ? [path] : [];
  });
}

export function moduleReferences(source) {
  const references = [];
  const ast = parsers.babel.parse(source);
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (
      ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
    ) {
      if (node.source) references.push(node.source.value);
    } else if (node.type === 'ImportExpression' && node.source.type === 'StringLiteral') {
      references.push(node.source.value);
    } else if (node.type === 'CallExpression' && node.callee.type === 'Import') {
      if (node.arguments[0]?.type === 'StringLiteral') references.push(node.arguments[0].value);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(ast.program);
  return references;
}

export function styleReferences(source) {
  return cssParsers.css
    .parse(source)
    .nodes.filter((node) => node.type === 'css-atrule' && node.name.toLowerCase() === 'import')
    .map((node) => {
      const match = node.params.text.match(/^(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s)]+))/i);
      return match?.[1] ?? match?.[2] ?? match?.[3];
    })
    .filter(Boolean);
}

export function createModuleGraph(files, root) {
  const graph = new Map();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const references = file.endsWith('.css') ? styleReferences(source) : moduleReferences(source);
    const dependencies = references
      .filter((path) => path.startsWith('.'))
      .map((path) => {
        const target = resolve(dirname(file), path);
        if (!existsSync(target)) throw new Error(`${relative(root, file)} imports missing ${path}`);
        return target;
      });
    graph.set(file, dependencies);
  }
  return graph;
}

export function assertAcyclic(graph, root) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  function visit(file) {
    if (active.has(file)) {
      const cycle = [...stack.slice(stack.indexOf(file)), file].map((path) => relative(root, path));
      throw new Error(`Circular dependency: ${cycle.join(' → ')}`);
    }
    if (visited.has(file)) return;
    active.add(file);
    stack.push(file);
    for (const target of graph.get(file) || []) visit(target);
    stack.pop();
    active.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
}

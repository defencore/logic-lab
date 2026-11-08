import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function discoverTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return discoverTests(path);
      return entry.isFile() && entry.name.endsWith('.test.js') ? [path] : [];
    }),
  );
  return files.flat().sort();
}

const tests = await discoverTests(join(projectRoot, 'test'));
if (!tests.length) throw new Error('No test suites found.');

const runner = spawn(process.execPath, ['--test', ...process.argv.slice(2), ...tests], {
  cwd: projectRoot,
  stdio: 'inherit',
});
runner.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
runner.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) inspect(path);
    else if (/\.(m?js)$/.test(entry.name))
      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    else if (entry.name.endsWith('.json')) JSON.parse(readFileSync(path, 'utf8'));
  }
}
for (const directory of ['src', 'scripts', 'test', 'examples']) inspect(directory);
console.log('All JavaScript and laboratory JSON files passed syntax checks.');

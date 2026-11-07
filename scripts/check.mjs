import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const directory of ['src', 'scripts', 'test']) {
  for (const file of readdirSync(directory).filter((name) => /\.(m?js)$/.test(name))) {
    execFileSync(process.execPath, ['--check', `${directory}/${file}`], { stdio: 'inherit' });
  }
}
console.log('All JavaScript files passed syntax checks.');

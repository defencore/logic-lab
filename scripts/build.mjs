import { cp, mkdir, rm, stat } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of ['index.html', 'style.css', 'favicon.svg', 'CNAME', '.nojekyll', 'src']) {
  await stat(new URL(file, root));
  await cp(new URL(file, root), new URL(file, destination), { recursive: true });
}
console.log('Built static application in dist/');

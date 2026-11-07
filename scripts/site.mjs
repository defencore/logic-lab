import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = new URL('../dist/', import.meta.url);

export async function cleanOutput() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
}

export async function copyPublicFiles() {
  for (const file of ['favicon.svg', 'CNAME', '.nojekyll', 'examples']) {
    await cp(new URL(`../${file}`, import.meta.url), new URL(file, output), { recursive: true });
  }
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  if (!source.includes('./src/app.js')) throw new Error('The HTML application entry is missing.');
  await writeFile(
    new URL('index.html', output),
    source.replace('./src/app.js', './assets/app.js').replace('./style.css', './assets/app.css'),
  );
}

export function buildOptions() {
  return {
    absWorkingDir: root,
    entryPoints: ['src/app.js'],
    outdir: 'dist/assets',
    entryNames: 'app',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2022'],
    minify: true,
    legalComments: 'eof',
    logLevel: 'info',
    plugins: [
      {
        name: 'public-files',
        setup(build) {
          build.onEnd(async (result) => {
            if (!result.errors.length) await copyPublicFiles();
          });
        },
      },
    ],
  };
}

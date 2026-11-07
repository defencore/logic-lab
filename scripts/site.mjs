import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = new URL('../dist/', import.meta.url);

export async function cleanOutput() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
}

export function renderBuiltHtml(
  source,
  metafile,
  { workingDirectory = root, outputDirectory = fileURLToPath(output) } = {},
) {
  if (!source.includes('./src/app.js') || !source.includes('./style.css'))
    throw new Error('The HTML application script or stylesheet entry is missing.');
  const entry = Object.entries(metafile?.outputs || {}).find(
    ([, information]) =>
      information.entryPoint &&
      resolve(workingDirectory, information.entryPoint) === resolve(workingDirectory, 'src/app.js'),
  );
  if (!entry || !entry[1].cssBundle || !metafile.outputs[entry[1].cssBundle])
    throw new Error(
      'The application JavaScript entry or its CSS bundle is missing from the build.',
    );
  const publicUrl = (path) =>
    `./${relative(outputDirectory, resolve(workingDirectory, path)).split(sep).join('/')}`;
  return source
    .replaceAll('./src/app.js', publicUrl(entry[0]))
    .replaceAll('./style.css', publicUrl(entry[1].cssBundle));
}

export async function copyPublicFiles(metafile) {
  for (const file of ['favicon.svg', 'CNAME', '.nojekyll', 'examples']) {
    await cp(new URL(`../${file}`, import.meta.url), new URL(file, output), { recursive: true });
  }
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  await writeFile(new URL('index.html', output), renderBuiltHtml(source, metafile));
}

export function buildOptions() {
  return {
    absWorkingDir: root,
    entryPoints: ['src/app.js'],
    outdir: 'dist/assets',
    entryNames: 'app-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2022'],
    minify: true,
    metafile: true,
    legalComments: 'eof',
    logLevel: 'info',
    plugins: [
      {
        name: 'public-files',
        setup(build) {
          build.onEnd(async (result) => {
            if (!result.errors.length) await copyPublicFiles(result.metafile);
          });
        },
      },
    ],
  };
}

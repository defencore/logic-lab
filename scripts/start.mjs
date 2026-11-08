import { context } from 'esbuild';
import { buildOptions, cleanOutput } from './site.mjs';
const argument = process.argv.find((value) => value.startsWith('--port='));
const port = argument ? Number(argument.slice(7)) : 4173;
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Choose a port between 1024 and 65535.');
const previewDirectory = `.cache/preview-${port}`;
await cleanOutput(previewDirectory);
const build = await context(buildOptions({ outputDirectory: previewDirectory }));
await build.watch();
await build.serve({ servedir: previewDirectory, host: '127.0.0.1', port });
console.log(`Logic Lab: http://127.0.0.1:${port}/`);
async function stop() {
  await build.dispose();
  process.exit(0);
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

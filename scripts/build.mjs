import { build } from 'esbuild';
import { buildOptions, cleanOutput } from './site.mjs';
await cleanOutput();
await build(buildOptions());
console.log('Built browser application and laboratory catalog in dist/');

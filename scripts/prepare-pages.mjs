import { cp, rm, writeFile } from 'node:fs/promises';

// GitHub Pages branch publishing supports /docs, but not /dist.
const output = new URL('../docs/', import.meta.url);
await rm(output, { recursive: true, force: true });
await cp(new URL('../dist/', import.meta.url), output, { recursive: true });
await writeFile(new URL('.nojekyll', output), '');

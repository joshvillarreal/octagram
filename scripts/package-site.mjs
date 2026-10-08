import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, '.openai/hosting.json'), 'utf8'));
if (manifest.static?.directory !== 'dist' || !existsSync(path.join(root, 'dist/index.html'))) {
  throw new Error('Build the static site before packaging: npm run build');
}
function checkTree(directory) {
  for (const name of readdirSync(directory)) {
    const entry = path.join(directory, name);
    const info = lstatSync(entry);
    if (info.isSymbolicLink()) throw new Error('Deployment output must not contain symbolic links.');
    if (info.isDirectory()) checkTree(entry);
    else if (!info.isFile()) throw new Error('Deployment output must contain only regular files.');
  }
}
checkTree(path.join(root, 'dist'));
mkdirSync(path.join(root, 'releases'), { recursive: true });
const archive = path.join(root, 'releases/octagram-site.tar.gz');
const result = spawnSync('tar', ['-czf', archive, '-C', root, '.openai/hosting.json', 'dist'], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Unable to package the production bundle.');
console.log(JSON.stringify({ archive, bytes: statSync(archive).size }));

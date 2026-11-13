import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'server/src');
let checked = 0;

function traverse(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) traverse(file);
    else if (entry.name.endsWith('.js')) {
      execFileSync(process.execPath, ['--check', file]);
      checked += 1;
    }
  }
}

traverse(src);
execFileSync(process.execPath, ['--check', path.join(root, 'scripts/seed.mjs')]);
// Vite installs esbuild. When dependencies are installed, validate all JSX too.
try {
  const { transformSync } = await import('esbuild');
  let jsxCount = 0;
  function checkFrontend(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) checkFrontend(filename);
      else if (/\.(js|jsx)$/.test(filename)) {
        const source = fs.readFileSync(filename, 'utf8');
        transformSync(source, { loader: entry.name.endsWith('.jsx') ? 'jsx' : 'js', sourcefile: filename });
        jsxCount += 1;
      }
    }
  }
  checkFrontend(path.join(root, 'client/src'));
  console.log(`Correcto: ${checked} módulos de la API, seed y ${jsxCount} archivos frontend.`);
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.log(`Correcto: ${checked} módulos de la API y seed. Instala npm para revisar también JSX.`);
}

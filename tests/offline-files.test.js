// Checks the service worker's list of files to save for offline use.
// A file missing from the list is the usual way offline mode breaks.

import { test, assert } from './test-runner.js';

const root = new URL('../', import.meta.url);

async function readText(path) {
  const response = await fetch(new URL(path, root), { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} could not be loaded (${response.status})`);
  return response.text();
}

async function listedFiles() {
  const source = await readText('sw.js');
  const block = source.split('// APP_FILES START')[1]?.split('// APP_FILES END')[0];
  if (!block) throw new Error('APP_FILES markers not found in sw.js');
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
}

// Follows every import, starting from app.js, and returns all module paths.
async function importedModules() {
  const found = new Set();
  const queue = ['app.js'];
  while (queue.length) {
    const path = queue.shift();
    if (found.has(path)) continue;
    found.add(path);
    const source = await readText(path);
    for (const match of source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const target = new URL(match[1] || match[2], new URL(path, root));
      queue.push(target.pathname.slice(root.pathname.length));
    }
  }
  return [...found];
}

test('offline: every listed file exists', async () => {
  for (const file of await listedFiles()) {
    const response = await fetch(new URL(file, root), { cache: 'no-store' });
    assert(response.ok, `${file} is listed in sw.js but could not be loaded`);
  }
});

test('offline: every JavaScript file the app imports is listed', async () => {
  const listed = new Set(await listedFiles());
  for (const module of await importedModules()) {
    assert(listed.has(module), `${module} is used by the app but missing from APP_FILES in sw.js`);
  }
});

test('offline: every file index.html and the manifest link to is listed', async () => {
  const listed = new Set(await listedFiles());
  const html = await readText('index.html');
  const linked = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]);
  const manifest = JSON.parse(await readText('manifest.webmanifest'));
  const icons = manifest.icons.map((icon) => icon.src);
  for (const file of [...linked, ...icons]) {
    assert(listed.has(file), `${file} is linked but missing from APP_FILES in sw.js`);
  }
});

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'client/public/manifest.webmanifest'), 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.icons.length, 3);
for (const icon of manifest.icons) {
  assert(existsSync(path.join(root, 'client/public', icon.src.slice(1))), `Falta ${icon.src}`);
}

const template = readFileSync(path.join(root, 'client/sw.template.js'), 'utf8');
const code = template
  .replace('__BUILD_VERSION__', '"test"')
  .replace('__PRECACHE__', '["/","/index.html","/assets/app.js"]');
const listeners = {};
const self = {
  location: { origin: 'https://myspa2.test' },
  clients: { claim() {} },
  skipWaiting() {},
  addEventListener(type, listener) { listeners[type] = listener; },
};
const caches = {
  open: async () => ({ addAll: async () => {}, match: async () => null,
    put: async () => {}, keys: async () => [], delete: async () => {} }),
  match: async () => null,
  keys: async () => [], delete: async () => {},
};
vm.runInNewContext(code, { self, caches, URL, Response, fetch: async () => ({ ok: true, type: 'basic', clone() { return this; } }) });
assert(listeners.fetch, 'No hay handler del Service Worker');

function intercept(path, method = 'GET', mode = 'cors') {
  let intercepted = false;
  const event = {
    request: { url: `https://myspa2.test${path}`, method, mode },
    respondWith(promise) { intercepted = true; Promise.resolve(promise).catch(() => {}); },
  };
  listeners.fetch(event);
  return intercepted;
}

assert.equal(intercept('/api/public/rooms'), true);
assert.equal(intercept('/api/public/rooms/1'), true);
assert.equal(intercept('/api/public/branches'), true);
assert.equal(intercept('/api/public/availability?roomId=1&date=2026-12-01'), false);
assert.equal(intercept('/api/reservations'), false);
assert.equal(intercept('/api/services'), false);
assert.equal(intercept('/api/auth/me'), false);
assert.equal(intercept('/api/media/68ceab123456789012345678'), false);
assert.equal(intercept('/api/reservations', 'POST'), false);
assert.equal(intercept('/api/reservations/1/cancel', 'POST'), false);
assert.equal(intercept('/mi-cuenta', 'GET', 'navigate'), true);
console.log('PWA: manifest e iconos presentes; 11 rutas verificadas para caché u operación online.');

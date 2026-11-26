import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// No extra runtime dependencies: the build generates a versioned, scoped SW
// using the exact entry HTML/CSS/JS files emitted by Vite.
function mySpaPwa() {
  return {
    name: 'myspa2-pwa',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((name) => /\.(js|css|html|svg|png|woff2?)$/.test(name))
        .map((name) => `/${name}`);
      const precache = [...new Set([
        '/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/brand-flower.svg',
        '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png',
        ...['lavanda', 'olivo', 'loto', 'bambu', 'salvia', 'arena', 'niebla']
          .map((room) => `/rooms/${room}.webp`),
        ...['karite', 'sal', 'avena', 'rocio']
          .map((ritual) => `/treatments/${ritual}.webp`),
        ...assets,
      ])];
      const version = `v-${Date.now().toString(36)}`;
      const template = readFileSync(path.join(here, 'sw.template.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__BUILD_VERSION__', JSON.stringify(version))
          .replace('__PRECACHE__', JSON.stringify(precache)),
      });
    },
  };
}

export default defineConfig({
  plugins: [mySpaPwa()],
  envDir: path.resolve(here, '..'),
  esbuild: { jsx: 'automatic' },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
});

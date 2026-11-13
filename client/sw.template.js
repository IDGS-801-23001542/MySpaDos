/* MySpa2 offline shell. Never cache sessions, personal data, bookings or availability. */
const VERSION = __BUILD_VERSION__;
const SHELL_CACHE = `myspa2-shell-${VERSION}`;
const PUBLIC_CACHE = `myspa2-public-${VERSION}`;
const PRECACHE = __PRECACHE__;
const PUBLIC_PATHS = new Set([
  '/api/public/branches',
  '/api/public/rooms',
  '/api/public/schedules',
  '/api/public/treatments',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('myspa2-') &&
      ![SHELL_CACHE, PUBLIC_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isPublicCatalog(url) {
  if (!PUBLIC_PATHS.has(url.pathname) && !/^\/api\/public\/rooms\/\d+$/.test(url.pathname)) {
    return false;
  }
  return !url.searchParams.has('private');
}

async function cachedPublic(request) {
  const cache = await caches.open(PUBLIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if (keys.length > 40) await cache.delete(keys[0]);
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (isPublicCatalog(url)) event.respondWith(cachedPublic(request));
    return; // Availability, photos, private API and auth are strictly network-only.
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match('/index.html')) || Response.error();
    }));
    return;
  }

  // Only build-generated application assets and public icons are precached.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((response) => response || fetch(request)));
  }
});

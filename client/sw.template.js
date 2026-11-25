/* MySpa2 offline shell. Never cache sessions, personal data, bookings or availability. */
const VERSION = __BUILD_VERSION__;
const SHELL_CACHE = `myspa2-shell-${VERSION}`;
const PUBLIC_CACHE = `myspa2-public-${VERSION}`;
const ROOM_PHOTO_CACHE = `myspa2-room-photos-${VERSION}`;
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
      ![SHELL_CACHE, PUBLIC_CACHE, ROOM_PHOTO_CACHE].includes(key)).map((key) => caches.delete(key)));
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

// Only explicit public photo URLs are eligible; never cache profile photos.
function isPublicRoomPhoto(url) {
  return /^\/api\/media\/[a-f0-9]{24}$/i.test(url.pathname) && url.search === '?public=1';
}

async function cachedRoomPhoto(request) {
  const cache = await caches.open(ROOM_PHOTO_CACHE);
  let response;
  try {
    response = await fetch(request, { credentials: 'omit', cache: 'no-store' });
  } catch {
    return (await cache.match(request)) || Response.error();
  }
  const policy = response.headers.get('Cache-Control') || '';
  const mime = response.headers.get('Content-Type') || '';
  if (response.ok && response.type === 'basic' && /\bpublic\b/i.test(policy) &&
      !/\b(private|no-store)\b/i.test(policy) && /^image\/(jpeg|png|webp)(?:;|$)/i.test(mime)) {
    try {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if (keys.length > 60) await cache.delete(keys[0]);
    } catch { /* Storage failure must not prevent displaying an online photo. */ }
  } else if (response.ok || [401, 403, 404, 410].includes(response.status)) {
    await cache.delete(request).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (isPublicRoomPhoto(url)) event.respondWith(cachedRoomPhoto(request));
    else if (isPublicCatalog(url)) event.respondWith(cachedPublic(request));
    return; // Availability, private photos, private API and auth are strictly network-only.
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

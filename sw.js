/* EOT Cranes Record Book — offline service worker.
   The whole app is a single HTML page with inline script, so caching the
   app shell makes it fully usable with no network. Records live in
   localStorage on the device and are never sent anywhere. */
const CACHE = 'eot-cranes-v3';
const ROOT = self.registration.scope;
const SHELL = [
  '', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png'
].map((p) => ROOT + p);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle our own origin; leave Netlify's injected scripts etc. alone.
  if (url.origin !== self.location.origin) return;

  // Page loads: network first (fresh app), fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(ROOT, cp)); return r; })
        .catch(() => caches.match(ROOT).then((r) => r || caches.match(req)))
    );
    return;
  }

  // Everything else (icons, manifest): cache first, then network.
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((r) => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      })
    )
  );
});

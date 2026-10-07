// CA Exam Study service worker: pre-cache app shell, serve cache-first.
// Bump CACHE whenever any asset changes so returning visitors get the update.
const CACHE = 'ca-exam-study-v2';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  // cache:'reload' bypasses the HTTP cache so the new version never stores stale files
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    // Upgrade (not first install): reload open pages once so they show the new version now.
    if (old.length) {
      const wins = await self.clients.matchAll({type: 'window'});
      await Promise.all(wins.map(w => w.navigate(w.url).catch(() => {})));
    }
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error());
    })
  );
});

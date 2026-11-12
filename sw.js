/* LIHL Hockey service worker: offline shell. Network first for code and pages (so a deploy is never stale),
   cache first for models, data and icons. Photos and the live game socket are never cached. */
const V = 'lihl-shell-v1';
/* Reflector.js is loaded lazily (high tier only), so it would never be fetched on other tiers: precache it so the high tier also works offline. */
const PRE = ['lib/Reflector.js'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => Promise.all(PRE.map(u => c.add(u).catch(() => {})))).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /\/photos\//.test(u.pathname) || /\/(health|rooms|api)\b/.test(u.pathname)) return;
  const stat = /\.(glb|gltf|json|png|jpg|webp|woff2?)$/.test(u.pathname) && !/\/photos\//.test(u.pathname);
  if (stat) e.respondWith(caches.open(V).then(c => c.match(r).then(h => h || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
  else e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(h => h || caches.match('./index.html'))));
});

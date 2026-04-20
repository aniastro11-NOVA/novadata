const CACHE = 'novadata-v10';
const ASSETS = ['./', './index.html', './preview.html', './app.js', './style.css', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis.com')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

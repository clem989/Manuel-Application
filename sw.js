// Service Worker — Manuel d'une journée
const CACHE = 'manuel-v5d';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './guide-firebase.html'
];

// Installation : cache les ressources
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation : nettoie les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : network-first pour les pages (mises à jour immédiates), cache-first pour le reste
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return response;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(response => {
        // Mise en cache des ressources locales uniquement
        if (e.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

// Notifications : laissées au JS principal (notifications locales)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const c of clients) {
        if (c.url.includes('index.html') && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

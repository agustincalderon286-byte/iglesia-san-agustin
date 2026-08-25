const CACHE = 'san-agustin-v5';
const OFFLINE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(OFFLINE)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ])
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(match => match || (event.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Iglesia San Agustín', {
    body: data.body || 'Hay un nuevo aviso de nuestra comunidad.',
    icon: '/icon-192.png', badge: '/icon-192.png', data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  const trackOpen = fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: 'notification_open' }) }).catch(() => undefined);
  const openApp = clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(destination);
      return existing.focus();
    }
    return clients.openWindow(destination);
  });
  event.waitUntil(Promise.all([trackOpen, openApp]));
});

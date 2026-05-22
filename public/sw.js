// public/sw.js
const CACHE_NAME = 'smartmoney-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/SM_icon.png'
];

// Instalación: cachear recursos estáticos iniciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  // Activar el nuevo worker inmediatamente sin esperar a que se cierren otras pestañas
  self.skipWaiting();
});

// Activación: eliminar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim(); // Tomar control de todas las pestañas abiertas
});

// Fetch: estrategia "cache first" para todos los recursos
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si está en caché, devolverlo
      if (response) return response;
      // Si no, ir a la red, cachear la respuesta y devolverla
      return fetch(event.request).then(networkResponse => {
        // Solo cachear respuestas exitosas (200) y que no sean de otros dominios (opcional)
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    }).catch(() => {
      // Si no hay red y no está en caché, mostrar una página offline personalizada (opcional)
      return caches.match('/offline.html');
    })
  );
});

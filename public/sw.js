const CACHE_NAME = 'bastion-defender-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/src/main.js',
  '/src/constants.js',
  '/src/entities.js',
  '/src/ui.js',
  '/src/world.js',
  '/src/input.js',
  '/src/systems.js',
  '/src/enemies.js',
  '/src/Elultimoleon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting()) // Activar inmediatamente sin esperar
  );
});

// Eliminar cachés viejos al activar la nueva versión
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Tomar control de todas las páginas abiertas
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

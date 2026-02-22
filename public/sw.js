const CACHE_NAME = 'bastion-defender-v1';
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
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

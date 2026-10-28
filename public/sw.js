/**
 * Service Worker de ¡PENALTAZO! (PWA Offline-First para modo práctica vs IA)
 */
const CACHE_NAME = 'penaltazo-pwa-v4.8';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/animations.css',
  '/js/audio.js',
  '/js/ai-opponent.js',
  '/js/goal-grid.js',
  '/js/animation.js',
  '/js/scoreboard.js',
  '/js/tournament.js',
  '/js/network.js',
  '/js/main.js',
  '/assets/audio/penaltazo.mp3',
  '/assets/icons/icon.svg'
];

// 1. Instalación: precachear recursos estáticos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia Network-First con fallback a Caché para modo offline (garantiza que los enlaces de WhatsApp y salas online estén siempre al día)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o que vayan al endpoint en tiempo real de Socket.io / API
  if (request.method !== 'GET' || url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});

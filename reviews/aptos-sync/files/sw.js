const CACHE_NAME = 'aptos-sync-v1.6.2';
const ASSETS = [
  '/',
  '/index.html',
  '/brainhunter.html',
  '/nback.html',
  '/stroop.html',
  '/matrix.html',
  '/taskswitch.html',
  '/visualsearch.html',
  '/dualtask.html',
  '/board-games.html',
  '/damas.html',
  '/ludo.html',
  '/reversi.html',
  '/connect-four.html',
  '/batalha-naval.html',
  '/velha.html',
  '/sudoku.html',
  '/ab-dashboard.html',
  '/manifest.json',
  '/version.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install — pre-cache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Não faz skipWaiting automático — aguarda usuário confirmar
});

// Activate — limpa caches antigos e notifica clientes
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      // Notifica todas as abas abertas que há update disponível
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
      return self.clients.claim();
    })
  );
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', e => {
  // version.json sempre busca da rede para detectar updates
  if (e.request.url.includes('version.json')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Mensagem do cliente para skipWaiting (usuário confirmou update)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

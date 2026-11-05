// Service Worker: hält die App offline verfügbar.
// Strategie für die App-Dateien: erst Netz (damit Updates sofort ankommen),
// bei fehlendem Netz der Cache. Lerninhalte (content/) lädt die App selbst
// und speichert sie lokal – die laufen hier nicht durch.

const CACHE = 'lernapp-shell-v11';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'img/fanny.webp',
  'img/fanny-full.webp',
  'img/fanny-happy.webp',
  'img/fanny-happy-full.webp',
  'img/fanny-sad.webp',
  'img/fanny-sad-full.webp',
  'js/app.js',
  'js/util.js',
  'js/store.js',
  'js/content.js',
  'js/srs.js',
  'js/diff.js',
  'js/pet.js',
  'js/streak.js',
  'js/sync.js',
  'js/exercises/registry.js',
  'js/exercises/write.js',
  'js/views/home.js',
  'js/views/subject.js',
  'js/views/lesson.js',
  'js/views/practice.js',
  'js/views/stats.js',
  'js/views/parents.js',
  'js/views/handwriting-test.js',
];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/content/')) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    // no-cache: beim Server nachfragen, ob sich die Datei geändert hat (sonst kommen Updates verspätet an).
    const response = await withTimeout(fetch(request, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('index.html');
    throw new Error('offline und nicht im Cache: ' + request.url);
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Service Worker: hält die App offline verfügbar.
//
// Eine App-Version = ein vollständiger Satz Dateien (SHELL) in einem Cache.
// - Installation: alle Dateien frisch vom Server laden. Fehlt eine, wird die neue
//   Version gar nicht erst aktiv – so laufen nie alte und neue Programmteile gemischt.
// - Betrieb: Dateien kommen aus dem Cache der aktiven Version (schnell, offline).
// - Update: CACHE-Namen ändern (bei jedem Push). Der Browser findet die neue sw.js,
//   installiert die neue Version komplett, die App lädt sich dann einmal neu (app.js).
// Lerninhalte (content/) lädt die App selbst und speichert sie lokal – die laufen hier nicht durch.

const CACHE = 'lernapp-shell-v28';
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
  'js/medal.js',
  'js/lessons.js',
  'js/sync.js',
  'js/merge.js',
  'js/exercises/registry.js',
  'js/exercises/modes.js',
  'js/exercises/round.js',
  'js/practice-now.js',
  'js/views/now.js',
  'js/views/test.js',
  'js/exercises/questions.js',
  'js/exercises/summary.js',
  'js/speech.js',
  'js/views/home.js',
  'js/views/subject.js',
  'js/views/lesson.js',
  'js/views/practice.js',
  'js/views/stats.js',
  'js/views/parents.js',
  'js/views/portrait.js',
  'js/views/handwriting-test.js',
  'js/views/speech-test.js',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
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
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true })
    ?? (request.mode === 'navigate' ? await cache.match('index.html') : undefined);
  if (cached) return cached;
  // Nicht in der Liste (sollte nicht vorkommen): aus dem Netz holen und merken.
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

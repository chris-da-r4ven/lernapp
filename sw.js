// Service Worker: hält die App offline verfügbar.
//
// Eine App-Version = ein vollständiger Satz Dateien (SHELL) in einem Cache.
// - Installation: alle Dateien frisch vom Server laden. Fehlt eine, wird die neue
//   Version gar nicht erst aktiv – so laufen nie alte und neue Programmteile gemischt.
// - Betrieb: Dateien kommen aus dem Cache der aktiven Version (schnell, offline).
// - Update: Der CACHE-Name ist ein Fingerabdruck der App-Dateien und wird von
//   tools/check.py --fix gesetzt (läuft vor jedem Push). Der Browser findet die neue sw.js,
//   installiert die neue Version komplett, die App lädt sich dann einmal neu (app.js).
// Lerninhalte (content/) lädt die App selbst und speichert sie lokal – die laufen hier nicht durch.

const CACHE = 'lernapp-a7742e97e1';
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
  'js/validate.js',
  'js/device.js',
  'js/levels.js',
  'js/nav.js',
  'js/updates.js',
  'js/exercises/round-notes.js',
  'js/exercises/numberline.js',
  'js/exercises/charts.js',
  'js/exercises/answer.js',
  'js/exercises/math.js',
  'js/version.js',
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
      // ?v=… umgeht auch den Zwischenspeicher von GitHub Pages (bis 10 Minuten) – sonst könnte
      // kurz nach einem Push noch eine alte Datei in die neue Version geraten.
      .then((c) => Promise.all(SHELL.map(async (u) => {
        const r = await fetch(new Request(`${u}${u.includes('?') ? '&' : '?'}v=${CACHE}`, { cache: 'reload' }));
        if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
        await c.put(u, r);   // gespeichert unter der normalen Adresse
      })))
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
  // Inhalte lädt die App selbst; die Testseite soll immer frisch sein.
  if (url.pathname.includes('/content/') || url.pathname.includes('/tests/')) return;
  event.respondWith(fromTestPage(event.clientId).then((test) =>
    // Die Testseite soll immer den aktuellen Code prüfen, nicht den gespeicherten.
    (test ? fetch(event.request.url, { cache: 'no-store' }) : cacheFirst(event.request))));
});

async function fromTestPage(clientId) {
  if (!clientId) return false;
  const client = await self.clients.get(clientId);
  return Boolean(client?.url.includes('/tests/'));
}

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

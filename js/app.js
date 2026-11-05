import { checkUpdates } from './content.js';
import { toast } from './util.js';
import { homeView } from './views/home.js';
import { subjectView } from './views/subject.js';
import { lessonView } from './views/lesson.js';
import { practiceView } from './views/practice.js';
import { statsView } from './views/stats.js';

const routes = [
  [/^#?\/?$/, homeView, 'home'],
  [/^#\/fach\/([^/]+)$/, subjectView, 'home'],
  [/^#\/lektion\/([^/]+)\/([^/]+)$/, lessonView, 'home'],
  [/^#\/ueben\/([^/]+)\/([^/]+)\/([^/]+)\/(ab|ba)(\/alle)?$/, practiceView, 'home'],
  [/^#\/statistik$/, statsView, 'statistik'],
];

const app = document.getElementById('app');

export function render() {
  const hash = location.hash || '#/';
  const match = routes.find(([re]) => re.test(hash));
  if (!match) { location.hash = '#/'; return; }
  const [re, view, nav] = match;
  const params = hash.match(re).slice(1).map((p) => (p === undefined ? p : decodeURIComponent(p)));
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  app.innerHTML = '';
  window.scrollTo(0, 0);
  view(app, ...params);
}

// Von "Neue Inhalte suchen" und beim Start aufgerufen.
export async function updateContent({ quiet = false } = {}) {
  const result = await checkUpdates();
  if (result === 'updated') {
    toast('Neue Inhalte geladen 🎉');
    if (!location.hash.startsWith('#/ueben')) render();
  } else if (!quiet) {
    toast(result === 'current' ? 'Alles aktuell.' : 'Kein Internet – du übst mit den gespeicherten Inhalten.');
  }
  return result;
}

window.addEventListener('hashchange', render);
render();
updateContent({ quiet: true });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker:', e));
}

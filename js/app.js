import { checkUpdates } from './content.js';
import { startSync } from './sync.js';
import { toast } from './util.js';
import { homeView } from './views/home.js';
import { subjectView } from './views/subject.js';
import { lessonView } from './views/lesson.js';
import { practiceView } from './views/practice.js';
import { statsView } from './views/stats.js';
import { handwritingTestView } from './views/handwriting-test.js';
import { speechTestView } from './views/speech-test.js';
import { nowView } from './views/now.js';
import { testView } from './views/test.js';

const routes = [
  [/^#?\/?$/, homeView, 'home'],
  [/^#\/fach\/([^/]+)$/, subjectView, 'home'],
  [/^#\/lektion\/([^/]+)\/([^/]+)$/, lessonView, 'home'],
  [/^#\/ueben\/([^/]+)\/([^/]+)\/([^/]+)\/(ab|ba|hoeren|hoeren-wahl|satz)(\/alle)?$/, practiceView, 'home'],
  [/^#\/jetzt$/, nowView, 'home'],
  [/^#\/test\/([^/]+)$/, testView, 'home'],
  [/^#\/statistik$/, statsView, 'statistik'],
  [/^#\/handschrift-test$/, handwritingTestView, 'home'],
  [/^#\/vorlese-test$/, speechTestView, 'home'],
];

const app = document.getElementById('app');

// Mitten in einer Übung die Seite nicht neu zeichnen.
const practicing = () => /^#\/(ueben|jetzt|test)\//.test(location.hash + '/');

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
    if (!practicing()) render();
  } else if (!quiet) {
    toast(result === 'current' ? 'Alles aktuell.' : 'Kein Internet – du übst mit den gespeicherten Inhalten.');
  }
  return result;
}

window.addEventListener('hashchange', render);
render();
updateContent({ quiet: true });
// Sicherung: wurde sie von außen geändert (z. B. zurückgesetzt), Seite neu zeichnen –
// außer mitten in einer Übungsrunde.
startSync({ onRemoteChange: () => { if (!practicing()) render(); } });

// Browser bitten, den Spielstand nicht bei Speichermangel selbst zu löschen.
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker:', e));
}

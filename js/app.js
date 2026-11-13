import { applyMoves, allLessons, hasContent } from './content.js';
import { pathSince, adoptLearned, storageNewer } from './store.js';
import { adoptable } from './path.js';
import { startSync } from './sync.js';
import { toast } from './util.js';
import { homeView } from './views/home.js';
import { subjectView } from './views/subject.js';
import { lessonView } from './views/lesson.js';
import { practiceView } from './views/practice.js';
import { statsView } from './views/stats.js';
import { handwritingTestView } from './views/handwriting-test.js';
import { speechTestView } from './views/speech-test.js';
import { ausrittView } from './views/ausritt.js';
import { testView } from './views/test.js';
import { etappeView } from './views/etappe.js';
import { setRenderer, practicing } from './nav.js';
import { updateContent } from './updates.js';

const routes = [
  [/^#?\/?$/, homeView, 'home'],
  [/^#\/fach\/([^/]+)$/, subjectView, 'home'],
  [/^#\/lektion\/([^/]+)\/([^/]+)$/, lessonView, 'home'],
  [/^#\/ueben\/([^/]+)\/([^/]+)\/([a-z-]+)(\/alle)?$/, practiceView, 'home'],   // Übungsart wird in der Ansicht geprüft
  [/^#\/etappe\/([^/]+)\/([^/]+)\/(\d{1,2})$/, etappeView, 'home'],
  [/^#\/ausritt$/, ausrittView, 'home'],
  [/^#\/jetzt$/, () => { location.replace('#/ausritt'); }, 'home'],   // alte Adresse (Lesezeichen)
  [/^#\/test\/([^/]+)(?:\/([^/]+))?$/, testView, 'home'],
  [/^#\/statistik$/, statsView, 'statistik'],
  [/^#\/handschrift-test$/, handwritingTestView, 'home'],
  [/^#\/vorlese-test$/, speechTestView, 'home'],
];

const app = document.getElementById('app');

function render() {
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

// Einmalig beim ersten Start mit Lernweg: Was schon sitzt (Abruf-Fach ≥ 2), gilt als gelernt –
// Etappen mit diesen Wörtern sind gleich abgehakt (path.js adoptable).
// Lief die Übernahme gerade erst (in dieser Sitzung), wird sie nach dem ersten Abgleich mit der Sicherung
// ergänzt – ein anderes Gerät kann weiter gewesen sein.
let adoptedNow = false;
function adoptOnce() {
  if (storageNewer() || !hasContent()) return;
  if (pathSince() && !adoptedNow) return;
  adoptLearned(adoptable(allLessons()), adoptedNow ? pathSince() : Date.now());
  adoptedNow = true;
}

setRenderer(render);
window.addEventListener('hashchange', render);
applyMoves();
adoptOnce();
render();
updateContent({ quiet: true });
// Sicherung: wurde sie von außen geändert (z. B. zurückgesetzt), Seite neu zeichnen –
// außer mitten in einer Übungsrunde.
startSync({ onRemoteChange: () => { applyMoves(); adoptOnce(); if (!practicing()) render(); } });

// Browser bitten, den Spielstand nicht bei Speichermangel selbst zu löschen.
navigator.storage?.persist?.().catch(() => {});

// Offline-Cache. Ist eine neue App-Version komplett geladen, übernimmt sie und die Seite
// lädt sich einmal neu – aber nicht mitten in einer Übung, dann erst beim nächsten Seitenwechsel.
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadPending = false;
  const reloadNow = () => { window.removeEventListener('hashchange', reloadWhenFree); location.reload(); };
  const reloadWhenFree = () => { if (!practicing()) reloadNow(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadPending) return;   // allererste Installation: nichts neu laden
    reloadPending = true;
    if (practicing()) {
      toast('Neue Version ist da – sie startet nach der Übung.');
      window.addEventListener('hashchange', reloadWhenFree);
    } else {
      reloadNow();
    }
  });
  navigator.serviceWorker.register('sw.js')
    .then((reg) => document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    }))
    .catch((e) => console.warn('Service Worker:', e));
}

// ⚡ Blitzrunde: 8 schnelle Antipp-Aufgaben aus geschafften Etappen. Keine Uhr, keine Wertung –
// die Rennbahn ist nur Kulisse: Fanny galoppiert mit jeder gelösten Aufgabe ein Stück weiter.

import { allLessons } from '../content.js';
import { blitzAvailable, blitzTasks } from '../path.js';
import { addBlitz } from '../store.js';
import { runRound } from '../exercises/round.js';
import { fannyPixel } from '../fanny-pixel.js';

export function blitzView(el) {
  const back = () => { location.hash = '#/'; };
  const { stock } = blitzAvailable();
  const tasks = stock ? blitzTasks(allLessons()) : [];
  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <div class="race" aria-hidden="true">
      <div class="race-sky"></div><div class="race-hills"></div><div class="race-fence"></div><div class="race-track"></div>
      <div class="race-fanny">${fannyPixel(84)}</div>
    </div>
    <p class="muted small race-note">Keine Uhr, keine Wertung – Fanny galoppiert nur als Kulisse mit.</p>
    <div class="exercise"></div>`;
  const box = el.querySelector('.exercise');
  if (!stock || tasks.length < 4) {
    box.innerHTML = `
      <div class="card summary">
        <h2>${stock ? 'Noch zu wenig für eine Blitzrunde' : 'Gerade keine Blitzrunde da'}</h2>
        <p>${stock ? 'Schaff erst noch ein paar Etappen – dann gibt es genug Antipp-Aufgaben.' : 'Nach je 2 geschafften Etappen gibt es eine ⚡ Blitzrunde.'}</p>
        <div class="actions"><a class="btn primary" href="#/">Zur Startseite</a></div>
      </div>`;
    return;
  }
  const fanny = el.querySelector('.race-fanny');
  let lastDone = 0;
  const race = el.querySelector('.race');
  runRound(box, {
    tasks,
    chosen: false,
    art: 'blitz',
    title: 'Ziel erreicht! ⚡',
    onProgress: (done, total) => {
      fanny.style.left = `${4 + (done / total) * 78}%`;
      // nur bei einer neu gelösten Aufgabe galoppieren, nicht nach einem Fehler
      if (done > lastDone) { race.classList.remove('gallop'); void race.offsetWidth; race.classList.add('gallop'); }
      lastDone = done;
    },
    onComplete: () => { addBlitz(); return ''; },
    againLabel: 'Zur Startseite',
    onAgain: back,
    onBack: back,
    backLabel: 'Zur Startseite',
  });
}

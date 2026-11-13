// 🌳 Ausritt (Auffrischen): gemischte Runde aus allem, was wieder dran ist. #/ausritt (früher #/jetzt)

import { buildAusritt } from '../ausritt.js';
import { runRound } from '../exercises/round.js';

export function ausrittView(el, anyway = false) {
  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <p class="muted small etappe-head">🌳 Ausritt · Auffrischen</p>
    <div class="exercise"></div>`;
  const box = el.querySelector('.exercise');
  const tasks = buildAusritt({ anyway });
  if (!tasks.length) {
    box.innerHTML = `
      <div class="card summary">
        <h2>Alles frisch! 🌳</h2>
        <p>${anyway ? 'Du hast noch nichts geübt, was man auffrischen könnte. Starte auf dem Lernweg einer Lektion.' : 'Gerade ist kein Wort fällig. Fanny ist stolz auf dich.'}</p>
        <div class="actions">
          ${anyway ? '' : '<button class="btn primary" data-act="anyway">Trotzdem ausreiten</button>'}
          <a class="btn" href="#/">Zur Startseite</a>
        </div>
      </div>`;
    box.querySelector('[data-act=anyway]')?.addEventListener('click', () => ausrittView(el, true));
    return;
  }
  runRound(box, {
    tasks,
    chosen: false,
    art: 'ausritt',
    title: 'Ausritt geschafft! 🌳',
    againLabel: 'Noch ein Ausritt',
    onAgain: () => ausrittView(el, anyway),
    onBack: () => { location.hash = '#/'; },
    backLabel: 'Zur Startseite',
  });
}

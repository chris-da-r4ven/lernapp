// Seite „Jetzt üben“: gemischte Runde aus allem, was gerade dran ist.

import { buildNowRound } from '../practice-now.js';
import { runRound } from '../exercises/round.js';

export function nowView(el, anyway = false) {
  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <div class="exercise"></div>`;
  const box = el.querySelector('.exercise');
  const tasks = buildNowRound({ anyway });
  if (!tasks.length) {
    box.innerHTML = `
      <div class="card summary">
        <h2>Alles erledigt! 🎉</h2>
        <p>Gerade ist kein Wort fällig. Fanny ist stolz auf dich.</p>
        <div class="actions">
          <button class="btn primary" data-act="anyway">Trotzdem üben</button>
          <a class="btn" href="#/">Zur Startseite</a>
        </div>
      </div>`;
    box.querySelector('[data-act=anyway]').addEventListener('click', () => nowView(el, true));
    return;
  }
  runRound(box, {
    tasks,
    chosen: false,
    onAgain: () => nowView(el, anyway),
    onBack: () => { location.hash = '#/'; },
    backLabel: 'Zur Startseite',
  });
}

// Rundenbilanz – gleich für alle Übungsarten.
// Den Grundbetrag gibt es nur für eine zu Ende gespielte Runde.

import { esc } from '../util.js';
import { ROUND_BONUS } from '../srs.js';
import { getState, addPoints, save, streak } from '../store.js';
import { petStatus, MAX_GLITTER_LEVEL } from '../pet.js';
import { mood } from '../streak.js';
import { portrait } from '../views/portrait.js';

// mistakes: Liste von [gefragt, Antwort]
export function roundSummary(el, { total, firstTry, points, startLevel, mistakes, onAgain, onBack }) {
  addPoints(ROUND_BONUS);
  save();
  const pet = petStatus(getState().points, mood(streak()));
  const levelUp = pet.level > startLevel;
  const w = (n) => `${n} ${n === 1 ? 'Wort' : 'Wörter'}`;
  el.innerHTML = `
    <div class="card summary">
      <h2>Geschafft! 🏁</h2>
      <p class="big">${w(total)} geübt – ${firstTry === total ? 'alle' : firstTry + ' davon'} sofort richtig</p>
      <div class="earned">
        <div>✦ +${ROUND_BONUS} fürs Durchhalten</div>
        <div>✦ +${points} für die Wörter</div>
        <p class="big">= +${ROUND_BONUS + points} ✦ Sternchen · jetzt ${getState().points} ✦</p>
      </div>
      ${levelUp ? `
        <div class="level-up mood-${pet.mood}">
          ${portrait(pet)}
          <p class="big">${pet.level <= MAX_GLITTER_LEVEL ? 'Fanny glitzert jetzt noch mehr! ✨' : 'Neue Stufe erreicht! ✨'}</p>
          <p>Glitzer-Stufe ${pet.level}</p>
        </div>` : `
        <div class="level-progress">
          <div class="meter"><div style="width:${pet.progress * 100}%"></div></div>
          <p class="muted small">noch ${pet.toNext} ✦ bis zur nächsten Glitzer-Stufe</p>
        </div>`}
      ${mistakes.length ? `<h3>Diese Wörter üben wir weiter:</h3>
        <ul class="word-list">${mistakes.map(([q, a]) => `<li><span>${esc(q)}</span><strong>${esc(a)}</strong></li>`).join('')}</ul>` : '<p>Keine Fehler – super!</p>'}
      <div class="actions">
        <button class="btn primary" data-act="again">Noch eine Runde</button>
        <button class="btn" data-act="back">Zur Lektion</button>
      </div>
    </div>`;
  el.querySelector('[data-act=again]').addEventListener('click', onAgain);
  el.querySelector('[data-act=back]').addEventListener('click', onBack);
}

// Rundenbilanz – gleich für alle Übungsarten.
// Den Grundbetrag gibt es nur für eine zu Ende gespielte Runde.

import { esc, fmt1 } from '../util.js';
import { getState, addPoints, save, streak, addFeedback, feedbackId } from '../store.js';
import { petStatus, MAX_GLITTER_LEVEL } from '../pet.js';
import { mood } from '../streak.js';
import { portrait } from '../views/portrait.js';

// unit: [Einzahl, Mehrzahl], z. B. ['Wort', 'Wörter'] (lessons.unitOf)
// mistakes: Liste von [gefragt, Antwort]
// intro: eigene Zeile statt „X Wörter geübt …“ (z. B. Testergebnis)
// notice: zusätzlicher Hinweis unter den Sternchen (z. B. „Teste dich doch mal!“)
// goalBefore: Tagesziel-Stand vor der Runde – die Bilanz zeigt, wie viel die Runde dafür gebracht hat
// feedback: { what, mode, art, test } – dann fragt die Bilanz „Spaß?“ und „weitergebracht?“ (je 1–5)
// title: Überschrift (z. B. „Etappe geschafft!“), againLabel: Text des Hauptknopfs (ohne onAgain: kein Knopf)
export function roundSummary(el, { unit = ['Wort', 'Wörter'], goalBefore = null, feedback = null, total, firstTry, points, bonus, extraPoints = 0, startLevel, mistakes, intro, mistakesTitle, notice = '', title = 'Geschafft! 🏁', againLabel = 'Noch eine Runde', onAgain, onBack, backLabel = 'Zur Lektion' }) {
  addPoints(bonus);
  save();
  const pet = petStatus(getState().points, mood(streak()));
  const levelUp = pet.level > startLevel;
  const w = (n) => `${n} ${unit[n === 1 ? 0 : 1]}`;
  el.innerHTML = `
    <div class="card summary">
      <h2>${esc(title)}</h2>
      ${intro ?? `<p class="big">${w(total)} geübt – ${firstTry === total ? 'alle' : firstTry + ' davon'} sofort richtig</p>`}
      <div class="earned">
        <div>✦ +${bonus} fürs Durchhalten</div>
        <div>✦ +${points} für die ${esc(unit[1])}</div>
        ${extraPoints ? `<div>🏅 +${extraPoints} Medaillen-Bonus</div>` : ''}
        <p class="big">= +${bonus + points + extraPoints} ✦ Sternchen · jetzt ${Number(getState().points) || 0} ✦</p>
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
      ${goalBefore === null ? '' : goalLine(goalBefore)}
      ${feedback ? RATING_HTML : ''}
      ${notice}
      ${mistakes.length ? `<h3>${esc(mistakesTitle)}</h3>
        <ul class="word-list">${mistakes.map(([q, a]) => `<li><span>${esc(q)}</span><strong>${esc(a)}</strong></li>`).join('')}</ul>` : '<p>Keine Fehler – super!</p>'}
      <div class="actions">
        ${onAgain ? `<button class="btn primary" data-act="again">${esc(againLabel)}</button>` : ''}
        <button class="btn" data-act="back">${esc(backLabel)}</button>
      </div>
    </div>`;
  if (feedback) bindRating(el, { ...feedback, n: total, right: firstTry });
  el.querySelector('[data-act=again]')?.addEventListener('click', onAgain);
  el.querySelector('[data-act=back]').addEventListener('click', onBack);
}

// 🎯 Tagesziel: was die Runde gebracht hat und wie viel heute noch fehlt. Eintippen zählt mehr als
// Antippen, je nach Denkaufwand weniger oder mehr (weights.js) – deshalb steht hier keine Aufgabenzahl.
function goalLine(before) {
  const s = streak();
  const gained = Math.max(0, s.todayWords - before);
  const now = Math.min(s.todayWords, s.need);
  if (s.todayDone) {
    return `<div class="goal-line done"><p>🎯 <strong>Tagesziel geschafft!</strong>${gained ? ` Diese Runde: +${fmt1(gained)}` : ''}</p></div>`;
  }
  return `
    <div class="goal-line">
      <p>🎯 Tagesziel: <strong>+${fmt1(gained)}</strong> → heute ${fmt1(now)} von ${s.need}</p>
      <div class="meter"><div style="width:${(now / s.need) * 100}%"></div></div>
      <p class="muted small">Eintippen zählt mehr als Antippen.</p>
    </div>`;
}

// --- Rückmeldung: Wie war die Runde? -------------------------------------------
// Zwei kurze Fragen, je ein Tipp, freiwillig. Die Antworten landen im Spielstand (store.addFeedback)
// und sind für die Eltern unter Fortschritt → Für Eltern sichtbar.
export const RATINGS = {
  fun: { question: 'Wie viel Spaß hat dir die Runde gemacht?', icons: ['😫', '😕', '😐', '🙂', '🤩'] },
  learn: { question: 'Wie viel hat sie dich weitergebracht?', icons: ['🐢', '🚶', '🚲', '🚗', '🚀'] },
};

const RATING_HTML = `
  <div class="rating-ask">
    ${Object.entries(RATINGS).map(([q, r]) => `
      <p>${esc(r.question)}</p>
      <div class="rate" data-q="${q}" role="group" aria-label="${esc(r.question)}">
        ${r.icons.map((icon, i) => `<button type="button" class="rate-btn" data-v="${i + 1}" aria-label="${i + 1} von 5">${icon}</button>`).join('')}
      </div>`).join('')}
    <p class="muted small rate-thanks" hidden>Danke! 💜</p>
  </div>`;

function bindRating(el, info) {
  const id = feedbackId();
  const picked = {};
  el.querySelectorAll('.rate').forEach((group) => {
    group.addEventListener('click', (ev) => {
      const b = ev.target.closest('.rate-btn');
      if (!b) return;
      picked[group.dataset.q] = Number(b.dataset.v);
      group.querySelectorAll('.rate-btn').forEach((x) => x.classList.toggle('picked', x === b));
      group.classList.add('answered');
      addFeedback({ id, ...info, ...picked });   // jede Wahl gleich speichern – Ändern ist erlaubt
      if (picked.fun && picked.learn) el.querySelector('.rate-thanks').hidden = false;
    });
  });
}

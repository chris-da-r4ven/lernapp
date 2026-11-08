// Hinweise in der Rundenbilanz: neue Medaille, Medaillen-Fortschritt nach einem Test,
// „Teste dich doch mal!“ und der Hinweis auf weniger Sternchen bei gekonnten Lektionen.

import { esc } from '../util.js';
import { MEDAL_BONUS } from '../srs.js';
import { MEDAL_PCT, MEDAL_DAYS, testReady } from '../medal.js';
import { kindInfo, countWord } from '../lessons.js';

export const newMedalsHtml = (lessons) => lessons.map((lesson) => `
  <div class="medal-new"><span class="medal" aria-hidden="true">🏅</span>
    <span><strong>Medaille!</strong> „${esc(lesson.title)}“ kannst du jetzt richtig gut.<br>
    <span class="small">✦ +${MEDAL_BONUS} Medaillen-Bonus</span></span></div>`).join('');

// Eine Zeile pro Lektion: Medaillen-Stand nach diesem Test (progress aus medal.saveTest).
export function medalProgressHtml(progress) {
  return progress.map((p) => {
    if (p.before.medal || p.after.medal) return '';   // schon da bzw. gerade gewonnen (eigene Meldung)
    const words = (n) => countWord(kindInfo(p.lesson).unit, n);
    let text;
    if (p.pct >= MEDAL_PCT && p.goodToday) {
      text = `${p.pct} % – super! Heute hast du die ${MEDAL_PCT} % aber schon geschafft. Der zweite Test zählt erst an einem anderen Tag.`;
    } else if (p.pct >= MEDAL_PCT) {
      text = `<strong>${p.after.goodDays} von ${MEDAL_DAYS}</strong> geschafft! Mach den nächsten Test an einem anderen Tag.`;
    } else {
      const missing = Math.ceil((MEDAL_PCT / 100) * p.total) - p.right;
      text = `${p.pct} % – ${missing <= 2 ? `nur <strong>${words(missing)}</strong>` : words(missing)} ${missing === 1 ? 'fehlte' : 'fehlten'} für die Medaillen-Wertung.`
        + (p.after.goodDays ? ` ${p.after.goodDays} von ${MEDAL_DAYS} hast du schon.` : '');
    }
    return `<p class="medal-progress">🏅 <strong>${esc(p.lesson.title)}:</strong> ${text}</p>`;
  }).join('');
}

// Nach einer normalen Runde: bis zu zwei Lektionen vorschlagen, die bereit für den Test sind.
// lessons: [{ sid, lesson }]
export function readyNoticeHtml(lessons) {
  return lessons.filter((x) => testReady(x.sid, x.lesson)).slice(0, 2).map(({ sid, lesson }) => `
    <div class="test-ready">
      <span class="test-ready-icon" aria-hidden="true">📝</span>
      <span>„${esc(lesson.title)}“ kannst du schon ziemlich gut – <strong>teste dich doch mal!</strong></span>
      <a class="btn primary small" href="#/test/${encodeURIComponent(sid)}/${encodeURIComponent(lesson.id)}">Zum Test</a>
    </div>`).join('');
}

export const MASTERED_HTML = `
  <p class="muted small mastered-note">🏅 Diese Lektion kannst du schon – dafür gibt es weniger Sternchen. Probier doch eine andere!</p>`;

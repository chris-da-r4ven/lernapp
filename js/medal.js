// Medaille 🏅 „Kannst du schon gut“ für eine Lektion.
// Vokabeln: zweimal mindestens 90 % im Test-Modus, an zwei verschiedenen Tagen.
// Grammatik (kein Test-Modus): mindestens 90 % der Sätze sitzen sicher.
// Eine Medaille geht nicht wieder verloren.

import { medalStatus, MEDAL_PCT, MEDAL_DAYS } from './store.js';
import { mastery } from './srs.js';

export function lessonMedal(sid, lesson) {
  if (lesson.grammar) {
    const m = mastery(sid, lesson);
    return {
      medal: m >= MEDAL_PCT / 100,
      started: m > 0,
      hint: `${Math.round(m * 100)} % der Sätze sitzen sicher – ab ${MEDAL_PCT} % gibt es die Medaille`,
    };
  }
  const s = medalStatus(`${sid}/${lesson.id}`);
  if (s.medal) return { medal: true, started: true, hint: 'Kannst du schon gut' };
  const hint = s.goodDays
    ? `${s.goodDays} von ${MEDAL_DAYS} Tests mit ${MEDAL_PCT} % geschafft – nächster Test an einem anderen Tag`
    : s.tests
      ? `Bester Test: ${s.best} % – ${MEDAL_DAYS}× ${MEDAL_PCT} % an verschiedenen Tagen bringt die Medaille`
      : `${MEDAL_DAYS}× ${MEDAL_PCT} % im Test-Modus (an verschiedenen Tagen) bringt die Medaille`;
  return { medal: false, started: s.tests > 0, hint };
}

export const MEDAL_RULE = `🏅 Medaille: ${MEDAL_DAYS}× mindestens ${MEDAL_PCT} % im Test-Modus, an verschiedenen Tagen`;

// Medaille 🏅 „Kannst du schon gut“ für eine Lektion.
// Vokabeln: zweimal mindestens 90 % im Test-Modus, an zwei verschiedenen Tagen.
// Ohne Test-Modus (z. B. Grammatik): mindestens 90 % der Einträge sitzen sicher.
// Eine Medaille geht nicht wieder verloren.

import { medalStatus, testedToday, itemState, MEDAL_PCT, MEDAL_DAYS } from './store.js';
import { itemKey } from './srs.js';
import { kindInfo, masteryOf, towardTarget } from './lessons.js';

export function lessonMedal(sid, lesson) {
  if (!kindInfo(lesson).testable) {
    const m = masteryOf(sid, lesson);
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

// „Teste dich doch mal!“: genug geübt für einen Test?
// Mindestens 80 % der Wörter wurden schon zweimal richtig auf Englisch geschrieben
// (Deutsch → Englisch – genau das fragt der Test ab), noch keine Medaille,
// und heute gab es für diese Lektion noch keinen Test.
export const READY_SHARE = 0.8;
export const READY_RIGHT = 2;

export function testReady(sid, lesson) {
  if (!lesson || !kindInfo(lesson).testable || !lesson.items?.length) return false;
  const key = `${sid}/${lesson.id}`;
  const s = medalStatus(key);
  if (s.medal || testedToday(key)) return false;
  const dir = towardTarget(lesson);
  const ok = lesson.items.filter((it) => itemState(itemKey(sid, lesson.id, it, dir)).right >= READY_RIGHT).length;
  return ok / lesson.items.length >= READY_SHARE;
}

// Medaille 🏅 „Kannst du schon gut“ für eine Lektion.
// Vokabeln: zweimal mindestens 90 % im Test-Modus, an zwei verschiedenen Tagen.
// Ohne Test-Modus (z. B. Grammatik): mindestens 90 % der Einträge sitzen sicher.
// Eine Medaille geht nicht wieder verloren.

import { testResults, addTestResult, itemState, save } from './store.js';
import { itemKey } from './srs.js';
import { dayKey } from './util.js';
import { kindInfo, masteryOf, masteryMode, lessonKey, coreItems } from './lessons.js';

export const MEDAL_PCT = 90;
export const MEDAL_DAYS = 2;

// Stand der Tests einer Lektion (key = lessonKey).
export function medalStatus(key) {
  const list = testResults(key);
  const goodDays = new Set(list.filter((r) => r.pct >= MEDAL_PCT).map((r) => r.day));
  const best = list.reduce((m, r) => Math.max(m, r.pct), 0);
  return { medal: goodDays.size >= MEDAL_DAYS, goodDays: goodDays.size, tests: list.length, best };
}

// Heute schon getestet? minPct: nur Tests zählen, die mindestens so gut waren.
export const testedToday = (key, minPct = 0) =>
  testResults(key).some((r) => r.day === dayKey() && r.pct >= minPct);

export function lessonMedal(sid, lesson) {
  if (!kindInfo(lesson).testable) {
    const m = masteryOf(sid, lesson);
    return {
      medal: m >= MEDAL_PCT / 100,
      started: m > 0,
      hint: `${Math.round(m * 100)} % der Sätze sitzen sicher – ab ${MEDAL_PCT} % gibt es die Medaille`,
    };
  }
  const s = medalStatus(lessonKey(sid, lesson));
  if (s.medal) return { medal: true, started: true, hint: 'Kannst du schon gut' };
  const hint = s.goodDays
    ? `${s.goodDays} von ${MEDAL_DAYS} Tests mit ${MEDAL_PCT} % geschafft – nächster Test an einem anderen Tag`
    : s.tests
      ? `Bester Test: ${s.best} % – ${MEDAL_DAYS}× ${MEDAL_PCT} % an verschiedenen Tagen bringt die Medaille`
      : `${MEDAL_DAYS}× ${MEDAL_PCT} % im Test-Modus (an verschiedenen Tagen) bringt die Medaille`;
  return { medal: false, started: s.tests > 0, hint };
}

export const MEDAL_RULE = `🏅 Medaille: ${MEDAL_DAYS}× mindestens ${MEDAL_PCT} % im Test-Modus, an verschiedenen Tagen`;

// Ein Test ist vorbei: Ergebnis pro beteiligter Lektion speichern.
// results: [{ sid, lesson, right: bool }] – liefert pro Lektion den Stand vorher/nachher (für die Bilanz).
export function saveTest(results) {
  const byLesson = new Map();
  for (const r of results) {
    const k = lessonKey(r.sid, r.lesson);
    const x = byLesson.get(k) ?? { lesson: r.lesson, right: 0, total: 0 };
    x.total++;
    if (r.right) x.right++;
    byLesson.set(k, x);
  }
  const progress = [];
  for (const [k, x] of byLesson) {
    const pct = Math.round((x.right / x.total) * 100);
    const before = medalStatus(k);
    const goodToday = testedToday(k, MEDAL_PCT);
    addTestResult(k, pct);
    progress.push({ ...x, pct, before, after: medalStatus(k), goodToday });
  }
  save();
  return progress;
}

// „Teste dich doch mal!“: genug geübt für einen Test?
// Mindestens 80 % der Einträge wurden schon zweimal richtig gelöst – in der Übungsart, die der
// Test abfragt (Vokabeln: Deutsch → Englisch, Mathe: Aufgaben lösen), noch keine Medaille,
// und heute gab es für diese Lektion noch keinen Test.
export const READY_SHARE = 0.8;
export const READY_RIGHT = 2;

export function testReady(sid, lesson) {
  const items = coreItems(lesson);
  if (!lesson || !kindInfo(lesson).testable || !items.length) return false;
  const key = lessonKey(sid, lesson);
  const s = medalStatus(key);
  if (s.medal || testedToday(key)) return false;
  const dir = masteryMode(lesson);
  const ok = items.filter((it) => itemState(itemKey(sid, lesson.id, it, dir)).right >= READY_RIGHT).length;
  return ok / items.length >= READY_SHARE;
}

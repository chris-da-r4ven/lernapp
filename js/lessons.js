// Was für eine Lektion ist das? Lektionsart, Lernsprache, Fortschritt.
//
// Lektionsarten ("kind" in der Lektionsdatei):
//   vokabeln  – Wortpaare, alle passenden Übungsarten, Test-Modus, Medaille über Tests
//   grammatik – Sätze mit Lücke und Auswahl, nur „Richtige Form“, Medaille über sicher sitzende Sätze
// Später z. B. „lesetext“ oder „quiz“: hier eine Art ergänzen, in modes.js passende Übungsarten.
//
// Sprachen: Jede Lektion hat zwei Seiten (a, b). Die Lernsprache ("target") ist die Seite,
// die nicht Deutsch ist. Ihre Sprache bestimmt die Stimme beim Vorlesen.

import { itemState } from './store.js';
import { itemKey, SAFE_BOX } from './srs.js';

export const KINDS = {
  vokabeln: { unit: ['Wort', 'Wörter'], testable: true },
  grammatik: { unit: ['Satz', 'Sätze'], testable: false },
};

// "grammar": true war das alte Format (Inhalte bis Version 9) – noch verstehen,
// falls ein Gerät die neue App, aber noch die alten Inhalte hat.
export const kindOf = (lesson) => (KINDS[lesson?.kind] ? lesson.kind : lesson?.grammar ? 'grammatik' : 'vokabeln');
export const kindInfo = (lesson) => KINDS[kindOf(lesson)];
export const unitWord = (lesson, n) => kindInfo(lesson).unit[n === 1 ? 0 : 1];

// Sprachcode je Seitenname (falls die Lektion keine "langs" angibt).
const LANG_BY_NAME = { Deutsch: 'de-DE', Englisch: 'en-GB', Französisch: 'fr-FR', Spanisch: 'es-ES', Latein: 'la' };

export const otherSide = (side) => (side === 'b' ? 'a' : 'b');

// Seite in der Lernsprache: angegeben ("target") oder die, die nicht Deutsch ist.
export function targetSide(lesson) {
  if (lesson?.target === 'a' || lesson?.target === 'b') return lesson.target;
  return lesson?.sides?.b === 'Deutsch' ? 'a' : 'b';
}
export const nativeSide = (lesson) => otherSide(targetSide(lesson));

export const langOf = (lesson, side = targetSide(lesson)) =>
  lesson?.langs?.[side] ?? LANG_BY_NAME[lesson?.sides?.[side]] ?? 'en-GB';

// Schreibrichtung „Muttersprache → Lernsprache“ – die fragt der Test ab.
export const towardTarget = (lesson) => (targetSide(lesson) === 'b' ? 'ab' : 'ba');

// Übungsart, nach der eine Lektion als „sicher“ zählt (Sterne, Prozent, Grammatik-Medaille).
export const masteryMode = (lesson) => (kindOf(lesson) === 'grammatik' ? 'form' : towardTarget(lesson));

// Anteil sicherer Einträge einer Lektion (0..1).
export function masteryOf(sid, lesson, mode = masteryMode(lesson)) {
  if (!lesson?.items?.length) return 0;
  const safe = lesson.items.filter((it) => itemState(itemKey(sid, lesson.id, it, mode)).box >= SAFE_BOX).length;
  return safe / lesson.items.length;
}

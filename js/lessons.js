// Was für eine Lektion ist das? Lektionsart, Lernsprache, Fortschritt.
//
// Lektionsarten ("kind" in der Lektionsdatei):
//   vokabeln  – Wortpaare, alle passenden Übungsarten, Test-Modus, Medaille über Tests
//   grammatik – Sätze mit Lücke und Auswahl, nur „Richtige Form“, Medaille über sicher sitzende Sätze
//   mathe     – Aufgabe (a) und Lösung (b), eintippen oder antippen, ggf. mit Grafik; Test-Modus
// Später z. B. „lesetext“ oder „quiz“: hier eine Art ergänzen, in modes.js passende Übungsarten.
// Alles, was eine Art von den anderen unterscheidet, steht in KINDS – nicht verstreut in den Seiten:
//   unit         Einheit [Einzahl, Mehrzahl]; countsAs: zählt in gemischten Angaben wie diese Art
//   testable     Test-Modus möglich (sonst Medaille über „sicher“); test, testLabel – Texte dazu
//   mastery      Übungsart für „sicher“, Test und Medaille (ohne Angabe: Muttersprache → Lernsprache)
//   showAnswers  Lösungen in der Liste der Lektion zeigen (Wortliste ja, Mathe-Lösungen nein)
//   language     Sprachlektion mit zwei Seiten (sides) – Vorlesen, Lernsprache
//
// Sprachen: Jede Lektion hat zwei Seiten (a, b). Die Lernsprache ("target") ist die Seite,
// die nicht Deutsch ist. Ihre Sprache bestimmt die Stimme beim Vorlesen.

import { itemState } from './store.js';
import { itemKey, SAFE_BOX } from './srs.js';
import { levelOf } from './levels.js';

export const KINDS = {
  vokabeln: {
    unit: ['Wort', 'Wörter'], language: true, testable: true, showAnswers: true, testLabel: 'wie im Vokabeltest',
    test: 'Wie im Vokabeltest: Du bekommst das deutsche Wort und schreibst es in der Fremdsprache. Jedes Wort kommt nur einmal, ohne Hilfe.',
  },
  grammatik: { unit: ['Satz', 'Sätze'], countsAs: 'vokabeln', language: true, testable: false, showAnswers: true, mastery: 'form' },
  mathe: {
    unit: ['Aufgabe', 'Aufgaben'], testable: true, showAnswers: false, mastery: 'rechnen', testLabel: 'wie eine Klassenarbeit',
    test: 'Wie in einer Klassenarbeit: Jede Aufgabe kommt nur einmal, ohne Hilfe.',
  },
};

// "grammar": true war das alte Format (Inhalte bis Version 9) – noch verstehen,
// falls ein Gerät die neue App, aber noch die alten Inhalte hat.
export const kindOf = (lesson) => {
  if (KINDS[lesson?.kind]) return lesson.kind;
  if (lesson?.kind) return null;              // Art, die diese App (noch) nicht kennt
  return lesson?.grammar ? 'grammatik' : 'vokabeln';
};
// Kann diese App die Lektion darstellen? (Unbekannte Arten werden ausgeblendet statt falsch gezeigt.)
export const isSupported = (lesson) => Boolean(lesson && kindOf(lesson) && Array.isArray(lesson.items));
export const kindInfo = (lesson) => KINDS[kindOf(lesson)];
export const unitWord = (lesson, n) => kindInfo(lesson).unit[n === 1 ? 0 : 1];

// Einheit für mehrere Lektionen (z. B. Ausritt): gleiche Art → deren Wort, sonst „Aufgaben“.
// Grammatik zählt dabei wie Vokabeln (countsAs) – Englisch bleibt „Wörter“.
export function unitOf(lessons) {
  const kinds = new Set(lessons.map(kindOf));
  if (kinds.size === 1) return KINDS[[...kinds][0]].unit;
  const mixed = new Set([...kinds].map((k) => KINDS[k]?.countsAs ?? k));
  return mixed.size === 1 ? KINDS[[...mixed][0]].unit : ['Aufgabe', 'Aufgaben'];
}
export const countWord = (unit, n) => `${n} ${unit[n === 1 ? 0 : 1]}`;

// Schlüssel einer Lektion im Lernstand (Tests, Medaille): "<fach>/<lektion>"
export const lessonKey = (sid, lesson) => `${sid}/${lesson.id}`;

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

// Übungsart, nach der eine Lektion als „sicher“ zählt (Sterne, Prozent, Medaille) – und die der Test abfragt.
export const masteryMode = (lesson) => kindInfo(lesson)?.mastery ?? towardTarget(lesson);

// Einträge, die für Test, Medaille und „sicher“ zählen (ohne Experten-Aufgaben).
export const coreItems = (lesson) => (lesson?.items ?? []).filter((it) => levelOf(it) !== 3);

// Anteil sicherer Einträge einer Lektion (0..1).
export function masteryOf(sid, lesson, mode = masteryMode(lesson)) {
  const items = coreItems(lesson);
  if (!items.length) return 0;
  const safe = items.filter((it) => itemState(itemKey(sid, lesson.id, it, mode)).box >= SAFE_BOX).length;
  return safe / items.length;
}

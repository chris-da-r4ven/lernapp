// „Sitzt“ und „wackelt“ pro Wort – über alle Übungsarten hinweg, mit Abstand.
//
// Der Karteikasten (srs.js) plant Wiederholungen weiter pro Wort und Übungsart. Für die Einschätzung
// „neu · wackelt · sitzt“ zählt dagegen das Wort als Ganzes:
// - Jeder Abruf auf Anhieb in einer starken Übungsart bringt das Wort eine Stufe weiter (lv 0–5) – stark
//   heißt: eingetippt (Schreiben in beide Richtungen, Diktat, Lückensatz, Form eintippen) oder die
//   Übungsart, die auch Test und Medaille zählen (masteryMode – bei Grammatik das Antippen der Form).
// - Höchstens eine Stufe pro Tag: Weitere Treffer am selben Tag festigen, bringen aber nicht weiter.
// - Ein Fehler in einer starken Übungsart setzt auf Stufe 1 (wackelt) zurück. Antippen bringt ein Wort
//   höchstens auf „wackelt“, ein Antipp-Fehler ändert nichts (das sind oft Flüchtigkeitsfehler).
// - „Sitzt“ = Stufe 3 (also an 3 verschiedenen Tagen auf Anhieb richtig) und seit dem letzten Fehler
//   mindestens einmal in der Übungsart des Tests (test).
//
// Wörter ohne eigenen Eintrag (vor dieser Wertung geübt) werden aus dem Karteikasten abgeleitet:
// Stufe = bestes Fach einer starken Übungsart, test = in der Test-Übungsart schon richtig.

import { itemState, wordEntry, setWordEntry } from './store.js';
import { itemKey, SAFE_BOX, status } from './srs.js';
import { masteryMode, coreItems } from './lessons.js';
import { modeById, storeMode, usableFor } from './exercises/registry.js';
import { MODES } from './exercises/modes.js';
import { dayKey } from './util.js';

export const WORD_MAX = 5;

export const wordKey = (sid, lesson, item) => `${sid}/${lesson.id}/${item.id ?? item.b}`;

// Eingetippt (nicht aus Antworten gewählt)?
const typedMode = (modeId, item) => (modeById(modeId)?.answer?.(item ?? {}) ?? 1) >= 1;
// Zählt diese Übungsart als Beleg fürs „Sitzt“?
export const strongMode = (modeId, item, lesson) => typedMode(modeId, item) || storeMode(modeId) === masteryMode(lesson);

// Aus dem Karteikasten abgeleitet (für Wörter ohne eigenen Eintrag).
function derive(sid, lesson, item) {
  let lv = 0;
  let last = 0;
  let any = false;
  // alle Übungsarten (auch solche, die die Lektion gerade nicht anbietet, z. B. Hören ohne Sprachausgabe)
  for (const m of MODES) {
    if (!usableFor(m, item)) continue;
    const st = itemState(itemKey(sid, lesson.id, item, storeMode(m.id)));
    if (st.box > 0) any = true;
    if (!strongMode(m.id, item, lesson) || st.box <= 0) continue;
    lv = Math.max(lv, st.box);
    last = Math.max(last, st.last ?? 0);
  }
  const test = itemState(itemKey(sid, lesson.id, item, masteryMode(lesson))).box > 0;
  return { lv: lv || (any ? 1 : 0), day: last ? dayKey(new Date(last)) : '', test, last, at: 0 };
}

export const wordInfo = (sid, lesson, item) => wordEntry(wordKey(sid, lesson, item)) ?? derive(sid, lesson, item);

// Wirksames Fach: ohne Abruf in der Test-Übungsart höchstens „wackelt“.
export const wordBox = (w) => (w.test ? w.lv : Math.min(w.lv, SAFE_BOX - 1));
// { box, last } – passt zu exams.recentShare und srs.status.
export function wordState(sid, lesson, item) {
  const w = wordInfo(sid, lesson, item);
  return { box: wordBox(w), last: w.last };
}
export const wordStatus = (sid, lesson, item) => status(wordState(sid, lesson, item));

// Anteil der Einträge einer Lektion, die sitzen (0..1) – für Sterne, Medaille (Grammatik) und Anzeigen.
export function masteryOf(sid, lesson) {
  const items = coreItems(lesson);
  if (!items.length) return 0;
  return items.filter((it) => wordStatus(sid, lesson, it) === 'sicher').length / items.length;
}

// Neuer Stand nach einer Antwort (rein, im Selbsttest geprüft).
// strong: starke Übungsart; isTest: die Übungsart des Tests; today: "JJJJ-MM-TT".
export function nextWord(w, { correct, firstTry = false, hold = false, strong, isTest, today, now }) {
  const out = { ...w, at: now };
  if (!correct) {
    if (!strong) return null;              // Antipp-Fehler: keine Änderung
    return { ...out, lv: 1, test: false };
  }
  if (!strong || hold || !firstTry) return { ...out, lv: Math.max(out.lv, 1) };
  if (out.day !== today) { out.lv = Math.min(out.lv + 1, WORD_MAX); out.day = today; } else out.lv = Math.max(out.lv, 1);
  if (isTest) out.test = true;
  out.last = now;
  return out;
}

// Antwort eintragen (aus round.js). task: { sid, lesson, item, dir }.
export function recordWord(task, { correct, firstTry = false, hold = false }) {
  const { sid, lesson, item, dir } = task ?? {};
  if (!sid || !lesson?.id || !item) return;
  const next = nextWord(wordInfo(sid, lesson, item), {
    correct, firstTry, hold,
    strong: strongMode(dir, item, lesson),
    isTest: storeMode(dir) === masteryMode(lesson),
    today: dayKey(), now: Date.now(),
  });
  if (next) setWordEntry(wordKey(sid, lesson, item), next);
}

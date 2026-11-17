// Runden fürs Reitturnier (siehe exams.js):
// - Turniertraining: 12 Aufgaben nur aus den offenen Turnierlektionen, nur schon gelernte Wörter
//   (neue kommen über die Etappen), etwa ⅔ wackelig und ⅓ sicher, mit einem sicheren Wort vorneweg.
//   Abrufen bevorzugt, meist in der Richtung wie im Test (masteryMode).
// - Generalprobe: schon gelernte Wörter der offenen Turnierlektionen (höchstens 30) einmal ohne Hilfe – zählt nicht als Test
//   (kein Testergebnis, keine Medaille), aber für den Karteikasten.

import { getSubject, getLesson } from './content.js';
import { coreItems, masteryMode, lessonKey } from './lessons.js';
import { itemState, pathEntry } from './store.js';
import { modesFor, tasksFor } from './exercises/registry.js';
import { lessonAccess, spreadModes, wordId } from './path.js';
import { itemKey, SAFE_BOX } from './srs.js';
import { shuffle } from './util.js';

export const TRAINING_SIZE = 12;
export const SHAKY_SHARE = 2 / 3;
const RECOGNIZE = new Set(['hoeren-wahl', 'form']);   // nur wiedererkennen – im Training nicht
export const GENERALPROBE_DAYS = 3;                    // ab so vielen Tagen vor dem Turnier

// Offene Lektionen eines Turniers (Lektionsobjekte).
export function openExamLessons(exam) {
  const subject = getSubject(exam.sid);
  if (!subject) return [];
  const all = subject.lessons.map((l) => getLesson(exam.sid, l.id)).filter(Boolean);
  const access = lessonAccess(exam.sid, all);
  return exam.lessons.map((lid) => all.find((l) => l.id === lid)).filter((l) => l && access.get(l.id) === 'open');
}

// Mischung fürs Training (rein, im Selbsttest geprüft): bis zu ⅔ wackelig, Rest sicher; fehlt eine Sorte,
// füllt die andere auf. Ein sicheres Wort vorneweg (kleiner Erfolg zum Einstieg).
export function mixTraining(shaky, sure, size = TRAINING_SIZE) {
  const nShaky = Math.min(shaky.length, Math.max(size - sure.length, Math.round(size * SHAKY_SHARE)));
  const nSure = Math.min(sure.length, size - nShaky);
  const a = shaky.slice(0, nShaky);
  const b = sure.slice(0, nSure);
  return { first: b[0] ?? null, rest: [...a, ...b.slice(1)] };
}

// Turniertraining: Aufgaben (wie in round.js).
export function trainingTasks(exam) {
  const shaky = [];
  const sure = [];
  for (const lesson of openExamLessons(exam)) {
    const sid = exam.sid;
    const test = masteryMode(lesson);
    const learned = pathEntry(lessonKey(sid, lesson)).learned ?? {};
    const modes = modesFor(lesson).filter((m) => !m.optIn && !RECOGNIZE.has(m.id)).map((m) => m.id);
    const byWord = new Map();
    for (const m of modes) for (const t of tasksFor(sid, lesson, m)) {
      const w = wordId(t.item);
      if (!byWord.has(w)) byWord.set(w, []);
      byWord.get(w).push({ ...t, st: itemState(t.key) });
    }
    for (const item of coreItems(lesson)) {
      const list = byWord.get(wordId(item)) ?? [];
      const started = Object.hasOwn(learned, wordId(item)) || list.some((t) => t.st.box > 0);
      if (!list.length || !started) continue;   // neue Wörter nur über den Lernweg
      // meist die Richtung wie im Test, sonst eine andere Abruf-Übungsart
      const own = list.find((t) => t.dir === test);
      const task = own && (Math.random() < 0.6 || list.length === 1) ? own : shuffle(list)[0];
      const box = itemState(itemKey(sid, lesson.id, item, test)).box;
      (box < SAFE_BOX ? shaky : sure).push(task);
    }
  }
  // wackeligste zuerst ausgewählt (niedriges Fach), dann gemischt
  shaky.sort((x, y) => x.st.box - y.st.box || Math.random() - 0.5);
  const { first, rest } = mixTraining(shaky, shuffle(sure));
  const tail = spreadModes(shuffle(rest));
  return first ? [first, ...tail] : tail;
}

// Generalprobe: schon gelernte Kernwörter der offenen Lektionen in der Übungsart des Tests – höchstens
// GENERALPROBE_MAX, gleichmäßig über die Lektionen verteilt (ungelernte Wörter gehören erst in den Lernweg).
export const GENERALPROBE_MAX = 30;
export function generalprobeTasks(exam) {
  const per = openExamLessons(exam).map((lesson) => {
    const learned = pathEntry(lessonKey(exam.sid, lesson)).learned ?? {};
    const core = new Set(coreItems(lesson));
    return shuffle(tasksFor(exam.sid, lesson, masteryMode(lesson))
      .filter((t) => core.has(t.item) && (Object.hasOwn(learned, wordId(t.item)) || itemState(t.key).box > 0)));
  });
  const out = [];
  for (let i = 0; out.length < GENERALPROBE_MAX && per.some((l) => i < l.length); i++) {
    for (const list of per) if (i < list.length && out.length < GENERALPROBE_MAX) out.push(list[i]);
  }
  return shuffle(out);
}

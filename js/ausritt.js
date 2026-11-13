// 🌳 Ausritt (Auffrischen): gemischte Runde aus allem, was wieder dran ist – ersetzt „Jetzt üben“.
//
// - Nur Wiederholungen: Wörter, die schon geübt wurden (Fach > 0) und fällig sind, die wackeligsten zuerst.
//   Neue Wörter kommen nur über den Lernweg (path.js).
// - Pro Wort eine Aufgabe, möglichst in einer anderen Übungsart als beim letzten Mal und eher abrufen
//   (schreiben) als antippen – damit es sich nicht wie dieselbe Wiederholung anfühlt.
// - Höchstens zwei gleiche Übungsarten hintereinander (wenn möglich), Fächer gemischt.

import { allLessons, contentVersion } from './content.js';
import { itemState, revision } from './store.js';
import { modesFor, tasksFor } from './exercises/registry.js';
import { isBasic, withWarmup, WARMUP } from './levels.js';
import { spreadModes } from './path.js';
import { shuffle } from './util.js';

export const ROUND_SIZE = 12;
// Übungsarten, die nur wiedererkennen – im Ausritt nur, wenn es nichts anderes gibt.
const RECOGNIZE = new Set(['hoeren-wahl', 'form']);

// Alle Aufgaben aller Lektionen – zwischengespeichert, solange sich Inhalte und Lernstand nicht ändern.
let cache = { key: null, tasks: [] };
function allTasks() {
  const key = `${contentVersion()}|${revision()}`;
  if (cache.key === key) return cache.tasks;
  const tasks = [];
  for (const { sid, lesson } of allLessons()) {
    for (const m of modesFor(lesson).filter((x) => !x.optIn)) {   // Experten-Aufgaben nur auf Wunsch
      for (const t of tasksFor(sid, lesson, m.id)) {
        tasks.push({ ...t, st: itemState(t.key), word: t.key.split('|')[0] });
      }
    }
  }
  cache = { key, tasks };
  return tasks;
}

const isDue = (t, now) => t.st.box > 0 && t.st.due <= now;

// Pro Wort: geübte Aufgaben (Fach > 0), gruppiert.
function byWord(tasks) {
  const words = new Map();
  for (const t of tasks) {
    if (t.st.box === 0) continue;
    if (!words.has(t.word)) words.set(t.word, []);
    words.get(t.word).push(t);
  }
  return words;
}

// Die Aufgabe, mit der ein Wort diesmal drankommt.
export function pickTask(list, now = Date.now()) {
  const lastDir = list.reduce((a, b) => ((b.st.last ?? 0) > (a.st.last ?? 0) ? b : a)).dir;
  const score = (t) => (isDue(t, now) ? 0 : 4) + (t.dir === lastDir && list.length > 1 ? 2 : 0) + (RECOGNIZE.has(t.dir) ? 1 : 0) + Math.random() * 0.5;
  return [...list].sort((a, b) => score(a) - score(b))[0];
}

// Wie viel wartet gerade? (für die Startseite) – Anzahl fälliger Wörter.
export function dueSummary() {
  const now = Date.now();
  let due = 0;
  for (const list of byWord(allTasks()).values()) if (list.some((t) => isDue(t, now))) due++;
  return { due };
}

// anyway: auch wenn nichts fällig ist – dann die Wörter, die am ehesten wieder dran wären.
export function buildAusritt({ anyway = false } = {}) {
  const now = Date.now();
  const words = [...byWord(allTasks()).values()];
  const minBox = (list) => Math.min(...list.map((t) => t.st.box));
  const nextDue = (list) => Math.min(...list.map((t) => t.st.due));
  let pick = words.filter((list) => list.some((t) => isDue(t, now)));
  if (!pick.length && anyway) pick = [...words].sort((a, b) => nextDue(a) - nextDue(b)).slice(0, ROUND_SIZE);
  const candidates = shuffle(pick).sort((a, b) => minBox(a) - minBox(b)).map((list) => pickTask(list, now));
  // Höchstens WARMUP Basis-Aufgaben vorneweg, der Rest gemischt.
  const round = withWarmup(candidates, ROUND_SIZE);
  const warm = round.filter((t) => isBasic(t.item)).slice(0, WARMUP);
  return [...warm, ...spreadModes(shuffle(round.filter((t) => !warm.includes(t))))];
}

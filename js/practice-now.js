// „Jetzt üben“: stellt eine Runde aus allen Lektionen und Übungsarten zusammen.
//
// - Zuerst fällige Wiederholungen (Wörter, die schon geübt wurden und wieder dran sind),
//   die wackeligsten zuerst.
// - Danach neue Aufgaben. Ein Wort lernt sie in einer festen Reihenfolge kennen:
//   learnOrder in modes.js – erst hören und antippen (leicht), dann schreiben, Diktat, Lückensatz.
// - Jedes Wort höchstens einmal pro Runde.

import { allLessons, contentVersion } from './content.js';
import { itemState, revision } from './store.js';
import { modesFor, tasksFor, learnOrderOf } from './exercises/registry.js';
import { isBasic, withWarmup, WARMUP } from './levels.js';
import { shuffle } from './util.js';

export const ROUND_SIZE = 12;

// Alle Aufgaben aller Lektionen – zwischengespeichert, solange sich Inhalte und Lernstand nicht ändern
// (die Startseite fragt bei jedem Aufruf danach).
let cache = { key: null, tasks: [] };
function allTasks() {
  const key = `${contentVersion()}|${revision()}`;
  if (cache.key === key) return cache.tasks;
  const tasks = [];
  for (const { sid, lesson } of allLessons()) {
    for (const m of modesFor(lesson).filter((x) => !x.optIn)) {   // Experten-Aufgaben nur auf Wunsch
      for (const t of tasksFor(sid, lesson, m.id)) {
        tasks.push({ ...t, st: itemState(t.key), word: `${sid}/${lesson.id}/${t.item.id}` });
      }
    }
  }
  cache = { key, tasks };
  return tasks;
}

const isDue = (t, now) => t.st.box > 0 && t.st.due <= now;
const isNew = (t) => t.st.box === 0;
const newRank = (t) => learnOrderOf(t.dir);

// Wie viel wartet gerade? (für die Startseite)
export function dueSummary() {
  const now = Date.now();
  const tasks = allTasks();
  const due = new Set(tasks.filter((t) => isDue(t, now)).map((t) => t.word));
  const started = new Set(tasks.filter((t) => !isNew(t)).map((t) => t.word));
  const words = new Set(tasks.map((t) => t.word));
  const fresh = [...words].filter((w) => !started.has(w)).length;
  // angefangene Wörter, bei denen noch eine Übungsart neu ist
  const steps = new Set(tasks.filter((t) => isNew(t) && started.has(t.word)).map((t) => t.word)).size;
  return { due: due.size, fresh, steps };
}

// anyway: auch wenn nichts fällig ist – dann die Wörter, die am ehesten wieder dran wären.
export function buildNowRound({ anyway = false } = {}) {
  const now = Date.now();
  const tasks = allTasks();
  // Kandidaten in Wunsch-Reihenfolge sammeln (jedes Wort nur einmal), dann mit Aufwärmen auswählen.
  const used = new Set();
  const candidates = [];
  const take = (list) => {
    for (const t of list) {
      if (used.has(t.word)) continue;
      used.add(t.word);
      candidates.push(t);
    }
  };

  // 1. fällige Wiederholungen
  take(shuffle(tasks.filter((t) => isDue(t, now))).sort((a, b) => a.st.box - b.st.box));

  // 2. neue Aufgaben: pro Wort die nächste Übungsart in der Lern-Reihenfolge,
  //    schwierige Wörter und Wörter, die schon angefangen sind, zuerst.
  const started = new Set(tasks.filter((t) => !isNew(t)).map((t) => t.word));
  const nextFor = new Map();
  for (const t of tasks.filter(isNew)) {
    const cur = nextFor.get(t.word);
    if (!cur || newRank(t) < newRank(cur)) nextFor.set(t.word, t);
  }
  const fresh = shuffle([...nextFor.values()]).sort((a, b) =>
    Number(started.has(b.word)) - Number(started.has(a.word))
    || Number(Boolean(b.item.hard)) - Number(Boolean(a.item.hard)));
  take(fresh);

  // 3. nichts fällig, nichts neu: auf Wunsch die, die als Nächstes dran wären
  if (anyway && !candidates.length) take([...tasks].sort((a, b) => a.st.due - b.st.due));

  // Höchstens WARMUP Basis-Aufgaben vorneweg, der Rest gemischt.
  const round = withWarmup(candidates, ROUND_SIZE);
  const warm = round.filter((t) => isBasic(t.item)).slice(0, WARMUP);
  return [...warm, ...shuffle(round.filter((t) => !warm.includes(t)))];
}

// „Jetzt üben“: stellt eine Runde aus allen Lektionen und Übungsarten zusammen.
//
// - Zuerst fällige Wiederholungen (Wörter, die schon geübt wurden und wieder dran sind),
//   die wackeligsten zuerst.
// - Danach neue Aufgaben. Ein Wort lernt sie in einer festen Reihenfolge kennen:
//   erst hören und antippen (leicht), dann schreiben, dann Diktat, dann Lückensatz.
// - Jedes Wort höchstens einmal pro Runde.

import { getSubjects, getLesson } from './content.js';
import { itemState } from './store.js';
import { modesFor, tasksFor, usableIn } from './exercises/registry.js';
import { shuffle } from './util.js';

export const ROUND_SIZE = 12;
const NEW_ORDER = ['hoeren-wahl', 'ab', 'ba', 'hoeren', 'satz'];

function allTasks() {
  const tasks = [];
  for (const s of getSubjects()) {
    for (const l of s.lessons) {
      const lesson = getLesson(s.id, l.id);
      if (!lesson) continue;
      for (const m of modesFor(lesson)) {
        for (const t of tasksFor(s.id, lesson, m.dir, (it) => usableIn(m.exId, it))) {
          tasks.push({ ...t, st: itemState(t.key), word: `${s.id}/${lesson.id}/${t.item.id ?? t.item.b}` });
        }
      }
    }
  }
  return tasks;
}

const isDue = (t, now) => t.st.box > 0 && t.st.due <= now;
const isNew = (t) => t.st.box === 0;
const newRank = (t) => { const i = NEW_ORDER.indexOf(t.dir); return i < 0 ? NEW_ORDER.length : i; };

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
  const used = new Set();
  const round = [];
  const take = (list) => {
    for (const t of list) {
      if (round.length >= ROUND_SIZE) return;
      if (used.has(t.word)) continue;
      used.add(t.word);
      round.push(t);
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
  if (anyway && !round.length) take([...tasks].sort((a, b) => a.st.due - b.st.due));

  return shuffle(round);
}

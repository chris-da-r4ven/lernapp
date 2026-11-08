// Übungsarten. Eine Lektion nennt in "exercises", welche davon passen.
// Übungen mit auto(lesson) werden zusätzlich angeboten, wenn sie passen
// (z. B. Hör-Übungen bei englischen Lektionen, wenn das Gerät vorlesen kann).
// Die eigentlichen Fragen stehen in questions.js, der Ablauf einer Runde in round.js.
// Neue Übungsarten (Mini-Spiele, Grammatik …) werden hier eingetragen.

import { itemKey, buildRound } from '../srs.js';
import { canSpeak, englishSide } from '../speech.js';
import { runRound } from './round.js';
import { parseGap } from './questions.js';

// Kurzform für Markierungen: Deutsch → DE, Englisch → EN.
const CODES = { Deutsch: 'DE', Englisch: 'EN' };
const code = (side) => CODES[side] ?? String(side).slice(0, 2).toUpperCase();

// Aufgaben einer Lektion für eine Übungsart (dir). usable: welche Wörter sich eignen.
export function tasksFor(sid, lesson, dir, usable = () => true) {
  return lesson.items.filter(usable).map((item) => ({ sid, lesson, item, dir, key: itemKey(sid, lesson.id, item, dir) }));
}

function exercise(def) {
  return {
    ...def,
    run(el, { sid, lesson, dir, all, onFinish }) {
      const self = this;
      const round = buildRound(tasksFor(sid, lesson, dir, def.usable), all);
      runRound(el, {
        tasks: round,
        onAgain: () => self.run(el, { sid, lesson, dir, all, onFinish }),
        onBack: () => onFinish?.(),
      });
    },
  };
}

const hasEnglish = (lesson) => Boolean(englishSide(lesson));

export const write = exercise({
  id: 'write',
  label: 'Schreiben',
  modes: (lesson) => [
    { dir: 'ab', label: `Schreiben: ${lesson.sides.a} → ${lesson.sides.b}`, short: `✍️ ${code(lesson.sides.a)}→${code(lesson.sides.b)}` },
    { dir: 'ba', label: `Schreiben: ${lesson.sides.b} → ${lesson.sides.a}`, short: `✍️ ${code(lesson.sides.b)}→${code(lesson.sides.a)}` },
  ],
});

export const dictation = exercise({
  id: 'hoeren',
  label: 'Hören → Englisch schreiben',
  group: 'hoeren',
  auto: (lesson) => canSpeak() && hasEnglish(lesson),
  modes: () => [{ dir: 'hoeren', label: '🔊 Hören → Englisch schreiben', short: '🔊 Diktat' }],
});

export const listenChoose = exercise({
  id: 'hoeren-wahl',
  label: 'Hören → Bedeutung antippen',
  group: 'hoeren',
  // Braucht mindestens 4 Wörter für die Auswahl.
  auto: (lesson) => canSpeak() && hasEnglish(lesson) && lesson.items.length >= 4,
  modes: () => [{ dir: 'hoeren-wahl', label: '🔊 Hören → Bedeutung antippen', short: '🔊 Antippen' }],
});

// Lückensätze: nur für Wörter mit Beispielsatz ("ex").
export const gap = exercise({
  id: 'satz',
  label: 'Lückensätze',
  auto: (lesson) => hasEnglish(lesson) && lesson.items.some((it) => parseGap(it.ex)),
  // Nur Sätze mit gültiger {Lücke} – ein Tippfehler im Inhalt soll keine Runde abstürzen lassen.
  usable: (item) => Boolean(parseGap(item.ex)),
  modes: () => [{ dir: 'satz', label: '📝 Lückensätze', short: '📝 Satz' }],
});

// Grammatik: richtige Form antippen (Lektionen mit "grammar": true).
export const form = exercise({
  id: 'form',
  label: 'Richtige Form',
  usable: (item) => Boolean(parseGap(item.ex) && item.choices?.length),
  modes: () => [{ dir: 'form', label: '✏️ Richtige Form antippen', short: '✏️ Form' }],
});

export const exercises = Object.fromEntries([write, dictation, listenChoose, gap, form].map((ex) => [ex.id, ex]));

export function exercisesFor(lesson) {
  const listed = (lesson.exercises ?? []).map((id) => exercises[id]).filter(Boolean);
  // Grammatik-Lektionen bekommen nur ihre eigenen Übungen.
  if (lesson.grammar) return listed;
  const auto = Object.values(exercises).filter((ex) => ex.auto?.(lesson) && !listed.includes(ex));
  return [...listed, ...auto];
}

// Alle Übungsarten einer Lektion als flache Liste (für Markierungen und Fortschritt).
export function modesFor(lesson) {
  return exercisesFor(lesson).flatMap((ex) => ex.modes(lesson).map((m) => ({ ...m, exId: ex.id })));
}

// Wörter, die in einer Übungsart vorkommen können.
export function usableIn(exId, item) {
  return exercises[exId]?.usable?.(item) ?? true;
}

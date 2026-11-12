// Welche Übungsarten passen zu einer Lektion – und alles, was sich daraus ableitet.
// Die Übungsarten selbst stehen in modes.js.
//
// Eine Lektion bekommt alle Übungsarten ihrer Lektionsart (lessons.js KINDS), die auf dem
// Gerät möglich sind und für die es passende Einträge gibt. Mit "modes": [...] in der
// Lektionsdatei lässt sich das auf bestimmte Übungsarten beschränken.

import { itemKey } from '../srs.js';
import { canSpeak } from '../speech.js';
import { kindOf } from '../lessons.js';
import { levelInfo } from '../levels.js';
import { MODES } from './modes.js';

const byId = new Map(MODES.map((m) => [m.id, m]));
export const modeById = (id) => byId.get(id);

export const usableFor = (mode, item) => mode.usable?.(item) ?? true;

// Übungsarten einer Lektion, in der Reihenfolge von MODES.
export function modesFor(lesson) {
  const kind = kindOf(lesson);
  return MODES.filter((m) =>
    (lesson.modes ? lesson.modes.includes(m.id) : m.kinds.includes(kind))
    && (!m.speech || canSpeak())
    && (!m.minItems || lesson.items.length >= m.minItems)
    && lesson.items.some((it) => usableFor(m, it)));
}

// Übungsarten mit gleicher group (z. B. die Hör-Übungen) gehören in eine Zeile.
export function modeGroups(lesson) {
  const groups = new Map();
  for (const m of modesFor(lesson)) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group).push(m);
  }
  return [...groups.values()];
}

// Aufgaben einer Lektion für eine Übungsart (nur passende Einträge).
export function tasksFor(sid, lesson, modeId) {
  const mode = modeById(modeId);
  return lesson.items
    .filter((item) => !mode || usableFor(mode, item))
    .map((item) => ({ sid, lesson, item, dir: modeId, key: itemKey(sid, lesson.id, item, modeId) }));
}

// Gewicht einer Aufgabe: Übungsart (ggf. je Eintrag, z. B. Antippen) × Schwierigkeitsstufe.
export const weightFor = (modeId, item = null) => {
  const m = modeById(modeId);
  const base = (item && m?.itemWeight?.(item)) ?? m?.weight ?? 1;
  return item ? Math.round(base * levelInfo(item).factor * 100) / 100 : base;
};
export const learnOrderOf = (modeId) => modeById(modeId)?.learnOrder ?? 99;
export const questionFor = (modeId) => modeById(modeId)?.question;

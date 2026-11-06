// Übungsarten. Eine Lektion nennt in "exercises", welche davon passen.
// Übungen mit auto(lesson) werden zusätzlich angeboten, wenn sie passen
// (z. B. Hör-Übungen bei englischen Lektionen, wenn das Gerät vorlesen kann).
// Neue Übungsarten (Mini-Spiele, Grammatik …) werden hier eingetragen.

import { write, dictation } from './write.js';
import { listenChoose } from './choose.js';

export const exercises = Object.fromEntries([write, dictation, listenChoose].map((ex) => [ex.id, ex]));

export function exercisesFor(lesson) {
  const listed = (lesson.exercises ?? []).map((id) => exercises[id]).filter(Boolean);
  const auto = Object.values(exercises).filter((ex) => ex.auto?.(lesson) && !listed.includes(ex));
  return [...listed, ...auto];
}

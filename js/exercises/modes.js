// Alle Übungsarten der App – jede ist genau EIN Eintrag in dieser Liste.
// Daraus leiten sich ab: Knöpfe in der Lektion, Adressen, Sternchen-Gewicht,
// Reihenfolge in „Jetzt üben“, Markierungen und Fortschrittsseite.
//
// Neue Übungsart (z. B. ein Quiz oder Spiel):
//   1. Fragetyp schreiben (describe, pair, render – siehe questions.js bzw. math.js).
//   2. Hier einen Eintrag ergänzen. Die id nie wieder ändern – an ihr hängt der Lernstand.
//   3. Passt sie zu einer neuen Lektionsart, diese in lessons.js (KINDS) ergänzen.
//   4. Neue Dateien in sw.js (SHELL) eintragen. tools/inhalte.py liest die ids aus dieser Datei.
//
// Felder:
//   id         Kennung (auch Teil des Lernstand-Schlüssels)
//   kinds      zu welchen Lektionsarten sie passt
//   group      Übungsarten mit gleicher group stehen in der Lektion in einer Zeile
//              (Reihenfolge der Liste = Reihenfolge der Knöpfe und Markierungen)
//   name       Klartext (z. B. für die Eltern-Übersicht)
//   label      Knopftext (Funktion der Lektion), short – Kurzform für Markierungen
//   answer     Antwortform (item) → Faktor, think – Denkaufwand (item) → Faktor; Schwere = answer × think
//              (Sternchen und Tagesziel, siehe weights.js)
//   learnOrder Reihenfolge, in der „Jetzt üben“ ein neues Wort durch die Übungsarten führt
//   speech     braucht Sprachausgabe; minItems – mindestens so viele Einträge in der Lektion
//   usable     welche Einträge sich eignen (z. B. nur mit Beispielsatz)
//   optIn      nur auf Wunsch (eigener Knopf) – nicht in „Jetzt üben“, kein Medaillen-Abschlag
//   storeAs    Lernstand unter dieser Übungsart ablegen (statt der eigenen id)
//   question   Fragetyp aus questions.js

import { writeQuestion, chooseQuestion, gapQuestion, formQuestion, parseGap, CHOICE_OPTIONS } from './questions.js';
import { ANSWER, THINK, choiceFactor } from '../weights.js';
import { mathQuestion } from './math.js';
import { targetSide } from '../lessons.js';
import { levelOf, levelInfo } from '../levels.js';

// Mathe: „Aufgaben lösen“ und „Experten-Aufgaben“ unterscheiden sich nur in der Stufe der Einträge.
const MATH = {
  kinds: ['mathe'],
  answer: (item) => (item.choices ? choiceFactor(item.choices.length) : ANSWER.tippen),
  think: (item) => item.denken ?? levelInfo(item).factor,   // Stufe gibt den Denkaufwand vor
  question: mathQuestion,
};

const CODES = { Deutsch: 'DE', Englisch: 'EN', Französisch: 'FR', Spanisch: 'ES', Latein: 'LA' };
const code = (side) => CODES[side] ?? String(side).slice(0, 2).toUpperCase();
const lang = (l) => l.sides[targetSide(l)];

export const MODES = [
  {
    id: 'ab',
    name: 'Schreiben',
    kinds: ['vokabeln'],
    group: 'schreiben',
    label: (l) => `Schreiben: ${l.sides.a} → ${l.sides.b}`,
    short: (l) => `✍️ ${code(l.sides.a)}→${code(l.sides.b)}`,
    answer: () => ANSWER.tippen,
    think: () => THINK.abrufen,
    learnOrder: 3,
    question: writeQuestion,
  },
  {
    id: 'ba',
    name: 'Schreiben',
    kinds: ['vokabeln'],
    group: 'schreiben',
    label: (l) => `Schreiben: ${l.sides.b} → ${l.sides.a}`,
    short: (l) => `✍️ ${code(l.sides.b)}→${code(l.sides.a)}`,
    answer: () => ANSWER.tippen,
    think: () => THINK.abrufen,
    learnOrder: 4,
    question: writeQuestion,
  },
  {
    id: 'hoeren',
    name: 'Diktat',
    kinds: ['vokabeln'],
    group: 'hoeren',
    label: (l) => `🔊 Hören → ${lang(l)} schreiben`,
    short: () => '🔊 Diktat',
    answer: () => ANSWER.diktat,
    think: () => THINK.abrufen,
    learnOrder: 5,
    speech: true,
    question: writeQuestion,
  },
  {
    id: 'hoeren-wahl',
    name: 'Hören & antippen',
    kinds: ['vokabeln'],
    group: 'hoeren',
    label: () => '🔊 Hören → Bedeutung antippen',
    short: () => '🔊 Antippen',
    answer: () => choiceFactor(CHOICE_OPTIONS),
    think: () => THINK.erkennen,
    learnOrder: 1,
    speech: true,
    minItems: 4,
    question: chooseQuestion,
  },
  {
    id: 'satz',
    name: 'Lückensatz',
    kinds: ['vokabeln'],
    group: 'satz',
    label: () => '📝 Lückensätze',
    short: () => '📝 Satz',
    answer: () => ANSWER.tippen,
    think: () => THINK.kontext,
    learnOrder: 6,
    usable: (item) => Boolean(parseGap(item.ex)),
    question: gapQuestion,
  },
  {
    id: 'form',
    name: 'Richtige Form',
    kinds: ['grammatik'],
    group: 'form',
    label: () => '✏️ Richtige Form antippen',
    short: () => '✏️ Form',
    answer: (item) => choiceFactor(item.choices?.length ?? 3),
    think: () => THINK.routine,
    learnOrder: 2,
    usable: (item) => Boolean(parseGap(item.ex) && item.choices?.length),
    question: formQuestion,
  },
  {
    ...MATH,
    id: 'rechnen',
    name: 'Mathe',
    group: 'rechnen',
    label: () => '✏️ Aufgaben lösen',
    short: () => '✏️ Lösen',
    learnOrder: 7,
    usable: (item) => levelOf(item) !== 3,
  },
  {
    ...MATH,
    id: 'experte',
    name: 'Mathe Experte',
    group: 'experte',
    label: () => '🟣 Experten-Aufgaben',
    short: () => '🟣 Experte',
    learnOrder: 8,
    optIn: true,                                       // nur über den eigenen Knopf
    storeAs: 'rechnen',                                // Umstufen 2 ↔ 3 behält den Lernstand
    usable: (item) => levelOf(item) === 3,
  },
];

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
//   label      Knopftext (Funktion der Lektion), short – Kurzform für Markierungen
//   weight     Sternchen im Verhältnis zum Schreiben (1); itemWeight(item) – abweichend für einzelne Einträge
//   learnOrder Reihenfolge, in der „Jetzt üben“ ein neues Wort durch die Übungsarten führt
//   speech     braucht Sprachausgabe; minItems – mindestens so viele Einträge in der Lektion
//   usable     welche Einträge sich eignen (z. B. nur mit Beispielsatz)
//   optIn      nur auf Wunsch (eigener Knopf) – nicht in „Jetzt üben“
//   question   Fragetyp aus questions.js

import { writeQuestion, chooseQuestion, gapQuestion, formQuestion, parseGap } from './questions.js';
import { mathQuestion } from './math.js';
import { targetSide } from '../lessons.js';
import { levelOf } from '../levels.js';

// Mathe: „Aufgaben lösen“ und „Experten-Aufgaben“ unterscheiden sich nur in der Stufe der Einträge.
// Antippen (z. B. < oder >) zählt weniger als Eintippen; Basis/Experte verrechnet die Stufe (levels.js).
const MATH = { kinds: ['mathe'], weight: 1, itemWeight: (item) => (item.choices ? 0.3 : 1), question: mathQuestion };

const CODES = { Deutsch: 'DE', Englisch: 'EN', Französisch: 'FR', Spanisch: 'ES', Latein: 'LA' };
const code = (side) => CODES[side] ?? String(side).slice(0, 2).toUpperCase();
const lang = (l) => l.sides[targetSide(l)];

export const MODES = [
  {
    id: 'ab',
    kinds: ['vokabeln'],
    group: 'schreiben',
    label: (l) => `Schreiben: ${l.sides.a} → ${l.sides.b}`,
    short: (l) => `✍️ ${code(l.sides.a)}→${code(l.sides.b)}`,
    weight: 1,
    learnOrder: 3,
    question: writeQuestion,
  },
  {
    id: 'ba',
    kinds: ['vokabeln'],
    group: 'schreiben',
    label: (l) => `Schreiben: ${l.sides.b} → ${l.sides.a}`,
    short: (l) => `✍️ ${code(l.sides.b)}→${code(l.sides.a)}`,
    weight: 1,
    learnOrder: 4,
    question: writeQuestion,
  },
  {
    id: 'hoeren',
    kinds: ['vokabeln'],
    group: 'hoeren',
    label: (l) => `🔊 Hören → ${lang(l)} schreiben`,
    short: () => '🔊 Diktat',
    weight: 1.2,
    learnOrder: 5,
    speech: true,
    question: writeQuestion,
  },
  {
    id: 'hoeren-wahl',
    kinds: ['vokabeln'],
    group: 'hoeren',
    label: () => '🔊 Hören → Bedeutung antippen',
    short: () => '🔊 Antippen',
    weight: 0.2,
    learnOrder: 1,
    speech: true,
    minItems: 4,
    question: chooseQuestion,
  },
  {
    id: 'satz',
    kinds: ['vokabeln'],
    group: 'satz',
    label: () => '📝 Lückensätze',
    short: () => '📝 Satz',
    weight: 0.8,
    learnOrder: 6,
    usable: (item) => Boolean(parseGap(item.ex)),
    question: gapQuestion,
  },
  {
    id: 'form',
    kinds: ['grammatik'],
    group: 'form',
    label: () => '✏️ Richtige Form antippen',
    short: () => '✏️ Form',
    weight: 0.3,
    learnOrder: 2,
    usable: (item) => Boolean(parseGap(item.ex) && item.choices?.length),
    question: formQuestion,
  },
  {
    ...MATH,
    id: 'rechnen',
    group: 'rechnen',
    label: () => '✏️ Aufgaben lösen',
    short: () => '✏️ Lösen',
    learnOrder: 7,
    usable: (item) => levelOf(item) !== 3,
  },
  {
    ...MATH,
    id: 'experte',
    group: 'experte',
    label: () => '🟣 Experten-Aufgaben',
    short: () => '🟣 Experte',
    learnOrder: 8,
    optIn: true,                                       // nur über den eigenen Knopf
    usable: (item) => levelOf(item) === 3,
  },
];

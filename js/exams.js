// 🏆 Reitturnier – ein Test in der Schule (Vokabeltest, Klassenarbeit) mit Datum und Lektionen.
// Anlegen dürfen Kind und Eltern, auch mit gesperrten Lektionen: Das Turnier öffnet nichts, gesperrte
// Lektionen sind der Anlass, den Eltern Bescheid zu sagen (öffnen nur unter „Für Eltern“).
// Bis zum Turniertag: Plakat auf der Startseite (Lektionen = Hindernisse), Vorrang auf der Weiter-Karte.
// Im Code heißt es „exam“ – „turnier“ ist intern die letzte Etappe einer Lektion („Probe“).
//
// Reine Funktionen: Lernstand, Zugang und „jetzt“ kommen als Parameter (im Selbsttest prüfbar).

import { dayKey, addDays } from './util.js';

export const EXAM_NAME = 'Reitturnier';            // Arbeitstitel – die Tochter darf umbenennen
export const READY_SHARE = 0.8;                     // so viel muss in der Turnierwoche sicher abgerufen sein
export const WEEK_DAYS = 7;

const toDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

// Tage bis zum Turnier (0 = heute, negativ = vorbei).
export function daysUntil(date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((toDate(date) - today) / 864e5);
}

// Anstehende Turniere (heute oder später), das nächste zuerst.
export const upcomingExams = (exams, now = new Date()) => exams
  .filter((e) => !e.deleted && daysUntil(e.date, now) >= 0)
  .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

// Lektionsschlüssel ("fach/lektion") → Datum des nächsten Turniers, in dem sie vorkommt.
export function examFocus(exams, now = new Date()) {
  const focus = new Map();
  for (const e of upcomingExams(exams, now)) {
    for (const l of e.lessons) { const k = `${e.sid}/${l}`; if (!focus.has(k)) focus.set(k, e.date); }
  }
  return focus;
}

// „Do 20.11.“
export const dateLabel = (date) => toDate(date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });

// Positiv formuliert – kein Alarm nach Tageszahl.
export function countdownText(days) {
  if (days <= 0) return 'heute';
  if (days === 1) return 'morgen';
  return `in ${days} Tagen`;
}

// Erster Tag der Turnierwoche (Abrufe ab hier zählen für „sitzt“).
export const weekStart = (date) => addDays(toDate(date), -WEEK_DAYS).getTime();

// Zustand eines Hindernisses:
//   'locked' – Lektion noch zu (Eltern fragen)
//   'way'    – Lernweg noch nicht durch
//   'shaky'  – Lernweg durch, aber in der Turnierwoche noch nicht sicher abgerufen
//   'ready'  – sitzt: mindestens READY_SHARE der Wörter in der Turnierwoche sicher abgerufen
// open: Lektion offen? way: { done, total, complete }; recent: Anteil sicher in der Turnierwoche (0–1).
export function hurdleState({ open, way, recent }) {
  if (!open) return 'locked';
  if (way.total && !way.complete) return 'way';
  return recent >= READY_SHARE ? 'ready' : 'shaky';
}

// Anteil der Wörter, die seit `since` zuletzt geübt wurden und sicher sitzen (Fach ≥ safeBox).
// states: Karteikasten-Stände der Kernwörter in der Abruf-Übungsart.
export function recentShare(states, since, safeBox) {
  if (!states.length) return 0;
  return states.filter((s) => (s.last ?? 0) >= since && s.box >= safeBox).length / states.length;
}

// Wird es eng? Nur bei echtem Rückstand: offene Lernwege oder gesperrte Lektionen und höchstens 2 Tage.
export const isTight = (days, states) => days <= 2 && states.some((s) => s === 'way' || s === 'locked');

// Für die Weiter-Karte: unter den Kandidaten ({ key }) den mit dem nächsten Turnier – oder null.
export function examPick(candidates, focus) {
  let best = null;
  for (const c of candidates) {
    const d = focus.get(c.key);
    if (d && (!best || d < focus.get(best.key))) best = c;
  }
  return best;
}

export const todayKey = (now = new Date()) => dayKey(now);

// Wiederholsystem nach dem Karteikasten-Prinzip (Leitner).
// Fach 0 = neu, Fach 1–5 = immer längere Abstände.
// Falsch → zurück in Fach 1. Ab Fach 3 gilt eine Karte als "sicher".

import { itemState, setItemState, addDayStat, addPoints, save } from './store.js';
import { shuffle } from './util.js';
import { levelOf, WARMUP } from './levels.js';

const DAY = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
export const SAFE_BOX = 3;
// Sternchen ✦: Durchhalten zählt am meisten, Sorgfalt merkbar, aber nicht stark.
// Werte gelten fürs Schreiben; andere Übungsarten werden nach Schwierigkeit gewichtet (weight in modes.js).
// Eine Schreib-Runde mit 12 Wörtern bringt 96–110 ✦, eine Antipp-Runde etwa 22 ✦.
export const ROUND_BONUS = 50;       // für jede zu Ende gespielte Runde
export const POINTS_FIRST_TRY = 5;   // Wort beim ersten Versuch richtig
export const POINTS_RETRY = 3;       // Wort nach einem Fehler richtig
const pointsFor = (firstTry, weight) =>
  Math.max(1, Math.round((firstTry ? POINTS_FIRST_TRY : POINTS_RETRY) * weight));
// Rundenbonus nach dem durchschnittlichen Gewicht der Aufgaben in der Runde.
export const roundBonus = (weights) =>
  Math.round(ROUND_BONUS * (weights.length ? weights.reduce((n, w) => n + w, 0) / weights.length : 1));

// Lektionen mit Medaille, selbst ausgewählt: weniger Sternchen (kein Grinden leichter Lektionen).
export const MASTERED_FACTOR = 0.3;
// Für jede neue Medaille.
export const MEDAL_BONUS = 200;

export function itemKey(sid, lid, item, dir) {
  return `${sid}/${lid}/${item.id ?? item.b}|${dir}`;
}

export function status(st) {
  if (st.box === 0) return 'neu';
  return st.box >= SAFE_BOX ? 'sicher' : 'wackelt';
}

// Ein Ergebnis eintragen. firstTry: ohne vorherigen Fehler in dieser Runde.
// typed: die falsche Schreibweise (wird für "schwere Wörter" gemerkt).
// weight: Sternchen-Faktor (Übungsart, ggf. weniger bei Medaille), effort: zählt fürs Tagesziel.
export function record(key, { correct, firstTry, typed, weight = 1, effort = 1 }) {
  const st = { ...itemState(key) };
  const now = Date.now();
  if (correct) {
    st.right++;
    st.box = firstTry ? Math.min(st.box + 1, 5) : 1;
    st.due = now + INTERVAL_DAYS[st.box] * DAY;
    addPoints(pointsFor(firstTry, weight));
  } else {
    st.wrong++;
    st.box = 1;
    st.due = now;
    if (typed) st.wrongs = [typed, ...(st.wrongs ?? [])].slice(0, 5);
  }
  st.last = now;
  setItemState(key, st);
  addDayStat(correct, effort, key.split('/')[0]);   // Fach steht vorne im Schlüssel
  save();
  return correct ? pointsFor(firstTry, weight) : 0;
}

// Reihenfolge für eine Übungsrunde.
// Normal: fällige und neue Karten zuerst, aufgefüllt bis MIN_ROUND, höchstens MAX_ROUND.
// all=true: die ganze Lektion (z. B. am Tag vor dem Test), von leicht nach schwer.
// Aufgaben mit Stufen (lessons.LEVELS): höchstens WARMUP Basis-Aufgaben zum Aufwärmen vorneweg,
// dann die anspruchsvolleren – Basis füllt nur auf, wenn sonst nichts mehr da ist.
const MIN_ROUND = 10;
const MAX_ROUND = 15;

export function buildRound(entries, all = false) {
  const now = Date.now();
  const withState = shuffle(entries).map((e) => ({ ...e, st: itemState(e.key) }));
  if (all) return withState.sort((a, b) => levelOf(a.item) - levelOf(b.item));
  // Reihenfolge: niedrige Fächer (zuletzt falsch) zuerst, neue Wörter danach –
  // außer als schwierig markierte ("hard": true), die zählen wie Fach 1.
  const rank = (e) => (e.st.box === 0 ? (e.item.hard ? 1 : 6) : e.st.box);
  const byBox = (a, b) => rank(a) - rank(b) || Boolean(b.item.hard) - Boolean(a.item.hard);
  const due = withState.filter((e) => e.st.box === 0 || e.st.due <= now).sort(byBox);
  const rest = withState.filter((e) => !due.includes(e)).sort((a, b) => byBox(a, b) || a.st.due - b.st.due);
  const ordered = due.concat(rest);
  const basic = (e) => levelOf(e.item) === 1;
  const warm = ordered.filter(basic).slice(0, WARMUP);
  // Rundengröße nach den fälligen anspruchsvolleren Aufgaben (+ Aufwärmen) – fällige Basis-Aufgaben
  // dürfen die Runde nicht aufblähen.
  const size = Math.min(MAX_ROUND, Math.max(MIN_ROUND, due.filter((e) => !basic(e)).length + warm.length));
  const round = [...warm, ...ordered.filter((e) => !basic(e))].slice(0, size);
  if (round.length < size) round.push(...ordered.filter((e) => basic(e) && !warm.includes(e)).slice(0, size - round.length));
  return round;
}

export function starsFor(m) {
  if (m >= 1) return 3;
  if (m >= 2 / 3) return 2;
  if (m >= 1 / 3) return 1;
  return 0;
}

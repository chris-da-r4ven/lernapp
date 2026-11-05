// Wiederholsystem nach dem Karteikasten-Prinzip (Leitner).
// Fach 0 = neu, Fach 1–5 = immer längere Abstände.
// Falsch → zurück in Fach 1. Ab Fach 3 gilt eine Karte als "sicher".

import { itemState, setItemState, addDayStat, addPoints, save } from './store.js';
import { shuffle } from './util.js';

const DAY = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
export const SAFE_BOX = 3;
export const POINTS_FIRST_TRY = 10;
export const POINTS_RETRY = 3;

export function itemKey(sid, lid, item, dir) {
  return `${sid}/${lid}/${item.id ?? item.b}|${dir}`;
}

export function status(st) {
  if (st.box === 0) return 'neu';
  return st.box >= SAFE_BOX ? 'sicher' : 'wackelt';
}

// Ein Ergebnis eintragen. firstTry: ohne vorherigen Fehler in dieser Runde.
// typed: die falsche Schreibweise (wird für "schwere Wörter" gemerkt).
export function record(key, { correct, firstTry, typed }) {
  const st = { ...itemState(key) };
  const now = Date.now();
  if (correct) {
    st.right++;
    st.box = firstTry ? Math.min(st.box + 1, 5) : 1;
    st.due = now + INTERVAL_DAYS[st.box] * DAY;
    addPoints(firstTry ? POINTS_FIRST_TRY : POINTS_RETRY);
  } else {
    st.wrong++;
    st.box = 1;
    st.due = now;
    if (typed) st.wrongs = [typed, ...(st.wrongs ?? [])].slice(0, 5);
  }
  st.last = now;
  setItemState(key, st);
  addDayStat(correct);
  save();
  return correct ? (firstTry ? POINTS_FIRST_TRY : POINTS_RETRY) : 0;
}

// Reihenfolge für eine Übungsrunde.
// Normal: fällige und neue Karten zuerst, aufgefüllt bis MIN_ROUND, höchstens MAX_ROUND.
// all=true: die ganze Lektion (z. B. am Tag vor dem Test).
const MIN_ROUND = 10;
const MAX_ROUND = 15;

export function buildRound(entries, all = false) {
  const now = Date.now();
  const withState = shuffle(entries).map((e) => ({ ...e, st: itemState(e.key) }));
  if (all) return withState;
  // Reihenfolge: niedrige Fächer (zuletzt falsch) zuerst, neue Wörter danach –
  // außer als schwierig markierte ("hard": true), die zählen wie Fach 1.
  const rank = (e) => (e.st.box === 0 ? (e.item.hard ? 1 : 6) : e.st.box);
  const byBox = (a, b) => rank(a) - rank(b) || Boolean(b.item.hard) - Boolean(a.item.hard);
  const due = withState.filter((e) => e.st.box === 0 || e.st.due <= now).sort(byBox);
  const rest = withState.filter((e) => !due.includes(e)).sort((a, b) => byBox(a, b) || a.st.due - b.st.due);
  const round = due.concat(rest.slice(0, Math.max(0, MIN_ROUND - due.length)));
  return round.slice(0, MAX_ROUND);
}

// Anteil sicherer Karten einer Lektion in einer Richtung (0..1).
export function mastery(sid, lesson, dir = 'ab') {
  if (!lesson?.items?.length) return 0;
  const safe = lesson.items.filter((it) => itemState(itemKey(sid, lesson.id, it, dir)).box >= SAFE_BOX).length;
  return safe / lesson.items.length;
}

export function starsFor(m) {
  if (m >= 1) return 3;
  if (m >= 2 / 3) return 2;
  if (m >= 1 / 3) return 1;
  return 0;
}

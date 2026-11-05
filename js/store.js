// Lernfortschritt im Browser des Tablets (optional zusätzlich gesichert, siehe sync.js).
// items:  pro Karte und Richtung der Stand im Wiederholsystem
// days:   pro Tag, wie viel geübt wurde (für Serie und Verlauf)
// points: Punkte für Sterne/Tier

import { dayKey } from './util.js';
import { streakInfo } from './streak.js';

const KEY = 'lernapp.progress';

const empty = () => ({ items: {}, days: {}, points: 0, pet: null });

let state = load();

function load() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return empty(); }
}

const listeners = [];
export const onSave = (fn) => listeners.push(fn);

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher voll/gesperrt */ }
}

export function save() {
  persist();
  listeners.forEach((fn) => fn());
}

// Spielstand von außen übernehmen (Sicherung) – meldet sich nicht als Änderung zurück.
export function replaceState(next) {
  state = { ...empty(), ...next };
  persist();
}

export const getState = () => state;

// Alles zurück auf null: Punkte, Serie, Lernstand. Lektionen bleiben erhalten.
export function resetProgress() {
  state = empty();
  save();
}

export function itemState(key) {
  return state.items[key] ?? { box: 0, due: 0, right: 0, wrong: 0, wrongs: [], last: 0 };
}

export function setItemState(key, s) {
  state.items[key] = s;
}

export function addDayStat(correct) {
  const k = dayKey();
  const d = state.days[k] ?? { right: 0, wrong: 0 };
  if (correct) d.right++; else d.wrong++;
  state.days[k] = d;
}

export function addPoints(n) {
  state.points += n;
}

// Serie mit Tagesziel und Rettungstag – siehe streak.js.
export function streak() {
  return streakInfo(state.days);
}

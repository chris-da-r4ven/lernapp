// Lernfortschritt im Browser des Tablets (optional zusätzlich gesichert, siehe sync.js).
// items:  pro Karte und Richtung der Stand im Wiederholsystem
// days:   pro Tag, wie viel geübt wurde (für Serie und Verlauf)
// points: gesammelte Sternchen ✦ (im Code „points“) – bestimmen Fannys Glitzer-Stufe

import { dayKey } from './util.js';
import { streakInfo } from './streak.js';

const KEY = 'lernapp.progress';

// resetAt: Zeitpunkt des letzten Zurücksetzens (für das Zusammenführen mit der Sicherung).
const empty = () => ({ items: {}, days: {}, points: 0, pet: null, tests: {}, resetAt: 0 });

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
  state = { ...empty(), resetAt: Date.now() };
  save();
}

// Lektionen zusammengelegt/umbenannt: Lernstand der Wörter mitnehmen.
// moved: { alteLektion: neueLektion } innerhalb eines Fachs. Mehrfach aufrufen schadet nicht.
export function migrateLessons(sid, moved = {}) {
  let changed = false;
  for (const [from, to] of Object.entries(moved)) {
    const prefix = `${sid}/${from}/`;
    for (const key of Object.keys(state.items)) {
      if (!key.startsWith(prefix)) continue;
      const target = `${sid}/${to}/` + key.slice(prefix.length);
      const old = state.items[key];
      const cur = state.items[target];
      if (!cur || (old.last ?? 0) > (cur.last ?? 0)) state.items[target] = old;
      delete state.items[key];
      changed = true;
    }
    const tFrom = `${sid}/${from}`;
    if (state.tests?.[tFrom]) {
      state.tests[`${sid}/${to}`] = [...(state.tests[`${sid}/${to}`] ?? []), ...state.tests[tFrom]];
      delete state.tests[tFrom];
      changed = true;
    }
  }
  if (changed) save();
  return changed;
}

// --- Testergebnisse und Medaillen ---------------------------------------------
// Medaille 🏅: zweimal mindestens 90 % im Test, an zwei verschiedenen Tagen.
export const MEDAL_PCT = 90;
export const MEDAL_DAYS = 2;

export function addTestResult(lessonKey, pct) {
  state.tests ??= {};
  const list = state.tests[lessonKey] ?? [];
  list.push({ day: dayKey(), pct });
  state.tests[lessonKey] = list.slice(-20);
}

// minPct: nur Tests zählen, die mindestens so gut waren.
export const testedToday = (lessonKey, minPct = 0) =>
  (state.tests?.[lessonKey] ?? []).some((r) => r.day === dayKey() && r.pct >= minPct);

export function medalStatus(lessonKey) {
  const list = state.tests?.[lessonKey] ?? [];
  const goodDays = new Set(list.filter((r) => r.pct >= MEDAL_PCT).map((r) => r.day));
  const best = list.reduce((m, r) => Math.max(m, r.pct), 0);
  return { medal: goodDays.size >= MEDAL_DAYS, goodDays: goodDays.size, tests: list.length, best };
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

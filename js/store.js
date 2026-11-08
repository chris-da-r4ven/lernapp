// Lernfortschritt im Browser des Tablets (optional zusätzlich gesichert, siehe sync.js).
// items:  pro Karte und Richtung der Stand im Wiederholsystem
// days:   pro Tag, wie viel geübt wurde (für Serie und Verlauf)
// points: gesammelte Sternchen ✦ (im Code „points“) – bestimmen Fannys Glitzer-Stufe

import { dayKey } from './util.js';
import { streakInfo } from './streak.js';
import { sanitizeState } from './validate.js';

// Die Selbsttest-Seite (tests/) arbeitet mit einem eigenen Speicher – der echte Lernstand
// wird dort nie angefasst, auch wenn der Test mittendrin abbricht.
const TESTING = typeof location !== 'undefined' && location.pathname.includes('/tests/');
const KEY = TESTING ? 'lernapp.test.progress' : 'lernapp.progress';
const CORRUPT_KEY = 'lernapp.progress.beschaedigt';

// resetAt: Zeitpunkt des letzten Zurücksetzens (für das Zusammenführen mit der Sicherung).
const empty = () => ({ items: {}, days: {}, points: 0, pet: null, tests: {}, resetAt: 0 });

// Konnte der gespeicherte Stand nicht (vollständig) gelesen werden? Dann hebt load() den
// Rohtext auf, und die Sicherung führt beim nächsten Abgleich zusammen statt zu überschreiben.
let recovered = false;
export const wasRecovered = () => recovered;

let state = load();

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return empty(); }
  if (raw === null) return empty();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* unten */ }
  const clean = sanitizeState(parsed);
  if (!clean || clean.dropped) {
    recovered = true;
    try { localStorage.setItem(CORRUPT_KEY, JSON.stringify({ at: new Date().toISOString(), raw })); } catch { /* egal */ }
    console.warn('Lernstand war beschädigt – Rohdaten unter', CORRUPT_KEY, 'aufgehoben.');
  }
  return clean ? clean.state : empty();
}

const listeners = [];
export const onSave = (fn) => listeners.push(fn);

// Zählt jede Änderung am Lernstand – damit können andere Teile Berechnungen zwischenspeichern.
let rev = 0;
export const revision = () => rev;

function persist() {
  rev++;
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch {
    console.warn('Lernstand konnte nicht gespeichert werden (Speicher voll oder gesperrt).');
    return false;
  }
}

export function save() {
  persist();
  listeners.forEach((fn) => fn());
}

// Spielstand von außen übernehmen (Sicherung) – meldet sich nicht als Änderung zurück.
// Wird vorher geprüft; ist er unbrauchbar, bleibt der jetzige Stand.
export function replaceState(next) {
  const clean = sanitizeState(next);
  if (!clean) return false;
  state = clean.state;
  persist();
  return true;
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

// effort: wie viel die Aufgabe fürs Tagesziel zählt (Gewicht der Übungsart, Schreiben = 1).
// Gespeichert in Zehnteln (e), damit sich keine Rundungsfehler aufsummieren.
export function addDayStat(correct, effort = 1) {
  const k = dayKey();
  const d = state.days[k] ?? { right: 0, wrong: 0 };
  if (correct) d.right++; else d.wrong++;
  d.e = (d.e ?? (d.right + d.wrong - 1) * 10) + Math.round(effort * 10);
  state.days[k] = d;
}

export function addPoints(n) {
  state.points += n;
}

// Serie mit Tagesziel und Rettungstag – siehe streak.js.
export function streak() {
  return streakInfo(state.days);
}

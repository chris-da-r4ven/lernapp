// Lernfortschritt im Browser des Geräts (optional zusätzlich gesichert, siehe sync.js).
// Format und Prüfung: validate.js. Sternchen und Tageswerte zählen pro Gerät (device.js),
// angezeigt werden die Summen (points, days[…].right/wrong/e).
//
// Profile: Jedes Kind hat seinen eigenen Lernstand unter lernapp.p.<profil>.progress.
// Heute gibt es nur das Profil „standard“ (eine Auswahl kommt, wenn sie gebraucht wird).

import { dayKey } from './util.js';
import { streakInfo } from './streak.js';
import { sanitizeState, sumDay, sumPoints, SCHEMA, FEEDBACK_MAX } from './validate.js';
import { deviceId } from './device.js';
import { mergePath } from './merge.js';

// Die Selbsttest-Seite (tests/) arbeitet mit einem eigenen Speicher – der echte Lernstand
// wird dort nie angefasst, auch wenn der Test mittendrin abbricht.
const TESTING = typeof location !== 'undefined' && location.pathname.includes('/tests/');
const readKey = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const PROFILE = (TESTING ? 'test' : readKey('lernapp.profil')) || 'standard';
export const profileId = () => PROFILE;
const KEY = `lernapp.p.${PROFILE}.progress`;
const OLD_KEY = 'lernapp.progress';            // vor den Profilen (bis App-Stand Paket F)
const CORRUPT_KEY = `lernapp.p.${PROFILE}.beschaedigt`;

// Einmaliger Umzug vom alten Schlüssel ins Standardprofil.
if (!TESTING && PROFILE === 'standard' && readKey(KEY) === null && readKey(OLD_KEY) !== null) {
  try { localStorage.setItem(KEY, readKey(OLD_KEY)); localStorage.removeItem(OLD_KEY); } catch { /* bleibt beim alten */ }
}

// resetAt: Zeitpunkt des letzten Zurücksetzens (für das Zusammenführen mit der Sicherung).
const empty = () => ({ v: SCHEMA, items: {}, days: {}, points: 0, pointsBy: {}, pet: null, tests: {}, feedback: [], resetAt: 0,
  path: {}, pathSince: 0, opened: {}, blitz: [] });

// Konnte der gespeicherte Stand nicht (vollständig) gelesen werden? Dann hebt load() den
// Rohtext auf, und die Sicherung führt beim nächsten Abgleich zusammen statt zu überschreiben.
let recovered = false;
export const wasRecovered = () => recovered;

// Stand aus einer neueren App (Format > SCHEMA)? Dann nichts überschreiben: lesen ja, speichern nein,
// bis die neue App da ist – sonst gingen deren Daten verloren.
let newerData = false;
export const storageNewer = () => newerData;

let state = load();

function load() {
  const raw = readKey(KEY) ?? (PROFILE === 'standard' ? readKey(OLD_KEY) : null);
  if (raw === null) return empty();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* unten */ }
  const clean = sanitizeState(parsed);
  if (!clean || clean.dropped) {
    recovered = true;
    try { localStorage.setItem(CORRUPT_KEY, JSON.stringify({ at: new Date().toISOString(), raw })); } catch { /* egal */ }
    console.warn('Lernstand war beschädigt – Rohdaten unter', CORRUPT_KEY, 'aufgehoben.');
  }
  if (clean?.newer) newerData = true;
  return clean ? moveExpertKeys(clean.state) : empty();
}

// Experten-Aufgaben hatten kurz einen eigenen Lernstand (…|experte, 12.11.2026) – jetzt teilen sie
// ihn mit „rechnen“ (modes.js storeAs). Einmalig umziehen, der neuere Eintrag gewinnt.
function moveExpertKeys(s) {
  for (const k of Object.keys(s.items)) {
    if (!k.endsWith('|experte')) continue;
    const to = k.slice(0, -'experte'.length) + 'rechnen';
    if (!s.items[to] || (s.items[k].last ?? 0) > (s.items[to].last ?? 0)) s.items[to] = s.items[k];
    delete s.items[k];
  }
  return s;
}

const listeners = [];
export const onSave = (fn) => listeners.push(fn);

// Zählt jede Änderung am Lernstand – damit können andere Teile Berechnungen zwischenspeichern.
let rev = 0;
export const revision = () => rev;

// Konnte zuletzt nicht gespeichert werden (Speicher voll/gesperrt)? → Warnung für die Eltern.
let storageFailed = false;
export const storageProblem = () => storageFailed;

function persist() {
  rev++;
  if (newerData) return false;     // Stand einer neueren App nicht überschreiben
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageFailed = false; return true; } catch {
    storageFailed = true;
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
  if (!clean || clean.newer) return false;
  state = moveExpertKeys(clean.state);
  persist();
  return true;
}

export const getState = () => state;

// Alles zurück auf null: Punkte, Serie, Lernstand. Lektionen bleiben erhalten.
export function resetProgress() {
  // Rückmeldungen bleiben. Der Lernweg beginnt neu – ohne erneute Übernahme (pathSince).
  state = { ...empty(), feedback: state.feedback ?? [], resetAt: Date.now(), pathSince: Date.now() };
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
    const tTo = `${sid}/${to}`;
    if (state.tests?.[tFrom]) {
      state.tests[tTo] = [...(state.tests[tTo] ?? []), ...state.tests[tFrom]];
      delete state.tests[tFrom];
      changed = true;
    }
    // Lernweg und Freischaltung ziehen mit (vereinigt mit dem, was die neue Lektion schon hat).
    if (Object.hasOwn(state.path ?? {}, tFrom)) {
      state.path = mergePath(state.path, { [tTo]: state.path[tFrom] });
      delete state.path[tFrom];
      changed = true;
    }
    if (Object.hasOwn(state.opened ?? {}, tFrom)) {
      state.opened[tTo] = Math.min(state.opened[tTo] ?? Infinity, state.opened[tFrom]);
      delete state.opened[tFrom];
      changed = true;
    }
  }
  if (changed) save();
  return changed;
}

// --- Testergebnisse (ausgewertet in medal.js) -----------------------------------
export function addTestResult(lessonKey, pct) {
  state.tests ??= {};
  const list = state.tests[lessonKey] ?? [];
  list.push({ day: dayKey(), pct });
  state.tests[lessonKey] = list.slice(-20);
}

export const testResults = (lessonKey) => state.tests?.[lessonKey] ?? [];

export function itemState(key) {
  return state.items[key] ?? { box: 0, due: 0, right: 0, wrong: 0, wrongs: [], last: 0 };
}

export function setItemState(key, s) {
  state.items[key] = s;
}

// effort: wie viel die Aufgabe fürs Tagesziel zählt (Gewicht der Übungsart, Schreiben = 1).
// Gespeichert in Zehnteln (e), damit sich keine Rundungsfehler aufsummieren.
// Gezählt wird beim eigenen Gerät (und pro Fach, subject); der Tag zeigt die Summe aller Geräte.
export function addDayStat(correct, effort = 1, subject = null) {
  const k = dayKey();
  const dev = deviceId();
  const by = { ...(state.days[k]?.by ?? {}) };
  const c = { right: 0, wrong: 0, e: 0, ...(by[dev] ?? {}) };
  if (correct) c.right++; else c.wrong++;
  const tenth = (x) => Math.round(x * 10) / 10;       // e in Zehnteln, auf 0,1 genau (kein Doppelrunden)
  const add = tenth(effort * 10);
  c.e = tenth(c.e + add);
  if (subject) c.s = { ...(c.s ?? {}), [subject]: tenth((c.s?.[subject] ?? 0) + add) };
  by[dev] = c;
  state.days[k] = sumDay(by);
}

export function addPoints(n) {
  const dev = deviceId();
  state.pointsBy = { ...state.pointsBy, [dev]: (state.pointsBy?.[dev] ?? 0) + n };
  state.points = sumPoints(state.pointsBy);
}

// Serie mit Tagesziel und Rettungstag – siehe streak.js.
export function streak() {
  return streakInfo(state.days);
}

// Rückmeldung nach einer Runde (Spaß / weitergebracht, je 1–5). Gleiche id = dieselbe Runde, die
// letzte Wahl gilt. Gespeichert und gesichert wie der Lernstand, damit die Eltern sie sehen.
export function addFeedback(entry) {
  const list = (state.feedback ?? []).filter((f) => f.id !== entry.id);
  state.feedback = [...list, { ...entry, at: Date.now() }].slice(-FEEDBACK_MAX);
  save();
}
export const feedbackId = () => `${deviceId()}-${Date.now().toString(36)}`;

// --- Lernweg (Bedeutung und Regeln: path.js) -------------------------------------------
const emptyEntry = () => ({ learned: {}, mix: {} });
// Lernweg-Eintrag einer Lektion (lk = "<fach>/<lektion>") – nur lesen.
export const pathEntry = (lk) => (Object.hasOwn(state.path ?? {}, lk) ? state.path[lk] : emptyEntry());
export const pathSince = () => state.pathSince ?? 0;

function entryFor(lk) {
  state.path ??= {};
  if (!Object.hasOwn(state.path, lk)) state.path[lk] = emptyEntry();
  return state.path[lk];
}
// Wörter einer geschafften Etappe als gelernt eintragen (der erste Zeitpunkt bleibt).
export function markLearned(lk, wordIds, at = Date.now()) {
  const e = entryFor(lk);
  for (const w of wordIds) if (!Object.hasOwn(e.learned, w)) e.learned[w] = at;
  save();
}
// Gemischte Etappe (Springen, Koppel …) geschafft.
export function markMix(lk, id, at = Date.now()) {
  const e = entryFor(lk);
  if (!Object.hasOwn(e.mix, id)) e.mix[id] = at;
  save();
}
// Einmalige Übernahme des bisherigen Lernstands: { lk: [wort-ids] }.
export function adoptLearned(byLesson, at = Date.now()) {
  for (const [lk, ids] of Object.entries(byLesson)) {
    if (!ids.length) continue;
    const e = entryFor(lk);
    for (const w of ids) if (!Object.hasOwn(e.learned, w)) e.learned[w] = at;
  }
  state.pathSince = at;
  save();
}

// Turnier zu Ende gespielt: Ergebnis und die falschen Wörter (für das Nachtraining).
export function setTurnier(lk, pct, retry = [], at = Date.now()) {
  const e = entryFor(lk);
  e.turnier = { day: dayKey(new Date(at)), at, pct: Math.round(pct) };
  if (retry.length) e.retry = retry.slice(0, 100); else delete e.retry;
  save();
}

// Lektion von den Eltern geöffnet (bleibt offen).
export function openLesson(lk, at = Date.now()) {
  state.opened ??= {};
  if (!Object.hasOwn(state.opened, lk)) state.opened[lk] = at;
  save();
}

// Blitzrunde gespielt (der Vorrat wird in path.js nachgerechnet).
export function addBlitz(at = Date.now()) {
  state.blitz = [...(state.blitz ?? []), { id: `${deviceId()}-${at.toString(36)}`, at }].slice(-500);
  save();
}

// Lernweg der Lektion einmal ganz geschafft – bleibt gemerkt (die nächste Lektion bleibt offen, auch wenn
// später neue Wörter dazukommen oder ein Turnier nochmal schwächer ausfällt).
export function markComplete(lk, at = Date.now()) {
  const e = entryFor(lk);
  if (!e.complete) { e.complete = at; save(); }
}

// Spielstand prüfen, bereinigen und ins aktuelle Format bringen – bevor er übernommen wird
// (aus dem Speicher des Geräts, aus der Sicherung, beim Zusammenführen).
//
// Format (SCHEMA = 3):
//   v          Formatversion
//   items      { "<fach>/<lektion>/<wort>|<übungsart>": { box, due, right, wrong, wrongs, last } }
//   points     Summe der Sternchen   – pointsBy: { <gerät>: Sternchen dieses Geräts }
//   days       { "JJJJ-MM-TT": { right, wrong, e, s: {<fach>: e}, by: { <gerät>: { right, wrong, e, s } } } }
//              right/wrong/e/s sind die Summen über alle Geräte (e = Tagesziel-Wert in Zehnteln)
//   tests      { "<fach>/<lektion>": [{ day, pct }] }
//   resetAt    Zeitpunkt des letzten Zurücksetzens
//   feedback   Rückmeldungen nach Runden: [{ id, at, fun 1–5, learn 1–5, what, mode, art, n, right, test }]
//              (bleibt beim Zurücksetzen erhalten – sie ist für die Eltern, nicht Teil des Lernstands)
// Ab SCHEMA 3 (Lernweg, siehe path.js):
//   path       { "<fach>/<lektion>": { learned: { <wort-id>: ms }, mix: { <etappe>: ms }, complete?: ms,
//                turnier?: { day, at, pct }, retry?: [<wort-id>] } }
//   pathSince  Zeitpunkt der einmaligen Übernahme des bisherigen Lernstands in den Lernweg (0 = noch nicht)
//   opened     { "<fach>/<lektion>": ms } – von den Eltern geöffnete Lektionen
//   blitz      [{ id, at }] – gespielte Blitzrunden
// Ältere Stände (ohne v) werden umgewandelt: bisherige Werte zählen als Gerät "alt".
//
// Ziel: Ein vertippter, beschädigter oder manipulierter Stand darf die App weder lahmlegen
// noch etwas ins HTML schmuggeln. Einzelne kaputte Einträge werden verworfen, der Rest bleibt.
// Ist der Stand als Ganzes unbrauchbar (kein Objekt), gibt es null.

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (x, min = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= min ? x : null);
const int = (x, min = 0) => { const n = num(x, min); return n === null ? null : Math.floor(n); };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Tagesziel-Werte (e, s) in Zehnteln, auf eine Nachkommastelle (z. B. 1,5 für eine Antipp-Aufgabe der Stufe Basis).
const tenth = (x) => { const n = num(x); return n === null ? null : Math.round(n * 10) / 10; };
export const SCHEMA = 3;
export const LEGACY_DEVICE = 'alt';
const ID = /^[\w-]{1,40}$/;
const okId = (k) => ID.test(k) && safeKey(k);
// Schlüssel, die in normalen Objekten etwas anderes bedeuten (Prototyp) – nie als Daten-Schlüssel übernehmen.
const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);
export const safeKey = (k) => typeof k === 'string' && !UNSAFE.has(k);
// Lektion im Lernweg: "<fach>/<lektion>". Wort- und Etappen-IDs: wie in den Inhalten (auch „How are you?“),
// nur ohne Steuerzeichen und spitze Klammern, höchstens 80 Zeichen.
const LESSON_KEY = /^[\w-]{1,40}\/[\w-]{1,60}$/;
const WORD_ID = /^[^\u0000-\u001f<>|]{1,80}$/u;   // ohne „|“: trennt in Lernstand-Schlüsseln die Übungsart ab
const MAX_LESSONS = 300;
const MAX_WORDS = 500;
const MAX_RETRY = 100;
export const BLITZ_MAX = 500;

function cleanItem(v) {
  if (!isObj(v)) return null;
  const box = int(v.box);
  if (box === null || box > 5) return null;
  return {
    box,
    due: num(v.due) ?? 0,
    right: int(v.right) ?? 0,
    wrong: int(v.wrong) ?? 0,
    wrongs: Array.isArray(v.wrongs) ? v.wrongs.filter((w) => typeof w === 'string').map((w) => w.slice(0, 100)).slice(0, 5) : [],
    last: num(v.last) ?? 0,
  };
}

// Ein Tageswert ohne Geräteaufteilung: { right, wrong, e?, s? }
function cleanCounts(v) {
  if (!isObj(v)) return null;
  const d = { right: int(v.right) ?? 0, wrong: int(v.wrong) ?? 0 };
  const e = tenth(v.e);
  if (e !== null) d.e = e;
  if (isObj(v.s)) {
    const sub = {};
    for (const [k, x] of Object.entries(v.s)) { const n = tenth(x); if (okId(k) && n !== null) sub[k] = n; }
    if (Object.keys(sub).length) d.s = sub;
  }
  return d;
}

function cleanDay(v, legacy) {
  if (!isObj(v)) return null;
  const by = {};
  if (isObj(v.by)) {
    for (const [dev, c] of Object.entries(v.by)) { const x = okId(dev) ? cleanCounts(c) : null; if (x) by[dev] = x; }
  } else if (legacy) {
    const x = cleanCounts(v);
    if (x) by[LEGACY_DEVICE] = x;   // alter Stand: bisherige Werte als Gerät „alt“
  }
  return sumDay(by);
}

// Summen eines Tages aus den Gerätewerten.
export function sumDay(by) {
  const d = { right: 0, wrong: 0, by };
  let e = null;
  const s = {};
  for (const c of Object.values(by)) {
    d.right += c.right; d.wrong += c.wrong;
    // Tage ohne Tagesziel-Wert (vor der Gewichtung): jede Antwort zählt voll
    e = (e ?? 0) + (c.e ?? (c.right + c.wrong) * 10);
    for (const [k, n] of Object.entries(c.s ?? {})) s[k] = Math.round(((s[k] ?? 0) + n) * 10) / 10;
  }
  if (e !== null) d.e = Math.round(e * 10) / 10;
  if (Object.keys(s).length) d.s = s;
  return d;
}

export const sumPoints = (pointsBy) => Object.values(pointsBy).reduce((n, x) => n + x, 0);

export const FEEDBACK_MAX = 500;
const text = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
const rating = (x) => { const n = int(x); return n !== null && n >= 1 && n <= 5 ? n : null; };

export function cleanFeedback(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isObj)
    .map((f) => ({
      id: typeof f.id === 'string' && /^[\w-]{1,60}$/.test(f.id) ? f.id : null,
      at: num(f.at), fun: rating(f.fun), learn: rating(f.learn),
      what: text(f.what, 200), mode: text(f.mode, 40), art: text(f.art, 20), n: int(f.n) ?? 0, right: int(f.right) ?? 0, test: f.test === true,
    }))
    .filter((f) => f.id && f.at !== null && (f.fun || f.learn))
    .slice(-FEEDBACK_MAX);
}

function cleanTests(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => isObj(r) && typeof r.day === 'string' && DAY.test(r.day) && num(r.pct) !== null && r.pct <= 100)
    .map((r) => ({ day: r.day, pct: Math.round(r.pct) }))
    .slice(-20);
}

// Ein Lernweg-Eintrag einer Lektion (siehe oben). Unbrauchbare Teile fallen weg.
function cleanPathEntry(v) {
  if (!isObj(v)) return null;
  const stamps = (o, max) => {
    const out = {};
    if (!isObj(o)) return out;
    for (const [k, x] of Object.entries(o).slice(0, max)) { const n = num(x); if (safeKey(k) && WORD_ID.test(k) && n !== null) out[k] = n; }
    return out;
  };
  const e = { learned: stamps(v.learned, MAX_WORDS), mix: stamps(v.mix, 200) };
  if (num(v.complete) !== null) e.complete = num(v.complete);
  const t = v.turnier;
  if (isObj(t) && typeof t.day === 'string' && DAY.test(t.day) && num(t.at) !== null) {
    e.turnier = { day: t.day, at: num(t.at), pct: Math.min(100, int(t.pct) ?? 0) };
  }
  if (Array.isArray(v.retry)) {
    const r = v.retry.filter((w) => typeof w === 'string' && safeKey(w) && WORD_ID.test(w)).slice(0, MAX_RETRY);
    if (r.length) e.retry = r;
  }
  return e;
}

export function cleanPath(raw) {
  const out = {};
  let dropped = 0;
  if (!isObj(raw)) return { path: out, dropped: raw === undefined ? 0 : 1 };
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_LESSONS) { dropped++; continue; }
    const e = LESSON_KEY.test(k) && safeKey(k) ? cleanPathEntry(v) : null;
    if (e) out[k] = e; else dropped++;
  }
  return { path: out, dropped };
}

function cleanOpened(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw).slice(0, MAX_LESSONS)) {
    const n = num(v);
    if (LESSON_KEY.test(k) && safeKey(k) && n !== null) out[k] = n;
  }
  return out;
}

export function cleanBlitz(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((b) => isObj(b) && typeof b.id === 'string' && /^[\w-]{1,60}$/.test(b.id) && num(b.at) !== null)
    .map((b) => ({ id: b.id, at: num(b.at) }))
    .slice(-BLITZ_MAX);
}

// Liefert { state, dropped } – dropped zählt verworfene Einträge – oder null, wenn unbrauchbar.
export function sanitizeState(raw) {
  if (!isObj(raw)) return null;
  let dropped = 0;
  const items = {};
  if (isObj(raw.items)) {
    for (const [k, v] of Object.entries(raw.items)) {
      const c = safeKey(k) && k.length < 300 ? cleanItem(v) : null;
      if (c) items[k] = c; else dropped++;
    }
  } else if (raw.items !== undefined) dropped++;
  const legacy = !(int(raw.v) >= 2);
  const days = {};
  if (isObj(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) {
      const c = DAY.test(k) ? cleanDay(v, legacy) : null;
      if (c) days[k] = c; else dropped++;
    }
  } else if (raw.days !== undefined) dropped++;
  const pointsBy = {};
  if (!legacy && isObj(raw.pointsBy)) {
    for (const [dev, x] of Object.entries(raw.pointsBy)) { const n = int(x); if (okId(dev) && n !== null) pointsBy[dev] = n; }
  } else if (legacy && int(raw.points)) {
    pointsBy[LEGACY_DEVICE] = int(raw.points);
  }
  const tests = {};
  if (isObj(raw.tests)) {
    for (const [k, v] of Object.entries(raw.tests)) {
      if (!safeKey(k) || k.length > 120) continue;
      const list = cleanTests(v);
      if (list.length) tests[k] = list;
    }
  }
  const p = cleanPath(raw.path);
  dropped += p.dropped;
  return {
    dropped,
    newer: int(raw.v) > SCHEMA,   // aus einer neueren App – nicht verstanden
    state: {
      v: SCHEMA,
      items,
      days,
      points: sumPoints(pointsBy),
      pointsBy,
      pet: null,
      tests,
      feedback: cleanFeedback(raw.feedback),
      resetAt: num(raw.resetAt) ?? 0,
      path: p.path,
      pathSince: num(raw.pathSince) ?? 0,
      opened: cleanOpened(raw.opened),
      blitz: cleanBlitz(raw.blitz),
    },
  };
}

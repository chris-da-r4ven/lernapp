// Spielstand prüfen, bereinigen und ins aktuelle Format bringen – bevor er übernommen wird
// (aus dem Speicher des Geräts, aus der Sicherung, beim Zusammenführen).
//
// Format (SCHEMA = 2):
//   v          Formatversion
//   items      { "<fach>/<lektion>/<wort>|<übungsart>": { box, due, right, wrong, wrongs, last } }
//   points     Summe der Sternchen   – pointsBy: { <gerät>: Sternchen dieses Geräts }
//   days       { "JJJJ-MM-TT": { right, wrong, e, s: {<fach>: e}, by: { <gerät>: { right, wrong, e, s } } } }
//              right/wrong/e/s sind die Summen über alle Geräte (e = Tagesziel-Wert in Zehnteln)
//   tests      { "<fach>/<lektion>": [{ day, pct }] }
//   resetAt    Zeitpunkt des letzten Zurücksetzens
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
export const SCHEMA = 2;
export const LEGACY_DEVICE = 'alt';
const ID = /^[\w-]{1,40}$/;

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
    for (const [k, x] of Object.entries(v.s)) { const n = tenth(x); if (ID.test(k) && n !== null) sub[k] = n; }
    if (Object.keys(sub).length) d.s = sub;
  }
  return d;
}

function cleanDay(v, legacy) {
  if (!isObj(v)) return null;
  const by = {};
  if (isObj(v.by)) {
    for (const [dev, c] of Object.entries(v.by)) { const x = ID.test(dev) ? cleanCounts(c) : null; if (x) by[dev] = x; }
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

function cleanTests(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => isObj(r) && typeof r.day === 'string' && DAY.test(r.day) && num(r.pct) !== null && r.pct <= 100)
    .map((r) => ({ day: r.day, pct: Math.round(r.pct) }))
    .slice(-20);
}

// Liefert { state, dropped } – dropped zählt verworfene Einträge – oder null, wenn unbrauchbar.
export function sanitizeState(raw) {
  if (!isObj(raw)) return null;
  let dropped = 0;
  const items = {};
  if (isObj(raw.items)) {
    for (const [k, v] of Object.entries(raw.items)) {
      const c = typeof k === 'string' && k.length < 300 ? cleanItem(v) : null;
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
    for (const [dev, x] of Object.entries(raw.pointsBy)) { const n = int(x); if (ID.test(dev) && n !== null) pointsBy[dev] = n; }
  } else if (legacy && int(raw.points)) {
    pointsBy[LEGACY_DEVICE] = int(raw.points);
  }
  const tests = {};
  if (isObj(raw.tests)) {
    for (const [k, v] of Object.entries(raw.tests)) {
      const list = cleanTests(v);
      if (list.length) tests[k] = list;
    }
  }
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
      resetAt: num(raw.resetAt) ?? 0,
    },
  };
}

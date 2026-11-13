// Zwei Spielstände zusammenführen (Gerät und Sicherung), ohne Fortschritt zu verlieren.
//
// Normalfall: pro Wort gewinnt der zuletzt geübte Eintrag, Tests werden vereinigt.
// Sternchen und Tageswerte zählt jedes Gerät für sich (pointsBy, days[…].by) – pro Gerät
// gewinnt der höhere Wert, angezeigt wird die Summe. So geht nichts verloren, wenn zwei
// Geräte zwischen zwei Sicherungen geübt haben, und nichts wird doppelt gezählt.
//
// Zurücksetzen: Ein Stand mit neuerem „resetAt“ (Statistik zurücksetzen, oder ein
// Zurücksetzen auf eine frühere Uhrzeit über die Sicherung) gewinnt. Vom anderen Stand
// bleibt nur, was nach diesem Zeitpunkt geübt wurde.

import { dayKey } from './util.js';
import { sanitizeState, sumDay, sumPoints, LEGACY_DEVICE, FEEDBACK_MAX, BLITZ_MAX } from './validate.js';

const total = (d) => (d ? d.right + d.wrong : 0);

export function mergeStates(local, remote) {
  let L = normalize(local);
  let R = normalize(remote);
  // Stand einer alten App (ohne Format-Version): ihre Summen enthalten schon, was die anderen Geräte
  // beigetragen haben (sie hat die Sicherung ja gelesen). Sonst würde das doppelt gezählt.
  if (isLegacy(remote) && !isLegacy(local)) R = liftLegacy(R, L);
  if (isLegacy(local) && !isLegacy(remote)) L = liftLegacy(L, R);
  if (L.resetAt === R.resetAt) return mergeSame(L, R);
  const [newer, older] = L.resetAt > R.resetAt ? [L, R] : [R, L];
  return mergeAfterReset(newer, older);
}

const isLegacy = (raw) => !(raw && Number.isInteger(raw.v) && raw.v >= 2);

// Alter Stand → Anteil des Geräts „alt“: Summe minus das, was die anderen Geräte im Vergleichsstand
// gezählt haben – mindestens aber, was „alt“ dort schon hatte (nie weniger als bekannt).
function liftLegacy(leg, ref) {
  const others = (by = {}) => Object.entries(by).filter(([dev]) => dev !== LEGACY_DEVICE).map(([, c]) => c);
  const sum = (list, f) => list.reduce((n, x) => n + (f(x) ?? 0), 0);
  const refOthers = others(ref.pointsBy);
  const alt = Math.max(ref.pointsBy[LEGACY_DEVICE] ?? 0, (leg.pointsBy[LEGACY_DEVICE] ?? 0) - sum(refOthers, (x) => x));
  const days = {};
  for (const [k, d] of Object.entries(leg.days)) {
    const mine = d.by[LEGACY_DEVICE];
    const refDay = ref.days[k];
    if (!mine || !refDay) { days[k] = d; continue; }
    const o = others(refDay.by);
    const keep = refDay.by[LEGACY_DEVICE] ?? { right: 0, wrong: 0, e: 0 };
    const part = (f) => Math.max(keep[f] ?? 0, (mine[f] ?? 0) - sum(o, (c) => c[f]));
    days[k] = sumDay({ [LEGACY_DEVICE]: { right: part('right'), wrong: part('wrong'), e: part('e') } });
  }
  const pointsBy = { [LEGACY_DEVICE]: alt };
  return { ...leg, days, pointsBy, points: sumPoints(pointsBy) };
}

// Beide Seiten vorher prüfen – Unbrauchbares zählt als leerer Stand.
function normalize(s) {
  return sanitizeState(s ?? {})?.state ?? sanitizeState({}).state;
}

function mergeSame(a, b) {
  const items = { ...a.items };
  for (const [k, v] of Object.entries(b.items)) {
    if (!items[k] || (v.last ?? 0) > (items[k].last ?? 0)) items[k] = v;
  }
  const days = { ...a.days };
  for (const [k, v] of Object.entries(b.days)) days[k] = mergeDay(days[k], v);
  const pointsBy = { ...a.pointsBy };
  for (const [dev, n] of Object.entries(b.pointsBy)) pointsBy[dev] = Math.max(pointsBy[dev] ?? 0, n);
  return {
    ...a,
    items,
    days,
    tests: mergeTests(a.tests, b.tests),
    feedback: mergeFeedback(a.feedback, b.feedback),
    pointsBy,
    points: sumPoints(pointsBy),
    pet: a.pet ?? b.pet,
    path: mergePath(a.path, b.path),
    pathSince: Math.max(a.pathSince ?? 0, b.pathSince ?? 0),
    opened: mergeStamps(a.opened, b.opened),
    blitz: mergeBlitz(a.blitz, b.blitz),
  };
}

// --- Lernweg (SCHEMA 3) ------------------------------------------------------------
// Zeitstempel-Sammlungen: Vereinigung, der frühere Zeitpunkt gewinnt (geschafft bleibt geschafft).
// since: nur Einträge nach diesem Zeitpunkt übernehmen (nach einem Zurücksetzen).
function mergeStamps(a = {}, b = {}, since = -Infinity) {
  const out = { ...a };
  for (const [k, t] of Object.entries(b)) {
    if (t <= since) continue;
    if (!Object.hasOwn(out, k) || t < out[k]) out[k] = t;
  }
  return out;
}

// Lernweg pro Lektion: gelernte Wörter und gemischte Etappen vereinigen; das neuere Turnier gilt
// (mit seinen falschen Wörtern „retry“).
export function mergePath(a = {}, b = {}, since = -Infinity) {
  const out = { ...a };
  for (const [k, e] of Object.entries(b)) {
    const cur = Object.hasOwn(out, k) ? out[k] : { learned: {}, mix: {} };
    const m = { learned: mergeStamps(cur.learned, e.learned, since), mix: mergeStamps(cur.mix, e.mix, since) };
    const take = e.turnier && e.turnier.at > since && (!cur.turnier || e.turnier.at > cur.turnier.at) ? e : cur;
    if (take.turnier) m.turnier = take.turnier;
    if (take.retry) m.retry = take.retry;
    out[k] = m;
  }
  return out;
}

// Blitzrunden: alle gespielten sammeln (gleiche id = dieselbe Runde).
function mergeBlitz(a = [], b = [], since = -Infinity) {
  const byId = new Map();
  for (const x of [...a, ...b]) if (x.at > since && !byId.has(x.id)) byId.set(x.id, x);
  return [...byId.values()].sort((x, y) => x.at - y.at).slice(-BLITZ_MAX);
}

// Ein Tag: pro Gerät der Eintrag mit mehr Antworten (die Zähler wachsen nur).
function mergeDay(a, b) {
  if (!a) return b;
  const by = { ...a.by };
  for (const [dev, c] of Object.entries(b.by)) if (total(c) > total(by[dev])) by[dev] = c;
  return sumDay(by);
}

// newer wurde zurückgesetzt: vom älteren Stand nur übernehmen, was danach geübt wurde.
// Sternchen bleiben die des neueren Stands (beim älteren lässt sich nicht trennen, was davor
// und was danach gesammelt wurde).
function mergeAfterReset(newer, older) {
  const since = newer.resetAt;
  const sinceDay = dayKey(new Date(since));
  const items = { ...newer.items };
  for (const [k, v] of Object.entries(older.items)) {
    if ((v.last ?? 0) > since && (!items[k] || v.last > (items[k].last ?? 0))) items[k] = v;
  }
  const days = { ...newer.days };
  for (const [k, v] of Object.entries(older.days)) {
    if (k >= sinceDay) days[k] = mergeDay(days[k], v);
  }
  const olderTests = Object.fromEntries(Object.entries(older.tests)
    .map(([k, list]) => [k, list.filter((r) => r.day >= sinceDay)]));
  // Rückmeldungen gehören nicht zum Lernstand – sie bleiben auch über ein Zurücksetzen hinweg.
  // Lernweg, geöffnete Lektionen und Blitzrunden: wie der Lernstand nur, was nach dem Zurücksetzen kam.
  return {
    ...newer, items, days, tests: mergeTests(newer.tests, olderTests), feedback: mergeFeedback(newer.feedback, older.feedback),
    path: mergePath(newer.path, older.path, since),
    opened: mergeStamps(newer.opened, older.opened, since),
    blitz: mergeBlitz(newer.blitz, older.blitz.filter((x) => x.at > since)),
  };
}

// Rückmeldungen: alle sammeln, pro Runde (id) gilt die zuletzt geänderte.
function mergeFeedback(a = [], b = []) {
  const byId = new Map();
  for (const f of [...a, ...b]) if (!byId.has(f.id) || f.at > byId.get(f.id).at) byId.set(f.id, f);
  return [...byId.values()].sort((x, y) => x.at - y.at).slice(-FEEDBACK_MAX);
}

function mergeTests(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, list] of Object.entries(b)) {
    const seen = new Set((out[k] ?? []).map((r) => `${r.day}|${r.pct}`));
    out[k] = [...(out[k] ?? []), ...list.filter((r) => !seen.has(`${r.day}|${r.pct}`))].slice(-20);
  }
  return out;
}

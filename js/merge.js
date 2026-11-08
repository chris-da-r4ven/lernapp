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
import { sanitizeState, sumDay, sumPoints } from './validate.js';

const total = (d) => (d ? d.right + d.wrong : 0);

export function mergeStates(local, remote) {
  const L = normalize(local);
  const R = normalize(remote);
  if (L.resetAt === R.resetAt) return mergeSame(L, R);
  const [newer, older] = L.resetAt > R.resetAt ? [L, R] : [R, L];
  return mergeAfterReset(newer, older);
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
    pointsBy,
    points: sumPoints(pointsBy),
    pet: a.pet ?? b.pet,
  };
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
  return { ...newer, items, days, tests: mergeTests(newer.tests, olderTests) };
}

function mergeTests(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, list] of Object.entries(b)) {
    const seen = new Set((out[k] ?? []).map((r) => `${r.day}|${r.pct}`));
    out[k] = [...(out[k] ?? []), ...list.filter((r) => !seen.has(`${r.day}|${r.pct}`))].slice(-20);
  }
  return out;
}

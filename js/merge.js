// Zwei Spielstände zusammenführen (Gerät und Sicherung), ohne Fortschritt zu verlieren.
//
// Normalfall: pro Wort gewinnt der zuletzt geübte Eintrag, Übungstage und Tests werden
// vereinigt, Sternchen nimmt den höheren Wert.
//
// Zurücksetzen: Ein Stand mit neuerem „resetAt“ (Statistik zurücksetzen, oder ein
// Zurücksetzen auf eine frühere Uhrzeit über die Sicherung) gewinnt. Vom anderen Stand
// bleibt nur, was nach diesem Zeitpunkt geübt wurde.

import { dayKey } from './util.js';
import { sanitizeState } from './validate.js';

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
  for (const [k, v] of Object.entries(b.days)) if (total(v) > total(days[k])) days[k] = v;
  return {
    ...a,
    items,
    days,
    tests: mergeTests(a.tests, b.tests),
    points: Math.max(a.points ?? 0, b.points ?? 0),
    pet: a.pet ?? b.pet,
  };
}

// newer wurde zurückgesetzt: vom älteren Stand nur übernehmen, was danach geübt wurde.
function mergeAfterReset(newer, older) {
  const since = newer.resetAt;
  const sinceDay = dayKey(new Date(since));
  const items = { ...newer.items };
  for (const [k, v] of Object.entries(older.items)) {
    if ((v.last ?? 0) > since && (!items[k] || v.last > (items[k].last ?? 0))) items[k] = v;
  }
  const days = { ...newer.days };
  for (const [k, v] of Object.entries(older.days)) {
    if (k >= sinceDay && total(v) > total(days[k])) days[k] = v;
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

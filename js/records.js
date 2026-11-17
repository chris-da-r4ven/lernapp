// 🏆 Tagesrekord: so viele Punkte 🎯 an einem Tag wie noch nie (Tagesziel-Punkte: jede Aufgabe nach ihrer
// Schwere, siehe streak.js dayValue). Gefeiert wird nur der Moment, in dem der alte Rekord überholt wird,
// und erst, wenn es einen nennenswerten alten Rekord gibt (RECORD_MIN = ein volles Tagesziel).

import { dayValue, DAY_GOAL } from './streak.js';

export const RECORD_MIN = DAY_GOAL;
export const dayPoints = (d) => Math.round(dayValue(d) * 10) / 10;
export const fmtPoints = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

// Tag (ganz oder teilweise) aus der Zeit vor der Gewichtung (8.11.2026): Damals zählte jede Aufgabe 1,
// auch Antippen – mit heutigen Tagen nicht vergleichbar, deshalb kein Rekord.
export const oldCount = (d) => !!d && (d.by && Object.keys(d.by).length
  ? Object.values(d.by).some((c) => c?.e == null)
  : d.e == null && (Number(d.right) || 0) + (Number(d.wrong) || 0) > 0);

// Bester Tag vor heute: { key, n } (n = 0, wenn es noch keinen gibt).
export function bestDay(days, today) {
  let best = { key: null, n: 0 };
  for (const [k, d] of Object.entries(days)) {
    if (k === today || oldCount(d)) continue;
    const n = dayPoints(d);
    if (n > best.n) best = { key: k, n };
  }
  return best;
}

// Hat diese Runde den Rekord geknackt? before/after: Punkte heute vor und nach der Runde.
export function recordBroken(days, today, before, after) {
  const best = bestDay(days, today).n;
  return best >= RECORD_MIN && before <= best && after > best ? { best, now: after } : null;
}

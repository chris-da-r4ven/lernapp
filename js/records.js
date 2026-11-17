// 🏆 Tagesrekord: so viele Punkte 🎯 an einem Tag wie noch nie (Tagesziel-Punkte: jede Aufgabe nach ihrer
// Schwere, siehe streak.js dayValue). Gefeiert wird nur der Moment, in dem der alte Rekord überholt wird,
// und erst, wenn es einen nennenswerten alten Rekord gibt (RECORD_MIN = ein volles Tagesziel).
//
// Zwei Rekorde:
// - Rekord der letzten 4 Wochen (RECORD_DAYS): gleitend, damit er erreichbar bleibt – ein früherer
//   Spitzentag fällt irgendwann heraus. Hängt bewusst nicht an der Serie (ein Riss nimmt nichts weg).
// - Allzeit-Rekord: der beste Tag überhaupt, als Siegerkranz auf der Fortschritt-Seite.

import { dayValue, DAY_GOAL } from './streak.js';

export const RECORD_MIN = DAY_GOAL;
export const RECORD_DAYS = 28;
export const dayPoints = (d) => Math.round(dayValue(d) * 10) / 10;
export const fmtPoints = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

// Tag (ganz oder teilweise) aus der Zeit vor der Gewichtung (8.11.2026): Damals zählte jede Aufgabe 1,
// auch Antippen – mit heutigen Tagen nicht vergleichbar, deshalb kein Rekord.
export const oldCount = (d) => !!d && (d.by && Object.keys(d.by).length
  ? Object.values(d.by).some((c) => c?.e == null)
  : d.e == null && (Number(d.right) || 0) + (Number(d.wrong) || 0) > 0);

// Tagesschlüssel n Tage vor `key` ("2026-11-17" → "2026-10-20").
function keyBefore(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d - n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// Bester Tag: { key, n } (n = 0, wenn es noch keinen gibt).
// window: nur die letzten so vielen Tage vor `today` (null = alle). withToday: heute mitzählen.
export function bestDay(days, today, { window = RECORD_DAYS, withToday = false } = {}) {
  const from = window ? keyBefore(today, window) : '';
  let best = { key: null, n: 0 };
  for (const [k, d] of Object.entries(days)) {
    if ((k === today && !withToday) || k > today || k < from || oldCount(d)) continue;
    const n = dayPoints(d);
    if (n > best.n) best = { key: k, n };
  }
  return best;
}

// Hat diese Runde einen Rekord geknackt? before/after: Punkte heute vor und nach der Runde.
// → null oder { best, now, allTime } (allTime: auch der Allzeit-Rekord ist überholt).
export function recordBroken(days, today, before, after) {
  const broke = (best) => best >= RECORD_MIN && before <= best && after > best;
  const all = bestDay(days, today, { window: null }).n;
  if (broke(all)) return { best: all, now: after, allTime: true };
  const best = bestDay(days, today).n;
  return broke(best) ? { best, now: after, allTime: false } : null;
}

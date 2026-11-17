// 🏆 Tagesrekord: so viele Aufgaben an einem Tag wie noch nie (richtig + falsch – wie die Balken
// auf der Fortschritt-Seite). Gefeiert wird nur der Moment, in dem der alte Rekord überholt wird,
// und erst, wenn es einen nennenswerten alten Rekord gibt (RECORD_MIN).

export const RECORD_MIN = 10;
export const dayAnswers = (d) => (d ? (Number(d.right) || 0) + (Number(d.wrong) || 0) : 0);

// Bester Tag vor heute: { key, n } (n = 0, wenn es noch keinen gibt).
export function bestDay(days, today) {
  let best = { key: null, n: 0 };
  for (const [k, d] of Object.entries(days)) {
    if (k === today) continue;
    const n = dayAnswers(d);
    if (n > best.n) best = { key: k, n };
  }
  return best;
}

// Hat diese Runde den Rekord geknackt? before/after: Aufgaben heute vor und nach der Runde.
export function recordBroken(days, today, before, after) {
  const best = bestDay(days, today).n;
  return best >= RECORD_MIN && before <= best && after > best ? { best, now: after } : null;
}

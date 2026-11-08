// Spielstand prüfen und bereinigen – bevor er übernommen wird (aus dem Speicher des Geräts,
// aus der Sicherung, beim Zusammenführen).
//
// Ziel: Ein vertippter, beschädigter oder manipulierter Stand darf die App weder lahmlegen
// noch etwas ins HTML schmuggeln. Einzelne kaputte Einträge werden verworfen, der Rest bleibt.
// Ist der Stand als Ganzes unbrauchbar (kein Objekt), gibt es null.

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (x, min = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= min ? x : null);
const int = (x, min = 0) => { const n = num(x, min); return n === null ? null : Math.floor(n); };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

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

function cleanDay(v) {
  if (!isObj(v)) return null;
  const d = { right: int(v.right) ?? 0, wrong: int(v.wrong) ?? 0 };
  const e = int(v.e);
  if (e !== null) d.e = e;
  return d;
}

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
  const days = {};
  if (isObj(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) {
      const c = DAY.test(k) ? cleanDay(v) : null;
      if (c) days[k] = c; else dropped++;
    }
  } else if (raw.days !== undefined) dropped++;
  const tests = {};
  if (isObj(raw.tests)) {
    for (const [k, v] of Object.entries(raw.tests)) {
      const list = cleanTests(v);
      if (list.length) tests[k] = list;
    }
  }
  return {
    dropped,
    state: {
      items,
      days,
      points: int(raw.points) ?? 0,
      pet: null,
      tests,
      resetAt: num(raw.resetAt) ?? 0,
    },
  };
}

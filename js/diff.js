// Vergleich Buchstabe für Buchstabe (Levenshtein mit Rückverfolgung).
// Ergebnis: Liste von Schritten
//   ok   – Buchstabe stimmt
//   sub  – falscher Buchstabe (typed statt target)
//   extra – zu viel getippt
//   miss – Buchstabe fehlt

import { esc } from './util.js';

export function distance(a, b) {
  return table(a, b)[a.length][b.length];
}

function table(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d;
}

// Abstand mit Vertauschung benachbarter Buchstaben als EIN Fehler (Damerau, „optimal string alignment“).
// Für „Fast richtig“: Bei distance() oben kostet „freind“ statt „friend“ zwei Schritte.
export function osa(a, b) {
  a = [...a]; b = [...b];
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Genau ein Buchstabe daneben (fehlt, zu viel, falsch, vertauscht) – oder nur Groß/Klein falsch.
// Kurze Wörter (unter NEAR_MIN Buchstaben) nie: in/on, a/an, cat/hat wären sonst „fast richtig“.
export const NEAR_MIN = 4;
export function nearMiss(typed, target) {
  if ([...target].length < NEAR_MIN || typed === target) return false;
  if (typed.toLowerCase() === target.toLowerCase()) return true;
  return osa(typed, target) === 1;
}

export function align(typed, target) {
  const a = [...typed];
  const b = [...target];
  const d = table(a, b);
  const ops = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push(a[i - 1] === b[j - 1] ? { op: 'ok', t: a[i - 1], c: b[j - 1] } : { op: 'sub', t: a[i - 1], c: b[j - 1] });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: 'extra', t: a[i - 1] });
      i--;
    } else {
      ops.push({ op: 'miss', c: b[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}

// Zwei Zeilen HTML: was getippt wurde (Fehler rot) und die richtige Lösung (korrigierte Stellen grün).
export function renderDiff(typed, target) {
  const ops = align(typed, target);
  const ch = (c) => (c === ' ' ? '&nbsp;' : esc(c));
  const yours = ops.map((o) => {
    if (o.op === 'ok') return `<span class="d-ok">${ch(o.t)}</span>`;
    if (o.op === 'sub') return `<span class="d-bad">${ch(o.t)}</span>`;
    if (o.op === 'extra') return `<span class="d-bad d-extra">${ch(o.t)}</span>`;
    return '<span class="d-gap">_</span>';
  }).join('');
  const right = ops.filter((o) => o.op !== 'extra').map((o) =>
    o.op === 'ok' ? `<span class="d-ok">${ch(o.c)}</span>` : `<span class="d-fix">${ch(o.c)}</span>`
  ).join('');
  return { yours, right };
}

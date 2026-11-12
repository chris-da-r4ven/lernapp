// Zahlenstrahl als Grafik (SVG) für Mathe-Aufgaben.
//
// In der Lektionsdatei: "line": { "from": 0, "to": 50, "step": 2, "label": 10, "arrow": 24 }
//   from/to  Ausschnitt          step   Abstand der Striche (Schrittlänge)
//   label    jede wievielte Zahl beschriftet ist (Vielfache davon, gezählt ab from)
//   arrow    Zahl, auf die der Pfeil zeigt (optional – ohne Pfeil z. B. „Wie groß ist die Schrittlänge?“)
//   marks    weitere beschriftete Zahlen (optional), z. B. [24, 36]

const W = 640;
const PAD = 28;
const Y = 70;

export function numberLine({ from, to, step, label, arrow, marks = [] }) {
  const n = Math.round((to - from) / step);
  if (!(n > 0 && n <= 200)) return '';
  const x = (v) => PAD + ((v - from) / (to - from)) * (W - 2 * PAD);
  const isLabel = (v) => (label ? Math.abs(((v - from) / label) - Math.round((v - from) / label)) < 1e-9 : false) || marks.includes(v);
  const parts = [`<line x1="${PAD - 12}" y1="${Y}" x2="${W - PAD + 16}" y2="${Y}" class="nl-axis"/>`,
    `<path d="M${W - PAD + 16} ${Y - 6} L${W - PAD + 26} ${Y} L${W - PAD + 16} ${Y + 6}" class="nl-axis nl-head"/>`];
  for (let i = 0; i <= n; i++) {
    const v = from + i * step;
    const big = isLabel(v);
    parts.push(`<line x1="${x(v)}" y1="${Y - (big ? 12 : 7)}" x2="${x(v)}" y2="${Y + (big ? 12 : 7)}" class="nl-tick${big ? ' nl-big' : ''}"/>`);
    if (big) parts.push(`<text x="${x(v)}" y="${Y + 34}" class="nl-num">${v.toLocaleString('de-DE')}</text>`);
  }
  if (typeof arrow === 'number') {
    const ax = x(arrow);
    parts.push(`<path d="M${ax} ${Y - 16} L${ax - 9} ${Y - 34} L${ax + 9} ${Y - 34} Z" class="nl-arrow"/>`,
      `<line x1="${ax}" y1="${Y - 50}" x2="${ax}" y2="${Y - 32}" class="nl-arrow-line"/>`);
  }
  return `<svg class="numberline" viewBox="0 0 ${W} 120" role="img" aria-label="Zahlenstrahl von ${from} bis ${to}">${parts.join('')}</svg>`;
}

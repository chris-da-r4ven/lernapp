// Diagramme und Strichlisten als Grafik für Mathe-Aufgaben (Kapitel „Daten“).
//
// In der Lektionsdatei:
//   "chart": { "type": "saeulen" | "balken" | "bild", "title": "Wie kommst du zur Schule?",
//              "labels": ["Bus", "Fahrrad"], "values": [8, 5],
//              "step": 2,            Skala: Abstand der Hilfslinien (Säulen/Balken)
//              "max": 10,            Skala bis (optional, sonst nächstes Vielfaches von step)
//              "axis": "Anzahl",     Beschriftung der Zahlen-Achse (optional)
//              "symbol": "🚲", "per": 2 }   Bilddiagramm: ein Symbol steht für "per" Stück
//   "tally": [["Hund", 7], ["Katze", 12]]   Strichliste (Fünferbündel mit Querstrich)

import { esc } from '../util.js';

const fmt = (v) => Number(v).toLocaleString('de-DE');

export function chart(spec) {
  const { type, labels = [], values = [] } = spec ?? {};
  if (!labels.length || labels.length !== values.length) return '';
  const head = spec.title ? `<p class="chart-title">${esc(spec.title)}</p>` : '';
  if (type === 'bild') return `<figure class="chart">${head}${pictogram(spec)}</figure>`;
  if (type === 'saeulen' || type === 'balken') return `<figure class="chart">${head}${bars(spec, type === 'balken')}</figure>`;
  return '';
}

function scale(spec) {
  const step = spec.step > 0 ? spec.step : 1;
  const top = Math.max(...spec.values);
  const max = spec.max ?? Math.ceil(top / step) * step;
  const n = Math.round(max / step);
  return n > 0 && n <= 40 ? { step, max, n } : null;
}

// Säulen (senkrecht) oder Balken (waagerecht) mit Skala und Hilfslinien.
function bars(spec, horizontal) {
  const s = scale(spec);
  if (!s) return '';
  const k = spec.labels.length;
  const W = 640;
  const H = horizontal ? 60 + k * 44 : 300;
  const L = horizontal ? 130 : 56;            // Platz links (Beschriftung)
  const R = 20, T = 14, B = horizontal ? 46 : 54;
  const pw = W - L - R, ph = H - T - B;
  const out = [];
  for (let i = 0; i <= s.n; i++) {
    const v = i * s.step;
    if (horizontal) {
      const x = L + (v / s.max) * pw;
      out.push(`<line x1="${x}" y1="${T}" x2="${x}" y2="${T + ph}" class="ch-grid"/>`,
        `<text x="${x}" y="${T + ph + 22}" class="ch-num" text-anchor="middle">${fmt(v)}</text>`);
    } else {
      const y = T + ph - (v / s.max) * ph;
      out.push(`<line x1="${L}" y1="${y}" x2="${L + pw}" y2="${y}" class="ch-grid"/>`,
        `<text x="${L - 8}" y="${y + 5}" class="ch-num" text-anchor="end">${fmt(v)}</text>`);
    }
  }
  const slot = (horizontal ? ph : pw) / k;
  const thick = Math.min(slot * 0.6, 56);
  spec.labels.forEach((label, i) => {
    const v = Math.min(spec.values[i], s.max);
    const c = slot * i + (slot - thick) / 2;
    if (horizontal) {
      const w = (v / s.max) * pw;
      out.push(`<rect x="${L}" y="${T + c}" width="${w}" height="${thick}" class="ch-bar ch-c${i % 6}"/>`,
        `<text x="${L - 8}" y="${T + c + thick / 2 + 5}" class="ch-label" text-anchor="end">${esc(label)}</text>`);
    } else {
      const h = (v / s.max) * ph;
      out.push(`<rect x="${L + c}" y="${T + ph - h}" width="${thick}" height="${h}" class="ch-bar ch-c${i % 6}"/>`,
        `<text x="${L + c + thick / 2}" y="${T + ph + 22}" class="ch-label" text-anchor="middle">${esc(label)}</text>`);
    }
  });
  out.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" class="ch-axis"/>`,
    `<line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" class="ch-axis"/>`);
  if (spec.axis) {
    out.push(horizontal
      ? `<text x="${L + pw / 2}" y="${H - 6}" class="ch-axis-title" text-anchor="middle">${esc(spec.axis)}</text>`
      : `<text x="14" y="${T + ph / 2}" class="ch-axis-title" text-anchor="middle" transform="rotate(-90 14 ${T + ph / 2})">${esc(spec.axis)}</text>`);
  }
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${horizontal ? 'Balkendiagramm' : 'Säulendiagramm'}">${out.join('')}</svg>`;
}

// Bilddiagramm: pro Zeile so viele Symbole, wie der Wert ergibt (ein Symbol = "per" Stück).
function pictogram(spec) {
  const per = spec.per > 0 ? spec.per : 1;
  const sym = esc(spec.symbol ?? '●');
  const rows = spec.labels.map((label, i) => {
    const full = Math.floor(spec.values[i] / per);
    const half = spec.values[i] % per ? '<span class="pic-half">' + sym + '</span>' : '';
    return `<tr><th>${esc(label)}</th><td class="pic-row">${sym.repeat(full)}${half}</td></tr>`;
  }).join('');
  return `<table class="pictogram">${rows}</table>
    <p class="muted small pic-key">${sym} = ${fmt(per)}${spec.axis ? ' ' + esc(spec.axis) : ''}</p>`;
}

// Strichliste: je 4 Striche und ein Querstrich = 5.
function tallyMarks(n) {
  const group = (k) => {
    const lines = Array.from({ length: Math.min(k, 4) }, (_, i) => `<line x1="${5 + i * 7}" y1="3" x2="${5 + i * 7}" y2="27"/>`).join('');
    const cross = k === 5 ? '<line x1="1" y1="22" x2="31" y2="8"/>' : '';
    return `<svg class="tally" viewBox="0 0 34 30" width="34" height="30" aria-hidden="true">${lines}${cross}</svg>`;
  };
  const out = [];
  for (let left = n; left > 0; left -= 5) out.push(group(Math.min(left, 5)));
  return out.join('');
}

export function tallyTable(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return `<table class="tally-table">${rows.map(([label, n]) =>
    `<tr><th>${esc(label)}</th><td>${tallyMarks(n)}</td></tr>`).join('')}</table>`;
}

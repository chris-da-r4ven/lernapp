// Siegerkranz wie beim Pferderennen: Lorbeer-Hufeisen (oben offen), Schleife unten,
// in der Mitte eine Zahl. Reines SVG, ohne Bilddatei.

import { esc } from './util.js';

const R = 46;            // Radius des Kranzes
const C = 60;            // Mitte (viewBox 120 × 120)
const FROM = -55;        // oben rechts …
const TO = 235;          // … im Uhrzeigersinn bis oben links (Grad, 90 = unten)

const pt = (a, r = R) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
const f = (n) => n.toFixed(1);

function leaves() {
  const out = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = FROM + ((TO - FROM) * i) / n;
    const side = a < 90 ? 1 : -1;            // beide Seiten wachsen von der Schleife nach oben (gespiegelt)
    for (const [dr, tilt] of [[-5, -35], [5, 35]]) {
      const [x, y] = pt(a, R + dr);
      out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="3.6" transform="rotate(${f(a + 90 + tilt * side)} ${f(x)} ${f(y)})" fill="${dr < 0 ? '#2f8a3a' : '#3fa34d'}"/>`);
    }
  }
  return out.join('');
}

const bow = () => {
  const [x, y] = pt(90);
  return `<g fill="#4f6cf7">
    <path d="M${f(x)} ${f(y)} l-6 16 l4 -2 l2 4 z"/><path d="M${f(x)} ${f(y)} l6 16 l-4 -2 l-2 4 z"/>
    <path d="M${f(x)} ${f(y)} q-11 -9 -13 0 q2 8 13 0 z"/><path d="M${f(x)} ${f(y)} q11 -9 13 0 q-2 8 -13 0 z"/>
    <circle cx="${f(x)}" cy="${f(y)}" r="3.4" fill="#f5b400"/></g>`;
};

// value: Zahl als Text (z. B. "40"); label: kleine Zeile darunter; size: Breite in px.
export function wreath(value, { label = '🎯 Punkte', size = 120, title = '' } = {}) {
  const big = String(value).length > 3 ? 22 : 28;
  return `<svg class="wreath" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(title || `${value} ${label}`)}">
    ${leaves()}${bow()}
    <text x="60" y="${label ? 61 : 69}" text-anchor="middle" font-size="${big}" font-weight="800" fill="currentColor">${esc(value)}</text>
    ${label ? `<text x="60" y="78" text-anchor="middle" font-size="10" font-weight="600" fill="currentColor" opacity="0.75">${esc(label)}</text>` : ''}
  </svg>`;
}

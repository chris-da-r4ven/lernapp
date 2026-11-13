// Hofkarte auf der Lektionsseite: fester Hintergrund je Thema (img/hof-<thema>.svg, aus tools/hofkarte)
// und darüber die Ebene aus dem Lernweg – Stationen mit Zustand, gelaufener Weg, Pixel-Fanny.
// Die Stationen liegen gleichmäßig auf dem Weg, egal wie viele Etappen die Lektion hat.
// Nur berechnete Zahlen und feste Tabellen im SVG – keine Inhaltstexte. Die Karte ist Deko
// (aria-hidden); dieselben Etappen stehen als Liste darunter.

import { HOF_VIEW, HOF_WAY } from './hof-data.js';
import { STATIONS } from './path.js';
import { fannyPixel } from './fanny-pixel.js';

export const HOF_THEMES = Object.keys(HOF_WAY);
export const hofTheme = (lesson) => (typeof lesson?.hof === 'string' && Object.hasOwn(HOF_WAY, lesson.hof) ? lesson.hof : 'neutral');

// Punkt auf dem Weg nach Anteil t (0 … 1) der Weglänge; dazu der Weg bis dorthin.
export function along(way, t) {
  const seg = way.slice(1).map((p, k) => Math.hypot(p[0] - way[k][0], p[1] - way[k][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let rest = Math.max(0, Math.min(1, t)) * total;
  const walked = [way[0]];
  for (let k = 0; k < seg.length; k++) {
    if (rest <= seg[k] || k === seg.length - 1) {
      const f = seg[k] ? Math.min(1, rest / seg[k]) : 0;
      const p = [way[k][0] + (way[k + 1][0] - way[k][0]) * f, way[k][1] + (way[k + 1][1] - way[k][1]) * f];
      walked.push(p);
      return { point: p, walked };
    }
    rest -= seg[k];
    walked.push(way[k + 1]);
  }
  return { point: way[way.length - 1], walked };
}

// Lage der Stationen: n Etappen gleichmäßig vom Anfang bis zum Ende des Wegs.
export const stationTs = (n) => (n <= 1 ? [1] : Array.from({ length: n }, (_, k) => k / (n - 1)));

const r = (v) => Math.round(v);
const line = (ps) => ps.map((p) => `${r(p[0])},${r(p[1])}`).join(' ');

// stages: aus etappenFor; next: nextEtappe (null = alles geschafft); href(stage) → Adresse der Etappe
export function hofkarte(lesson, stages, next, href) {
  if (!stages.length) return '';
  const theme = hofTheme(lesson);
  const way = HOF_WAY[theme];
  const ts = stationTs(stages.length);
  const spots = ts.map((t) => along(way, t).point);
  const cur = next ? stages.indexOf(next) : stages.length - 1;
  const walked = cur > 0 ? along(way, ts[cur]).walked : [];

  let no = 0;
  const markers = stages.map((s, k) => {
    if (!s.optional) no += 1;
    const [x, y] = spots[k];
    const state = s.done ? 'done' : s === next ? 'now' : 'later';
    const special = s.type === 'turnier' || s.type === 'nachtraining' || s.optional;
    const label = s.done && !special ? '✓' : special ? STATIONS[s.station].icon : String(no);
    const body = `<g class="hof-st ${state}${special ? ' special' : ''}">
        <line x1="${r(x)}" y1="${r(y - 50)}" x2="${r(x)}" y2="${r(y)}"></line>
        <circle cx="${r(x)}" cy="${r(y - 76)}" r="30"></circle>
        <text x="${r(x)}" y="${r(y - 64)}" text-anchor="middle">${label}</text>
      </g>`;
    // tabindex -1: Antippen geht, die Tastatur nimmt die Liste darunter
    return s.open ? `<a href="${href(s)}" tabindex="-1">${body}</a>` : body;
  });

  // Fanny steht neben der aktuellen Station (am Ende: auf dem Siegerplatz)
  const [fx, fy] = spots[cur];
  const fw = 120;
  const fanny = fannyPixel(fw).replace('<svg ', `<svg x="${r(fx - fw - 18)}" y="${r(fy - fw * 23 / 30 + 6)}" `);

  const [vx, vy, vw, vh] = HOF_VIEW;
  return `
    <div class="hofkarte" aria-hidden="true">
      <svg viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet">
        <image href="img/hof-${theme}.svg" x="${vx}" y="${vy}" width="${vw}" height="${vh}"></image>
        ${walked.length > 1 ? `<polyline class="hof-walked" points="${line(walked)}"></polyline>` : ''}
        <g class="hof-fanny${next ? '' : ' won'}">${fanny}</g>
        ${markers.join('')}
      </svg>
    </div>`;
}

// Pferdekopf von vorn (SVG) für die Stallboxen: Jede Lektion hat ihr eigenes Pferd – Fell, Mähne,
// Frisur, Abzeichen und Halfter ergeben sich aus der Nummer der Lektion im Fach. Nachbarn unterscheiden
// sich in allen Merkmalen, weil jedes Merkmal mit einem anderen Schritt durch seine Liste läuft.

const COATS = [
  { name: 'Fuchs', coat: '#c8692c', shade: '#a4521f', mane: '#8a3d14' },
  { name: 'Schimmel', coat: '#eceae6', shade: '#cfcac2', mane: '#bdb7ad' },
  { name: 'Rappe', coat: '#3b3433', shade: '#272120', mane: '#151112' },
  { name: 'Palomino', coat: '#e2b660', shade: '#c79a45', mane: '#fbf1d6' },
  { name: 'Brauner', coat: '#8a5532', shade: '#6d3f22', mane: '#2b1a12' },
  { name: 'Falbe', coat: '#d6b98a', shade: '#b89a6b', mane: '#3d2a1c' },
  { name: 'Apfelschimmel', coat: '#b9bcc2', shade: '#979ba3', mane: '#e9e9ec', dapple: true },
  { name: 'Lichtfuchs', coat: '#d98a4e', shade: '#bb6f37', mane: '#f3dcb0' },
];
const MANES = [null, null, '#f28bb8', null, '#9b7be0', null];        // ab und zu eine bunte Mähne
const STYLES = ['pony', 'scheitel', 'locken', 'zopf', 'strubbel'];
const MARKS = ['blesse', 'stern', 'keins', 'schnippe', 'laterne'];
const HALTERS = ['#e5484d', '#4f6cf7', '#1f9d55', '#f5b400', '#d14aa0', '#7b4fd6', '#18a3b8'];

// Merkmale für Lektion Nummer i (0, 1, 2 …).
export function horseLook(i) {
  const n = Math.max(0, i | 0);
  const c = COATS[n % COATS.length];
  return {
    ...c,
    mane: MANES[(n * 5) % MANES.length] ?? c.mane,
    style: STYLES[(n * 2 + 1) % STYLES.length],
    mark: MARKS[(n * 3) % MARKS.length],
    halter: HALTERS[(n * 4 + 2) % HALTERS.length],
  };
}

function forelock(style, m) {
  switch (style) {
    case 'scheitel': return `<path d="M50 14 C38 16 30 26 32 38 C38 30 44 26 50 24 Z M50 14 C60 16 68 24 66 34 C62 28 56 25 50 24 Z" fill="${m}"/>`;
    case 'locken': return [38, 46, 54, 62, 42, 58, 50].map((x, k) => `<circle cx="${x}" cy="${k < 4 ? 20 : 27}" r="${k < 4 ? 6 : 5.5}" fill="${m}"/>`).join('');
    case 'zopf': return `<path d="M42 14 L58 14 L54 26 L46 26 Z" fill="${m}"/>${[30, 37, 44].map((y) => `<ellipse cx="50" cy="${y}" rx="4.5" ry="4" fill="${m}"/>`).join('')}<circle cx="50" cy="49" r="3" fill="#ffffff" opacity="0.9"/>`;
    case 'strubbel': return `<path d="M34 24 L38 10 L43 20 L48 6 L52 19 L58 8 L60 21 L67 13 L64 28 L36 30 Z" fill="${m}"/>`;
    default: return `<path d="M36 18 C40 12 60 12 64 18 L66 30 C60 26 56 32 50 28 C44 32 40 26 34 30 Z" fill="${m}"/>`;   // Pony
  }
}

function marking(mark) {
  const w = '#fbfaf7';
  switch (mark) {
    case 'blesse': return `<path d="M47 30 L53 30 L54 64 L58 82 L42 82 L46 64 Z" fill="${w}"/>`;
    case 'stern': return `<path d="M50 34 L53 40 L50 46 L47 40 Z" fill="${w}"/>`;
    case 'schnippe': return `<ellipse cx="50" cy="80" rx="6" ry="4.5" fill="${w}"/>`;
    case 'laterne': return `<path d="M41 28 L59 28 L62 66 L65 86 L35 86 L38 66 Z" fill="${w}"/>`;
    default: return '';
  }
}

// Pferdekopf als SVG (viewBox 100 × 100, Hals unten angeschnitten).
// part: 'back' = Hals und Mähne (hinter der unteren Tür), 'front' = Kopf mit Gesicht (davor), 'all' = beides.
export function horseSvg(i, { className = 'horse-head', part = 'all' } = {}) {
  const h = horseLook(i);
  const dapple = h.dapple ? [[40, 54], [60, 56], [46, 64], [56, 30], [43, 28], [54, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${h.shade}" opacity="0.55"/>`).join('') : '';
  const back = `
    <path d="M30 62 C28 80 24 92 22 100 L78 100 C76 92 72 80 70 62 Z" fill="${h.shade}"/>
    <path d="M31 30 C24 44 20 62 16 80 C14 90 14 96 15 100 L27 100 C26 86 28 70 33 54 Z" fill="${h.mane}"/>`;
  const front = `
    <path d="M32 22 L28 3 L43 15 Z" fill="${h.coat}"/><path d="M33 18 L31 8 L39 15 Z" fill="${h.shade}"/>
    <path d="M68 22 L72 3 L57 15 Z" fill="${h.coat}"/><path d="M67 18 L69 8 L61 15 Z" fill="${h.shade}"/>
    <path d="M50 12 C64 12 72 22 73 36 C74 48 70 58 64 68 C62 72 64 76 66 82 C67 92 60 97 50 97 C40 97 33 92 34 82 C36 76 38 72 36 68 C30 58 26 48 27 36 C28 22 36 12 50 12 Z" fill="${h.coat}"/>
    ${dapple}${marking(h.mark)}
    <path d="M36 78 C38 72 62 72 64 78 C67 90 60 97 50 97 C40 97 33 90 36 78 Z" fill="${h.shade}" opacity="0.6"/>
    <ellipse cx="44" cy="87" rx="2.8" ry="3.6" fill="#2a1a12"/><ellipse cx="56" cy="87" rx="2.8" ry="3.6" fill="#2a1a12"/>
    <path d="M45 93 Q50 95 55 93" stroke="#2a1a12" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="35" cy="44" rx="5" ry="6" fill="#241815"/><ellipse cx="65" cy="44" rx="5" ry="6" fill="#241815"/>
    <circle cx="36.8" cy="41.6" r="1.9" fill="#ffffff"/><circle cx="66.8" cy="41.6" r="1.9" fill="#ffffff"/>
    <path d="M29.5 39 l-3 -2.5 M31 37 l-2 -3.2 M70.5 39 l3 -2.5 M69 37 l2 -3.2" stroke="#241815" stroke-width="1.2" stroke-linecap="round"/>
    ${forelock(h.style, h.mane)}
    <path d="M30 32 C33 46 36 58 38 70" stroke="${h.halter}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M70 32 C67 46 64 58 62 70" stroke="${h.halter}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M36 71 C42 75 58 75 64 71" stroke="${h.halter}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="75" r="2.6" fill="none" stroke="#d9d9d9" stroke-width="1.6"/>`;
  return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">${part === 'front' ? '' : back}${part === 'back' ? '' : front}
  </svg>`;
}

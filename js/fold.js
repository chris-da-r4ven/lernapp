// Einklappbare Bereiche (z. B. auf der Fortschritt-Seite). Auf- oder zugeklappt bleibt gemerkt –
// nur auf diesem Gerät, nur Bequemlichkeit: Ohne Speicher gilt einfach die Voreinstellung.

import { esc } from './util.js';

const KEY = 'lernapp.fold';
let remembered = load();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

export const isOpen = (id, dflt = false) => (Object.hasOwn(remembered, id) ? remembered[id] === true : dflt);

// id: fester Name des Bereichs; summary: fertiges HTML der Kopfzeile; body: fertiges HTML des Inhalts.
// open: Voreinstellung; force: jetzt auf jeden Fall offen (z. B. nach einer Aktion im Bereich).
export function fold(id, summary, body, { open = false, force = false, cls = 'card' } = {}) {
  return `<details class="${cls} fold-card" data-fold="${esc(id)}"${force || isOpen(id, open) ? ' open' : ''}>
    <summary>${summary}</summary>
    ${body}
  </details>`;
}

// Auf- und Zuklappen merken.
export function bindFolds(el) {
  el.querySelectorAll('details[data-fold]').forEach((d) => d.addEventListener('toggle', () => {
    remembered = { ...remembered, [d.dataset.fold]: d.open };
    try { localStorage.setItem(KEY, JSON.stringify(remembered)); } catch { /* egal */ }
  }));
}

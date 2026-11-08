// Lerninhalte: werden von content/ geladen und lokal gespeichert,
// damit die App offline weiterläuft. Neue Inhalte erkennt sie an
// "version" in content/index.json. "updated" (JJJJ-MM-TT) ist nur zur Anzeige.

import { migrateLessons } from './store.js';
import { APP_VERSION } from './version.js';
import { isSupported } from './lessons.js';

const KEY = 'lernapp.content';

let data = load() ?? { version: null, subjects: [], lessons: {} };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Speicher voll/gesperrt */ }
}

export const contentUpdated = () => data.updated ?? null;
export const contentVersion = () => data.version;
export const hasContent = () => data.subjects.length > 0;
// Lektionen, die diese App nicht darstellen kann (unbekannte Lektionsart), werden ausgeblendet.
export const getSubjects = () => data.subjects.map((s) => ({
  ...s,
  lessons: s.lessons.filter((l) => isSupported(data.lessons[s.id + '/' + l.id])),
}));
export const getSubject = (sid) => getSubjects().find((s) => s.id === sid);
export const getLesson = (sid, lid) => {
  const l = data.lessons[sid + '/' + lid];
  return isSupported(l) ? l : undefined;
};

// Lektionen, die zusammengelegt wurden: Lernstand dorthin mitnehmen (siehe store.migrateLessons).
export function applyMoves() {
  for (const s of data.subjects) if (s.moved) migrateLessons(s.id, s.moved);
}

// Liefert 'updated', 'current', 'offline' oder 'app-zu-alt' (Inhalte brauchen eine neuere App –
// dann bleiben die bisherigen Inhalte, bis die neue App da ist).
export async function checkUpdates() {
  try {
    const idx = await fetchJson('content/index.json');
    if (idx.version === data.version) return 'current';
    if ((idx.minApp ?? 0) > APP_VERSION) return 'app-zu-alt';
    const lessons = {};
    for (const s of idx.subjects) {
      for (const l of s.lessons) {
        lessons[s.id + '/' + l.id] = await fetchJson('content/' + l.file);
      }
    }
    data = { version: idx.version, updated: idx.updated ?? null, subjects: idx.subjects, lessons };
    save();
    applyMoves();
    return 'updated';
  } catch (e) {
    console.warn('Inhalte nicht geladen:', e);
    return 'offline';
  }
}

async function fetchJson(path) {
  // Zeitlimit: bei schlechtem WLAN nicht ewig hängen – dann gelten die gespeicherten Inhalte.
  const r = await fetch(path + '?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout?.(20000) });
  if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
  return r.json();
}

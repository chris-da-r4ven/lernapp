// Lerninhalte: werden von content/ geladen und lokal gespeichert,
// damit die App offline weiterläuft. Neue Inhalte erkennt sie an
// "version" in content/index.json. "updated" (JJJJ-MM-TT) ist nur zur Anzeige.

import { migrateLessons } from './store.js';

const KEY = 'lernapp.content';

let data = load() ?? { version: null, subjects: [], lessons: {} };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Speicher voll/gesperrt */ }
}

export const contentUpdated = () => data.updated ?? null;
export const hasContent = () => data.subjects.length > 0;
export const getSubjects = () => data.subjects;
export const getSubject = (sid) => data.subjects.find((s) => s.id === sid);
export const getLesson = (sid, lid) => data.lessons[sid + '/' + lid];

// Lektionen, die zusammengelegt wurden: Lernstand dorthin mitnehmen (siehe store.migrateLessons).
export function applyMoves() {
  for (const s of data.subjects) if (s.moved) migrateLessons(s.id, s.moved);
}

// Liefert 'updated', 'current' oder 'offline'.
export async function checkUpdates() {
  try {
    const idx = await fetchJson('content/index.json');
    if (idx.version === data.version) return 'current';
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
  const r = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
  return r.json();
}

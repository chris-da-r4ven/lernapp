// Lernweg einer Lektion: Etappen, ihr Stand und die Aufgaben einer Etappe.
// Plan und Begründung: docs/plan-lernweg.md
//
// Etappen entstehen automatisch aus Lektionsart und Einträgen:
//   Gruppe   – 5–6 Wörter (Mathe: bis 8 Aufgaben). Jedes Wort erst erkennen (hören → antippen),
//              kurz danach abrufen (schreiben). Ab der 2. Gruppe kommen 2 Wörter der vorigen Gruppe
//              in anderer Form dazu. Station: erste Gruppe 🪮 Pflege, weitere 🎠 Dressur.
//   Springen – nach je 3 Gruppen und am Ende: die Wörter dieser Gruppen gemischt, in wechselnden Formen.
//              Kennung „springen-<nr>-<wortzahl>“.
//   Koppel   – nur Mathe: Basis-Aufgaben zum Aufwärmen, solange sie nicht sicher sitzen (freiwillig,
//              zählt nicht im „x von n“).
//
// Gespeichert wird pro Wort (store.path[lektion].learned), nicht pro Etappe: Die Gruppen werden jedes Mal
// neu gebildet – erst die gelernten Wörter (in Datei-Reihenfolge), dann die übrigen. So bleiben geschaffte
// Etappen geschafft, auch wenn die Lektion später neue Wörter bekommt. Gemischte Etappen (Springen, Koppel)
// stehen unter ihrer Nummer in .mix.
//
// Alles hier ist reine Logik: Lernstand und Lernweg-Eintrag kommen als Parameter (Standard: store),
// damit der Selbsttest sie prüfen kann.

import { itemKey, SAFE_BOX } from './srs.js';
import { itemState, pathEntry } from './store.js';
import { modesFor, modeById, storeMode, usableFor } from './exercises/registry.js';
import { kindOf, towardTarget, lessonKey, masteryMode } from './lessons.js';
import { levelOf } from './levels.js';
import { shuffle } from './util.js';

export const GROUP_MAX = 6;          // Wörter pro Gruppe
export const MATH_GROUP_MAX = 8;     // Mathe-Aufgaben pro Gruppe
export const MIX_WORDS = 2;          // Wörter aus der vorigen Gruppe in anderer Form
export const SPRING_EVERY = 3;       // nach so vielen Gruppen ein Springen
export const SPRING_MAX = 12;        // Aufgaben im Springen
export const KOPPEL_MAX = 4;         // Aufwärm-Aufgaben
export const SECONDS_PER_TASK = 20;  // für „ca. x Minuten“

export const STATIONS = {
  koppel: { name: 'Koppel', icon: '🌿' },
  pflege: { name: 'Pflege', icon: '🪮' },
  dressur: { name: 'Dressur', icon: '🎠' },
  springen: { name: 'Springen', icon: '🐎' },
};

export const wordId = (item) => String(item.id ?? item.b);
const has = (o, k) => Boolean(o) && Object.hasOwn(o, k);

// In n möglichst gleich große Teile mit höchstens max Einträgen (11 → 6 + 5, 13 → 5 + 4 + 4).
export function chunk(list, max) {
  if (!list.length) return [];
  const n = Math.ceil(list.length / max);
  const out = [];
  let i = 0;
  for (let g = 0; g < n; g++) {
    const size = Math.ceil((list.length - i) / (n - g));
    out.push(list.slice(i, i + size));
    i += size;
  }
  return out;
}

// Welche Übungsarten nimmt der Lernweg dieser Lektion – abhängig vom Gerät (Sprachausgabe) und den Einträgen.
export function pathModes(lesson) {
  const avail = new Set(modesFor(lesson).map((m) => m.id));
  const pick = (...ids) => ids.find((id) => avail.has(id)) ?? null;
  const kind = kindOf(lesson);
  if (kind === 'mathe') {
    return { pool: 'rechnen', recognize: null, recall: pick('rechnen'), extra: ['rechnen'], groupMax: MATH_GROUP_MAX };
  }
  if (kind === 'grammatik') {
    return { pool: 'form', recognize: pick('form'), recall: pick('form-tippen', 'form'), extra: ['form-tippen', 'form'].filter((m) => avail.has(m)), groupMax: GROUP_MAX };
  }
  const recall = pick(towardTarget(lesson));
  const recognize = pick('hoeren-wahl', recall === 'ab' ? 'ba' : 'ab');
  const extra = ['satz', 'hoeren', recall === 'ab' ? 'ba' : 'ab', recall].filter((m) => m && avail.has(m));
  return { pool: recall, recognize, recall, extra, groupMax: GROUP_MAX };
}

// Alle Etappen einer Lektion mit Stand.
// opts.entry: Lernweg-Eintrag der Lektion ({ learned, mix }), opts.stateOf(key): Karteikasten-Stand.
export function etappenFor(sid, lesson, { entry = pathEntry(lessonKey(sid, lesson)), stateOf = itemState } = {}) {
  const pm = pathModes(lesson);
  if (!pm.recall) return [];
  const poolMode = modeById(pm.pool);
  const math = kindOf(lesson) === 'mathe';
  const usable = (it) => (poolMode ? usableFor(poolMode, it) : true);
  const pool = lesson.items.filter((it) => usable(it) && (!math || levelOf(it) === 2));
  const learned = (it) => has(entry.learned, wordId(it));
  const groups = [...chunk(pool.filter(learned), pm.groupMax), ...chunk(pool.filter((it) => !learned(it)), pm.groupMax)];

  const stages = [];
  // Koppel: Basis-Aufgaben, solange sie nicht sicher sitzen und noch nicht gespielt
  if (math && !has(entry.mix, 'koppel')) {
    const basics = lesson.items.filter((it) => levelOf(it) === 1 && usable(it));
    const unsafe = basics.some((it) => stateOf(itemKey(sid, lesson.id, it, storeMode('rechnen'))).box < SAFE_BOX);
    if (basics.length && unsafe) stages.push({ type: 'koppel', id: 'koppel', station: 'koppel', items: basics.slice(0, KOPPEL_MAX), optional: true, done: false });
  }
  let since = [];
  let springNo = 0;
  groups.forEach((g, i) => {
    stages.push({ type: 'gruppe', id: `g-${wordId(g[0])}`, station: i === 0 ? 'pflege' : 'dressur', items: g, done: g.every(learned), group: i });
    since.push(...g);
    const last = i === groups.length - 1;
    if ((i + 1) % SPRING_EVERY === 0 || last) {
      springNo++;
      // Nummer und Wortzahl in der Kennung: Bekommt die Lektion neue Wörter, ist ein schon geschafftes
      // Springen mit den neuen Wörtern wieder offen (gemischt üben lohnt sich dann wieder).
      const id = `springen-${springNo}-${since.length}`;
      stages.push({ type: 'springen', id, station: 'springen', items: since, done: has(entry.mix, id) });
      since = [];
    }
  });
  // Verfügbar: alle Pflicht-Etappen davor geschafft. Nummer = Position (für die Adresse).
  let blocked = false;
  stages.forEach((s, n) => {
    s.n = n;
    s.open = !blocked;
    if (!s.optional && !s.done) blocked = true;
  });
  return stages;
}

// Stand: geschaffte Pflicht-Etappen von allen, ganz geschafft?
export function progress(stages) {
  const req = stages.filter((s) => !s.optional);
  const done = req.filter((s) => s.done).length;
  return { done, total: req.length, complete: req.length > 0 && done === req.length };
}

// Nächste Etappe (erste offene, nicht geschaffte) – oder null, wenn alles geschafft ist.
export const nextEtappe = (stages) => stages.find((s) => s.open && !s.done) ?? null;

// --- Aufgaben einer Etappe ---------------------------------------------------------

const task = (sid, lesson, item, dir) => ({ sid, lesson, item, dir, key: itemKey(sid, lesson.id, item, storeMode(dir)) });
const canUse = (modeId, item) => { const m = modeById(modeId); return Boolean(m) && usableFor(m, item); };

// Bestes Fach eines Worts über die angegebenen Übungsarten (für „wackeligste zuerst“).
function bestBox(sid, lesson, item, modes, stateOf) {
  return Math.max(0, ...modes.map((m) => stateOf(itemKey(sid, lesson.id, item, storeMode(m))).box));
}

// Erkennen und Abrufen verschränkt: E1 E2 A1 E3 A2 … – das Abrufen kommt kurz nach dem Erkennen,
// aber nicht direkt danach.
export function interleave(recognize, recall) {
  if (!recognize.length) return recall;
  const out = [];
  for (let i = 0; i < recognize.length; i++) {
    out.push(recognize[i]);
    if (i >= 1) out.push(recall[i - 1]);
  }
  out.push(recall[recall.length - 1]);
  return out;
}

// Höchstens zwei gleiche Übungsarten hintereinander, wenn es sich einrichten lässt.
export function spreadModes(tasks) {
  const rest = [...tasks];
  const out = [];
  while (rest.length) {
    const blocked = out.length >= 2 && out[out.length - 1].dir === out[out.length - 2].dir ? out[out.length - 1].dir : null;
    const i = Math.max(0, rest.findIndex((t) => t.dir !== blocked));
    out.push(...rest.splice(i, 1));
  }
  return out;
}

export function tasksForEtappe(sid, lesson, stage, stages = etappenFor(sid, lesson), { stateOf = itemState } = {}) {
  const pm = pathModes(lesson);
  if (stage.type === 'koppel') return shuffle(stage.items).map((it) => task(sid, lesson, it, 'rechnen'));

  if (stage.type === 'springen') {
    const modes = pm.extra;
    const words = [...stage.items]
      .sort((a, b) => bestBox(sid, lesson, a, [pm.recall], stateOf) - bestBox(sid, lesson, b, [pm.recall], stateOf))
      .slice(0, SPRING_MAX);
    const list = shuffle(words).map((it, i) => {
      // Übungsarten reihum; passt eine nicht zum Wort (z. B. kein Beispielsatz), die nächste.
      for (let k = 0; k < modes.length; k++) {
        const m = modes[(i + k) % modes.length];
        if (canUse(m, it)) return task(sid, lesson, it, m);
      }
      return task(sid, lesson, it, pm.recall);
    });
    return spreadModes(list);
  }

  // Gruppe
  const words = shuffle(stage.items);
  const recall = words.map((it) => task(sid, lesson, it, pm.recall));
  const recognize = pm.recognize && pm.recognize !== pm.recall
    ? words.filter((it) => canUse(pm.recognize, it)).map((it) => task(sid, lesson, it, pm.recognize))
    : [];
  // Erkennen nur, wenn es für alle Wörter geht (sonst passt die Verschränkung nicht) – sonst direkt abrufen.
  let list = recognize.length === words.length ? interleave(recognize, recall) : recall;
  // Beimischung: 2 Wörter der vorigen Gruppe in anderer Form (die wackeligsten zuerst).
  const prev = stages.find((s) => s.type === 'gruppe' && s.group === stage.group - 1);
  if (prev) {
    const other = pm.extra.filter((m) => m !== pm.recognize);
    const mixModes = other.length > 1 ? other.filter((m) => m !== pm.recall) : other;
    const picks = [...prev.items]
      .sort((a, b) => bestBox(sid, lesson, a, [pm.recall], stateOf) - bestBox(sid, lesson, b, [pm.recall], stateOf))
      .slice(0, MIX_WORDS);
    const extra = picks.map((it, i) => {
      const m = [...mixModes.slice(i), ...mixModes.slice(0, i)].find((x) => canUse(x, it)) ?? pm.recall;
      return task(sid, lesson, it, m);
    });
    // eine Beimischung in der Mitte, eine am Ende
    extra.forEach((t, i) => list.splice(i === 0 ? Math.floor(list.length / 2) : list.length, 0, t));
  }
  return list;
}

// Ungefähre Dauer in Minuten.
export const minutesFor = (n) => Math.max(1, Math.round((n * SECONDS_PER_TASK) / 60));

// --- Einmalige Übernahme des bisherigen Lernstands -----------------------------------
// Wörter, deren bestes Abruf-Fach (Schreiben, Diktat, Lückensatz bzw. die Übungsart der Lektion) ≥ 2 ist,
// gelten als gelernt. Ergebnis: { "<fach>/<lektion>": [wort-ids] }.
export const ADOPT_BOX = 2;
export function adoptable(lessons, { stateOf = itemState } = {}) {
  const out = {};
  for (const { sid, lesson } of lessons) {
    const pm = pathModes(lesson);
    if (!pm.recall) continue;
    // Abruf-Übungsarten des Lernwegs, dazu die Übungsart für „sicher“ (Grammatik bisher: Form antippen).
    const recallModes = [...new Set([pm.recall, ...pm.extra, masteryMode(lesson)])].filter((m) => m !== 'hoeren-wahl');
    const ids = lesson.items
      .filter((it) => bestBox(sid, lesson, it, recallModes, stateOf) >= ADOPT_BOX)
      .map(wordId);
    if (ids.length) out[lessonKey(sid, lesson)] = ids;
  }
  return out;
}

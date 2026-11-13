// Eine Etappe des Lernwegs spielen: #/etappe/<fach>/<lektion>/<nr>[/probe][?ohne=…]
// Zu Ende gespielt (falsche Aufgaben kommen in der Runde wieder) = Etappe geschafft.
// Turnier = Test der Lektion (ohne Hilfe, zählt für die Medaille); unter 90 % folgt ein Nachtraining.
// probe: „Ich kann das schon – zeig’s mir“ – jedes Wort einmal abrufen; alles auf Anhieb richtig = geschafft,
// sonst geht es direkt mit der Etappe weiter, ohne die schon gekonnten Wörter (?ohne=…, nur für diese Runde).

import { getSubject, getLesson } from '../content.js';
import { etappenFor, tasksForEtappe, nextEtappe, progress, wordId, pathModes, lessonAccess, STATIONS, RETRY_BELOW } from '../path.js';
import { lessonKey, kindOf, targetSide } from '../lessons.js';
import { markLearned, markMix, setTurnier } from '../store.js';
import { itemKey } from '../srs.js';
import { storeMode } from '../exercises/registry.js';
import { runRound } from '../exercises/round.js';
import { esc } from '../util.js';

export const etappeHref = (sid, lid, n, probe = false) =>
  `#/etappe/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}/${n}${probe ? '/probe' : ''}`;

// Ist die Lektion für das Kind offen? (sonst zurück zur Fachseite)
export function lessonOpen(sid, lid) {
  const subject = getSubject(sid);
  const lessons = (subject?.lessons ?? []).map((l) => getLesson(sid, l.id)).filter(Boolean);
  return lessonAccess(sid, lessons).get(lid) === 'open';
}

export function etappeView(el, sid, lid, nr, probe) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  const back = `#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  if (!subject || !lesson) { location.hash = '#/'; return; }
  if (!lessonOpen(sid, lid)) { location.hash = `#/fach/${encodeURIComponent(sid)}`; return; }
  const stages = etappenFor(sid, lesson);
  const stage = stages[Number(nr)];
  if (!stage || !stage.open) { location.hash = back; return; }
  const lk = lessonKey(sid, lesson);
  const st = STATIONS[stage.station];
  const wasDone = stage.done;
  // Gibt es nach dieser Etappe noch etwas zu tun? (für den Hauptknopf der Bilanz; die Adresse
  // wird erst nach dem Speichern bestimmt, weil sich die Gruppen dabei neu ordnen können)
  const more = stages.some((s) => s !== stage && !s.done && !s.optional);
  let nextHref = null;

  el.innerHTML = `
    <a class="back" href="${back}">← ${esc(lesson.title)}</a>
    <p class="muted small etappe-head">${st.icon} ${esc(st.name)}${probe ? ' · Probe „Ich kann das schon“' : ''} · ${esc(lesson.title)}</p>
    <div class="exercise"></div>`;
  const box = el.querySelector('.exercise');

  // Nach dem Speichern: wie geht es weiter? (Hinweis für die Bilanz)
  const afterNote = (extra = '') => {
    const after = etappenFor(sid, lesson);
    const p = progress(after);
    const next = nextEtappe(after);
    nextHref = next ? etappeHref(sid, lid, next.n) : null;
    const way = p.complete
      ? '<p class="big">🎀 Lernweg geschafft! Alle Etappen dieser Lektion sind erledigt.</p>'
      : `<p class="muted">${p.done} von ${p.total} Etappen geschafft${next ? ` · als Nächstes: ${STATIONS[next.station].icon} ${esc(STATIONS[next.station].name)}` : ''}</p>`;
    return `<div class="etappe-done">${extra}${way}</div>`;
  };
  // Nur bei Vokabeln die Wörter nennen (bei Mathe wären es die Lösungen).
  const canList = (items) => (kindOf(lesson) === 'vokabeln'
    ? `<p>Jetzt kannst du: ${items.slice(0, 6).map((it) => `<strong>${esc(it[targetSide(lesson)])}</strong>`).join(', ')}</p>` : '');
  const common = {
    againLabel: more ? 'Weiter zur nächsten Etappe' : 'Zur Lektion',
    onAgain: () => { location.hash = nextHref ?? back; },
    onBack: () => { location.hash = back; },
    backLabel: 'Zur Lektion',
  };

  // Turnier: Test ohne Hilfe, jedes Wort einmal
  if (stage.type === 'turnier') {
    runRound(box, {
      ...common,
      tasks: tasksForEtappe(sid, lesson, stage, stages),
      test: true,
      art: 'turnier',
      title: 'Turnier geschafft! 🏆',
      onComplete: ({ mistakes, firstTry, total }) => {
        const pct = total ? (firstTry / total) * 100 : 0;
        const prefix = `${sid}/${lesson.id}/`;
        const wrong = [...new Set(mistakes.map((k) => k.split('|')[0].slice(prefix.length)))];
        setTurnier(lk, pct, pct < RETRY_BELOW ? wrong : []);
        const msg = pct >= RETRY_BELOW
          ? `<p>${firstTry} von ${total} sitzen schon – stark!</p>`
          : `<p>${firstTry} von ${total} sitzen schon. Die anderen übst du gleich im 🔁 Nachtraining.</p>`;
        return afterNote(msg);
      },
    });
    return;
  }

  // Probe „Ich kann das schon“: nur Gruppen, jedes Wort einmal abrufen
  if (probe && stage.type === 'gruppe') {
    const pm = pathModes(lesson);
    const tasks = stage.items.map((it) => ({ sid, lesson, item: it, dir: pm.recall, key: itemKey(sid, lesson.id, it, storeMode(pm.recall)) }));
    runRound(box, {
      tasks,
      once: true,
      art: 'probe',
      title: 'Probe vorbei',
      onComplete: ({ mistakes }) => {
        const missed = new Set(mistakes.map((k) => k.split('|')[0]));
        const known = stage.items.filter((it) => !missed.has(`${sid}/${lesson.id}/${wordId(it)}`));
        if (known.length === stage.items.length) {
          markLearned(lk, stage.items.map(wordId));
          return afterNote(`<p class="big">Alles gewusst – Etappe geschafft! 🐎</p>${canList(stage.items)}`);
        }
        nextHref = `${etappeHref(sid, lid, stage.n)}?ohne=${encodeURIComponent(known.map(wordId).join('|'))}`;
        return `<div class="etappe-done"><p>${known.length} von ${stage.items.length} wusstest du schon. Die übrigen übst du jetzt in der Etappe.</p></div>`;
      },
      againLabel: 'Weiter',
      onAgain: () => { location.hash = nextHref ?? back; },
      onBack: () => { location.hash = back; },
      backLabel: 'Zur Lektion',
    });
    return;
  }

  // Nach einer Probe: Wörter, die sie schon konnte, fallen in dieser einen Runde weg (kein Teilstand).
  const query = location.hash.split('?ohne=')[1] ?? '';
  const skip = new Set(decodeURIComponent(query).split('|').filter(Boolean));
  const rest = stage.type === 'gruppe' ? stage.items.filter((it) => !skip.has(wordId(it))) : stage.items;
  const play = rest.length && rest.length < stage.items.length ? { ...stage, items: rest } : stage;

  runRound(box, {
    ...common,
    tasks: tasksForEtappe(sid, lesson, play, stages),
    art: stage.type === 'koppel' ? 'koppel' : 'etappe',
    title: wasDone ? 'Nochmal geschafft! 🐎' : 'Etappe geschafft! 🐎',
    onComplete: () => {
      if (stage.type === 'gruppe') markLearned(lk, stage.items.map(wordId));
      else markMix(lk, stage.id);
      return afterNote(stage.type === 'gruppe' ? canList(stage.items) : '');
    },
  });
}

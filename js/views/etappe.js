// Eine Etappe des Lernwegs spielen: #/etappe/<fach>/<lektion>/<nr>
// Zu Ende gespielt (falsche Aufgaben kommen in der Runde wieder) = Etappe geschafft.

import { getSubject, getLesson } from '../content.js';
import { etappenFor, tasksForEtappe, nextEtappe, progress, wordId, STATIONS } from '../path.js';
import { lessonKey, kindOf, targetSide } from '../lessons.js';
import { markLearned, markMix } from '../store.js';
import { runRound } from '../exercises/round.js';
import { esc } from '../util.js';

export const etappeHref = (sid, lid, n) => `#/etappe/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}/${n}`;

export function etappeView(el, sid, lid, nr) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  const back = `#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  if (!subject || !lesson) { location.hash = '#/'; return; }
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
    <p class="muted small etappe-head">${st.icon} ${esc(st.name)} · ${esc(lesson.title)}</p>
    <div class="exercise"></div>`;

  runRound(el.querySelector('.exercise'), {
    tasks: tasksForEtappe(sid, lesson, stage, stages),
    art: stage.type === 'koppel' ? 'koppel' : 'etappe',
    title: wasDone ? 'Nochmal geschafft! 🐎' : 'Etappe geschafft! 🐎',
    onComplete: () => {
      if (stage.type === 'gruppe') markLearned(lk, stage.items.map(wordId));
      else markMix(lk, stage.id);
      const after = etappenFor(sid, lesson);
      const p = progress(after);
      const next = nextEtappe(after);
      // Was jetzt geht – kurz und informativ statt einer weiteren Belohnung.
      // Nur bei Vokabeln die Wörter nennen (bei Mathe wären es die Lösungen).
      const can = stage.type === 'gruppe' && kindOf(lesson) === 'vokabeln'
        ? `<p>Jetzt kannst du: ${stage.items.slice(0, 6).map((it) => `<strong>${esc(it[targetSide(lesson)])}</strong>`).join(', ')}</p>`
        : '';
      const way = p.complete
        ? '<p class="big">🎀 Lernweg geschafft! Alle Etappen dieser Lektion sind erledigt.</p>'
        : `<p class="muted">${p.done} von ${p.total} Etappen geschafft${next ? ` · als Nächstes: ${STATIONS[next.station].icon} ${esc(STATIONS[next.station].name)}` : ''}</p>`;
      // Hauptknopf: gleich zur nächsten Etappe
      nextHref = next ? etappeHref(sid, lid, next.n) : null;
      return `<div class="etappe-done">${can}${way}</div>`;
    },
    againLabel: more ? 'Weiter zur nächsten Etappe' : 'Zur Lektion',
    onAgain: () => { location.hash = nextHref ?? back; },
    onBack: () => { location.hash = back; },
    backLabel: 'Zur Lektion',
  });
}

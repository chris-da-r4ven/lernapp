// Eine Übungsrunde in einer Lektion: #/ueben/<fach>/<lektion>/<übungsart>[/alle]

import { getLesson } from '../content.js';
import { modesFor, tasksFor } from '../exercises/registry.js';
import { buildRound } from '../srs.js';
import { runRound } from '../exercises/round.js';
import { esc } from '../util.js';
import { lessonOpen } from './etappe.js';

export function practiceView(el, sid, lid, modeId, all) {
  const lesson = getLesson(sid, lid);
  const mode = lesson && modesFor(lesson).find((m) => m.id === modeId);
  if (!lesson || !mode) { location.hash = '#/'; return; }
  if (!lessonOpen(sid, lid)) { location.hash = `#/fach/${encodeURIComponent(sid)}`; return; }
  const back = `#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;

  el.innerHTML = `
    <a class="back" href="${back}">← ${esc(lesson.title)}</a>
    <div class="exercise"></div>`;
  const start = () => runRound(el.querySelector('.exercise'), {
    tasks: buildRound(tasksFor(sid, lesson, mode.id), Boolean(all)),
    onAgain: start,
    onBack: () => { location.hash = back; },
  });
  start();
}

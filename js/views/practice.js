import { getLesson } from '../content.js';
import { exercises } from '../exercises/registry.js';
import { esc } from '../util.js';

export function practiceView(el, sid, lid, exId, dir, all) {
  const lesson = getLesson(sid, lid);
  const ex = exercises[exId];
  if (!lesson || !ex) { location.hash = '#/'; return; }
  const back = `#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;

  el.innerHTML = `
    <a class="back" href="${back}">← ${esc(lesson.title)}</a>
    <div class="exercise"></div>`;
  ex.run(el.querySelector('.exercise'), {
    sid, lesson, dir, all: Boolean(all),
    onFinish: () => { location.hash = back; },
  });
}

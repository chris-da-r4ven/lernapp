import { getSubject, getLesson } from '../content.js';
import { mastery, starsFor } from '../srs.js';
import { esc, stars } from '../util.js';

export function subjectView(el, sid) {
  const subject = getSubject(sid);
  if (!subject) { location.hash = '#/'; return; }

  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <h1>${esc(subject.icon ?? '')} ${esc(subject.name)}</h1>
    <section class="list">
      ${subject.lessons.map((l) => {
        const lesson = getLesson(sid, l.id);
        const m = mastery(sid, lesson);
        return `
          <a class="card row" href="#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(l.id)}">
            <div class="grow">
              <strong>${esc(l.title)}</strong>
              <div class="meter small"><div style="width:${m * 100}%"></div></div>
            </div>
            ${stars(starsFor(m))}
          </a>`;
      }).join('')}
    </section>`;
}

// Fachseite: Lektionen nach Gruppen (z. B. „Schule & ich“, „Feiertage“, „Grammatik“).
// Lektionen mit Medaille 🏅 rutschen in ihrer Gruppe nach unten in „Kannst du schon gut“.

import { getSubject, getLesson } from '../content.js';
import { mastery, starsFor } from '../srs.js';
import { lessonMedal, MEDAL_RULE } from '../medal.js';
import { esc, stars } from '../util.js';

export function subjectView(el, sid) {
  const subject = getSubject(sid);
  if (!subject) { location.hash = '#/'; return; }

  // Gruppen in der Reihenfolge, in der sie im Inhaltsverzeichnis vorkommen.
  const groups = new Map();
  for (const l of subject.lessons) {
    const lesson = getLesson(sid, l.id);
    if (!lesson) continue;
    const g = l.group ?? 'Lektionen';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ l, lesson, medal: lessonMedal(sid, lesson) });
  }

  const tile = ({ l, lesson, medal }) => {
    const m = mastery(sid, lesson);
    return `
      <a class="card row lesson-tile${medal.medal ? ' has-medal' : ''}" href="#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(l.id)}">
        ${medal.medal ? '<span class="medal" aria-label="Medaille">🏅</span>' : ''}
        <div class="grow">
          <strong>${esc(l.title)}</strong> <span class="muted small">${lesson.items.length} ${lesson.grammar ? 'Sätze' : 'Wörter'}</span>
          <div class="meter small"><div style="width:${m * 100}%"></div></div>
          ${!medal.medal && medal.started ? `<div class="muted small medal-hint">🏅 ${esc(medal.hint)}</div>` : ''}
        </div>
        ${stars(starsFor(m))}
      </a>`;
  };

  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <h1>${esc(subject.icon ?? '')} ${esc(subject.name)}</h1>
    <p class="muted small">${esc(MEDAL_RULE)}</p>
    ${[...groups].map(([name, list]) => {
      const open = list.filter((x) => !x.medal.medal);
      const done = list.filter((x) => x.medal.medal);
      return `
        <h2 class="section-title">${esc(name)}</h2>
        <section class="list">
          ${open.map(tile).join('')}
          ${done.length ? `
            <details class="mastered"${open.length ? '' : ' open'}>
              <summary>🏅 Kannst du schon gut (${done.length})</summary>
              ${done.map(tile).join('')}
            </details>` : ''}
        </section>`;
    }).join('')}
    <div class="actions">
      <a class="btn" href="#/test/${encodeURIComponent(sid)}">📝 Test-Modus – wie im Vokabeltest</a>
    </div>`;
}

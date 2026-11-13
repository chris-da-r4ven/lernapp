// Fachseite: Lektionen nach Gruppen (z. B. „Schule & ich“, „Feiertage“, „Grammatik“).
// Lektionen mit Medaille 🏅 rutschen in ihrer Gruppe nach unten in „Kannst du schon gut“.

import { getSubject, getLesson } from '../content.js';
import { starsFor } from '../srs.js';
import { masteryOf, unitWord, kindInfo, coreItems } from '../lessons.js';
import { lessonMedal, MEDAL_RULE, testReady } from '../medal.js';
import { esc, stars } from '../util.js';
import { etappenFor, progress } from '../path.js';

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

  const testLabel = [...groups.values()].flat().map((x) => kindInfo(x.lesson)).find((k) => k.testable)?.testLabel;

  const tile = ({ l, lesson, medal }) => {
    const m = masteryOf(sid, lesson);
    const way = progress(etappenFor(sid, lesson));
    return `
      <a class="card row lesson-tile${medal.medal ? ' has-medal' : ''}" href="#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(l.id)}">
        ${medal.medal ? '<span class="medal" aria-label="Medaille">🏅</span>' : ''}
        <div class="grow">
          <strong>${esc(l.title)}</strong> <span class="muted small">${coreItems(lesson).length} ${unitWord(lesson, coreItems(lesson).length)}</span>
          ${way.total ? `<div class="small ${way.complete ? 'way-done' : 'muted'}">${way.complete ? '🎀 Lernweg geschafft' : `Lernweg: ${way.done} von ${way.total} Etappen`}</div>` : ''}
          <div class="meter small"><div style="width:${m * 100}%"></div></div>
          ${testReady(sid, lesson) ? '<div class="small ready-hint">📝 Bereit für den Test!</div>' : ''}
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
      <a class="btn" href="#/test/${encodeURIComponent(sid)}">📝 Test-Modus${testLabel ? ` – ${esc(testLabel)}` : ''}</a>
    </div>`;
}

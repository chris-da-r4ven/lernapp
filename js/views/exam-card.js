// Turnierplakat auf der Startseite: pro anstehendem Reitturnier die Lektionen als Hindernisse.
// grün = sitzt (in der Turnierwoche sicher abgerufen) · gelb = wackelt · weiß = Lernweg noch nicht durch ·
// grau 🔒 = noch zu (Eltern fragen). Positiv formuliert; „eng“ nur bei echtem Rückstand.

import { getSubject, getLesson } from '../content.js';
import { coreItems, masteryMode, lessonKey } from '../lessons.js';
import { itemState } from '../store.js';
import { itemKey, SAFE_BOX } from '../srs.js';
import { etappenFor, progress, nextEtappe, lessonAccess, etappeNo } from '../path.js';
import { EXAM_NAME, upcomingExams, daysUntil, dateLabel, countdownText, hurdleState, recentShare, weekStart, isTight } from '../exams.js';
import { etappeHref } from './etappe.js';
import { examHref } from './exam-edit.js';
import { lessonIcon } from './subject.js';
import { esc } from '../util.js';

const VISIBLE = 2;
const LABEL = { ready: 'sitzt ✓', shaky: 'üben', way: '', locked: 'noch zu – sag Papa Bescheid' };

// Hindernisse eines Turniers (Lektionen, die es nicht mehr gibt, fallen weg).
export function hurdlesOf(exam, now = new Date()) {
  const subject = getSubject(exam.sid);
  if (!subject) return [];
  const all = subject.lessons.map((l) => getLesson(exam.sid, l.id)).filter(Boolean);
  const access = lessonAccess(exam.sid, all);   // einmal pro Fach
  const since = weekStart(exam.date);
  return exam.lessons.map((lid) => all.find((l) => l.id === lid)).filter(Boolean).map((lesson) => {
    const open = access.get(lesson.id) === 'open';
    const stages = open ? etappenFor(exam.sid, lesson) : [];
    const way = progress(stages);
    const mode = masteryMode(lesson);
    const states = coreItems(lesson).map((it) => itemState(itemKey(exam.sid, lesson.id, it, mode)));
    const state = hurdleState({ open, way, recent: recentShare(states, since, SAFE_BOX) });
    return { lesson, state, way, stages, next: open ? nextEtappe(stages) : null, key: lessonKey(exam.sid, lesson) };
  });
}

function poster(exam, now) {
  const subject = getSubject(exam.sid);
  const days = daysUntil(exam.date, now);
  const hurdles = hurdlesOf(exam, now);
  const tight = isTight(days, hurdles.map((h) => h.state));
  const behind = hurdles.find((h) => h.state === 'way' && h.next);
  const ready = hurdles.filter((h) => h.state === 'ready').length;
  const note = days === 0 ? 'Heute ist Reitturnier – viel Glück! 🍀'
    : tight && behind ? 'Jetzt zählt jeder Tag – als Nächstes:'
    : ready === hurdles.length ? 'Alle Hindernisse sitzen – stark! Bleib dran.'
    : `Noch ${days} ${days === 1 ? 'Trainingstag' : 'Trainingstage'} – du schaffst das!`;
  return `
    <section class="card exam-card${tight ? ' tight' : ''}">
      <div class="exam-head">
        <span class="exam-cup" aria-hidden="true">🏆</span>
        <span class="grow"><strong>${esc(EXAM_NAME)} ${esc(subject?.name ?? '')}</strong><br>
          <span class="small">${esc(dateLabel(exam.date))} · ${esc(countdownText(days))}</span></span>
        <a class="small exam-edit" href="${examHref(exam.id)}">ändern</a>
      </div>
      <ul class="hurdles">
        ${hurdles.map((h) => {
          const text = h.state === 'way' ? `Lernweg ${h.way.done} von ${h.way.total}` : LABEL[h.state];
          const inner = `<span class="hurdle-bar" aria-hidden="true"></span><span class="hurdle-icon" aria-hidden="true">${h.state === 'locked' ? '🔒' : esc(lessonIcon(h.lesson))}</span>
            <span class="grow">${esc(h.lesson.title)}</span><span class="small hurdle-text">${esc(text)}</span>`;
          return `<li class="hurdle ${h.state}">${h.state === 'locked' ? `<span class="hurdle-row">${inner}</span>`
            : `<a class="hurdle-row" href="#/lektion/${encodeURIComponent(exam.sid)}/${encodeURIComponent(h.lesson.id)}">${inner}</a>`}</li>`;
        }).join('')}
      </ul>
      <p class="small exam-note">${esc(note)}</p>
      ${tight && behind ? `<a class="btn primary" href="${etappeHref(exam.sid, behind.lesson.id, behind.next.n)}">${esc(behind.lesson.title)} · Etappe ${etappeNo(behind.stages, behind.next)}</a>` : ''}
    </section>`;
}

// Alle anstehenden Turniere; die ersten VISIBLE offen, weitere zusammengeklappt.
export function examCards(exams, now = new Date()) {
  const list = upcomingExams(exams, now);
  if (!list.length) return '';
  const shown = list.slice(0, VISIBLE).map((e) => poster(e, now)).join('');
  const more = list.slice(VISIBLE);
  return shown + (more.length ? `<details class="exam-more"><summary>🏆 ${more.length} weitere${more.length === 1 ? 's' : ''} Turnier${more.length === 1 ? '' : 'e'}</summary>${more.map((e) => poster(e, now)).join('')}</details>` : '');
}

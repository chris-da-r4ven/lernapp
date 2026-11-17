// Turnierplakat auf der Startseite: pro anstehendem Reitturnier die Lektionen als Hindernisse.
// grün = sitzt (in der Turnierwoche sicher abgerufen) · gelb = wackelt · weiß = Lernweg noch nicht durch ·
// grau 🔒 = noch zu (Eltern fragen). Positiv formuliert; „eng“ nur bei echtem Rückstand.

import { getSubject, getLesson } from '../content.js';
import { coreItems, masteryMode, lessonKey } from '../lessons.js';
import { itemState } from '../store.js';
import { itemKey, SAFE_BOX } from '../srs.js';
import { etappenFor, progress, nextEtappe, lessonAccess, etappeNo } from '../path.js';
import { RIBBONS, EXAM_NAME, upcomingExams, daysUntil, dateLabel, countdownText, hurdleState, recentShare, weekStart, isTight } from '../exams.js';
import { etappeHref } from './etappe.js';
import { examHref } from './exam-edit.js';
import { GENERALPROBE_DAYS } from '../exam-rounds.js';
import { lessonIcon } from './subject.js';
import { esc } from '../util.js';
import { isOpen } from '../fold.js';

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
    return { lesson, state, way, stages, next: open ? nextEtappe(stages) : null, key: lessonKey(exam.sid, lesson), started: states.some((s) => s.box > 0) };
  });
}

// compact: Hindernisse eingeklappt (ab zwei Turnieren) – Kopf und Knöpfe bleiben sichtbar.
function poster(exam, now, compact = false) {
  const subject = getSubject(exam.sid);
  const days = daysUntil(exam.date, now);
  const hurdles = hurdlesOf(exam, now);
  const tight = isTight(days, hurdles.map((h) => h.state));
  const behind = hurdles.find((h) => h.state === 'way' && h.next);
  const ready = hurdles.filter((h) => h.state === 'ready').length;
  // Trainieren geht, sobald in einer offenen Turnierlektion schon etwas gelernt ist.
  const canTrain = hurdles.some((h) => h.state !== 'locked' && (h.state !== 'way' || h.way.done > 0 || h.started));
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
      ${compact ? `<details class="exam-fold" data-fold="exam-${esc(exam.id)}"${isOpen(`exam-${exam.id}`) ? ' open' : ''}>
        <summary>${hurdles.length} ${hurdles.length === 1 ? 'Lektion' : 'Lektionen'} · ${ready} ${ready === 1 ? 'sitzt' : 'sitzen'}</summary>` : ''}
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
      ${compact ? '</details>' : ''}
      <div class="actions exam-actions">
        ${tight && behind ? `<a class="btn primary" href="${etappeHref(exam.sid, behind.lesson.id, behind.next.n)}">${esc(behind.lesson.title)} · Etappe ${etappeNo(behind.stages, behind.next)}</a>` : ''}
        ${canTrain ? `<a class="btn${tight && behind ? '' : ' primary'}" href="#/reitturnier/${encodeURIComponent(exam.id)}/training">🏇 Turniertraining</a>` : ''}
        ${canTrain && days <= GENERALPROBE_DAYS ? `<a class="btn" href="#/reitturnier/${encodeURIComponent(exam.id)}/generalprobe">🎯 Generalprobe</a>` : ''}
      </div>
    </section>`;
}

// Nach dem Turnier: „Wie lief dein Reitturnier?“ – Schleife wählen (keine Note).
export function ribbonCards(list) {
  return list.map((e) => `
    <section class="card exam-card ribbon-ask" data-exam="${esc(e.id)}">
      <p><strong>🏆 Wie lief dein ${esc(EXAM_NAME)} ${esc(getSubject(e.sid)?.name ?? '')} am ${esc(dateLabel(e.date))}?</strong></p>
      <p class="small">Such dir eine Schleife aus – alle drei gehören an deine Schleifenwand.</p>
      <div class="actions">${Object.entries(RIBBONS).map(([k, r]) => `<button class="btn" type="button" data-ribbon="${k}">${r.icon} ${esc(r.name)}</button>`).join('')}</div>
    </section>`).join('');
}

// Alle anstehenden Turniere; ein einzelnes ganz offen, ab zwei mit eingeklappten Hindernissen.
export function examCards(exams, now = new Date()) {
  const list = upcomingExams(exams, now);
  return list.map((e) => poster(e, now, list.length > 1)).join('');
}

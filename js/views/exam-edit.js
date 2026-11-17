// 🏆 Reitturnier eintragen oder ändern: #/reitturnier/neu/<fach>[/eltern] · #/reitturnier/<id>
// Datum (ab heute) und Lektionen des Fachs – auch gesperrte (mit 🔒), denn das Kind soll benennen
// können, was im Test drankommt. Gesperrte öffnet das Turnier nicht: Danach steht deutlich da,
// dass es den Eltern Bescheid sagen soll.

import { getSubject, getLesson, getSubjects } from '../content.js';
import { coreItems } from '../lessons.js';
import { lessonAccess } from '../path.js';
import { examById, saveExam, deleteExam } from '../store.js';
import { EXAM_NAME, dateLabel, daysUntil } from '../exams.js';
import { EXAM_LESSONS_MAX } from '../validate.js';
import { esc, dayKey } from '../util.js';

export const examNewHref = (sid, eltern = false) => `#/reitturnier/neu/${encodeURIComponent(sid)}${eltern ? '/eltern' : ''}`;
export const examHref = (id) => `#/reitturnier/${encodeURIComponent(id)}`;

// Router: ('neu', sid, 'eltern') oder (id)
export function examEditView(el, first, second, third) {
  const isNew = first === 'neu';
  const exam = isNew ? null : examById(first);
  const sid = isNew ? second : exam?.sid;
  const subject = sid ? getSubject(sid) : null;
  if (!subject || (!isNew && !exam)) { location.hash = '#/'; return; }
  const by = isNew && third === 'eltern' ? 'eltern' : 'kind';
  const back = by === 'eltern' ? '#/statistik' : '#/';

  const lessons = subject.lessons.map((l) => getLesson(sid, l.id)).filter((l) => l && coreItems(l).length);
  const access = lessonAccess(sid, lessons);
  const chosen = new Set(exam?.lessons ?? []);
  const today = dayKey();

  el.innerHTML = `
    <a class="back" href="${back}">← zurück</a>
    <h1>🏆 ${esc(EXAM_NAME)} ${isNew ? 'eintragen' : 'ändern'}</h1>
    <section class="card">
      <p class="muted">${esc(subject.icon ?? '')} ${esc(subject.name)} – wann ist der Test, und welche Lektionen kommen dran?</p>
      <form class="exam-form" autocomplete="off">
        <label class="small">Datum<input class="answer exam-date" name="date" type="date" min="${today}" value="${esc(exam?.date ?? '')}" required></label>
        <h2>Welche Lektionen?</h2>
        ${lessons.map((l) => {
          const locked = access.get(l.id) !== 'open';
          return `<label class="check"><input type="checkbox" name="lesson" value="${esc(l.id)}"${chosen.has(l.id) ? ' checked' : ''}>
            ${locked ? '🔒 ' : ''}${esc(l.title)}${locked ? ' <span class="muted small">(noch zu)</span>' : ''}</label>`;
        }).join('')}
        <p class="exam-error bad small" hidden></p>
        <div class="actions">
          <button class="btn primary" type="submit">${isNew ? 'Eintragen' : 'Speichern'}</button>
          ${isNew ? '' : '<button class="btn ghost" type="button" data-act="delete">Turnier löschen</button>'}
        </div>
      </form>
    </section>`;

  const form = el.querySelector('.exam-form');
  const err = el.querySelector('.exam-error');
  const fail = (msg) => { err.textContent = msg; err.hidden = false; };
  form.addEventListener('input', () => { err.hidden = true; });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const date = form.date.value;
    const picked = [...form.querySelectorAll('input[name=lesson]:checked')].map((i) => i.value);
    if (!date) return fail('Wähle das Datum des Tests.');
    if (date < today) return fail('Das Datum liegt schon zurück – wähle heute oder später.');
    if (!picked.length) return fail('Kreuze mindestens eine Lektion an.');
    if (picked.length > EXAM_LESSONS_MAX) return fail(`Höchstens ${EXAM_LESSONS_MAX} Lektionen.`);
    saveExam({ id: exam?.id, sid, date, lessons: picked, by });
    const locked = lessons.filter((l) => picked.includes(l.id) && access.get(l.id) !== 'open');
    done(el, { subject, date, locked, back });
  });

  el.querySelector('[data-act=delete]')?.addEventListener('click', (ev) => {
    if (ev.currentTarget.dataset.sure) { deleteExam(exam.id); location.hash = back; return; }
    ev.currentTarget.dataset.sure = '1';
    ev.currentTarget.textContent = 'Wirklich löschen?';
  });
}

// Bestätigung – mit deutlichem Hinweis auf gesperrte Lektionen.
function done(el, { subject, date, locked, back }) {
  const days = daysUntil(date);
  el.innerHTML = `
    <section class="card exam-done">
      <h1>🏆 Eingetragen!</h1>
      <p>${esc(EXAM_NAME)} ${esc(subject.name)} am <strong>${esc(dateLabel(date))}</strong>${days > 0 ? ` – noch ${days} ${days === 1 ? 'Tag' : 'Tage'} zum Trainieren.` : ' – heute!'}</p>
      ${locked.length ? `<div class="exam-locked">
        <p><strong>🔒 Diese Lektionen sind noch zu:</strong> ${locked.map((l) => esc(l.title)).join(', ')}</p>
        <p>Sag Papa Bescheid, damit er sie öffnet – dann kannst du sie rechtzeitig lernen.</p>
      </div>` : ''}
      <div class="actions"><a class="btn primary" href="${back}">${back === '#/' ? 'Zur Startseite' : 'Zurück'}</a></div>
    </section>`;
}

// Alle Fächer (für die Eltern-Liste: „Turnier eintragen“ je Fach).
export const examSubjects = () => getSubjects();

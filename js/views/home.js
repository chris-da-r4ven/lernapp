import { getSubjects, hasContent, allLessons } from '../content.js';
import { unitOf, countWord } from '../lessons.js';
import { getState, streak } from '../store.js';
import { mood, DAY_GOAL } from '../streak.js';
import { petStatus, PET } from '../pet.js';
import { esc, fmt1 } from '../util.js';
import { updateContent } from '../updates.js';
import { portrait, bigPortrait } from './portrait.js';
import { dueSummary } from '../ausritt.js';
import { etappenFor, nextEtappe, progress, etappeNo, STATIONS } from '../path.js';
import { etappeHref, lessonOpen } from './etappe.js';
import { lessonKey } from '../lessons.js';
import { pathEntry } from '../store.js';

const PET_NAME = PET.name;

export function homeView(el) {
  const st = getState();
  const serie = streak();
  const pet = petStatus(st.points, mood(serie));
  const hop = pet.mood === 'happy' && serie.todayDone;

  el.innerHTML = `
    <section class="card pet-card mood-${pet.mood}">
      <button class="pet-open${hop ? ' hop' : ''}" data-act="pet" aria-label="${esc(pet.name)} groß anzeigen">
        ${portrait(pet)}
      </button>
      <div class="pet-info">
        <h2>${esc(pet.name)}</h2>
        <p class="pet-mood">${streakMessage(serie)}</p>
        <p class="muted small">Glitzer-Stufe ${pet.level} · noch ${pet.toNext} ✦ Sternchen bis zur nächsten</p>
        <div class="meter"><div style="width:${pet.progress * 100}%"></div></div>
      </div>
      <div class="pet-stats">
        <div><strong>${Number(st.points) || 0} ✦</strong><span>Sternchen</span></div>
        <div><strong>${serie.count}</strong><span>${serie.count === 1 ? 'Tag' : 'Tage'} am Stück</span></div>
      </div>
    </section>

    ${hasContent() ? `<div class="home-actions">${continueCard()}${ausrittCard()}</div>` : ''}

    <h2 class="section-title">Fächer</h2>
    <section class="tiles">
      ${hasContent() ? getSubjects().map(subjectTile).join('') : `
        <div class="card"><p>Noch keine Lerninhalte da. Verbinde das Tablet mit dem Internet und tippe auf „Neue Inhalte suchen“.</p></div>`}
    </section>

    <div class="footer-actions">
      <button class="btn" data-act="update">Neue Inhalte suchen</button>
    </div>

    <dialog class="pet-dialog">
      ${bigPortrait(pet)}
      <button class="btn" data-act="pet-close">Schließen</button>
    </dialog>`;

  const dialog = el.querySelector('.pet-dialog');
  el.querySelector('[data-act=pet]').addEventListener('click', () => dialog.showModal());
  el.querySelector('[data-act=pet-close]').addEventListener('click', () => dialog.close());
  // Antippen neben das Bild schließt ebenfalls.
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });

  el.querySelector('[data-act=update]').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    ev.target.textContent = 'Suche …';
    await updateContent();
    ev.target.disabled = false;
    ev.target.textContent = 'Neue Inhalte suchen';
  });
}

function subjectTile(s) {
  return `
    <a class="tile" href="#/fach/${encodeURIComponent(s.id)}">
      <span class="tile-icon">${esc(s.icon ?? '📘')}</span>
      <span class="tile-name">${esc(s.name)}</span>
      <span class="muted small">${s.lessons.length} ${s.lessons.length === 1 ? 'Lektion' : 'Lektionen'}</span>
    </a>`;
}

function streakMessage(s) {
  // Tagesziel nach Schwierigkeit (Eintippen zählt 1, Antippen weniger, Experte mehr) – deshalb in
  // Tagesziel-Punkten 🎯 statt „Aufgaben“: Mathe, Englisch, alles zählt zusammen.
  const left = Math.max(0, s.need - s.todayWords);
  const w = (n) => `${fmt1(n)} 🎯`;
  switch (s.state) {
    case 'active':
      return s.todayDone ? 'Heute geschafft! 🎉' : `Heute noch ${w(left)} von ${s.need} für deine Serie – egal in welchem Fach.`;
    case 'danger':
      return `${esc(PET_NAME)} vermisst dich! Noch ${w(left)} heute, dann ist deine Serie von ${s.count} ${s.count === 1 ? 'Tag' : 'Tagen'} gerettet.`;
    case 'broken':
      return `${esc(PET_NAME)} vermisst dich! Mit ${w(left)} ${left < DAY_GOAL ? 'mehr ' : ''}startest du eine neue Serie.`;
    default:
      return left < DAY_GOAL ? `Noch ${w(left)} von ${DAY_GOAL}, dann startet deine Serie.` : `Sammle ${w(DAY_GOAL)} (eintippen zählt mehr als antippen), dann startet deine Serie.`;
  }
}

// Woran zuletzt gearbeitet wurde: jüngster Zeitpunkt im Lernstand oder Lernweg der Lektion.
function lastActivity(sid, lesson, items) {
  const prefix = `${sid}/${lesson.id}/`;
  let t = 0;
  for (const [k, v] of Object.entries(items)) if (k.startsWith(prefix) && v.last > t) t = v.last;
  const e = pathEntry(lessonKey(sid, lesson));
  for (const x of [...Object.values(e.learned), ...Object.values(e.mix)]) if (x > t) t = x;
  return t;
}

// Großer Knopf „Weiter“: nächste Etappe der zuletzt geübten Lektion, deren Lernweg noch nicht fertig ist –
// sonst die erste unfertige Lektion.
function continueCard() {
  const items = getState().items;
  const open = allLessons()
    .filter(({ sid, lesson }) => lessonOpen(sid, lesson.id))
    .map(({ sid, lesson }) => ({ sid, lesson, stages: etappenFor(sid, lesson) }))
    .filter((x) => nextEtappe(x.stages));
  if (!open.length) {
    return `
      <div class="card continue-card done">
        <p class="next-label">🎀 ALLE LERNWEGE GESCHAFFT</p>
        <p class="muted small">Neue Lektionen kommen, sobald sie in der Schule dran sind. Bis dahin: 🌳 Ausritt.</p>
      </div>`;
  }
  const withTime = open.map((x) => ({ ...x, t: lastActivity(x.sid, x.lesson, items) }));
  const recent = withTime.filter((x) => x.t > 0).sort((a, b) => b.t - a.t)[0];
  const pick = recent ?? withTime[0];
  const next = nextEtappe(pick.stages);
  const st = STATIONS[next.station];
  const p = progress(pick.stages);
  const subject = getSubjects().find((s) => s.id === pick.sid);
  return `
    <a class="card continue-card now-card" href="${etappeHref(pick.sid, pick.lesson.id, next.n)}">
      <span class="now-play" aria-hidden="true">▶</span>
      <span>
        <strong>Weiter: ${esc(pick.lesson.title)}</strong>
        <span class="muted small">${esc(subject?.icon ?? '')} ${esc(subject?.name ?? '')} · ${next.optional ? 'Aufwärmen' : `Etappe ${etappeNo(pick.stages, next)} von ${p.total}`} · ${st.icon} ${esc(st.name)}</span>
      </span>
    </a>`;
}

// 🌳 Ausritt: fällige Wiederholungen aus allem, was schon geübt wurde.
function ausrittCard() {
  const { due } = dueSummary();
  const unit = unitOf(allLessons().map((x) => x.lesson));
  return `
    <a class="card row ausritt-card" href="#/ausritt">
      <span class="knobel-icon" aria-hidden="true">🌳</span>
      <span class="grow">
        <strong>Ausritt</strong> <span class="muted small">· Auffrischen</span><br>
        <span class="muted small">${due ? `${countWord(unit, due)} ${due === 1 ? 'ist' : 'sind'} wieder dran` : 'Gerade ist nichts fällig – du kannst trotzdem ausreiten'}</span>
      </span>
      <span aria-hidden="true">›</span>
    </a>`;
}

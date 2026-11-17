// Bereich „Für Eltern“ auf der Fortschrittsseite: zum Ausklappen,
// mit Rückmeldungen des Kindes, Statistik zurücksetzen, Sicherung des Spielstands und Geräte-Tests.

import { resetProgress, getState, openLesson, streak, spendable } from '../store.js';
import { jokerOffer, JOKER_GOAL, JOKER_PRICE } from '../streak.js';
import { allExams, deleteExam } from '../store.js';
import { EXAM_NAME, upcomingExams, dateLabel, countdownText, daysUntil } from '../exams.js';
import { examNewHref, examHref } from './exam-edit.js';
import { getSubjects, getLesson } from '../content.js';
import { lessonAccess } from '../path.js';
import { lessonKey } from '../lessons.js';
import { modeById } from '../exercises/registry.js';
import { RATINGS } from '../exercises/summary.js';
import { syncStatus, connect, disconnect, syncNow, setTokenUntil, DEFAULT_REPO } from '../sync.js';
import { esc, toast } from '../util.js';
import { fold, isOpen } from '../fold.js';

export function parentsSection(open = false) {
  return `
    <details class="card parents fold-card" data-fold="eltern"${open || isOpen('eltern') ? ' open' : ''}>
      <summary><h2>Für Eltern</h2></summary>

      ${fold('eltern:rueckmeldungen', '<h3>Rückmeldungen</h3>', feedbackBlock(), { cls: 'sub-fold' })}

      ${fold('eltern:turniere', `<h3>🏆 ${EXAM_NAME}e (Tests)</h3>`, examBlock(), { cls: 'sub-fold', open: examBlockUrgent() })}

      ${fold('eltern:lektionen', '<h3>Lektionen öffnen</h3>', unlockBlock(), { cls: 'sub-fold' })}

      ${fold('eltern:joker', '<h3>Serie retten (Joker 🃏)</h3>', jokerBlock(), { cls: 'sub-fold', open: Boolean(jokerOffer(getState().days, new Date(), getState().jokers ?? {})) })}

      ${fold('eltern:zuruecksetzen', '<h3>Statistik zurücksetzen</h3>', `<p class="muted small">Setzt Sternchen, Serie und den ganzen Lernstand auf null. Die Lektionen bleiben da.</p>
      <button class="btn danger" data-act="reset-start" type="button">Statistik zurücksetzen</button>
      <form class="reset-form" autocomplete="off" hidden>
        <p class="small">Wirklich alles löschen? Zum Bestätigen <strong>LÖSCHEN</strong> eintippen:</p>
        <input class="answer" name="confirm" type="text" autocomplete="off" autocapitalize="characters"
               spellcheck="false" placeholder="LÖSCHEN" aria-label="Zum Bestätigen LÖSCHEN eintippen">
        <div class="actions">
          <button class="btn danger" type="submit">Statistik jetzt zurücksetzen</button>
          <button class="btn ghost" type="button" data-act="reset-cancel">Abbrechen</button>
        </div>
      </form>`, { cls: 'sub-fold' })}

      ${fold('eltern:sicherung', '<h3>Sicherung</h3>', syncBlock(), { cls: 'sub-fold' })}

      ${fold('eltern:geraete', '<h3>Geräte-Tests</h3>', `<div class="actions">
        <a class="btn small" href="#/vorlese-test">🔊 Vorlese-Test</a>
        <a class="btn small" href="#/handschrift-test">✍️ Handschrift-Test</a>
      </div>`, { cls: 'sub-fold' })}
    </details>`;
}

// Joker 🃏: kauft das Kind selbst auf der Startseite mit Sternchen (streak.js, store.buyJoker).
// Hier nur, wie es gerade steht.
const dayLabel = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }); };
function jokerBlock() {
  const s = streak();
  const serie = `${s.count} ${s.count === 1 ? 'Tag' : 'Tagen'}`;
  if (s.joker === 'morgen') return `<p class="small">🃏 Joker ist gekauft. Morgen braucht es ${JOKER_GOAL} 🎯, dann ist die Serie von ${serie} gerettet.</p>`;
  if (s.joker === 'heute') return `<p class="small">🃏 Joker ist gekauft. Heute braucht es ${JOKER_GOAL} 🎯, dann ist die Serie von ${serie} gerettet (bisher ${Math.round(s.todayWords * 10) / 10}).</p>`;
  if (s.joker === 'gerettet') return `<p class="small">🃏 Mit Joker gerettet – die Serie steht bei ${serie}. 🎉</p>`;
  const offer = jokerOffer(getState().days, new Date(), getState().jokers ?? {});
  if (!offer) return `<p class="muted small">Gerade ist keine Serie zu retten. Einen verpassten Tag kann sie selbst am Tag danach retten (🛟). Reißt eine Serie nach mehreren verpassten Tagen, kann sie auf der Startseite einen Joker für ${JOKER_PRICE} ✦ kaufen.</p>`;
  return `<p class="small">Die Serie von <strong>${offer.count} ${offer.count === 1 ? 'Tag' : 'Tagen'}</strong> ist gerissen. Verpasst: ${offer.missed.map((k) => esc(dayLabel(k))).join(', ')}</p>
    <p class="muted small">Auf der Startseite kann sie einen Joker für ${JOKER_PRICE} ✦ kaufen (zum Ausgeben hat sie ${spendable()} ✦; Fannys Glitzer bleibt). Dann zählen diese Tage nicht mit, reißen die Serie aber nicht – wenn sie ${offer.rescue} ${JOKER_GOAL} 🎯 schafft.</p>`;
}

// Gesperrte Lektionen (noch nicht an der Reihe) öffnen – z. B. wenn in der Schule etwas anderes dran ist.
// Reitturniere: was ansteht, wer es eingetragen hat, gesperrte Lektionen direkt öffnen, löschen.
const examLocked = (e) => {
  const lessons = (getSubjects().find((s) => s.id === e.sid)?.lessons ?? []).map((l) => getLesson(e.sid, l.id)).filter(Boolean);
  const access = lessonAccess(e.sid, lessons);
  return e.lessons.map((lid) => lessons.find((l) => l.id === lid)).filter(Boolean).filter((l) => access.get(l.id) !== 'open');
};
// Aufklappen, wenn ein Turnier gesperrte Lektionen hat.
const examBlockUrgent = () => upcomingExams(allExams()).some((e) => examLocked(e).length);
function examBlock() {
  const list = upcomingExams(allExams());
  const subjects = getSubjects();
  const rows = list.map((e) => {
    const s = subjects.find((x) => x.id === e.sid);
    const lessons = e.lessons.map((lid) => getLesson(e.sid, lid)).filter(Boolean);
    const locked = examLocked(e);
    return `<li class="exam-row">
      <div><strong>${esc(s?.name ?? e.sid)} · ${esc(dateLabel(e.date))}</strong> <span class="muted small">(${esc(countdownText(daysUntil(e.date)))} · eingetragen von ${e.by === 'eltern' ? 'Eltern' : 'Kind'})</span></div>
      <div class="small">${lessons.map((l) => esc(l.title)).join(', ')}</div>
      ${locked.map((l) => `<div class="small">🔒 ${esc(l.title)} ist noch zu <button class="btn small" type="button" data-open="${esc(lessonKey(e.sid, l))}">Öffnen</button></div>`).join('')}
      <div class="actions"><a class="btn small" href="${examHref(e.id)}">ändern</a>
        <button class="btn ghost small" type="button" data-exam-del="${esc(e.id)}">löschen</button></div>
    </li>`;
  });
  return `<p class="muted small">Tests in der Schule: Die App zeigt bis zum Termin ein Turnierplakat und nimmt diese Lektionen auf der Weiter-Karte zuerst. Eintragen kann auch Ihr Kind – gesperrte Lektionen öffnet das nicht, das geht nur hier.</p>
    ${rows.length ? `<ul class="word-list exam-list">${rows.join('')}</ul>` : '<p class="muted small">Gerade ist kein Test eingetragen.</p>'}
    <div class="actions">${subjects.map((s) => `<a class="btn small" href="${examNewHref(s.id, true)}">＋ ${esc(EXAM_NAME)} ${esc(s.name)}</a>`).join('')}</div>`;
}

function unlockBlock() {
  const opened = getState().opened ?? {};
  const rows = [];
  for (const s of getSubjects()) {
    const lessons = s.lessons.map((l) => getLesson(s.id, l.id)).filter(Boolean);
    const access = lessonAccess(s.id, lessons);
    for (const l of lessons) {
      const lk = lessonKey(s.id, l);
      if (access.get(l.id) !== 'open') rows.push(`<li><span>${esc(s.name)}: ${esc(l.title)}</span><button class="btn small" type="button" data-open="${esc(lk)}">Öffnen</button></li>`);
      else if (Object.hasOwn(opened, lk)) rows.push(`<li><span>${esc(s.name)}: ${esc(l.title)}</span><span class="muted small">geöffnet am ${esc(new Date(opened[lk]).toLocaleDateString('de-DE'))}</span></li>`);
    }
  }
  return `<p class="muted small">Lektionen werden von alt nach neu frei: die erste, dann jede nach einem geschafften Lernweg; schon geübte bleiben offen. Hier können Sie eine Lektion vorher öffnen (z. B. vor einer Klassenarbeit).</p>
    ${rows.length ? `<ul class="word-list unlock-list">${rows.join('')}</ul>` : '<p class="muted small">Alle Lektionen sind offen.</p>'}`;
}

function syncBlock() {
  const s = syncStatus();
  if (!s) {
    return `
      <p class="muted small">Sichert den Spielstand in ein privates GitHub-Repo. Der Schlüssel bleibt nur auf diesem Gerät.</p>
      <form class="sync-form" autocomplete="off">
        <label class="small">Repo<input class="answer" name="repo" type="text" value="${esc(DEFAULT_REPO)}"
               autocomplete="off" autocapitalize="off" spellcheck="false"></label>
        <label class="small">Zugangsschlüssel<input class="answer" name="token" type="password"
               autocomplete="off" placeholder="github_pat_…"></label>
        <label class="small">Schlüssel gültig bis (steht bei GitHub beim Schlüssel)<input class="answer" name="until" type="date"></label>
        <p class="sync-error bad small" hidden></p>
        <button class="btn primary" type="submit">Verbinden</button>
      </form>`;
  }
  const when = s.lastSync ? new Date(s.lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nie';
  return `
    <p class="small">Verbunden mit <strong>${esc(s.repo)}</strong> · zuletzt gesichert: ${esc(when)}${s.dirty ? ' · neue Antworten warten' : ''}</p>
    ${s.error ? `<p class="bad small">${esc(s.error)}</p>` : ''}
    <form class="until-form actions" autocomplete="off">
      <label class="small">Schlüssel gültig bis <input class="answer" name="until" type="date" value="${esc(s.tokenUntil ?? '')}"></label>
      <button class="btn small" type="submit">Merken</button>
    </form>
    <p class="muted small">„Trennen“ löscht den Schlüssel nur auf diesem Gerät. Bei Verlust des Tablets den Schlüssel bei GitHub löschen.</p>
    <div class="actions">
      <button class="btn" type="button" data-act="sync-now">Jetzt sichern</button>
      <button class="btn ghost" type="button" data-act="sync-off">Trennen</button>
    </div>`;
}

// rerender(open): Seite neu zeichnen, Bereich dabei offen lassen.
export function bindParents(el, rerender) {
  const box = el.querySelector('.parents');
  box.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    openLesson(b.dataset.open);
    toast('Lektion geöffnet.');
    rerender(true);
  }));
  box.querySelectorAll('[data-exam-del]').forEach((b) => b.addEventListener('click', () => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Wirklich löschen?'; return; }
    deleteExam(b.dataset.examDel);
    toast('Turnier gelöscht.');
    rerender(true);
  }));
  const startBtn = box.querySelector('[data-act=reset-start]');
  const form = box.querySelector('.reset-form');

  startBtn.addEventListener('click', () => {
    startBtn.hidden = true;
    form.hidden = false;
    form.confirm.focus();
  });
  box.querySelector('[data-act=reset-cancel]').addEventListener('click', () => {
    form.reset();
    form.hidden = true;
    startBtn.hidden = false;
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (form.confirm.value.trim().toUpperCase() !== 'LÖSCHEN') {
      form.confirm.classList.remove('shake');
      void form.confirm.offsetWidth;
      form.confirm.classList.add('shake');
      form.confirm.focus();
      return;
    }
    resetProgress();
    toast('Statistik zurückgesetzt.');
    rerender(true);
  });

  const syncForm = box.querySelector('.sync-form');
  syncForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = syncForm.querySelector('button');
    const err = syncForm.querySelector('.sync-error');
    if (!syncForm.repo.value.trim() || !syncForm.token.value.trim()) return;
    btn.disabled = true;
    btn.textContent = 'Verbinde …';
    const res = await connect(syncForm.repo.value, syncForm.token.value, syncForm.until.value);
    if (res.ok) {
      toast('Sicherung eingerichtet.');
      rerender(true);
    } else {
      err.textContent = res.error;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Verbinden';
    }
  });
  box.querySelector('.until-form')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    setTokenUntil(ev.target.until.value);
    toast('Ablaufdatum gemerkt.');
    rerender(true);
  });
  box.querySelector('[data-act=sync-now]')?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    ev.target.textContent = 'Sichere …';
    await syncNow();
    rerender(true);
  });
  // Trennen in zwei Schritten: erstes Tippen fragt nach, erst das zweite (innerhalb von 5 s) trennt.
  // Sonst müsste der Schlüssel nach einem versehentlichen Tippen neu eingegeben werden.
  let offArmed = null;
  box.querySelector('[data-act=sync-off]')?.addEventListener('click', (ev) => {
    const btn = ev.currentTarget;
    if (!offArmed) {
      btn.textContent = 'Wirklich trennen? Nochmal tippen';
      btn.classList.add('danger');
      offArmed = setTimeout(() => { offArmed = null; btn.textContent = 'Trennen'; btn.classList.remove('danger'); }, 5000);
      return;
    }
    clearTimeout(offArmed);
    disconnect();
    toast('Sicherung getrennt. Der Spielstand bleibt auf dem Gerät.');
    rerender(true);
  });
}

// Was das Kind nach den Runden angetippt hat: Spaß und „weitergebracht“, je 1–5.
const FEEDBACK_ROWS = 15;
const avg = (list) => (list.length ? (list.reduce((n, x) => n + x, 0) / list.length).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–');
const modeNames = (mode) => [...new Set(String(mode).split(',').map((id) => modeById(id)?.name ?? id))].join(', ');
// Rundenart (ab dem Lernweg): Etappe, Ausritt … – ältere Rückmeldungen nach Übungsart.
const ART_NAMES = { etappe: 'Lernweg-Etappe', koppel: 'Aufwärmen (Koppel)', ausritt: 'Ausritt (Auffrischen)', blitz: 'Blitzrunde', test: 'Test', turnier: 'Probe (letzte Etappe)', probe: '„Ich kann das schon“' };
const kindOfRound = (f) => ART_NAMES[f.art] ?? (f.art === 'frei' ? `Frei üben: ${modeNames(f.mode)}` : modeNames(f.mode) + (f.test ? ' (Test)' : ''));

function feedbackBlock() {
  const list = getState().feedback ?? [];
  if (!list.length) return '<p class="muted small">Noch keine Rückmeldungen. Nach jeder Runde kann sie antippen, wie viel Spaß sie hatte und wie viel es ihr gebracht hat.</p>';
  // Durchschnitt pro Übungsart – zeigt, was gut ankommt und was sie als nützlich empfindet.
  const byMode = new Map();
  for (const f of list) {
    const k = kindOfRound(f);
    const m = byMode.get(k) ?? { fun: [], learn: [] };
    if (f.fun) m.fun.push(f.fun);
    if (f.learn) m.learn.push(f.learn);
    byMode.set(k, m);
  }
  const icon = (q, v) => (v ? RATINGS[q].icons[v - 1] : '–');
  const when = (at) => new Date(at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  return `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Übung</th><th>Runden</th><th>${RATINGS.fun.icons[4]} Spaß</th><th>${RATINGS.learn.icons[4]} gebracht</th></tr></thead>
      <tbody>${[...byMode].map(([k, m]) => `
        <tr><td>${esc(k)}</td><td>${Math.max(m.fun.length, m.learn.length)}</td><td>${avg(m.fun)}</td><td>${avg(m.learn)}</td></tr>`).join('')}
      </tbody>
    </table></div>
    <details class="small"><summary>Letzte ${Math.min(FEEDBACK_ROWS, list.length)} Runden</summary>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Wann</th><th>Was</th><th>Spaß</th><th>Gebracht</th></tr></thead>
        <tbody>${list.slice(-FEEDBACK_ROWS).reverse().map((f) => `
          <tr><td class="muted">${esc(when(f.at))}</td><td>${esc(f.what)}<br><span class="muted">${esc(kindOfRound(f))} · ${f.right}/${f.n} sofort richtig</span></td>
            <td>${icon('fun', f.fun)}</td><td>${icon('learn', f.learn)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </details>
    <p class="muted small">Werte 1–5. Spaß: ${RATINGS.fun.icons.join(' ')} · gebracht: ${RATINGS.learn.icons.join(' ')}</p>`;
}

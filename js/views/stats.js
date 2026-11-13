// Fortschritt – dieselbe Seite für Kind und Eltern.

import { allLessons, contentUpdated, contentVersion } from '../content.js';
import { syncStatus, syncWarning } from '../sync.js';
import { getState, itemState, streak, storageProblem, storageNewer, profileId } from '../store.js';
import { deviceId } from '../device.js';
import { parentsSection, bindParents } from './parents.js';
import { modesFor, tasksFor } from '../exercises/registry.js';
import { status, itemKey } from '../srs.js';
import { masteryMode, coreItems, unitOf, countWord } from '../lessons.js';
import { esc, dayKey, addDays } from '../util.js';
import { DAY_GOAL } from '../streak.js';
import { fold, bindFolds } from '../fold.js';

const HISTORY_DAYS = 14;
const HARD_WORDS = 10;

export function statsView(el, openParents = false) {
  const st = getState();
  const serie = streak();
  const rows = collectItems();
  const subjects = subjectCounts();
  const unit = unitOf(allLessons().map((x) => x.lesson));
  const practiceDays = Object.keys(st.days).length;
  const totalRight = Object.values(st.days).reduce((n, d) => n + d.right, 0);
  const totalWrong = Object.values(st.days).reduce((n, d) => n + d.wrong, 0);
  const hard = rows.filter((r) => r.st.wrong > 0)
    .sort((a, b) => b.st.wrong - a.st.wrong || b.st.last - a.st.last)
    .slice(0, HARD_WORDS);

  el.innerHTML = `
    <h1>Fortschritt</h1>
    ${storageNewer() ? '<p class="card warn-banner">⚠️ Der Lernstand stammt von einer neueren App-Version. Bitte die App schließen und neu öffnen – bis dahin wird nichts gespeichert.</p>' : ''}
    ${storageProblem() ? '<p class="card warn-banner">⚠️ Der Lernstand konnte zuletzt nicht gespeichert werden – Speicher des Geräts voll oder gesperrt (privates Fenster?).</p>' : ''}
    ${syncWarning() ? `<p class="card warn-banner">⚠️ ${esc(syncWarning())}</p>` : ''}

    <section class="kpis">
      <div class="card kpi"><strong>${serie.count}</strong><span>Tage am Stück</span></div>
      <div class="card kpi"><strong>${practiceDays}</strong><span>Übungstage</span></div>
      <div class="card kpi"><strong>${pct(totalRight, totalRight + totalWrong)}</strong><span>Trefferquote</span></div>
      <div class="card kpi"><strong>${Number(st.points) || 0} ✦</strong><span>Sternchen</span></div>
    </section>

    ${fold('faecher', '<h2>Fächer</h2>', `
      ${subjects.map((s) => `
        <div class="lesson-line">
          <div class="lesson-name"><strong>${esc(s.icon ?? '📘')} ${esc(s.name)}</strong></div>
          <div class="stack" role="img" aria-label="${s.sicher} sicher, ${s.wackelt} wackeln, ${s.neu} neu">
            <div class="sicher" style="width:${(s.sicher / (s.total || 1)) * 100}%"></div>
            <div class="wackelt" style="width:${(s.wackelt / (s.total || 1)) * 100}%"></div>
            <div class="neu" style="width:${(s.neu / (s.total || 1)) * 100}%"></div>
          </div>
          <span class="small muted">${countWord(s.unit, s.sicher)} sicher · ${s.wackelt} wackeln · ${s.neu} neu</span>
        </div>`).join('') || '<p class="muted">Noch keine Fächer.</p>'}`, { open: true })}

    ${fold('tage', `<h2>Letzte ${HISTORY_DAYS} Tage</h2>`, historyChart(st.days, serie.rescued), { open: true })}

    ${fold('test', '<h2>Bereit für den Test?</h2>', lessonTable())}

    ${fold('schwer', `<h2>Schwere ${esc(unit[1])}</h2>`, hard.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Gefragt</th><th>Richtig</th><th>Übung</th><th>Fehler</th><th>Zuletzt falsch</th></tr></thead>
          <tbody>${hard.map((r) => `
            <tr>
              <td>${esc(r.prompt)}</td>
              <td><strong>${esc(r.answer)}</strong></td>
              <td class="small">${esc(r.mode.short)}</td>
              <td>${r.st.wrong}</td>
              <td class="muted">${(r.st.wrongs ?? []).slice(0, 3).map(esc).join(', ') || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : '<p class="muted">Noch keine Fehler gesammelt.</p>')}

    ${parentsSection(openParents)}

    <p class="muted small status-line">${statusLine()}</p>`;
  fillAppVersion(el);
  bindFolds(el);

  bindParents(el, (open) => {
    statsView(el, open);
    el.querySelector('.parents')?.scrollIntoView({ block: 'start' });
  });
}

// Pro Fach: wie viele Einträge sicher sitzen, wackeln, neu sind – jeder Eintrag einmal, gemessen an
// der Übungsart, die auch Test und Sterne zählen (masteryMode), ohne Experten-Aufgaben.
function subjectCounts() {
  const bySubject = new Map();
  for (const { sid, subject, lesson } of allLessons()) {
    const s = bySubject.get(sid) ?? { name: subject.name, icon: subject.icon, neu: 0, wackelt: 0, sicher: 0, total: 0, lessons: [] };
    const mode = masteryMode(lesson);
    for (const it of coreItems(lesson)) { s[status(itemState(itemKey(sid, lesson.id, it, mode)))]++; s.total++; }
    s.lessons.push(lesson);
    bySubject.set(sid, s);
  }
  return [...bySubject.values()].map((s) => ({ ...s, unit: unitOf(s.lessons) }));
}

// Ein Eintrag pro Wort und Übungsart.
function collectItems() {
  const rows = [];
  for (const { sid, lesson } of allLessons()) {
    for (const m of modesFor(lesson)) {
      for (const t of tasksFor(sid, lesson, m.id)) {
        const st = itemState(t.key);
        const [prompt, answer] = m.question.pair(t);
        rows.push({ st, status: status(st), prompt, answer, mode: { ...m, short: m.short(lesson), label: m.label(lesson) } });
      }
    }
  }
  return rows;
}

function lessonTable() {
  const blocks = [];
  for (const { sid, subject: s, lesson } of allLessons()) {
    const lines = modesFor(lesson).map((m) => {
      const tasks = tasksFor(sid, lesson, m.id);
      const n = tasks.length || 1;
      const c = { neu: 0, wackelt: 0, sicher: 0 };
      tasks.forEach((t) => c[status(itemState(t.key))]++);
      return `
        <div class="mode-line">
          <span class="small">${esc(m.label(lesson).replace(/^Schreiben: /, '✍️ '))}</span>
          <div class="stack" role="img" aria-label="${c.sicher} sicher, ${c.wackelt} wackeln, ${c.neu} neu">
            <div class="sicher" style="width:${(c.sicher / n) * 100}%"></div>
            <div class="wackelt" style="width:${(c.wackelt / n) * 100}%"></div>
            <div class="neu" style="width:${(c.neu / n) * 100}%"></div>
          </div>
          <span class="small muted">${c.sicher} sicher · ${c.wackelt} wackeln · ${c.neu} neu</span>
        </div>`;
    });
    const mode = masteryMode(lesson);
    const core = coreItems(lesson);
    const safe = core.filter((it) => status(itemState(itemKey(sid, lesson.id, it, mode))) === 'sicher').length;
    blocks.push(fold(`test:${sid}/${lesson.id}`,
      `<strong>${esc(lesson.title)}</strong> <span class="muted small">${esc(s.name)} · ${pct(safe, core.length)} sicher</span>`,
      lines.join(''), { cls: 'lesson-line sub-fold' }));
  }
  return `
    <div class="legend small"><span class="dot sicher"></span>sicher <span class="dot wackelt"></span>wackelt <span class="dot neu"></span>neu</div>
    ${blocks.join('') || '<p class="muted">Noch keine Lektionen.</p>'}`;
}

function historyChart(days, rescued) {
  const list = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const day = days[dayKey(d)] ?? {};
    list.push({ d, rescued: rescued.has(dayKey(d)), right: Number(day.right) || 0, wrong: Number(day.wrong) || 0 });
  }
  const max = Math.max(1, ...list.map((x) => x.right + x.wrong));
  return `
    <div class="bars" role="img" aria-label="Geübte Aufgaben pro Tag">
      ${list.map((x) => `
        <div class="bar${x.rescued ? ' rescued' : ''}" title="${x.d.toLocaleDateString('de-DE')}: ${x.right} richtig, ${x.wrong} falsch${x.rescued ? ' – am Tag danach gerettet' : ''}">
          <div class="bar-stack" style="height:${((x.right + x.wrong) / max) * 100}%">
            <div class="wrong" style="flex:${x.wrong}"></div>
            <div class="right" style="flex:${x.right}"></div>
          </div>
          <span>${x.rescued ? '🛟' : x.d.toLocaleDateString('de-DE', { weekday: 'narrow' })}</span>
        </div>`).join('')}
    </div>
    <div class="legend small"><span class="dot right"></span>richtig <span class="dot wrong"></span>falsch</div>
    <p class="muted small">Ein Tag zählt für die Serie ab ${DAY_GOAL} 🎯. Jede Aufgabe zählt nach ihrer Schwere: Antwortform (Eintippen 1, Antippen weniger – Raten ist herausgerechnet) mal Denkaufwand (Wiedererkennen 0,3 bis Knobeln 2). Wörter schreiben zählt 1. 🛟 = verpasst, aber am Tag danach gerettet.</p>`;
}

// Für die Eltern: Stand von App, Inhalten und Sicherung auf einen Blick.
function statusLine() {
  const parts = ['App-Stand <span class="app-version">…</span>'];
  if (contentVersion()) parts.push(`Inhalte Version ${esc(contentVersion())}${contentUpdated() ? ` vom ${esc(formatDate(contentUpdated()))}` : ''}`);
  const s = syncStatus();
  parts.push(s
    ? `Sicherung: ${s.lastSync ? esc(new Date(s.lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })) : 'noch nie'}`
    : 'Sicherung: aus');
  const size = JSON.stringify(getState()).length;
  parts.push(`Lernstand ${size < 1e6 ? Math.ceil(size / 1024) + ' KB' : (size / 1e6).toFixed(1) + ' MB'}`);
  parts.push(`Gerät ${esc(deviceId())}${profileId() !== 'standard' ? ` · Profil ${esc(profileId())}` : ''}`);
  return parts.join(' · ');
}

// App-Stand = Name des aktiven Offline-Caches (Fingerabdruck der App-Dateien), dazu ob ein Update lädt.
async function fillAppVersion(el) {
  const span = el.querySelector('.app-version');
  if (!span) return;
  try {
    const name = (await caches.keys()).find((k) => k.startsWith('lernapp-'));
    const reg = await navigator.serviceWorker?.getRegistration();
    span.textContent = (name ? name.replace('lernapp-', '').replace('shell-', '') : 'unbekannt')
      + (reg?.installing || reg?.waiting ? ' (Update wird geladen)' : '');
  } catch { span.textContent = 'unbekannt'; }
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE');
}

function pct(a, n) {
  return n ? Math.round((a / n) * 100) + ' %' : '–';
}

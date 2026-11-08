// Fortschritt – dieselbe Seite für Kind und Eltern.

import { getSubjects, getLesson, contentUpdated, contentVersion } from '../content.js';
import { syncStatus, syncWarning } from '../sync.js';
import { getState, itemState, streak } from '../store.js';
import { parentsSection, bindParents } from './parents.js';
import { modesFor, tasksFor } from '../exercises/registry.js';
import { status } from '../srs.js';
import { esc, dayKey, addDays } from '../util.js';
import { DAY_GOAL } from '../streak.js';

const HISTORY_DAYS = 14;
const HARD_WORDS = 10;

export function statsView(el, openParents = false) {
  const st = getState();
  const serie = streak();
  const rows = collectItems();
  const counts = { neu: 0, wackelt: 0, sicher: 0 };
  // „Wörter sicher“ zählt wie bisher nur das Schreiben (beide Richtungen).
  rows.filter((r) => r.mode.group === 'schreiben').forEach((r) => counts[r.status]++);
  const practiceDays = Object.keys(st.days).length;
  const totalRight = Object.values(st.days).reduce((n, d) => n + d.right, 0);
  const totalWrong = Object.values(st.days).reduce((n, d) => n + d.wrong, 0);
  const hard = rows.filter((r) => r.st.wrong > 0)
    .sort((a, b) => b.st.wrong - a.st.wrong || b.st.last - a.st.last)
    .slice(0, HARD_WORDS);

  el.innerHTML = `
    <h1>Fortschritt</h1>
    ${syncWarning() ? `<p class="card warn-banner">⚠️ ${esc(syncWarning())}</p>` : ''}

    <section class="kpis">
      <div class="card kpi"><strong>${counts.sicher}</strong><span>Wörter sicher</span></div>
      <div class="card kpi"><strong>${counts.wackelt}</strong><span>wackeln noch</span></div>
      <div class="card kpi"><strong>${serie.count}</strong><span>Tage am Stück</span></div>
      <div class="card kpi"><strong>${practiceDays}</strong><span>Übungstage</span></div>
      <div class="card kpi"><strong>${pct(totalRight, totalRight + totalWrong)}</strong><span>Trefferquote</span></div>
      <div class="card kpi"><strong>${Number(st.points) || 0} ✦</strong><span>Sternchen</span></div>
    </section>

    <section class="card">
      <h2>Letzte ${HISTORY_DAYS} Tage</h2>
      ${historyChart(st.days, serie.rescued)}
    </section>

    <section class="card">
      <h2>Bereit für den Test?</h2>
      ${lessonTable()}
    </section>

    <section class="card">
      <h2>Schwere Wörter</h2>
      ${hard.length ? `
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
        </table></div>` : '<p class="muted">Noch keine Fehler gesammelt.</p>'}
    </section>

    ${parentsSection(openParents)}

    <p class="muted small status-line">${statusLine()}</p>`;
  fillAppVersion(el);

  bindParents(el, (open) => {
    statsView(el, open);
    el.querySelector('.parents')?.scrollIntoView({ block: 'start' });
  });
}

// Ein Eintrag pro Wort und Übungsart.
function collectItems() {
  const rows = [];
  for (const s of getSubjects()) {
    for (const l of s.lessons) {
      const lesson = getLesson(s.id, l.id);
      if (!lesson) continue;
      for (const m of modesFor(lesson)) {
        for (const t of tasksFor(s.id, lesson, m.id)) {
          const st = itemState(t.key);
          const [prompt, answer] = m.question.pair(t);
          rows.push({ st, status: status(st), prompt, answer, mode: { ...m, short: m.short(lesson), label: m.label(lesson) } });
        }
      }
    }
  }
  return rows;
}

function lessonTable() {
  const blocks = [];
  for (const s of getSubjects()) {
    for (const l of s.lessons) {
      const lesson = getLesson(s.id, l.id);
      if (!lesson) continue;
      const lines = modesFor(lesson).map((m) => {
        const tasks = tasksFor(s.id, lesson, m.id);
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
      blocks.push(`
        <div class="lesson-line">
          <div class="lesson-name"><strong>${esc(l.title)}</strong> <span class="muted small">${esc(s.name)}</span></div>
          ${lines.join('')}
        </div>`);
    }
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
    <div class="bars" role="img" aria-label="Geübte Wörter pro Tag">
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
    <p class="muted small">Ein Tag zählt für die Serie ab ${DAY_GOAL} Aufgaben. Schreiben und Diktat zählen voll, Lückensätze fast, Antippen nur ein Fünftel. 🛟 = verpasst, aber am Tag danach gerettet.</p>`;
}

// Für die Eltern: Stand von App, Inhalten und Sicherung auf einen Blick.
function statusLine() {
  const parts = ['App-Stand <span class="app-version">…</span>'];
  if (contentVersion()) parts.push(`Inhalte Version ${esc(contentVersion())}${contentUpdated() ? ` vom ${esc(formatDate(contentUpdated()))}` : ''}`);
  const s = syncStatus();
  parts.push(s
    ? `Sicherung: ${s.lastSync ? esc(new Date(s.lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })) : 'noch nie'}`
    : 'Sicherung: aus');
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

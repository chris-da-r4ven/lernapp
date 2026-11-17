// Fortschritt – dieselbe Seite für Kind und Eltern.

import { allLessons, contentUpdated, contentVersion } from '../content.js';
import { syncStatus, syncWarning } from '../sync.js';
import { getState, itemState, streak, storageProblem, storageNewer, profileId } from '../store.js';
import { deviceId } from '../device.js';
import { parentsSection, bindParents } from './parents.js';
import { modesFor, tasksFor } from '../exercises/registry.js';
import { status } from '../srs.js';
import { coreItems, unitOf, countWord } from '../lessons.js';
import { esc, dayKey, addDays } from '../util.js';
import { DAY_GOAL } from '../streak.js';
import { fold, bindFolds } from '../fold.js';
import { dayPoints, fmtPoints, oldCount, bestDay, RECORD_DAYS } from '../records.js';
import { wreath } from '../wreath.js';
import { wordStatus } from '../words.js';
import { dayValue } from '../streak.js';
import { allExams } from '../store.js';
import { ribbonWall, RIBBONS, dateLabel, EXAM_NAME } from '../exams.js';
import { getSubjects } from '../content.js';

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

    ${fold('tage', `<h2>Letzte ${HISTORY_DAYS} Tage</h2>`, historyChart(st.days, serie.rescued, serie.jokered), { open: true })}

    ${ribbonWallHtml()}

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
  bindDayBars(el);

  bindParents(el, (open) => {
    statsView(el, open);
    el.querySelector('.parents')?.scrollIntoView({ block: 'start' });
  });
}

// Schleifenwand: eine Schleife pro Reitturnier – ohne Zählen, alle gleich viel wert.
function ribbonWallHtml() {
  const wall = ribbonWall(allExams());
  if (!wall.length) return '';
  const name = (sid) => getSubjects().find((s) => s.id === sid)?.name ?? '';
  return fold('schleifen', '<h2>🎀 Schleifenwand</h2>', `
    <div class="ribbon-wall">${wall.map((e) => `
      <div class="ribbon-tile"><span class="ribbon-icon" aria-hidden="true">${RIBBONS[e.ribbon].icon}</span>
        <strong>${esc(EXAM_NAME)} ${esc(name(e.sid))}</strong><span class="small muted">${esc(dateLabel(e.date))} · ${esc(RIBBONS[e.ribbon].name)}</span></div>`).join('')}
    </div>`, { open: true });
}

// Pro Fach: wie viele Einträge sicher sitzen, wackeln, neu sind – jeder Eintrag einmal, als Wort über
// alle Übungsarten (words.js), ohne Experten-Aufgaben.
function subjectCounts() {
  const bySubject = new Map();
  for (const { sid, subject, lesson } of allLessons()) {
    const s = bySubject.get(sid) ?? { name: subject.name, icon: subject.icon, neu: 0, wackelt: 0, sicher: 0, total: 0, lessons: [] };
    for (const it of coreItems(lesson)) { s[wordStatus(sid, lesson, it)]++; s.total++; }
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
    const core = coreItems(lesson);
    const safe = core.filter((it) => wordStatus(sid, lesson, it) === 'sicher').length;
    blocks.push(fold(`test:${sid}/${lesson.id}`,
      `<strong>${esc(lesson.title)}</strong> <span class="muted small">${esc(s.name)} · ${pct(safe, core.length)} sicher</span>`,
      lines.join(''), { cls: 'lesson-line sub-fold' }));
  }
  return `
    <div class="legend small"><span class="dot sicher"></span>sicher <span class="dot wackelt"></span>wackelt <span class="dot neu"></span>neu</div>
    ${blocks.join('') || '<p class="muted">Noch keine Lektionen.</p>'}`;
}

function historyChart(days, rescued, jokered = new Set()) {
  const list = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const day = days[dayKey(d)] ?? {};
    list.push({ d, key: dayKey(d), rescued: rescued.has(dayKey(d)), joker: jokered.has(dayKey(d)), right: Number(day.right) || 0, wrong: Number(day.wrong) || 0, goal: dayValue(days[dayKey(d)]), old: oldCount(days[dayKey(d)]) });
  }
  const max = Math.max(1, ...list.map((x) => x.right + x.wrong));
  // Rekorde in 🎯 Punkten (heute zählt mit): letzte 4 Wochen und Allzeit
  const today = dayKey();
  const best = bestDay(days, today, { withToday: true });
  const all = bestDay(days, today, { window: null, withToday: true });
  // Antippen zeigt die Zahlen des Tages (data-info, siehe bindDayBars)
  const info = (x) => {
    const n = x.right + x.wrong;
    const day = x.d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
    if (!n) return `${day}: ${x.joker ? 'per Joker überbrückt 🃏' : 'nicht geübt'}`;
    const pts = Math.round(x.goal * 10) / 10;
    return `${day}: ${fmtPoints(pts)} 🎯 Punkte · ${n} Aufgaben (${x.right} richtig, ${x.wrong} falsch)${x.old ? ' · alte Zählung: jede Aufgabe zählte 1, auch Antippen' : x.key === all.key ? ' · 🏆 Allzeit-Rekord!' : x.key === best.key ? ' · 🏆 Rekord der letzten 4 Wochen!' : ''}${x.rescued ? ' · 🛟 gerettet' : ''}`;
  };
  const dayName = (k) => dateLabel(k);
  return `
    ${all.n > 0 ? `<div class="records">
      ${wreath(fmtPoints(all.n), { size: 112, title: `Allzeit-Rekord: ${fmtPoints(all.n)} Punkte` })}
      <div class="records-text">
        <p><strong>Siegerkranz</strong><br><span class="small">Dein bester Tag überhaupt: ${esc(dayName(all.key))}</span></p>
        ${best.n > 0 ? `<p><strong>${fmtPoints(best.n)} 🎯</strong> <span class="small">Rekord der letzten ${RECORD_DAYS / 7} Wochen${best.key === all.key ? '' : ` (${esc(dayName(best.key))})`}</span></p>` : ''}
      </div>
    </div>` : ''}
    <div class="bars" role="group" aria-label="Geübte Aufgaben pro Tag – antippen für die Zahlen">
      ${list.map((x) => `
        <button type="button" class="bar${x.rescued ? ' rescued' : ''}${x.old ? ' old' : ''}" data-info="${esc(info(x))}" aria-label="${esc(info(x))}">
          <div class="bar-stack" style="height:${((x.right + x.wrong) / max) * 100}%">
            <div class="wrong" style="flex:${x.wrong}"></div>
            <div class="right" style="flex:${x.right}"></div>
          </div>
          <span>${x.rescued ? '🛟' : x.joker ? '🃏' : x.d.toLocaleDateString('de-DE', { weekday: 'narrow' })}</span>
        </button>`).join('')}
    </div>
    <p class="small day-info" aria-live="polite">Tipp auf einen Balken, dann siehst du die Zahlen.</p>
    <div class="legend small"><span class="dot right"></span>richtig <span class="dot wrong"></span>falsch</div>
    <p class="muted small">Ein Tag zählt für die Serie ab ${DAY_GOAL} 🎯. Jede Aufgabe zählt nach ihrer Schwere: Antwortform (Eintippen 1, Antippen weniger – Raten ist herausgerechnet) mal Denkaufwand (Wiedererkennen 0,3 bis Knobeln 2). Wörter schreiben zählt 1. 🛟 = verpasst, aber am Tag danach gerettet. 🃏 = per Joker überbrückt.</p>`;
}

function bindDayBars(el) {
  const out = el.querySelector('.day-info');
  el.querySelectorAll('button.bar').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('button.bar.picked').forEach((x) => x.classList.remove('picked'));
    b.classList.add('picked');
    out.textContent = b.dataset.info;
  }));
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

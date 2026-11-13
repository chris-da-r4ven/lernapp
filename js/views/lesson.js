import { getSubject, getLesson } from '../content.js';
import { itemState } from '../store.js';
import { itemKey, status } from '../srs.js';
import { modesFor, modeGroups, usableFor, storeMode } from '../exercises/registry.js';
import { masteryOf, unitWord, kindInfo, coreItems } from '../lessons.js';
import { levelInfo, hasLevels, LEVELS } from '../levels.js';
import { esc } from '../util.js';
import { lessonMedal, testReady } from '../medal.js';
import { etappenFor, tasksForEtappe, nextEtappe, progress, minutesFor, pathModes, STATIONS } from '../path.js';
import { etappeHref } from './etappe.js';
import { kindOf, nativeSide } from '../lessons.js';

const STATUS_LABEL = { neu: 'neu', wackelt: 'wackelt', sicher: 'sicher' };

// Klartext zu einer Etappe: was passiert, wie wird geantwortet.
function stageText(lesson, stage) {
  const kind = kindOf(lesson);
  const pm = pathModes(lesson);
  if (stage.type === 'koppel') return { what: 'Aufwärmen mit Basis-Aufgaben', how: 'eintippen' };
  if (kind === 'mathe') return stage.type === 'springen'
    ? { what: 'Gemischte Aufgaben aus allen Etappen', how: 'eintippen' }
    : { what: 'Aufgaben lösen', how: 'eintippen' };
  if (kind === 'grammatik') return stage.type === 'springen'
    ? { what: 'Formen selbst schreiben, gemischt', how: 'eintippen' }
    : { what: 'Richtige Form erst antippen, dann selbst schreiben', how: 'antippen & eintippen' };
  if (stage.type === 'springen') return { what: 'Alles gemischt: Lückensätze, Diktat, beide Richtungen', how: 'eintippen' };
  return pm.recognize === 'hoeren-wahl'
    ? { what: 'Neue Wörter hören, antippen und schreiben', how: 'hören, antippen & eintippen' }
    : { what: 'Neue Wörter kennenlernen und schreiben', how: 'eintippen' };
}

export function lessonView(el, sid, lid) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  if (!subject || !lesson) { location.hash = '#/'; return; }

  const base = `#/ueben/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  const modes = modesFor(lesson);
  const medal = lessonMedal(sid, lesson);
  const ready = testReady(sid, lesson);
  const showAnswers = kindInfo(lesson).showAnswers;
  const core = coreItems(lesson).length;          // zählt für „sicher“, Test und Medaille
  const extra = lesson.items.length - core;       // Experten-Aufgaben (nur auf Wunsch)   // Mathe: Lösungen nicht verraten

  // Lernweg
  const stages = etappenFor(sid, lesson);
  const prog = progress(stages);
  const next = nextEtappe(stages);
  const testBtn = kindInfo(lesson).testable
    ? `<a class="btn${ready || prog.complete ? ' primary ready-btn' : ''}" href="#/test/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}">📝 Diese Lektion testen${ready ? ' – du bist bereit!' : ''}</a>`
    : '';
  const native = nativeSide(lesson);
  const preview = (stage) => (kindOf(lesson) === 'vokabeln' && stage.type === 'gruppe'
    ? `<p class="muted small">${stage.items.slice(0, 4).map((it) => esc(it[native])).join(' · ')}${stage.items.length > 4 ? ' …' : ''}</p>` : '');
  const nextCard = () => {
    if (!next) {
      return `
        <section class="card next-card done">
          <p class="next-label">🎀 LERNWEG GESCHAFFT</p>
          <p class="next-title">Alle Etappen dieser Lektion sind erledigt.</p>
          <p class="muted small">Fällige Wörter kommen im 🌳 Ausritt wieder. Jede Etappe kannst du unten nochmal spielen.</p>
          ${testBtn ? `<div class="actions">${testBtn}</div>` : ''}
        </section>`;
    }
    const st = STATIONS[next.station];
    const t = stageText(lesson, next);
    const n = tasksForEtappe(sid, lesson, next, stages).length;
    const pos = next.optional ? 'AUFWÄRMEN' : `ETAPPE ${stages.filter((s) => !s.optional).indexOf(next) + 1} VON ${prog.total}`;
    return `
      <section class="card next-card">
        <p class="next-label">${pos} · ${st.icon} ${esc(st.name.toUpperCase())}</p>
        <p class="next-title">${esc(t.what)}</p>
        ${preview(next)}
        <div class="chips">
          <span class="chip">${next.items.length} ${esc(unitWord(lesson, next.items.length))}</span>
          <span class="chip">ca. ${minutesFor(n)} ${minutesFor(n) === 1 ? 'Minute' : 'Minuten'}</span>
          <span class="chip">${esc(t.how)}</span>
        </div>
        <a class="btn primary big-btn" href="${etappeHref(sid, lid, next.n)}">Los geht’s</a>
      </section>`;
  };
  // Knobel-Parcours (Experten-Aufgaben): gleichwertig neben dem Weg, ab der ersten geschafften Etappe
  const expert = modes.find((m) => m.id === 'experte');
  const knobel = !expert ? '' : prog.done >= 1
    ? `<a class="card row knobel-card" href="${base}/experte">
        <span class="knobel-icon" aria-hidden="true">🟣</span>
        <span class="grow"><strong>Knobel-Parcours</strong><br><span class="muted small">${extra} Experten-Aufgaben – über das Buch hinaus, gibt mehr Sternchen</span></span>
        <span aria-hidden="true">›</span>
      </a>`
    : `<div class="card row knobel-card locked"><span class="knobel-icon" aria-hidden="true">🟣</span>
        <span class="grow"><strong>Knobel-Parcours</strong><br><span class="muted small">öffnet sich, wenn du die erste Etappe geschafft hast</span></span></div>`;
  const stageRow = (s) => {
    const st = STATIONS[s.station];
    const mark = s.done ? '✓' : s === next ? '▶' : '·';
    const label = `${st.icon} ${esc(st.name)} <span class="muted small">– ${esc(stageText(lesson, s).what)}</span>`;
    const cls = s.done ? 'done' : s === next ? 'now' : 'later';
    return `<li class="stage ${cls}"><span class="stage-mark" aria-hidden="true">${mark}</span>
      ${s.open ? `<a href="${etappeHref(sid, lid, s.n)}">${label}</a>` : `<span>${label}</span>`}
      <span class="sr-only">${s.done ? 'geschafft' : s === next ? 'jetzt dran' : 'kommt noch'}</span></li>`;
  };

  el.innerHTML = `
    <a class="back" href="#/fach/${encodeURIComponent(sid)}">← ${esc(subject.name)}</a>
    <h1>${esc(lesson.title)}</h1>
    <p class="muted">${prog.done} von ${prog.total} Etappen · ${core} ${unitWord(lesson, core)}${extra ? ` + ${extra} Experten-Aufgaben` : ''} · ${Math.round(masteryOf(sid, lesson) * 100)} % sicher</p>
    ${medal.medal
      ? '<div class="medal-banner"><span class="medal" aria-hidden="true">🏅</span><strong>Kannst du schon gut!</strong></div>'
      : `<p class="muted small">🏅 ${esc(medal.hint)}</p>`}

    ${nextCard()}
    ${knobel}

    <section class="card">
      <h2>Dein Lernweg</h2>
      <ol class="stage-list">${stages.map(stageRow).join('')}</ol>
    </section>

    <details class="card fold">
      <summary>Frei üben – einzelne Übungsarten, ganze Lektion, Test</summary>
      <p class="muted small">Freies Üben zählt für Sternchen und Tagesziel, hakt aber keine Etappe ab.</p>
      <label class="check"><input type="checkbox" data-all> Ganze Lektion üben (z. B. vor dem Test)</label>
      ${testBtn ? `<div class="actions wrap">${testBtn}</div>` : ''}
      ${modeGroups(lesson).map((group) => `
        <div class="actions wrap">
          ${group.map((m) => `<button class="btn" data-href="${base}/${m.id}">${esc(m.label(lesson))}</button>`).join('')}
        </div>`).join('')}
    </details>

    <details class="card fold">
      <summary>Alle ${esc(kindInfo(lesson).unit[1])} ansehen</summary>
      <ul class="word-list">
        ${lesson.items.map((it) => `
          <li>
            <span>${it.level ? `<span title="${esc(levelInfo(it).name)}">${levelInfo(it).icon}</span> ` : ''}${esc(it.a)}</span>
            ${!showAnswers ? '' : `<strong>${esc(it.b)}${it.hard ? ' <span class="hard" title="schwieriges Wort">✗</span>' : ''}</strong>`}
            <span class="pills">${modes.filter((m) => usableFor(m, it)).map((m) => {
              const st = status(itemState(itemKey(sid, lid, it, storeMode(m.id))));
              return `<span class="pill ${st}" title="${esc(m.label(lesson))}: ${STATUS_LABEL[st]}">${esc(m.short(lesson))}</span>`;
            }).join('')}</span>
          </li>`).join('')}
      </ul>
      ${hasLevels(lesson) ? `<p class="muted small">${Object.values(LEVELS).map((l) => `${l.icon} ${l.name}`).join(' · ')} – Basis zum Aufwärmen, Experte geht über das Buch hinaus und gibt mehr Sternchen.</p>` : ''}
      <div class="legend small"><span class="dot sicher"></span>sicher <span class="dot wackelt"></span>wackelt <span class="dot neu"></span>neu</div>
      <p class="muted small">Jede Markierung steht für eine Übungsart: ${modes.map((m) => `${esc(m.short(lesson))} = ${esc(m.label(lesson).replace(/^🔊 /, ''))}`).join(' · ')}${lesson.items.some((it) => it.hard) ? ' · <span class="hard">✗</span> = schwieriges Wort, kommt zuerst dran' : ''}</p>
    </details>`;

  const all = el.querySelector('[data-all]');
  el.querySelectorAll('[data-href]').forEach((a) => {
    a.addEventListener('click', () => { location.hash = a.dataset.href + (all.checked ? '/alle' : ''); });
  });
}

import { getSubject, getLesson } from '../content.js';
import { itemState } from '../store.js';
import { itemKey, status } from '../srs.js';
import { modesFor, modeGroups, usableFor } from '../exercises/registry.js';
import { masteryOf, unitWord, kindInfo } from '../lessons.js';
import { esc } from '../util.js';
import { lessonMedal, testReady } from '../medal.js';

const STATUS_LABEL = { neu: 'neu', wackelt: 'wackelt', sicher: 'sicher' };

export function lessonView(el, sid, lid) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  if (!subject || !lesson) { location.hash = '#/'; return; }

  const base = `#/ueben/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  const modes = modesFor(lesson);
  const medal = lessonMedal(sid, lesson);
  const ready = testReady(sid, lesson);

  el.innerHTML = `
    <a class="back" href="#/fach/${encodeURIComponent(sid)}">← ${esc(subject.name)}</a>
    <h1>${esc(lesson.title)}</h1>
    <p class="muted">${lesson.items.length} ${unitWord(lesson, lesson.items.length)} · ${Math.round(masteryOf(sid, lesson) * 100)} % sicher</p>
    ${medal.medal
      ? '<div class="medal-banner"><span class="medal" aria-hidden="true">🏅</span><strong>Kannst du schon gut!</strong></div>'
      : `<p class="muted small">🏅 ${esc(medal.hint)}</p>`}

    <section class="card">
      <h2>Üben</h2>
      <label class="check"><input type="checkbox" data-all> Ganze Lektion üben (z. B. vor dem Test)</label>
      ${!kindInfo(lesson).testable ? '' : `
        <div class="actions wrap">
          <a class="btn${ready ? ' primary ready-btn' : ''}" href="#/test/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}">📝 Diese Lektion testen${ready ? ' – du bist bereit!' : ''}</a>
        </div>`}
      ${modeGroups(lesson).map((group) => `
        <div class="actions wrap">
          ${group.map((m) => `<button class="btn primary" data-href="${base}/${m.id}">${esc(m.label(lesson))}</button>`).join('')}
        </div>`).join('')}
    </section>

    <section class="card">
      <h2>Wörter</h2>
      <ul class="word-list">
        ${lesson.items.map((it) => `
          <li>
            <span>${esc(it.a)}</span>
            <strong>${esc(it.b)}${it.hard ? ' <span class="hard" title="schwieriges Wort">✗</span>' : ''}</strong>
            <span class="pills">${modes.filter((m) => usableFor(m, it)).map((m) => {
              const st = status(itemState(itemKey(sid, lid, it, m.id)));
              return `<span class="pill ${st}" title="${esc(m.label(lesson))}: ${STATUS_LABEL[st]}">${esc(m.short(lesson))}</span>`;
            }).join('')}</span>
          </li>`).join('')}
      </ul>
      <div class="legend small"><span class="dot sicher"></span>sicher <span class="dot wackelt"></span>wackelt <span class="dot neu"></span>neu</div>
      <p class="muted small">Jede Markierung steht für eine Übungsart: ${modes.map((m) => `${esc(m.short(lesson))} = ${esc(m.label(lesson).replace(/^🔊 /, ''))}`).join(' · ')}${lesson.items.some((it) => it.hard) ? ' · <span class="hard">✗</span> = schwieriges Wort, kommt zuerst dran' : ''}</p>
    </section>`;

  const all = el.querySelector('[data-all]');
  el.querySelectorAll('[data-href]').forEach((a) => {
    a.addEventListener('click', () => { location.hash = a.dataset.href + (all.checked ? '/alle' : ''); });
  });
}

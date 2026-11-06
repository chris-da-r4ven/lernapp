import { getSubject, getLesson } from '../content.js';
import { itemState } from '../store.js';
import { itemKey, status, mastery } from '../srs.js';
import { exercisesFor, modesFor } from '../exercises/registry.js';
import { esc } from '../util.js';

const STATUS_LABEL = { neu: 'neu', wackelt: 'wackelt', sicher: 'sicher' };

export function lessonView(el, sid, lid) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  if (!subject || !lesson) { location.hash = '#/'; return; }

  const base = `#/ueben/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  const exList = exercisesFor(lesson);
  const modes = modesFor(lesson);

  el.innerHTML = `
    <a class="back" href="#/fach/${encodeURIComponent(sid)}">← ${esc(subject.name)}</a>
    <h1>${esc(lesson.title)}</h1>
    <p class="muted">${lesson.items.length} Wörter · ${Math.round(mastery(sid, lesson) * 100)} % sicher</p>

    <section class="card">
      <h2>Üben</h2>
      <label class="check"><input type="checkbox" data-all> Ganze Lektion üben (z. B. vor dem Test)</label>
      ${exList.map((ex) => `
        <div class="actions wrap">
          ${ex.modes(lesson).map((m) => `<button class="btn primary" data-href="${base}/${ex.id}/${m.dir}">${esc(m.label)}</button>`).join('')}
        </div>`).join('')}
    </section>

    <section class="card">
      <h2>Wörter</h2>
      <ul class="word-list">
        ${lesson.items.map((it) => `
          <li>
            <span>${esc(it.a)}</span>
            <strong>${esc(it.b)}${it.hard ? ' <span class="hard" title="schwieriges Wort">✗</span>' : ''}</strong>
            <span class="pills">${modes.map((m) => {
              const st = status(itemState(itemKey(sid, lid, it, m.dir)));
              return `<span class="pill ${st}" title="${esc(m.label)}: ${STATUS_LABEL[st]}">${esc(m.short)}</span>`;
            }).join('')}</span>
          </li>`).join('')}
      </ul>
      <div class="legend small"><span class="dot sicher"></span>sicher <span class="dot wackelt"></span>wackelt <span class="dot neu"></span>neu</div>
      <p class="muted small">Jede Markierung steht für eine Übungsart: ${modes.map((m) => `${esc(m.short)} = ${esc(m.label.replace(/^🔊 /, ''))}`).join(' · ')}${lesson.items.some((it) => it.hard) ? ' · <span class="hard">✗</span> = schwieriges Wort, kommt zuerst dran' : ''}</p>
    </section>`;

  const all = el.querySelector('[data-all]');
  el.querySelectorAll('[data-href]').forEach((a) => {
    a.addEventListener('click', () => { location.hash = a.dataset.href + (all.checked ? '/alle' : ''); });
  });
}

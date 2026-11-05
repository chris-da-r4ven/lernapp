import { getSubject, getLesson } from '../content.js';
import { itemState } from '../store.js';
import { itemKey, status, mastery } from '../srs.js';
import { exercises } from '../exercises/registry.js';
import { esc } from '../util.js';

const STATUS_LABEL = { neu: 'neu', wackelt: 'wackelt', sicher: 'sicher' };

export function lessonView(el, sid, lid) {
  const subject = getSubject(sid);
  const lesson = getLesson(sid, lid);
  if (!subject || !lesson) { location.hash = '#/'; return; }

  const base = `#/ueben/${encodeURIComponent(sid)}/${encodeURIComponent(lid)}`;
  const dirs = [['ab', `${lesson.sides.a} → ${lesson.sides.b}`], ['ba', `${lesson.sides.b} → ${lesson.sides.a}`]];
  const exList = (lesson.exercises ?? []).map((id) => exercises[id]).filter(Boolean);

  el.innerHTML = `
    <a class="back" href="#/fach/${encodeURIComponent(sid)}">← ${esc(subject.name)}</a>
    <h1>${esc(lesson.title)}</h1>
    <p class="muted">${lesson.items.length} Wörter · ${Math.round(mastery(sid, lesson) * 100)} % sicher</p>

    <section class="card">
      <h2>Üben</h2>
      <label class="check"><input type="checkbox" data-all> Ganze Lektion üben (z. B. vor dem Test)</label>
      ${exList.map((ex) => `
        <div class="actions wrap">
          ${dirs.map(([dir, label]) => `<button class="btn primary" data-href="${base}/${ex.id}/${dir}">${esc(ex.label)}: ${esc(label)}</button>`).join('')}
        </div>`).join('')}
    </section>

    <section class="card">
      <h2>Wörter</h2>
      <ul class="word-list">
        ${lesson.items.map((it) => `
          <li>
            <span>${esc(it.a)}</span>
            <strong>${esc(it.b)}${it.hard ? ' <span class="hard" title="schwieriges Wort">✗</span>' : ''}</strong>
            ${dirs.map(([dir]) => {
              const s = status(itemState(itemKey(sid, lid, it, dir)));
              return `<span class="pill ${s}" title="${dir === 'ab' ? lesson.sides.b : lesson.sides.a}">${STATUS_LABEL[s]}</span>`;
            }).join('')}
          </li>`).join('')}
      </ul>
      <p class="muted small">Erste Markierung: ${esc(dirs[0][1])}, zweite: ${esc(dirs[1][1])}${lesson.items.some((it) => it.hard) ? ' · <span class="hard">✗</span> = schwieriges Wort, kommt zuerst dran' : ''}</p>
    </section>`;

  const all = el.querySelector('[data-all]');
  el.querySelectorAll('[data-href]').forEach((a) => {
    a.addEventListener('click', () => { location.hash = a.dataset.href + (all.checked ? '/alle' : ''); });
  });
}

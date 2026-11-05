import { getSubjects, hasContent, contentVersion } from '../content.js';
import { getState, streak } from '../store.js';
import { petStatus } from '../pet.js';
import { esc } from '../util.js';
import { updateContent } from '../app.js';

export function homeView(el) {
  const st = getState();
  const pet = petStatus(st.points);
  const days = streak();

  el.innerHTML = `
    <section class="card pet-card">
      <img class="pet-img" src="${esc(pet.image)}" alt="${esc(pet.alt)}" width="132" height="132">
      <div class="pet-info">
        <h2>${esc(pet.name)}</h2>
        <p class="muted">Stufe ${pet.level} · noch ${pet.toNext} Punkte bis zur nächsten</p>
        <div class="meter"><div style="width:${pet.progress * 100}%"></div></div>
      </div>
      <div class="pet-stats">
        <div><strong>${st.points}</strong><span>Punkte</span></div>
        <div><strong>${days}</strong><span>${days === 1 ? 'Tag' : 'Tage'} am Stück</span></div>
      </div>
    </section>

    <h2 class="section-title">Fächer</h2>
    <section class="tiles">
      ${hasContent() ? getSubjects().map(subjectTile).join('') : `
        <div class="card"><p>Noch keine Lerninhalte da. Verbinde das Tablet mit dem Internet und tippe auf „Neue Inhalte suchen“.</p></div>`}
    </section>

    <div class="footer-actions">
      <button class="btn" data-act="update">Neue Inhalte suchen</button>
      <span class="muted small">${contentVersion() ? 'Inhalte Version ' + esc(contentVersion()) : ''}</span>
    </div>`;

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

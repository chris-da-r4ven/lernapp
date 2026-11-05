import { getSubjects, hasContent, contentVersion } from '../content.js';
import { getState, streak } from '../store.js';
import { mood, DAY_GOAL } from '../streak.js';
import { petStatus, PET } from '../pet.js';
import { esc } from '../util.js';
import { updateContent } from '../app.js';

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
        <p class="muted small">Glitzer-Stufe ${pet.level} · noch ${pet.toNext} Punkte bis zur nächsten</p>
        <div class="meter"><div style="width:${pet.progress * 100}%"></div></div>
      </div>
      <div class="pet-stats">
        <div><strong>${st.points}</strong><span>Punkte</span></div>
        <div><strong>${serie.count}</strong><span>${serie.count === 1 ? 'Tag' : 'Tage'} am Stück</span></div>
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
    </div>

    <dialog class="pet-dialog">
      <img src="${esc(pet.imageFull)}" alt="${esc(pet.alt)}" width="1024" height="1024">
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

// Bild mit Glitzer. Fanny ist freigestellt: unten schneidet der Kreis sie ab,
// oben ragen Ohren und Mähne heraus. Die Sternchen sitzen fest verteilt um das Porträt,
// damit sie nicht bei jedem Öffnen der Seite woanders sind.
function portrait(pet) {
  const g = pet.glitter;
  const sparkles = [];
  for (let i = 0; i < g.sparkles; i++) {
    const angle = i * 137.5 - 60;            // goldener Winkel → gleichmäßig verteilt
    const r = 44 + ((i * 7) % 5) * 2.5;       // Abstand zur Mitte in % der Fläche
    const x = 50 + r * Math.cos((angle * Math.PI) / 180);
    const y = 50 + r * Math.sin((angle * Math.PI) / 180);
    const hue = (i * 47) % 360;
    sparkles.push(`<span class="sparkle" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--d:${((i * 0.37) % 2.4).toFixed(2)}s;--h:${hue}">✦</span>`);
  }
  const cls = ['pet-portrait', `glitter-${g.color}`, g.glow ? 'glow' : '', g.ring ? 'ring' : '']
    .filter(Boolean).join(' ');
  return `
    <span class="${cls}" style="--sparkle-size:${g.size}">
      <span class="pet-disc"></span>
      <span class="pet-pop"><img class="pet-img" src="${esc(pet.image)}" alt="${esc(pet.alt)}" width="132" height="198"></span>
      <span class="sparkles" aria-hidden="true">${sparkles.join('')}</span>
    </span>`;
}

function streakMessage(s) {
  const left = Math.max(0, s.need - s.todayWords);
  const w = (n) => `${n} ${n === 1 ? 'Wort' : 'Wörter'}`;
  switch (s.state) {
    case 'active':
      return s.todayDone ? 'Heute geschafft! 🎉' : `Heute noch ${w(left)} für deine Serie.`;
    case 'danger':
      return `${esc(PET_NAME)} vermisst dich! Noch ${w(left)} heute, dann ist deine Serie von ${s.count} ${s.count === 1 ? 'Tag' : 'Tagen'} gerettet.`;
    case 'broken':
      return `${esc(PET_NAME)} vermisst dich! Mit ${w(DAY_GOAL)} startest du eine neue Serie.`;
    default:
      return `Übe ${w(DAY_GOAL)}, dann startet deine Serie.`;
  }
}

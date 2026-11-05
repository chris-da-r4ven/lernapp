// Bereich „Für Eltern“ auf der Fortschrittsseite: zum Ausklappen,
// mit Statistik zurücksetzen und der Sicherung des Spielstands.

import { resetProgress } from '../store.js';
import { syncStatus, connect, disconnect, syncNow, DEFAULT_REPO } from '../sync.js';
import { esc, toast } from '../util.js';

export function parentsSection(open = false) {
  return `
    <details class="card parents"${open ? ' open' : ''}>
      <summary><h2>Für Eltern</h2></summary>

      <h3>Statistik zurücksetzen</h3>
      <p class="muted small">Setzt Punkte, Serie und den ganzen Lernstand auf null. Die Lektionen bleiben da.</p>
      <button class="btn danger" data-act="reset-start" type="button">Statistik zurücksetzen</button>
      <form class="reset-form" autocomplete="off" hidden>
        <p class="small">Wirklich alles löschen? Zum Bestätigen <strong>LÖSCHEN</strong> eintippen:</p>
        <input class="answer" name="confirm" type="text" autocomplete="off" autocapitalize="characters"
               spellcheck="false" placeholder="LÖSCHEN" aria-label="Zum Bestätigen LÖSCHEN eintippen">
        <div class="actions">
          <button class="btn danger" type="submit">Statistik jetzt zurücksetzen</button>
          <button class="btn ghost" type="button" data-act="reset-cancel">Abbrechen</button>
        </div>
      </form>

      <h3>Sicherung</h3>
      ${syncBlock()}
    </details>`;
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
        <p class="sync-error bad small" hidden></p>
        <button class="btn primary" type="submit">Verbinden</button>
      </form>`;
  }
  const when = s.lastSync ? new Date(s.lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nie';
  return `
    <p class="small">Verbunden mit <strong>${esc(s.repo)}</strong> · zuletzt gesichert: ${esc(when)}${s.dirty ? ' · neue Antworten warten' : ''}</p>
    ${s.error ? `<p class="bad small">${esc(s.error)}</p>` : ''}
    <div class="actions">
      <button class="btn" type="button" data-act="sync-now">Jetzt sichern</button>
      <button class="btn ghost" type="button" data-act="sync-off">Trennen</button>
    </div>`;
}

// rerender(open): Seite neu zeichnen, Bereich dabei offen lassen.
export function bindParents(el, rerender) {
  const box = el.querySelector('.parents');
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
    const res = await connect(syncForm.repo.value, syncForm.token.value);
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
  box.querySelector('[data-act=sync-now]')?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    ev.target.textContent = 'Sichere …';
    await syncNow();
    rerender(true);
  });
  box.querySelector('[data-act=sync-off]')?.addEventListener('click', () => {
    disconnect();
    toast('Sicherung getrennt. Der Spielstand bleibt auf dem Gerät.');
    rerender(true);
  });
}

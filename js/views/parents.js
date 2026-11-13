// Bereich „Für Eltern“ auf der Fortschrittsseite: zum Ausklappen,
// mit Rückmeldungen des Kindes, Statistik zurücksetzen, Sicherung des Spielstands und Geräte-Tests.

import { resetProgress, getState } from '../store.js';
import { modeById } from '../exercises/registry.js';
import { RATINGS } from '../exercises/summary.js';
import { syncStatus, connect, disconnect, syncNow, setTokenUntil, DEFAULT_REPO } from '../sync.js';
import { esc, toast } from '../util.js';

export function parentsSection(open = false) {
  return `
    <details class="card parents"${open ? ' open' : ''}>
      <summary><h2>Für Eltern</h2></summary>

      <h3>Rückmeldungen</h3>
      ${feedbackBlock()}

      <h3>Statistik zurücksetzen</h3>
      <p class="muted small">Setzt Sternchen, Serie und den ganzen Lernstand auf null. Die Lektionen bleiben da.</p>
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

      <h3>Geräte-Tests</h3>
      <div class="actions">
        <a class="btn small" href="#/vorlese-test">🔊 Vorlese-Test</a>
        <a class="btn small" href="#/handschrift-test">✍️ Handschrift-Test</a>
      </div>
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
        <label class="small">Schlüssel gültig bis (steht bei GitHub beim Schlüssel)<input class="answer" name="until" type="date"></label>
        <p class="sync-error bad small" hidden></p>
        <button class="btn primary" type="submit">Verbinden</button>
      </form>`;
  }
  const when = s.lastSync ? new Date(s.lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nie';
  return `
    <p class="small">Verbunden mit <strong>${esc(s.repo)}</strong> · zuletzt gesichert: ${esc(when)}${s.dirty ? ' · neue Antworten warten' : ''}</p>
    ${s.error ? `<p class="bad small">${esc(s.error)}</p>` : ''}
    <form class="until-form actions" autocomplete="off">
      <label class="small">Schlüssel gültig bis <input class="answer" name="until" type="date" value="${esc(s.tokenUntil ?? '')}"></label>
      <button class="btn small" type="submit">Merken</button>
    </form>
    <p class="muted small">„Trennen“ löscht den Schlüssel nur auf diesem Gerät. Bei Verlust des Tablets den Schlüssel bei GitHub löschen.</p>
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
    const res = await connect(syncForm.repo.value, syncForm.token.value, syncForm.until.value);
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
  box.querySelector('.until-form')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    setTokenUntil(ev.target.until.value);
    toast('Ablaufdatum gemerkt.');
    rerender(true);
  });
  box.querySelector('[data-act=sync-now]')?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    ev.target.textContent = 'Sichere …';
    await syncNow();
    rerender(true);
  });
  // Trennen in zwei Schritten: erstes Tippen fragt nach, erst das zweite (innerhalb von 5 s) trennt.
  // Sonst müsste der Schlüssel nach einem versehentlichen Tippen neu eingegeben werden.
  let offArmed = null;
  box.querySelector('[data-act=sync-off]')?.addEventListener('click', (ev) => {
    const btn = ev.currentTarget;
    if (!offArmed) {
      btn.textContent = 'Wirklich trennen? Nochmal tippen';
      btn.classList.add('danger');
      offArmed = setTimeout(() => { offArmed = null; btn.textContent = 'Trennen'; btn.classList.remove('danger'); }, 5000);
      return;
    }
    clearTimeout(offArmed);
    disconnect();
    toast('Sicherung getrennt. Der Spielstand bleibt auf dem Gerät.');
    rerender(true);
  });
}

// Was das Kind nach den Runden angetippt hat: Spaß und „weitergebracht“, je 1–5.
const FEEDBACK_ROWS = 15;
const avg = (list) => (list.length ? (list.reduce((n, x) => n + x, 0) / list.length).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–');
const modeNames = (mode) => [...new Set(String(mode).split(',').map((id) => modeById(id)?.name ?? id))].join(', ');
// Rundenart (ab dem Lernweg): Etappe, Ausritt … – ältere Rückmeldungen nach Übungsart.
const ART_NAMES = { etappe: 'Lernweg-Etappe', koppel: 'Aufwärmen (Koppel)', ausritt: 'Ausritt (Auffrischen)', blitz: 'Blitzrunde', test: 'Test' };
const kindOfRound = (f) => ART_NAMES[f.art] ?? (f.art === 'frei' ? `Frei üben: ${modeNames(f.mode)}` : modeNames(f.mode) + (f.test ? ' (Test)' : ''));

function feedbackBlock() {
  const list = getState().feedback ?? [];
  if (!list.length) return '<p class="muted small">Noch keine Rückmeldungen. Nach jeder Runde kann sie antippen, wie viel Spaß sie hatte und wie viel es ihr gebracht hat.</p>';
  // Durchschnitt pro Übungsart – zeigt, was gut ankommt und was sie als nützlich empfindet.
  const byMode = new Map();
  for (const f of list) {
    const k = kindOfRound(f);
    const m = byMode.get(k) ?? { fun: [], learn: [] };
    if (f.fun) m.fun.push(f.fun);
    if (f.learn) m.learn.push(f.learn);
    byMode.set(k, m);
  }
  const icon = (q, v) => (v ? RATINGS[q].icons[v - 1] : '–');
  const when = (at) => new Date(at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  return `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Übung</th><th>Runden</th><th>${RATINGS.fun.icons[4]} Spaß</th><th>${RATINGS.learn.icons[4]} gebracht</th></tr></thead>
      <tbody>${[...byMode].map(([k, m]) => `
        <tr><td>${esc(k)}</td><td>${Math.max(m.fun.length, m.learn.length)}</td><td>${avg(m.fun)}</td><td>${avg(m.learn)}</td></tr>`).join('')}
      </tbody>
    </table></div>
    <details class="small"><summary>Letzte ${Math.min(FEEDBACK_ROWS, list.length)} Runden</summary>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Wann</th><th>Was</th><th>Spaß</th><th>Gebracht</th></tr></thead>
        <tbody>${list.slice(-FEEDBACK_ROWS).reverse().map((f) => `
          <tr><td class="muted">${esc(when(f.at))}</td><td>${esc(f.what)}<br><span class="muted">${esc(kindOfRound(f))} · ${f.right}/${f.n} sofort richtig</span></td>
            <td>${icon('fun', f.fun)}</td><td>${icon('learn', f.learn)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </details>
    <p class="muted small">Werte 1–5. Spaß: ${RATINGS.fun.icons.join(' ')} · gebracht: ${RATINGS.learn.icons.join(' ')}</p>`;
}

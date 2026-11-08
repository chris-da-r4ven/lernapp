// Sicherung des Spielstands in ein privates GitHub-Repo (optional).
//
// - Der Zugangsschlüssel wird nur auf diesem Gerät gespeichert, nie im Code.
// - Nach 30 Sekunden ohne neue Antwort (und beim Verlassen der App) wird gesichert.
// - Beim Start und beim Zurückkehren in die App wird nachgesehen, ob die Sicherung
//   von außen geändert wurde. Gab es auf dem Gerät keine neuen Antworten, wird sie
//   übernommen. Sonst werden beide Stände zusammengeführt (merge.js) – pro Wort gewinnt
//   der neuere Eintrag, ein bewusstes Zurücksetzen (resetAt) gewinnt gegen Älteres.
// - Zurücksetzen auf eine frühere Uhrzeit (von außen): alten Stand aus der Git-Historie
//   holen, "resetAt" auf jetzt setzen, als neuen Commit schreiben.
// - Jede Sicherung ist ein Commit – so lässt sich später jeder Stand wiederherstellen.

import { getState, replaceState, onSave, revision, wasRecovered } from './store.js';
import { sanitizeState } from './validate.js';
import { mergeStates } from './merge.js';

const CFG_KEY = 'lernapp.sync';
const FILE = 'spielstand.json';
const IDLE_MS = 30 * 1000;
const TIMEOUT_MS = 20 * 1000;   // länger wartet keine Anfrage – sonst hängt die Sicherung bei schlechtem WLAN
export const DEFAULT_REPO = 'chris-da-r4ven/lernapp-daten';

let cfg = loadCfg(); // { repo, token, sha, dirty, lastSync, error }
let timer = null;
let queue = Promise.resolve();
let onRemote = () => {};
const statusListeners = [];

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)); } catch { return null; }
}
function saveCfg() {
  try {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CFG_KEY);
  } catch { /* Speicher gesperrt */ }
  statusListeners.forEach((fn) => fn());
}

export const onSyncStatus = (fn) => statusListeners.push(fn);
export function syncStatus() {
  if (!cfg) return null;
  return { repo: cfg.repo, lastSync: cfg.lastSync ?? null, dirty: !!cfg.dirty, error: cfg.error ?? null };
}

// Alle Netzaktionen nacheinander, nie zwei gleichzeitig.
const serial = (fn) => (queue = queue.then(fn, fn));

// --- GitHub-API -------------------------------------------------------------

// Netzfehler (kein Internet, Zeitüberschreitung) – kein Grund zur Sorge, später nochmal.
class OfflineError extends Error {}

async function api(path, options = {}) {
  const c = cfg;
  if (!c) throw new SyncError('Die Sicherung wurde getrennt.');
  try {
    return await fetch(`https://api.github.com/repos/${c.repo}${path}`, {
      ...options,
      cache: 'no-store',
      signal: AbortSignal.timeout?.(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch (e) {
    throw new OfflineError(e.message);
  }
}

const toB64 = (text) => {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

class SyncError extends Error {}

function errorFor(r) {
  const status = r.status;
  if (status === 429 || (status === 403 && r.headers?.get('x-ratelimit-remaining') === '0')) {
    return 'GitHub hat gerade zu viele Anfragen gezählt – die Sicherung versucht es später wieder.';
  }
  if (status === 401) return 'Schlüssel ungültig oder abgelaufen.';
  if (status === 403) return 'Schlüssel darf dieses Repo nicht beschreiben.';
  if (status === 404) return 'Repo nicht gefunden – Name richtig? Hat der Schlüssel Zugriff?';
  return `GitHub meldet Fehler ${status}.`;
}

async function pull() {
  const r = await api(`/contents/${FILE}`);
  if (r.status === 404) {
    // Datei fehlt – aber gibt es das Repo überhaupt?
    const repo = await api('');
    if (!repo.ok) throw new SyncError(errorFor(repo));
    return { exists: false };
  }
  if (!r.ok) throw new SyncError(errorFor(r));
  const json = await r.json();
  // Dateien über 1 MB liefert dieser Weg ohne Inhalt – dann über die Git-Blob-Schnittstelle.
  let content = json.content;
  if (!content || json.encoding === 'none') {
    const b = await api(`/git/blobs/${json.sha}`);
    if (!b.ok) throw new SyncError(errorFor(b));
    content = (await b.json()).content;
  }
  let data;
  try { data = JSON.parse(fromB64(content)); } catch { data = null; }
  // Nur übernehmen, was als Spielstand taugt (validate.js) – sonst lieber gar nichts.
  if (!data || !sanitizeState(data.state)) {
    throw new SyncError('Die Sicherung ist beschädigt und wird nicht übernommen. Der Stand auf dem Gerät bleibt.');
  }
  return { exists: true, sha: json.sha, data };
}

// Stand-Nummer (store.revision), die zuletzt mit der Sicherung übereinstimmte. Kommt während
// des Hochladens eine Antwort dazu, ist der Stand danach weiter → bleibt „ungesichert“.
let syncedRev = -1;
let recoveryDone = false;

async function push() {
  const rev = revision();
  const stamp = new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const body = {
    message: `Spielstand ${stamp}`,
    content: toB64(JSON.stringify({ savedAt: new Date().toISOString(), state: getState() }, null, 1)),
    ...(cfg.sha ? { sha: cfg.sha } : {}),
  };
  const r = await api(`/contents/${FILE}`, { method: 'PUT', body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return 'conflict';
  if (!r.ok) throw new SyncError(errorFor(r));
  const json = await r.json();
  if (cfg) cfg.sha = json.content.sha;
  syncedRev = rev;
  return 'ok';
}

function adopt(remote) {
  if (!replaceState(remote.data.state)) throw new SyncError('Die Sicherung ist beschädigt und wird nicht übernommen.');
  cfg.sha = remote.sha;
  syncedRev = revision();
  onRemote();
}

// Gerätestand und Sicherung zusammenführen und das Ergebnis hochladen.
async function combineAndPush(remote) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!remote.exists) {
      // Sicherung wurde gelöscht: einfach den Gerätestand neu hochladen.
      cfg.sha = null;
      if ((await push()) === 'ok') return;
      remote = await pull();
      continue;
    }
    replaceState(mergeStates(getState(), remote.data.state));
    cfg.sha = remote.sha;
    onRemote();
    if ((await push()) === 'ok') return;
    remote = await pull();   // in der Zwischenzeit wieder geändert – nochmal
  }
  throw new SyncError('Die Sicherung ändert sich gerade ständig – später nochmal.');
}

// Abgleich mit der Sicherung:
// - von außen geändert, auf dem Gerät nichts Neues → übernehmen
// - sonst immer zusammenführen und hochladen (nie blind überschreiben – so kann auch ein
//   beschädigter oder leerer Gerätestand die Sicherung nicht kaputtmachen)
async function reconcile() {
  const c = cfg;
  if (!c) return;
  try {
    const remote = await pull();
    const needsMerge = c.dirty || (wasRecovered() && !recoveryDone);
    if (!remote.exists) {
      await push();
    } else if (remote.sha !== c.sha && !needsMerge) {
      adopt(remote);
    } else if (needsMerge) {
      await combineAndPush(remote);
      recoveryDone = true;
    } else {
      syncedRev = revision();   // nichts zu tun: Gerät und Sicherung stimmen überein
    }
    if (cfg !== c) return;      // während des Abgleichs getrennt
    c.dirty = revision() !== syncedRev;
    c.lastSync = Date.now();
    c.error = null;
  } catch (e) {
    if (cfg !== c) return;
    if (e instanceof OfflineError) c.error = null;           // kein Netz: später nochmal
    else if (e instanceof SyncError) c.error = e.message;
    else { console.error('Sicherung:', e); c.error = `Sicherung fehlgeschlagen: ${e.message}`; }
  }
  saveCfg();
  if (c.dirty) { clearTimeout(timer); timer = setTimeout(syncNow, IDLE_MS); }
}

export const syncNow = () => serial(reconcile);

// --- Einrichten / Trennen ---------------------------------------------------

export async function connect(repo, token) {
  cfg = { repo: repo.trim(), token: token.trim(), sha: null, dirty: false, lastSync: null, error: null };
  try {
    await serial(async () => {
      const remote = await pull();
      // Gibt es schon eine Sicherung (neues Gerät oder neu verbunden), wird sie mit dem
      // Stand auf dem Gerät zusammengeführt – es geht nichts verloren.
      if (remote.exists) await combineAndPush(remote);
      else await push();
      cfg.lastSync = Date.now();
    });
    saveCfg();
    return { ok: true };
  } catch (e) {
    cfg = null;
    saveCfg();
    return { ok: false, error: e instanceof SyncError ? e.message : e instanceof OfflineError ? 'Keine Verbindung zu GitHub – Internet an?' : `Fehler: ${e.message}` };
  }
}

export function disconnect() {
  clearTimeout(timer);
  cfg = null;
  saveCfg();
}

// --- Start ------------------------------------------------------------------

export function startSync({ onRemoteChange } = {}) {
  onRemote = onRemoteChange ?? (() => {});
  onSave(() => {
    if (!cfg) return;
    cfg.dirty = true;
    saveCfg();
    clearTimeout(timer);
    timer = setTimeout(syncNow, IDLE_MS);
  });
  document.addEventListener('visibilitychange', () => {
    if (!cfg) return;
    clearTimeout(timer);
    syncNow(); // beim Verlassen: sichern; beim Zurückkommen: nachsehen, ob sich etwas geändert hat
  });
  window.addEventListener('online', () => cfg && syncNow());
  if (cfg) syncNow();
}

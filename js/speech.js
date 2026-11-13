// Vorlesen mit der eingebauten Sprachausgabe des Geräts.
// Sprache: kommt aus der Lektion (lessons.langOf), z. B. en-GB.
// Stimme: die im Vorlese-Test gewählte (wenn sie zur Sprache passt), sonst die erste
// passende – bei mehreren bevorzugt genau die Region (en-GB) und offline verfügbar.
// Tempo: wählt das Kind in der Übung, wird gemerkt.

import { esc } from './util.js';

const VOICE_KEY = 'lernapp.voice';
const RATE_KEY = 'lernapp.rate';
export const RATES = [['langsam', 0.7], ['normal', 0.9], ['flott', 1.05]];

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* egal */ } };

export const canSpeak = () => 'speechSynthesis' in window;

let voices = [];
function refreshVoices() {
  voices = canSpeak() ? speechSynthesis.getVoices() : [];
}
if (canSpeak()) {
  refreshVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

const norm = (lang) => String(lang ?? '').replace('_', '-').toLowerCase();
const isEn = (v) => norm(v.lang).startsWith('en');

export function englishVoices() {
  if (!voices.length) refreshVoices();
  return voices.filter(isEn);
}

function pickVoice(lang = 'en-GB') {
  if (!voices.length) refreshVoices();
  const want = norm(lang);
  const base = want.split('-')[0];
  const fitting = voices.filter((v) => norm(v.lang).split('-')[0] === base);
  const saved = read(VOICE_KEY);
  return fitting.find((v) => v.voiceURI === saved)
    ?? fitting.find((v) => norm(v.lang) === want && v.localService)
    ?? fitting.find((v) => norm(v.lang) === want)
    ?? fitting.find((v) => v.localService)
    ?? fitting[0]
    ?? null;
}

export function getRate() {
  const r = Number(read(RATE_KEY));
  return RATES.some(([, x]) => x === r) ? r : 0.9;
}
export const setRate = (r) => write(RATE_KEY, String(r));

// Klammern wie in "(to) listen" nicht mitsprechen lassen, Schrägstriche als Pause.
const spoken = (text) => String(text).replace(/[()]/g, '').replace(/\s*\/\s*/g, ', ');

// Robust gegen Eigenheiten der Sprachausgabe (v. a. Chrome auf Android):
// - direkt nach cancel() verschluckt die Ausgabe manchmal das nächste speak() → kurz warten
// - Stimmen kommen nach dem Start der App erst verzögert → bis 1 s auf „voiceschanged“ warten
// - eine angehaltene Ausgabe (App war im Hintergrund) bleibt stumm → resume()
// - Fehler (außer durch eigenes Abbrechen) → einmal neu versuchen
let lastRequest = 0;
const voicesReady = () => (voices.length || !canSpeak() ? Promise.resolve() : new Promise((done) => {
  const t = setTimeout(done, 1000);
  speechSynthesis.addEventListener?.('voiceschanged', () => { clearTimeout(t); refreshVoices(); done(); }, { once: true });
  refreshVoices();
  if (voices.length) { clearTimeout(t); done(); }
}));

export function speak(text, lang = 'en-GB', rate = getRate()) {
  if (!canSpeak()) return;
  const id = ++lastRequest;
  const busy = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  const say = (retry) => {
    if (id !== lastRequest) return;   // inzwischen wurde etwas Neueres angefordert
    const u = new SpeechSynthesisUtterance(spoken(text));
    const voice = pickVoice(lang);
    try { u.voice = voice; } catch { /* Sprache reicht */ }
    u.lang = voice?.lang ?? lang;
    u.rate = rate;
    u.onerror = (e) => {
      if (retry && e.error !== 'interrupted' && e.error !== 'canceled') setTimeout(() => say(false), 250);
    };
    if (speechSynthesis.paused) speechSynthesis.resume();
    speechSynthesis.speak(u);
  };
  voicesReady().then(() => setTimeout(() => say(true), busy ? 150 : 30));
}

// Großer Abspielknopf plus Tempo-Knöpfe.
export function speechControls() {
  const rate = getRate();
  return `
    <div class="listen">
      <button class="btn primary listen-play" type="button" data-act="play" aria-label="Nochmal anhören">🔊</button>
      <div class="listen-rate" role="group" aria-label="Tempo">
        ${RATES.map(([label, r]) => `<button class="btn small${r === rate ? ' on' : ''}" type="button" data-rate="${r}">${esc(label)}</button>`).join('')}
      </div>
    </div>`;
}

// text: was vorgelesen wird, lang: in welcher Sprache. Spielt sofort einmal ab.
export function bindSpeechControls(root, text, lang) {
  root.querySelector('[data-act=play]').addEventListener('click', () => speak(text, lang));
  root.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => {
    const r = Number(b.dataset.rate);
    setRate(r);
    root.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b));
    speak(text, lang, r);
  }));
  speak(text, lang);
}

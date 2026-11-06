// Vorlesen mit der eingebauten Sprachausgabe des Geräts.
// Stimme: die im Vorlese-Test gewählte, sonst die erste britische (bevorzugt offline).
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

const isEn = (v) => v.lang.toLowerCase().replace('_', '-').startsWith('en');
const isGb = (v) => v.lang.replace('_', '-').startsWith('en-GB');

export function englishVoices() {
  if (!voices.length) refreshVoices();
  return voices.filter(isEn);
}

function pickVoice() {
  const en = englishVoices();
  const saved = read(VOICE_KEY);
  return en.find((v) => v.voiceURI === saved)
    ?? en.find((v) => isGb(v) && v.localService)
    ?? en.find(isGb)
    ?? en[0]
    ?? null;
}

export function getRate() {
  const r = Number(read(RATE_KEY));
  return RATES.some(([, x]) => x === r) ? r : 0.9;
}
export const setRate = (r) => write(RATE_KEY, String(r));

// Klammern wie in "(to) listen" nicht mitsprechen lassen, Schrägstriche als Pause.
const spoken = (text) => String(text).replace(/[()]/g, '').replace(/\s*\/\s*/g, ', ');

export function speak(text, rate = getRate()) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(spoken(text));
  const voice = pickVoice();
  try { u.voice = voice; } catch { /* Sprache reicht */ }
  u.lang = voice?.lang ?? 'en-GB';
  u.rate = rate;
  speechSynthesis.speak(u);
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

// text: was vorgelesen wird. Spielt sofort einmal ab.
export function bindSpeechControls(root, text) {
  root.querySelector('[data-act=play]').addEventListener('click', () => speak(text));
  root.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => {
    const r = Number(b.dataset.rate);
    setRate(r);
    root.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b));
    speak(text, r);
  }));
  speak(text);
}

// Welche Seite einer Lektion ist Englisch? ('a', 'b' oder null)
export function englishSide(lesson) {
  if (lesson.sides?.b === 'Englisch') return 'b';
  if (lesson.sides?.a === 'Englisch') return 'a';
  return null;
}

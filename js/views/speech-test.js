// Prüfseite: Wie gut liest dieses Gerät Englisch vor (eingebaute Sprachausgabe)?
// Zeigt die vorhandenen englischen Stimmen, ob eine britische dabei ist und
// ob sie ohne Internet geht. Wörter und Sätze lassen sich probehören.
// Die gewählte Stimme wird gemerkt – später nutzt die Hör-Übung sie.

import { esc } from '../util.js';
import { getLesson, getSubjects } from '../content.js';
import { targetSide } from '../lessons.js';

const VOICE_KEY = 'lernapp.voice';

const SAMPLES = [
  'caretaker', 'science', 'always', 'coloured pencils', 'whiteboard', 'to listen',
  'I am ten years old.', 'Can you help me, please?', 'Where is the canteen?',
  'I read a book every day.', "She's my best friend.",
];

function lessonWords() {
  const words = [];
  for (const s of getSubjects()) {
    for (const l of s.lessons) {
      const lesson = getLesson(s.id, l.id);
      lesson?.items?.slice(0, 4).forEach((it) => words.push(it[targetSide(lesson)]));
    }
  }
  return words;
}

// Stimmen kommen auf manchen Geräten erst etwas später.
function loadVoices() {
  return new Promise((resolve) => {
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 2000);
  });
}

const rank = (v) => (v.lang.replace('_', '-').startsWith('en-GB') ? 0 : 1) + (v.localService ? 0 : 0.5);

export async function speechTestView(el) {
  el.innerHTML = `
    <a class="back" href="#/statistik">← Fortschritt</a>
    <h1>Vorlese-Test</h1>
    <section class="card"><h2>Kann dieses Gerät Englisch vorlesen?</h2><div class="sp-result muted">Prüfe …</div></section>
    <section class="card sp-try" hidden>
      <h2>Probehören</h2>
      <p class="muted small">Lautstärke an! Stimme und Tempo wählen, dann ein Wort antippen.</p>
      <label class="small">Stimme <select class="sp-voice"></select></label>
      <div class="actions sp-rate" role="group" aria-label="Tempo">
        <button class="btn small" data-rate="0.7">langsam</button>
        <button class="btn small primary" data-rate="0.9">normal</button>
        <button class="btn small" data-rate="1.05">flott</button>
      </div>
      <h3>Beispiele</h3>
      <div class="sp-samples"></div>
      <h3>Eigener Text</h3>
      <form class="answer-form sp-own" autocomplete="off">
        <input class="answer" name="text" type="text" lang="en" autocomplete="off" spellcheck="false" placeholder="English text …">
        <button class="btn primary" type="submit">▶</button>
      </form>
    </section>
    <p class="muted small">${esc(navigator.userAgent)}</p>`;

  const result = el.querySelector('.sp-result');
  if (!('speechSynthesis' in window)) {
    result.innerHTML = '<strong>Ergebnis: Dieser Browser hat keine Sprachausgabe ❌</strong> – dann bräuchten wir fertige Audiodateien.';
    return;
  }

  const all = await loadVoices();
  const en = all.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en')).sort((a, b) => rank(a) - rank(b));
  const gb = en.filter((v) => v.lang.replace('_', '-').startsWith('en-GB'));
  const offline = en.filter((v) => v.localService);
  result.innerHTML = `
    <p>Stimmen insgesamt: <strong>${all.length}</strong>, davon englisch: <strong>${en.length}</strong></p>
    <p>Britische Stimme (en-GB): <strong>${gb.length ? 'ja ✅' : 'nein ❌'}</strong></p>
    <p>Englisch ohne Internet: <strong>${offline.length ? 'ja ✅' : 'nein ❌ (nur mit Internet)'}</strong></p>
    ${en.length ? `<table class="table small">
      <thead><tr><th>Stimme</th><th>Sprache</th><th>offline</th></tr></thead>
      <tbody>${en.map((v) => `<tr><td>${esc(v.name)}</td><td>${esc(v.lang)}</td><td>${v.localService ? 'ja' : 'nein'}</td></tr>`).join('')}</tbody>
    </table>` : '<p><strong>Keine englische Stimme gefunden.</strong> In den Android-Einstellungen unter „Sprachausgabe“ lässt sich Englisch meist nachinstallieren.</p>'}`;
  if (!en.length) return;

  const tryCard = el.querySelector('.sp-try');
  tryCard.hidden = false;
  const select = el.querySelector('.sp-voice');
  let saved = null;
  try { saved = localStorage.getItem(VOICE_KEY); } catch { /* egal */ }
  select.innerHTML = en.map((v) => `<option value="${esc(v.voiceURI)}"${v.voiceURI === saved ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  select.addEventListener('change', () => {
    try { localStorage.setItem(VOICE_KEY, select.value); } catch { /* egal */ }
  });

  let rate = 0.9;
  el.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => {
    rate = Number(b.dataset.rate);
    el.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('primary', x === b));
  }));

  const speak = (text) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = en.find((v) => v.voiceURI === select.value);
    try { u.voice = voice ?? null; } catch { /* Stimme nicht setzbar – Sprache reicht */ }
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = rate;
    speechSynthesis.speak(u);
  };

  const samples = [...new Set([...lessonWords(), ...SAMPLES])];
  const box = el.querySelector('.sp-samples');
  box.innerHTML = samples.map((t, i) => `<button class="btn small" data-i="${i}">🔊 ${esc(t)}</button>`).join(' ');
  box.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]');
    if (b) speak(samples[Number(b.dataset.i)]);
  });

  const own = el.querySelector('.sp-own');
  own.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (own.text.value.trim()) speak(own.text.value.trim());
  });
}

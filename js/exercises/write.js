// Übung "Schreiben": Wort wird angezeigt, die Übersetzung selbst geschrieben.
// Übung "Hören → Englisch schreiben" (Diktat): Wort wird vorgelesen und auf Englisch geschrieben.
// Bei Fehlern: Vergleich Buchstabe für Buchstabe, dann einmal richtig abschreiben,
// das Wort kommt in derselben Runde wieder dran.

import { esc } from '../util.js';
import { renderDiff, distance } from '../diff.js';
import { itemKey, buildRound, record } from '../srs.js';
import { getState } from '../store.js';
import { levelFor } from '../pet.js';
import { roundSummary } from './summary.js';
import { canSpeak, englishSide, speechControls, bindSpeechControls } from '../speech.js';

const RETRY_GAP = 3;

// Satzzeichen am Ende ("Can you help me?" / "…me") zählen nicht als Fehler.
const normalize = (s) => String(s).normalize('NFC').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().replace(/\s*[.!?]+$/, '');

// Alle Schreibweisen, die als richtig gelten.
// "Freund / Freundin" → auch "Freund" und "Freundin" einzeln.
function acceptedAnswers(answer, alts = []) {
  const parts = answer.includes('/') ? answer.split('/').map(normalize) : [];
  return [...new Set([answer, ...parts, ...alts].map(normalize).filter(Boolean))];
}

export function check(typed, answer, alts) {
  const t = normalize(typed);
  const accepted = acceptedAnswers(answer, alts);
  if (accepted.includes(t)) return { ok: true };
  const caseOnly = accepted.some((a) => a.toLowerCase() === t.toLowerCase());
  const closest = accepted.reduce((best, a) => (distance(t, a) < distance(t, best) ? a : best), accepted[0]);
  return { ok: false, caseOnly, closest };
}

// Kurzform für Markierungen: Deutsch → DE, Englisch → EN.
const CODES = { Deutsch: 'DE', Englisch: 'EN' };
const code = (side) => CODES[side] ?? String(side).slice(0, 2).toUpperCase();

export const write = {
  id: 'write',
  label: 'Schreiben',
  forTypes: ['pairs'],
  modes: (lesson) => [
    { dir: 'ab', label: `Schreiben: ${lesson.sides.a} → ${lesson.sides.b}`, short: `✍️ ${code(lesson.sides.a)}→${code(lesson.sides.b)}` },
    { dir: 'ba', label: `Schreiben: ${lesson.sides.b} → ${lesson.sides.a}`, short: `✍️ ${code(lesson.sides.b)}→${code(lesson.sides.a)}` },
  ],
  run: (el, opts) => runWrite(el, opts, write),
};

// Diktat: wird automatisch angeboten, wenn eine Seite der Lektion Englisch ist.
export const dictation = {
  id: 'hoeren',
  label: 'Hören → Englisch schreiben',
  group: 'hoeren',
  forTypes: ['pairs'],
  auto: (lesson) => canSpeak() && Boolean(englishSide(lesson)),
  modes: () => [{ dir: 'hoeren', label: '🔊 Hören → Englisch schreiben', short: '🔊 Diktat' }],
  run: (el, opts) => runWrite(el, { ...opts, listen: true }, dictation),
};

function runWrite(el, { sid, lesson, dir, all, onFinish, listen = false }, self) {
  const to = listen ? englishSide(lesson) : (dir === 'ab' ? 'b' : 'a');
  const from = to === 'b' ? 'a' : 'b';
  const entries = lesson.items.map((item) => ({ item, key: itemKey(sid, lesson.id, item, dir) }));
  const queue = buildRound(entries, all).map((e) => ({ ...e, attempts: 0 }));
  const total = queue.length;
  let done = 0;
  let firstTry = 0;
  let points = 0;
  const startLevel = levelFor(getState().points);
  const mistakes = new Map();

  const progressBar = () =>
    `<div class="round-progress"><div style="width:${(done / total) * 100}%"></div></div>
     <p class="muted small">${done} von ${total} · ${listen ? '🔊 Hören → Englisch' : `${esc(lesson.sides[from])} → ${esc(lesson.sides[to])}`}</p>`;

  function requeue(cur) {
    queue.shift();
    queue.splice(Math.min(RETRY_GAP, queue.length), 0, cur);
  }

  function next() {
    if (!queue.length) return summary();
    const cur = queue[0];
    el.innerHTML = `
      ${progressBar()}
      <div class="card prompt-card">
        ${listen ? speechControls() : `<div class="prompt">${esc(cur.item[from])}</div>`}
        <form class="answer-form" autocomplete="off">
          <input class="answer" name="answer" type="text" autocomplete="off" autocorrect="off"
                 autocapitalize="off" spellcheck="false" placeholder="${listen ? 'Was hörst du? Auf Englisch …' : `${esc(lesson.sides[to])} schreiben …`}" aria-label="Antwort">
          <button class="btn primary" type="submit">Prüfen</button>
        </form>
        <div class="feedback"></div>
      </div>`;
    if (listen) bindSpeechControls(el.querySelector('.prompt-card'), cur.item[to]);
    const form = el.querySelector('form');
    const input = form.answer;
    input.focus();
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      const res = check(input.value, cur.item[to], cur.item[to + 'Alt']);
      input.readOnly = true;
      form.querySelector('button').remove();
      if (res.ok) showRight(cur); else showWrong(cur, input.value, res);
    });
  }

  function showRight(cur) {
    const fb = el.querySelector('.feedback');
    fb.innerHTML = `
      <p class="result good">${cur.attempts ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉'}</p>
      ${listen ? meaning(cur.item) : ''}
      <div class="actions">
        <button class="btn primary" data-act="next">Weiter</button>
        <button class="btn ghost small" data-act="peek">Hab gespickt / war unsicher</button>
      </div>`;
    const nextBtn = fb.querySelector('[data-act=next]');
    nextBtn.focus();
    nextBtn.addEventListener('click', () => {
      const isFirst = cur.attempts === 0;
      points += record(cur.key, { correct: true, firstTry: isFirst });
      if (isFirst) firstTry++;
      queue.shift();
      done++;
      next();
    });
    fb.querySelector('[data-act=peek]').addEventListener('click', () => {
      record(cur.key, { correct: false });
      cur.attempts++;
      mistakes.set(cur.key, cur.item);
      requeue(cur);
      next();
    });
  }

  function showWrong(cur, typed, res) {
    record(cur.key, { correct: false, typed: typed.trim() });
    cur.attempts++;
    mistakes.set(cur.key, cur.item);
    const fb = el.querySelector('.feedback');
    fb.innerHTML = `
      <p class="result bad"></p>
      <div class="diff"></div>
      <form class="answer-form copy-form" autocomplete="off">
        <input class="answer" name="copy" type="text" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false" placeholder="Schreib es richtig ab …" aria-label="Richtig abschreiben">
        <button class="btn primary" type="submit">OK</button>
      </form>`;
    // Vergleich anzeigen – erst für die Antwort, nach falschem Abschreiben für die Abschrift.
    const showDiff = (text, r, message) => {
      const d = renderDiff(normalize(text), r.closest);
      fb.querySelector('.result').textContent = r.caseOnly ? 'Fast! Achte auf Groß- und Kleinschreibung.' : message;
      fb.querySelector('.diff').innerHTML = `
        <div><span class="muted small">Du:</span> <span class="word">${d.yours}</span></div>
        <div><span class="muted small">Richtig:</span> <span class="word">${d.right}</span></div>
        ${listen ? meaning(cur.item) : ''}`;
    };
    showDiff(typed, res, 'Noch nicht ganz.');
    const form = fb.querySelector('form');
    form.copy.focus();
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!form.copy.value.trim()) { form.copy.focus(); return; }
      const copyRes = check(form.copy.value, cur.item[to], cur.item[to + 'Alt']);
      if (copyRes.ok) {
        requeue(cur);
        next();
      } else {
        // Abschreiben zählt nicht als neuer Fehler – nur zeigen, wo es noch hakt.
        showDiff(form.copy.value, copyRes, 'Beim Abschreiben hat sich noch ein Fehler eingeschlichen. Schau genau hin:');
        form.copy.focus();
        form.copy.classList.remove('shake');
        void form.copy.offsetWidth;
        form.copy.classList.add('shake');
      }
    });
  }

  const meaning = (item) => `<p class="meaning muted">${esc(item[to])} = ${esc(item[from])}</p>`;

  function summary() {
    roundSummary(el, {
      total, firstTry, points, startLevel,
      mistakes: [...mistakes.values()].map((it) => [listen ? '🔊' : it[from], listen ? `${it[to]} (${it[from]})` : it[to]]),
      onAgain: () => self.run(el, { sid, lesson, dir, all, onFinish }),
      onBack: () => onFinish?.(),
    });
  }

  if (!total) {
    el.innerHTML = '<div class="card"><p>Diese Lektion hat noch keine Wörter.</p></div>';
    return;
  }
  next();
}

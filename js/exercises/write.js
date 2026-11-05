// Übung "Schreiben": Wort wird angezeigt, die Übersetzung selbst geschrieben.
// Bei Fehlern: Vergleich Buchstabe für Buchstabe, dann einmal richtig abschreiben,
// das Wort kommt in derselben Runde wieder dran.

import { esc } from '../util.js';
import { renderDiff, distance } from '../diff.js';
import { itemKey, buildRound, record } from '../srs.js';

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

export const write = {
  id: 'write',
  label: 'Schreiben',
  forTypes: ['pairs'],

  run(el, { sid, lesson, dir, all, onFinish }) {
    const from = dir === 'ab' ? 'a' : 'b';
    const to = dir === 'ab' ? 'b' : 'a';
    const entries = lesson.items.map((item) => ({ item, key: itemKey(sid, lesson.id, item, dir) }));
    const queue = buildRound(entries, all).map((e) => ({ ...e, attempts: 0 }));
    const total = queue.length;
    let done = 0;
    let firstTry = 0;
    let points = 0;
    const mistakes = new Map();

    const progressBar = () =>
      `<div class="round-progress"><div style="width:${(done / total) * 100}%"></div></div>
       <p class="muted small">${done} von ${total} · ${esc(lesson.sides[from])} → ${esc(lesson.sides[to])}</p>`;

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
          <div class="prompt">${esc(cur.item[from])}</div>
          <form class="answer-form" autocomplete="off">
            <input class="answer" name="answer" type="text" autocomplete="off" autocorrect="off"
                   autocapitalize="off" spellcheck="false" placeholder="${esc(lesson.sides[to])} schreiben …" aria-label="Antwort">
            <button class="btn primary" type="submit">Prüfen</button>
          </form>
          <div class="feedback"></div>
        </div>`;
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
      const d = renderDiff(normalize(typed), res.closest);
      const fb = el.querySelector('.feedback');
      fb.innerHTML = `
        <p class="result bad">${res.caseOnly ? 'Fast! Achte auf Groß- und Kleinschreibung.' : 'Noch nicht ganz.'}</p>
        <div class="diff">
          <div><span class="muted small">Du:</span> <span class="word">${d.yours}</span></div>
          <div><span class="muted small">Richtig:</span> <span class="word">${d.right}</span></div>
        </div>
        <form class="answer-form copy-form" autocomplete="off">
          <input class="answer" name="copy" type="text" autocomplete="off" autocorrect="off"
                 autocapitalize="off" spellcheck="false" placeholder="Schreib es richtig ab …" aria-label="Richtig abschreiben">
          <button class="btn primary" type="submit">OK</button>
        </form>`;
      const form = fb.querySelector('form');
      form.copy.focus();
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        if (check(form.copy.value, cur.item[to], cur.item[to + 'Alt']).ok) {
          requeue(cur);
          next();
        } else {
          form.copy.classList.remove('shake');
          void form.copy.offsetWidth;
          form.copy.classList.add('shake');
        }
      });
    }

    function summary() {
      const list = [...mistakes.values()];
      el.innerHTML = `
        <div class="card summary">
          <h2>Geschafft! 🏁</h2>
          <p class="big">${firstTry} von ${total} beim ersten Versuch richtig</p>
          <p>+${points} Punkte</p>
          ${list.length ? `<h3>Diese Wörter üben wir weiter:</h3>
            <ul class="word-list">${list.map((it) => `<li><span>${esc(it[from])}</span><strong>${esc(it[to])}</strong></li>`).join('')}</ul>` : '<p>Keine Fehler – super!</p>'}
          <div class="actions">
            <button class="btn primary" data-act="again">Noch eine Runde</button>
            <button class="btn" data-act="back">Zur Lektion</button>
          </div>
        </div>`;
      el.querySelector('[data-act=again]').addEventListener('click', () => write.run(el, { sid, lesson, dir, all, onFinish }));
      el.querySelector('[data-act=back]').addEventListener('click', () => onFinish?.());
    }

    if (!total) {
      el.innerHTML = '<div class="card"><p>Diese Lektion hat noch keine Wörter.</p></div>';
      return;
    }
    next();
  },
};

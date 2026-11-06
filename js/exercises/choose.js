// Übung "Hören → Bedeutung antippen": Das englische Wort wird vorgelesen,
// aus vier deutschen Bedeutungen wird die richtige angetippt.
// Falsch → richtige Antwort wird gezeigt, das Wort kommt in der Runde wieder dran.

import { esc, shuffle } from '../util.js';
import { itemKey, buildRound, record } from '../srs.js';
import { getState } from '../store.js';
import { levelFor } from '../pet.js';
import { roundSummary } from './summary.js';
import { canSpeak, englishSide, speechControls, bindSpeechControls } from '../speech.js';

const RETRY_GAP = 3;
const OPTIONS = 4;

export const listenChoose = {
  id: 'hoeren-wahl',
  label: 'Hören → Bedeutung antippen',
  forTypes: ['pairs'],
  // Braucht mindestens 4 Wörter für die Auswahl.
  auto: (lesson) => canSpeak() && Boolean(englishSide(lesson)) && lesson.items.length >= OPTIONS,
  modes: () => [{ dir: 'hoeren-wahl', label: '🔊 Hören → Bedeutung antippen' }],

  run(el, { sid, lesson, dir, all, onFinish }) {
    const en = englishSide(lesson);
    const de = en === 'b' ? 'a' : 'b';
    const entries = lesson.items.map((item) => ({ item, key: itemKey(sid, lesson.id, item, dir) }));
    const queue = buildRound(entries, all).map((e) => ({ ...e, attempts: 0 }));
    const total = queue.length;
    let done = 0;
    let firstTry = 0;
    let points = 0;
    const startLevel = levelFor(getState().points);
    const mistakes = new Map();

    // Drei falsche Bedeutungen aus derselben Lektion, keine doppelten.
    function optionsFor(item) {
      const others = shuffle([...new Set(lesson.items.map((it) => it[de]).filter((m) => m !== item[de]))]);
      return shuffle([item[de], ...others.slice(0, OPTIONS - 1)]);
    }

    function requeue(cur) {
      queue.shift();
      queue.splice(Math.min(RETRY_GAP, queue.length), 0, cur);
    }

    function next() {
      if (!queue.length) return summary();
      const cur = queue[0];
      const opts = optionsFor(cur.item);
      el.innerHTML = `
        <div class="round-progress"><div style="width:${(done / total) * 100}%"></div></div>
        <p class="muted small">${done} von ${total} · 🔊 Hören → Bedeutung</p>
        <div class="card prompt-card">
          ${speechControls()}
          <p class="muted small">Was bedeutet das Wort?</p>
          <div class="choices">
            ${opts.map((o, i) => `<button class="btn choice" type="button" data-i="${i}">${esc(o)}</button>`).join('')}
          </div>
          <div class="feedback"></div>
        </div>`;
      const card = el.querySelector('.prompt-card');
      bindSpeechControls(card, cur.item[en]);

      card.querySelector('.choices').addEventListener('click', (ev) => {
        const b = ev.target.closest('.choice');
        if (!b || card.dataset.answered) return;
        card.dataset.answered = '1';
        const picked = opts[Number(b.dataset.i)];
        const right = picked === cur.item[de];
        card.querySelectorAll('.choice').forEach((x) => {
          x.disabled = true;
          if (opts[Number(x.dataset.i)] === cur.item[de]) x.classList.add('right');
        });
        if (!right) b.classList.add('wrong');

        const fb = card.querySelector('.feedback');
        fb.innerHTML = `
          <p class="result ${right ? 'good' : 'bad'}">${right ? (cur.attempts ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉') : 'Noch nicht ganz.'}</p>
          <p class="meaning muted">${esc(cur.item[en])} = ${esc(cur.item[de])}</p>
          <div class="actions"><button class="btn primary" data-act="next">Weiter</button></div>`;
        const nextBtn = fb.querySelector('[data-act=next]');
        nextBtn.focus();
        nextBtn.addEventListener('click', () => {
          if (right) {
            const isFirst = cur.attempts === 0;
            points += record(cur.key, { correct: true, firstTry: isFirst });
            if (isFirst) firstTry++;
            queue.shift();
            done++;
          } else {
            record(cur.key, { correct: false, typed: picked });
            cur.attempts++;
            mistakes.set(cur.key, cur.item);
            requeue(cur);
          }
          next();
        });
      });
    }

    function summary() {
      roundSummary(el, {
        total, firstTry, points, startLevel,
        mistakes: [...mistakes.values()].map((it) => ['🔊', `${it[en]} (${it[de]})`]),
        onAgain: () => listenChoose.run(el, { sid, lesson, dir, all, onFinish }),
        onBack: () => onFinish?.(),
      });
    }

    if (!total) {
      el.innerHTML = '<div class="card"><p>Diese Lektion hat noch keine Wörter.</p></div>';
      return;
    }
    next();
  },
};

// Ablauf einer Übungsrunde – für alle Fragetypen gleich.
// Eine Runde besteht aus Aufgaben (task): ein Wort einer Lektion in einer Übungsart (dir).
// Normale Runde: Falsche Wörter kommen später in derselben Runde wieder dran.
// Test-Runde: Jedes Wort nur einmal, keine Hilfe, am Ende das Ergebnis in Prozent.

import { esc } from '../util.js';
import { record, weightFor, roundBonus } from '../srs.js';
import { getState, addTestResult, medalStatus, save } from '../store.js';
import { levelFor } from '../pet.js';
import { roundSummary } from './summary.js';
import { questionFor } from './questions.js';

const RETRY_GAP = 3;

// tasks: [{ sid, lesson, item, dir, key }]
export function runRound(el, { tasks, test = false, onAgain, onBack, backLabel }) {
  const queue = tasks.map((t) => ({ ...t, attempts: 0 }));
  const total = queue.length;
  let done = 0;
  let firstTry = 0;
  let points = 0;
  const startLevel = levelFor(getState().points);
  const mistakes = new Map(); // key → { task, typed }

  if (!total) {
    el.innerHTML = '<div class="card"><p>Hier gibt es gerade keine Wörter zu üben.</p></div>';
    return;
  }

  function requeue(task) {
    queue.shift();
    queue.splice(Math.min(RETRY_GAP, queue.length), 0, task);
  }

  const api = {
    right() {
      const task = queue[0];
      const isFirst = task.attempts === 0;
      points += record(task.key, { correct: true, firstTry: isFirst, weight: weightFor(task.dir) });
      if (isFirst) firstTry++;
      queue.shift();
      done++;
      next();
    },
    // Fehler eintragen – die Frage zeigt danach selbst die Lösung (und ggf. Abschreiben).
    wrong(typed) {
      const task = queue[0];
      record(task.key, { correct: false, typed: typed?.trim() });
      task.attempts++;
      mistakes.set(task.key, { task, typed });
    },
    // Nach einem Fehler weiter: normal später nochmal, im Test einfach das nächste Wort.
    retry() {
      const task = queue[0];
      if (test) { queue.shift(); done++; } else requeue(task);
      next();
    },
    peek() {
      api.wrong();
      api.retry();
    },
  };

  function next() {
    if (!queue.length) return summary();
    const task = queue[0];
    const q = questionFor(task.dir);
    el.innerHTML = `
      <div class="round-progress"><div style="width:${(done / total) * 100}%"></div></div>
      <p class="muted small">${done} von ${total} · ${test ? '📝 Test · ' : ''}${esc(q.describe(task))}</p>
      <div class="card prompt-card"></div>`;
    q.render(el.querySelector('.prompt-card'), task, api, { test });
  }

  // Im Test: Ergebnis für jede beteiligte Lektion einzeln speichern (für die Medaille 🏅).
  function saveTestResults() {
    const byLesson = new Map();
    for (const t of tasks) {
      const k = `${t.sid}/${t.lesson.id}`;
      const r = byLesson.get(k) ?? { right: 0, total: 0, title: t.lesson.title };
      r.total++;
      if (!mistakes.has(t.key)) r.right++;
      byLesson.set(k, r);
    }
    const newMedals = [];
    for (const [k, r] of byLesson) {
      const had = medalStatus(k).medal;
      addTestResult(k, Math.round((r.right / r.total) * 100));
      if (!had && medalStatus(k).medal) newMedals.push(r.title);
    }
    save();
    return newMedals;
  }

  function summary() {
    const list = [...mistakes.values()];
    const pct = Math.round((firstTry / total) * 100);
    const newMedals = test ? saveTestResults() : [];
    const medalHtml = newMedals.map((t) => `
      <div class="medal-new"><span class="medal" aria-hidden="true">🏅</span>
        <span><strong>Medaille!</strong> „${esc(t)}“ kannst du jetzt richtig gut.</span></div>`).join('');
    roundSummary(el, {
      total, firstTry, points, startLevel,
      bonus: roundBonus(tasks.map((t) => t.dir)),
      intro: test ? `<p class="big">${firstTry} von ${total} richtig (${pct} %)</p>${medalHtml}` : null,
      mistakesTitle: test ? 'Diese Wörter waren noch nicht richtig:' : null,
      mistakes: list.map(({ task, typed }) => {
        const [q, a] = questionFor(task.dir).pair(task);
        return [q, test && typed ? `${a} – du: ${typed}` : a];
      }),
      onAgain, onBack, backLabel,
    });
  }

  next();
}

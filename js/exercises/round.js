// Ablauf einer Übungsrunde – für alle Fragetypen gleich.
// Eine Runde besteht aus Aufgaben (task): ein Wort einer Lektion in einer Übungsart (dir).
// Normale Runde: Falsche Wörter kommen später in derselben Runde wieder dran.
// Test-Runde: Jedes Wort nur einmal, keine Hilfe, am Ende das Ergebnis in Prozent.

import { esc } from '../util.js';
import { record, weightFor, roundBonus, MASTERED_FACTOR, MEDAL_BONUS } from '../srs.js';
import { getState, addTestResult, addPoints, save } from '../store.js';
import { levelFor } from '../pet.js';
import { roundSummary } from './summary.js';
import { questionFor } from './questions.js';
import { testReady, lessonMedal } from '../medal.js';

const RETRY_GAP = 3;

// tasks: [{ sid, lesson, item, dir, key }]
// chosen: Lektion selbst ausgewählt (Lektion oder Test) – dann bringen Lektionen
// mit Medaille weniger Sternchen. Bei „Jetzt üben“ wählt die App, dort gibt es volle Sternchen.
export function runRound(el, { tasks, test = false, chosen = true, onAgain, onBack, backLabel }) {
  const queue = tasks.map((t) => ({ ...t, attempts: 0 }));
  const total = queue.length;
  let done = 0;
  let firstTry = 0;
  let points = 0;
  const startLevel = levelFor(getState().points);
  const mistakes = new Map(); // key → { task, typed }

  // Medaillen vor der Runde – für Bonus bei neuen Medaillen und den Faktor bei alten.
  const lessons = new Map();
  for (const t of tasks) {
    const k = `${t.sid}/${t.lesson.id}`;
    if (!lessons.has(k)) lessons.set(k, { sid: t.sid, lesson: t.lesson, hadMedal: lessonMedal(t.sid, t.lesson).medal });
  }
  const weight = (t) => weightFor(t.dir) * (chosen && lessons.get(`${t.sid}/${t.lesson.id}`).hadMedal ? MASTERED_FACTOR : 1);

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
      points += record(task.key, { correct: true, firstTry: isFirst, weight: weight(task) });
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
    for (const [k, r] of byLesson) addTestResult(k, Math.round((r.right / r.total) * 100));
    save();
  }

  // Nach einer normalen Runde: Lektionen vorschlagen, die bereit für den Test sind.
  function readyNotice() {
    const seen = new Map();
    for (const t of tasks) seen.set(`${t.sid}/${t.lesson.id}`, t);
    const ready = [...seen.values()].filter((t) => testReady(t.sid, t.lesson)).slice(0, 2);
    return ready.map((t) => `
      <div class="test-ready">
        <span class="test-ready-icon" aria-hidden="true">📝</span>
        <span>„${esc(t.lesson.title)}“ kannst du schon ziemlich gut – <strong>teste dich doch mal!</strong></span>
        <a class="btn primary small" href="#/test/${encodeURIComponent(t.sid)}/${encodeURIComponent(t.lesson.id)}">Zum Test</a>
      </div>`).join('');
  }

  function summary() {
    const list = [...mistakes.values()];
    const pct = Math.round((firstTry / total) * 100);
    if (test) saveTestResults();
    // Neue Medaillen (Test oder Grammatik-Runde): Bonus-Sternchen.
    const newMedals = [...lessons.values()].filter((x) => !x.hadMedal && lessonMedal(x.sid, x.lesson).medal);
    if (newMedals.length) { addPoints(MEDAL_BONUS * newMedals.length); save(); }
    const medalHtml = newMedals.map((x) => `
      <div class="medal-new"><span class="medal" aria-hidden="true">🏅</span>
        <span><strong>Medaille!</strong> „${esc(x.lesson.title)}“ kannst du jetzt richtig gut.<br>
        <span class="small">✦ +${MEDAL_BONUS} Medaillen-Bonus</span></span></div>`).join('');
    const mastered = chosen && [...lessons.values()].some((x) => x.hadMedal);
    const masteredHtml = mastered ? `
      <p class="muted small mastered-note">🏅 Diese Lektion kannst du schon – dafür gibt es weniger Sternchen. Probier doch eine andere!</p>` : '';
    roundSummary(el, {
      total, firstTry, points, startLevel,
      bonus: roundBonus(tasks.map(weight)),
      extraPoints: MEDAL_BONUS * newMedals.length,
      intro: test ? `<p class="big">${firstTry} von ${total} richtig (${pct} %)</p>` : null,
      notice: medalHtml + masteredHtml + (test ? '' : readyNotice()),
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

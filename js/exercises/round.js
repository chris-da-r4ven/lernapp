// Ablauf einer Übungsrunde – für alle Fragetypen gleich.
// Eine Runde besteht aus Aufgaben (task): ein Wort einer Lektion in einer Übungsart (dir).
// Normale Runde: Falsche Wörter kommen später in derselben Runde wieder dran.
// Test-Runde: Jedes Wort nur einmal, keine Hilfe, am Ende das Ergebnis in Prozent.
// Medaillen-Regeln: medal.js · Hinweise in der Bilanz: round-notes.js · Bilanz: summary.js

import { esc } from '../util.js';
import { record, roundBonus, MASTERED_FACTOR, MEDAL_BONUS } from '../srs.js';
import { weightFor, questionFor, modeById } from './registry.js';
import { getState, addPoints, save, streak } from '../store.js';
import { levelFor } from '../pet.js';
import { roundSummary } from './summary.js';
import { lessonMedal, saveTest } from '../medal.js';
import { lessonKey, unitOf } from '../lessons.js';
import { newMedalsHtml, medalProgressHtml, readyNoticeHtml, MASTERED_HTML } from './round-notes.js';

const RETRY_GAP = 3;

// tasks: [{ sid, lesson, item, dir, key }]
// chosen: Lektion selbst ausgewählt (Lektion oder Test) – dann bringen Lektionen
// mit Medaille weniger Sternchen. Im Ausritt wählt die App, dort gibt es volle Sternchen.
// art: Rundenart für die Rückmeldung (frei, etappe, ausritt, test …).
// onComplete({ mistakes, firstTry, total }): Runde zu Ende gespielt – vor der Bilanz (z. B. Etappe als
// geschafft speichern). Kann HTML für einen Hinweis in der Bilanz zurückgeben.
// title, againLabel: Überschrift und Hauptknopf der Bilanz.
// once: jede Aufgabe nur einmal, falsche kommen nicht wieder (Probe „Ich kann das schon“) – mit Hilfe, ohne Testergebnis.
// onProgress(done, total): nach jeder Aufgabe (z. B. Fanny auf der Rennbahn weiterlaufen lassen).
export function runRound(el, { tasks, test = false, once = false, onProgress = null, chosen = true, art = test ? 'test' : 'frei', onComplete = null, title, againLabel, onAgain, onBack, backLabel }) {
  const queue = tasks.map((t) => ({ ...t, attempts: 0 }));
  const total = queue.length;
  let done = 0;
  let firstTry = 0;
  let points = 0;
  const startLevel = levelFor(getState().points);
  const goalBefore = streak().todayWords;   // Tagesziel-Stand vor der Runde (für die Bilanz)
  const mistakes = new Map(); // key → { task, typed }

  // Medaillen vor der Runde – für Bonus bei neuen Medaillen und den Faktor bei alten.
  const lessons = new Map();
  for (const t of tasks) {
    const k = lessonKey(t.sid, t.lesson);
    if (!lessons.has(k)) lessons.set(k, { sid: t.sid, lesson: t.lesson, hadMedal: lessonMedal(t.sid, t.lesson).medal });
  }
  // Lektion mit Medaille selbst gewählt: weniger Sternchen – außer bei freiwilligen Zusatzaufgaben (Experte).
  const penalized = (t) => chosen && !modeById(t.dir)?.optIn && lessons.get(lessonKey(t.sid, t.lesson)).hadMedal;
  const weight = (t) => weightFor(t.dir, t.item) * (penalized(t) ? MASTERED_FACTOR : 1);
  const unit = unitOf([...lessons.values()].map((x) => x.lesson));

  if (!total) {
    el.innerHTML = '<div class="card"><p>Hier gibt es gerade nichts zu üben.</p></div>';
    return;
  }

  // Falsche Aufgabe später nochmal – aber nicht direkt neben eine Aufgabe desselben Worts
  // (in Etappen kommt ein Wort zweimal vor: erkennen und schreiben).
  const wordOf = (t) => t.key.split('|')[0];
  function requeue(task) {
    queue.shift();
    let at = Math.min(RETRY_GAP, queue.length);
    const near = (i) => [queue[i - 1], queue[i]].some((t) => t && t !== task && wordOf(t) === wordOf(task));
    while (at < queue.length && near(at)) at++;
    queue.splice(at, 0, task);
  }

  const api = {
    // hold: „Fast richtig“ selbst korrigiert – zählt als richtig, aber nicht als „auf Anhieb“, Fach bleibt.
    right({ hold = false } = {}) {
      const task = queue[0];
      const isFirst = task.attempts === 0 && !hold;
      points += record(task.key, { correct: true, firstTry: isFirst, hold, weight: weight(task), effort: weightFor(task.dir, task.item) });
      if (isFirst) firstTry++;
      queue.shift();
      done++;
      next();
    },
    // Fehler eintragen – die Frage zeigt danach selbst die Lösung (und ggf. Abschreiben).
    wrong(typed) {
      const task = queue[0];
      record(task.key, { correct: false, typed: typed?.trim(), effort: weightFor(task.dir, task.item) });
      task.attempts++;
      mistakes.set(task.key, { task, typed });
    },
    // Nach einem Fehler weiter: normal später nochmal, im Test einfach das nächste Wort.
    retry() {
      const task = queue[0];
      if (test || once) { queue.shift(); done++; } else requeue(task);
      next();
    },
    peek() {
      api.wrong();
      api.retry();
    },
  };

  function next() {
    onProgress?.(done, total);
    if (!queue.length) return summary();
    const task = queue[0];
    const q = questionFor(task.dir);
    el.innerHTML = `
      <div class="round-progress"><div style="width:${(done / total) * 100}%"></div></div>
      <p class="muted small">${done} von ${total} · ${test ? '📝 Test · ' : ''}${esc(q.describe(task))}</p>
      <div class="card prompt-card"></div>`;
    q.render(el.querySelector('.prompt-card'), task, api, { test });
  }

  function summary() {
    const list = [...mistakes.values()];
    const completeNotice = onComplete?.({ mistakes: [...mistakes.keys()], firstTry, total }) ?? '';
    const words = new Set(tasks.map(wordOf)).size;   // in Etappen kommt ein Wort mehrmals vor
    const pct = Math.round((firstTry / total) * 100);
    // Im Test: Ergebnis pro Lektion speichern (für die Medaille 🏅).
    const progress = test ? saveTest(tasks.map((t) => ({ sid: t.sid, lesson: t.lesson, right: !mistakes.has(t.key) }))) : [];
    // Neue Medaillen (Test oder Grammatik-Runde): Bonus-Sternchen.
    const all = [...lessons.values()];
    const newMedals = all.filter((x) => !x.hadMedal && lessonMedal(x.sid, x.lesson).medal);
    if (newMedals.length) { addPoints(MEDAL_BONUS * newMedals.length); save(); }
    const mastered = tasks.some(penalized);
    roundSummary(el, {
      unit,
      total, firstTry, points, startLevel, goalBefore,
      bonus: roundBonus(tasks.map(weight)),
      extraPoints: MEDAL_BONUS * newMedals.length,
      intro: test ? `<p class="big">${firstTry} von ${total} richtig (${pct} %)</p>`
        : words < total ? `<p class="big">${words} ${esc(unit[words === 1 ? 0 : 1])} in ${total} Aufgaben – ${firstTry === total ? 'alle' : `${firstTry} davon`} sofort richtig</p>` : null,
      title, againLabel,
      notice: completeNotice + newMedalsHtml(newMedals.map((x) => x.lesson)) + medalProgressHtml(progress)
        + (mastered ? MASTERED_HTML : '') + (test ? '' : readyNoticeHtml(all)),
      mistakesTitle: test ? `Diese ${unit[1]} waren noch nicht richtig:` : `Diese ${unit[1]} üben wir weiter:`,
      mistakes: list.map(({ task, typed }) => {
        const [q, a] = questionFor(task.dir).pair(task);
        return [q, test && typed ? `${a} – du: ${typed}` : a];
      }),
      // Für die Rückmeldung: welche Lektionen, welche Übungsarten, Test oder nicht.
      feedback: {
        what: all.map((x) => x.lesson.title).slice(0, 3).join(', ') + (all.length > 3 ? ' …' : ''),
        mode: [...new Set(tasks.map((t) => t.dir))].join(','),
        art,
        test,
      },
      onAgain, onBack, backLabel,
    });
  }

  next();
}

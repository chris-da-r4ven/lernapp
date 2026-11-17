// Reitturnier-Runden: #/reitturnier/<id>/training · #/reitturnier/<id>/generalprobe
// Generalprobe zählt nicht als Test (saveResult: false); danach direkt eine Runde nur mit den Wörtern,
// die noch nicht saßen.

import { getSubject } from '../content.js';
import { examById } from '../store.js';
import { EXAM_NAME, daysUntil, dateLabel } from '../exams.js';
import { trainingTasks, generalprobeTasks } from '../exam-rounds.js';
import { runRound } from '../exercises/round.js';
import { esc } from '../util.js';

export function examPlayView(el, id, what) {
  const exam = examById(id);
  const subject = exam ? getSubject(exam.sid) : null;
  if (!exam || !subject || daysUntil(exam.date) < 0) { location.hash = '#/'; return; }
  const home = () => { location.hash = '#/'; };
  const head = (label) => `
    <a class="back" href="#/">← Startseite</a>
    <p class="muted small etappe-head">🏆 ${esc(EXAM_NAME)} ${esc(subject.name)} · ${esc(dateLabel(exam.date))} · ${label}</p>
    <div class="exercise"></div>`;

  if (what === 'training') {
    const tasks = trainingTasks(exam);
    el.innerHTML = head('Turniertraining');
    const box = el.querySelector('.exercise');
    if (!tasks.length) {
      box.innerHTML = `<div class="card summary"><h2>Noch nichts zum Trainieren</h2>
        <p>Lerne zuerst die Wörter im Lernweg der Turnierlektionen – dann kannst du hier trainieren.</p>
        <div class="actions"><a class="btn primary" href="#/">Zur Startseite</a></div></div>`;
      return;
    }
    runRound(box, {
      tasks, chosen: false, art: 'training', title: 'Training geschafft! 🏆',
      againLabel: 'Nochmal trainieren', onAgain: () => examPlayView(el, id, what),
      onBack: home, backLabel: 'Zur Startseite',
    });
    return;
  }

  if (what === 'generalprobe') {
    const tasks = generalprobeTasks(exam);
    el.innerHTML = head('Generalprobe');
    const box = el.querySelector('.exercise');
    if (!tasks.length) { home(); return; }
    let wrong = [];
    runRound(box, {
      tasks, test: true, saveResult: false, chosen: false, art: 'generalprobe', title: 'Generalprobe vorbei 🎯',
      onComplete: ({ mistakes }) => {
        const miss = new Set(mistakes);
        wrong = tasks.filter((t) => miss.has(t.key));
        return wrong.length ? '' : '<p class="big">Alles gesessen – du bist bereit fürs Turnier! 🏆</p>';
      },
      againLabel: 'Weiter',
      onAgain: () => (wrong.length ? fixRound(el, head, wrong, home) : home()),
      onBack: home, backLabel: 'Zur Startseite',
    });
    // Hauptknopf passend beschriften, sobald die Bilanz steht
    const relabel = new MutationObserver(() => {
      const b = el.querySelector('[data-act=again]');
      if (!b) return;
      b.textContent = wrong.length ? `Diese ${wrong.length} üben wir jetzt` : 'Zur Startseite';
      relabel.disconnect();
    });
    relabel.observe(el, { childList: true, subtree: true });
    return;
  }
  home();
}

// Runde nur mit den Fehlwörtern der Generalprobe (mit Hilfe, falsche kommen wieder).
function fixRound(el, head, wrong, home) {
  el.innerHTML = head('Fehlwörter üben');
  runRound(el.querySelector('.exercise'), {
    tasks: wrong.map(({ sid, lesson, item, dir, key }) => ({ sid, lesson, item, dir, key })),
    chosen: false, art: 'training', title: 'Jetzt sitzen sie besser! 🐎',
    againLabel: 'Zur Startseite', onAgain: home, onBack: home, backLabel: 'Zur Startseite',
  });
}

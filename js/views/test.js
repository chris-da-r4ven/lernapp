// Test-Modus: wie ein Vokabeltest in der Schule.
// Lektionen auswählen, dann alle Wörter Deutsch → Englisch, gemischt,
// jedes nur einmal, ohne Abschreiben und Spicken. Am Ende: Ergebnis in Prozent.

import { getSubject, getLesson } from '../content.js';
import { kindInfo, towardTarget, unitWord } from '../lessons.js';
import { tasksFor } from '../exercises/registry.js';
import { runRound } from '../exercises/round.js';
import { esc, shuffle } from '../util.js';
import { lessonMedal } from '../medal.js';

// preselect: Lektion, die schon angehakt ist (z. B. aus „Teste dich doch mal!“).
export function testView(el, sid, preselect) {
  const subject = getSubject(sid);
  if (!subject) { location.hash = '#/'; return; }
  const lessons = subject.lessons.map((l) => getLesson(sid, l.id)).filter((l) => l && kindInfo(l).testable);
  const back = `#/fach/${encodeURIComponent(sid)}`;

  el.innerHTML = `
    <a class="back" href="${back}">← ${esc(subject.name)}</a>
    <h1>📝 Test-Modus</h1>
    <section class="card">
      <p>Wie im Vokabeltest: Du bekommst das deutsche Wort und schreibst es auf Englisch.
         Jedes Wort kommt nur einmal, ohne Hilfe. Am Ende siehst du, wie viel du richtig hattest.</p>
      <h2>Welche Lektionen?</h2>
      <form class="test-form">
        ${lessons.map((l, i) => {
          const meta = subject.lessons.find((x) => x.id === l.id) ?? {};
          const prev = i ? subject.lessons.find((x) => x.id === lessons[i - 1].id) ?? {} : {};
          const head = meta.group && meta.group !== prev.group ? `<h3 class="test-group">${esc(meta.group)}</h3>` : '';
          return `${head}
          <label class="check"><input type="checkbox" name="lesson" value="${esc(l.id)}"${l.id === preselect ? ' checked' : ''}>
            ${lessonMedal(sid, l).medal ? '🏅 ' : ''}${esc(meta.title ?? l.title)} <span class="muted small">(${l.items.length} ${unitWord(l, l.items.length)})</span></label>`;
        }).join('')}
        <p class="test-count muted small"></p>
        <div class="actions"><button class="btn primary" type="submit">Test starten</button></div>
      </form>
    </section>`;

  const form = el.querySelector('.test-form');
  const chosen = () => [...form.querySelectorAll('input[name=lesson]:checked')].map((i) => lessons.find((l) => l.id === i.value));
  const updateCount = () => {
    const n = chosen().reduce((sum, l) => sum + l.items.length, 0);
    form.querySelector('.test-count').textContent = n ? `${n} Wörter im Test` : 'Hake die Lektionen an, die im Test drankommen.';
    form.querySelector('button').disabled = !n;
  };
  form.addEventListener('change', updateCount);
  updateCount();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    start(chosen());
  });

  function start(selected) {
    // Muttersprache → Lernsprache, wie im Vokabeltest.
    const tasks = shuffle(selected.flatMap((l) => tasksFor(sid, l, towardTarget(l))));
    el.innerHTML = `<a class="back" href="${back}">← ${esc(subject.name)}</a><div class="exercise"></div>`;
    runRound(el.querySelector('.exercise'), {
      tasks,
      test: true,
      onAgain: () => start(selected),
      onBack: () => { location.hash = back; },
      backLabel: `Zu ${subject.name}`,
    });
  }
}

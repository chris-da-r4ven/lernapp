// Antwort-Bausteine für alle Fragetypen: Eintippen (mit Vergleich und Abschreiben) und Antippen.
// Ein Fragetyp (questions.js, math.js) zeigt die Aufgabe und ruft einen dieser Bausteine auf.

import { esc } from '../util.js';
import { renderDiff, distance } from '../diff.js';

// --- Prüfen ------------------------------------------------------------------

// Satzzeichen am Ende ("Can you help me?" / "…me") zählen nicht als Fehler.
const normalize = (s) => String(s).normalize('NFC').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().replace(/\s*[.!?]+$/, '');

// Alle Schreibweisen, die als richtig gelten.
// "Freund / Freundin" → auch "Freund" und "Freundin" einzeln.
function acceptedAnswers(answer, alts = []) {
  const parts = answer.includes('/') ? answer.split('/').map(normalize) : [];
  return [...new Set([answer, ...parts, ...alts].map(normalize).filter(Boolean))];
}

// norm: eigene Vereinheitlichung (Mathe: Leerzeichen und Tausenderpunkte egal, Groß/klein egal).
export function check(typed, answer, alts, norm = null) {
  const t = norm ? norm(typed) : normalize(typed);
  const accepted = norm ? [...new Set([answer, ...(alts ?? [])].map(norm))] : acceptedAnswers(answer, alts);
  if (accepted.includes(t)) return { ok: true };
  const caseOnly = accepted.some((a) => a.toLowerCase() === t.toLowerCase());
  const closest = accepted.reduce((best, a) => (distance(t, a) < distance(t, best) ? a : best), accepted[0]);
  return { ok: false, caseOnly, closest };
}

// --- Eintippen mit Vergleich und Abschreiben ---------------------------------

// Rendert Eingabefeld + Rückmeldung in `area`.
// solution(): Zusatz-HTML, das nach dem Antworten erscheint (z. B. Bedeutung, ganzer Satz).
// onAnswered(): wird nach dem Antworten aufgerufen (z. B. Satz vorlesen).
export function askTyped(area, { placeholder, answer, alts, norm = null, numeric = false, api, test, again = false, solution = () => '', onAnswered = () => {} }) {
  area.innerHTML = `
    <form class="answer-form" autocomplete="off">
      <input class="answer" name="answer" type="text" autocomplete="off" autocorrect="off"${numeric ? ' inputmode="numeric"' : ''}
             autocapitalize="off" spellcheck="false" placeholder="${esc(placeholder)}" aria-label="Antwort">
      <button class="btn primary" type="submit">Prüfen</button>
    </form>
    <div class="feedback"></div>`;
  const form = area.querySelector('form');
  const input = form.answer;
  const fb = area.querySelector('.feedback');
  input.focus();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    const res = check(input.value, answer, alts, norm);
    input.readOnly = true;
    form.querySelector('button').remove();
    if (res.ok) showRight(); else showWrong(input.value, res);
    onAnswered(res.ok);
  });

  function showRight() {
    fb.innerHTML = `
      <p class="result good">${again ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉'}</p>
      ${solution()}
      <div class="actions">
        <button class="btn primary" data-act="next">Weiter</button>
        ${test ? '' : '<button class="btn ghost small" data-act="peek">Hab gespickt / war unsicher</button>'}
      </div>`;
    const nextBtn = fb.querySelector('[data-act=next]');
    nextBtn.focus();
    nextBtn.addEventListener('click', () => api.right());
    fb.querySelector('[data-act=peek]')?.addEventListener('click', () => api.peek());
  }

  function showWrong(typed, res) {
    api.wrong(typed);
    const diffHtml = (text, r) => {
      const d = renderDiff(norm ? norm(text) : normalize(text), r.closest);
      return `
        <div class="diff">
          <div><span class="muted small">Du:</span> <span class="word">${d.yours}</span></div>
          <div><span class="muted small">Richtig:</span> <span class="word">${d.right}</span></div>
        </div>`;
    };
    const message = (r, m) => (r.caseOnly ? 'Fast! Achte auf Groß- und Kleinschreibung.' : m);

    if (test) {
      // Im Test: Lösung zeigen, kein Abschreiben.
      fb.innerHTML = `
        <p class="result bad">${message(res, 'Leider falsch.')}</p>
        ${diffHtml(typed, res)}
        ${solution()}
        <div class="actions"><button class="btn primary" data-act="next">Weiter</button></div>`;
      const nextBtn = fb.querySelector('[data-act=next]');
      nextBtn.focus();
      nextBtn.addEventListener('click', () => api.retry());
      return;
    }

    fb.innerHTML = `
      <p class="result bad">${message(res, 'Noch nicht ganz.')}</p>
      <div class="diff-area">${diffHtml(typed, res)}</div>
      ${solution()}
      <form class="answer-form copy-form" autocomplete="off">
        <input class="answer" name="copy" type="text" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false"${numeric ? ' inputmode="numeric"' : ''} placeholder="Schreib es richtig ab …" aria-label="Richtig abschreiben">
        <button class="btn primary" type="submit">OK</button>
      </form>`;
    const copy = fb.querySelector('.copy-form');
    copy.copy.focus();
    copy.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!copy.copy.value.trim()) { copy.copy.focus(); return; }
      const r = check(copy.copy.value, answer, alts, norm);
      if (r.ok) { api.retry(); return; }
      // Abschreiben zählt nicht als neuer Fehler – nur zeigen, wo es noch hakt.
      fb.querySelector('.result').textContent = message(r, 'Beim Abschreiben hat sich noch ein Fehler eingeschlichen. Schau genau hin:');
      fb.querySelector('.diff-area').innerHTML = diffHtml(copy.copy.value, r);
      copy.copy.focus();
      copy.copy.classList.remove('shake');
      void copy.copy.offsetWidth;
      copy.copy.classList.add('shake');
    });
  }
}

// --- Antippen ----------------------------------------------------------------

const resultText = (right, task, test) =>
  (right ? (task.attempts ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉') : (test ? 'Leider falsch.' : 'Noch nicht ganz.'));

// Knöpfe zum Antippen in `area`. isRight(choice): ist diese Antwort richtig?
// solution(): Zusatz-HTML nach dem Antworten (z. B. Bedeutung, Erklärung); onAnswered(right): z. B. Satz vorlesen.
// compact: höchstens drei kurze Antworten nebeneinander (am / is / are, < / >).
export function askChoice(area, { choices, isRight, api, task, test, compact = false, solution = () => '', onAnswered = () => {} }) {
  area.innerHTML = `
    <div class="choices${compact ? ' form-choices' : ''}">
      ${choices.map((c, i) => `<button class="btn choice" type="button" data-i="${i}">${esc(c)}</button>`).join('')}
    </div>
    <div class="feedback"></div>`;
  area.querySelector('.choices').addEventListener('click', (ev) => {
    const b = ev.target.closest('.choice');
    if (!b || area.dataset.answered) return;
    area.dataset.answered = '1';
    const picked = choices[Number(b.dataset.i)];
    const right = isRight(picked);
    area.querySelectorAll('.choice').forEach((x) => {
      x.disabled = true;
      if (isRight(choices[Number(x.dataset.i)])) x.classList.add('right');
    });
    if (!right) { b.classList.add('wrong'); api.wrong(picked); }
    onAnswered(right, picked);
    const fb = area.querySelector('.feedback');
    fb.innerHTML = `
      <p class="result ${right ? 'good' : 'bad'}">${resultText(right, task, test)}</p>
      ${solution()}
      <div class="actions"><button class="btn primary" data-act="next">Weiter</button></div>`;
    const nextBtn = fb.querySelector('[data-act=next]');
    nextBtn.focus();
    nextBtn.addEventListener('click', () => (right ? api.right() : api.retry()));
  });
}

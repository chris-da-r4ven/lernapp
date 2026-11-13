// Antwort-Bausteine für alle Fragetypen: Eintippen (mit Vergleich und Abschreiben) und Antippen.
// Ein Fragetyp (questions.js, math.js) zeigt die Aufgabe und ruft einen dieser Bausteine auf.

import { esc } from '../util.js';
import { renderDiff, distance, nearMiss } from '../diff.js';

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
// closest: die nächstliegende richtige Antwort, so wie sie geschrieben steht (für die Anzeige).
// near: „Fast richtig“ – genau ein Buchstabe daneben (diff.js nearMiss), nicht in Mathe (norm) und nicht,
// wenn die Eingabe die Antwort eines anderen Worts der Lektion ist (others: where/were).
export function check(typed, answer, alts, norm = null, others = []) {
  if (norm) {
    const t = norm(typed);
    const list = [answer, ...(alts ?? [])];
    if (list.some((a) => norm(a) === t)) return { ok: true };
    const closest = list.reduce((best, a) => (distance(t, norm(a)) < distance(t, norm(best)) ? a : best), list[0]);
    return { ok: false, caseOnly: false, closest: normalize(closest) };
  }
  const t = normalize(typed);
  const accepted = acceptedAnswers(answer, alts);
  if (accepted.includes(t)) return { ok: true };
  const caseOnly = accepted.some((a) => a.toLowerCase() === t.toLowerCase());
  const closest = accepted.reduce((best, a) => (distance(t, a) < distance(t, best) ? a : best), accepted[0]);
  const other = others.flatMap((o) => acceptedAnswers(o)).some((o) => o.toLowerCase() === t.toLowerCase());
  const near = !other && accepted.some((a) => nearMiss(t, a));
  return { ok: false, caseOnly, closest, near };
}

// --- Eintippen mit Vergleich und Abschreiben ---------------------------------

// Rendert Eingabefeld + Rückmeldung in `area`.
// solution(): Zusatz-HTML, das nach dem Antworten erscheint (z. B. Bedeutung, ganzer Satz).
// onAnswered(): wird nach dem Antworten aufgerufen (z. B. Satz vorlesen).
// others: Antworten der anderen Wörter der Lektion (kein „Fast richtig“, wenn eines davon getippt wurde).
//
// Rechtschreibung (nicht in Mathe, nicht im Test):
// - Fast richtig: genau ein Buchstabe daneben → ein Versuch, ihn selbst zu finden. Gefunden zählt als richtig,
//   das Wort bleibt aber in seinem Karteikasten-Fach (api.right({ hold: true })).
// - Nach einem Fehler: Anschauen – Abdecken – Schreiben. Die Lösung steht kurz da (LOOK_MS), dann wird sie
//   verdeckt und das Wort aus dem Gedächtnis geschrieben. „Nochmal ansehen“ zeigt sie wieder.
export const LOOK_MS = 3000;
export function askTyped(area, { placeholder, answer, alts, norm = null, numeric = false, api, test, again = false, others = [], solution = () => '', onAnswered = () => {} }) {
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
  let nearTry = false;   // läuft gerade der eine Versuch nach „Fast richtig“?

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!input.value.trim() || input.readOnly) { input.focus(); return; }
    const res = check(input.value, answer, alts, norm, others);
    if (!res.ok && res.near && !norm && !test && !nearTry) { offerNear(res); return; }
    input.readOnly = true;
    form.querySelector('button').remove();
    if (res.ok) showRight(nearTry); else showWrong(input.value, res);
    onAnswered(res.ok);
  });

  function offerNear(res) {
    nearTry = true;
    fb.innerHTML = `<p class="result near" role="status">${res.caseOnly && res.closest.toLowerCase() === normalize(input.value).toLowerCase()
      ? 'Fast! Schau dir die Groß- und Kleinschreibung noch mal an.'
      : 'Fast! Ein Buchstabe stimmt nicht – findest du ihn?'}</p>`;
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
    input.focus();
  }

  function showRight(found = false) {
    fb.innerHTML = `
      <p class="result good">${found ? 'Gefunden! 🔍' : again ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉'}</p>
      ${solution()}
      <div class="actions">
        <button class="btn primary" data-act="next">Weiter</button>
        ${test ? '' : '<button class="btn ghost small" data-act="peek">Hab gespickt / war unsicher</button>'}
      </div>`;
    const nextBtn = fb.querySelector('[data-act=next]');
    nextBtn.focus();
    nextBtn.addEventListener('click', () => api.right({ hold: found }));
    fb.querySelector('[data-act=peek]')?.addEventListener('click', () => api.peek());
  }

  function showWrong(typed, res) {
    api.wrong(typed);
    const diffHtml = (text, r) => {
      const d = renderDiff(normalize(text), r.closest);   // so, wie das Kind getippt hat
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

    // Mathe (norm): Lösung bleibt stehen, abschreiben wie bisher. Wörter: anschauen, abdecken, aus dem Gedächtnis.
    const cover = !norm;
    fb.innerHTML = `
      <p class="result bad">${message(res, 'Noch nicht ganz.')}</p>
      <div class="look">
        <div class="diff-area">${diffHtml(typed, res)}</div>
        ${solution()}
      </div>
      ${cover ? `<p class="muted small cover-hint" aria-live="polite">Schau es dir genau an …</p>
        <div class="actions cover-actions">
          <button class="btn small" type="button" data-act="hide">Hab’s mir gemerkt</button>
          <button class="btn ghost small" type="button" data-act="look" hidden>Nochmal ansehen</button>
        </div>` : ''}
      <form class="answer-form copy-form" autocomplete="off">
        <input class="answer" name="copy" type="text" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false"${numeric ? ' inputmode="numeric"' : ''}
               placeholder="${cover ? 'Jetzt aus dem Gedächtnis …' : 'Schreib es richtig ab …'}" aria-label="${cover ? 'Aus dem Gedächtnis schreiben' : 'Richtig abschreiben'}">
        <button class="btn primary" type="submit">OK</button>
      </form>`;
    const copy = fb.querySelector('.copy-form');
    const look = fb.querySelector('.look');
    const hint = fb.querySelector('.cover-hint');
    const hideBtn = fb.querySelector('[data-act=hide]');
    const lookBtn = fb.querySelector('[data-act=look]');
    let timer = null;

    // Lösung zeigen: Eingabe gesperrt und ohne Fokus (sonst verdeckt die Tastatur die Lösung).
    function showLook() {
      look.hidden = false;
      copy.copy.disabled = true;
      copy.querySelector('button').disabled = true;
      hideBtn.hidden = false;
      lookBtn.hidden = true;
      hint.textContent = 'Schau es dir genau an …';
      clearTimeout(timer);
      timer = setTimeout(() => { if (fb.isConnected) coverUp(); }, LOOK_MS);
      hideBtn.focus();
    }
    function coverUp() {
      clearTimeout(timer);
      look.hidden = true;
      copy.copy.disabled = false;
      copy.querySelector('button').disabled = false;
      hideBtn.hidden = true;
      lookBtn.hidden = false;
      hint.textContent = 'Jetzt aus dem Gedächtnis!';
      copy.copy.focus();
    }
    if (cover) {
      hideBtn.addEventListener('click', coverUp);
      lookBtn.addEventListener('click', showLook);
      showLook();
    } else {
      copy.copy.focus();
    }

    copy.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (copy.copy.disabled) return;
      if (!copy.copy.value.trim()) { copy.copy.focus(); return; }
      const r = check(copy.copy.value, answer, alts, norm);
      if (r.ok) { clearTimeout(timer); api.retry(); return; }
      // Abschreiben zählt nicht als neuer Fehler – nur zeigen, wo es noch hakt (und nochmal anschauen).
      fb.querySelector('.result').textContent = message(r, cover
        ? 'Da hat sich noch ein Fehler eingeschlichen. Schau nochmal genau hin:'
        : 'Beim Abschreiben hat sich noch ein Fehler eingeschlichen. Schau genau hin:');
      fb.querySelector('.diff-area').innerHTML = diffHtml(copy.copy.value, r);
      copy.copy.classList.remove('shake');
      void copy.copy.offsetWidth;
      copy.copy.classList.add('shake');
      if (cover) { copy.copy.value = ''; showLook(); } else copy.copy.focus();
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

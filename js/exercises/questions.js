// Fragetypen. Jeder Typ zeigt eine Aufgabe an und meldet dem Runden-Ablauf
// (round.js) über api.right / api.wrong / api.retry / api.peek, wie es lief.
//
//   ab / ba      – Wort lesen, Übersetzung schreiben
//   hoeren       – Wort hören, auf Englisch schreiben (Diktat)
//   hoeren-wahl  – Wort hören, Bedeutung antippen
//   satz         – Lückensatz: fehlendes englisches Wort einsetzen

import { esc, shuffle } from '../util.js';
import { renderDiff, distance } from '../diff.js';
import { englishSide, speak, speechControls, bindSpeechControls } from '../speech.js';

// --- Prüfen ------------------------------------------------------------------

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

const other = (side) => (side === 'b' ? 'a' : 'b');

// --- Eintippen mit Vergleich und Abschreiben ---------------------------------

// Rendert Eingabefeld + Rückmeldung in `area`.
// solution(): Zusatz-HTML, das nach dem Antworten erscheint (z. B. Bedeutung, ganzer Satz).
// onAnswered(): wird nach dem Antworten aufgerufen (z. B. Satz vorlesen).
function askTyped(area, { placeholder, answer, alts, api, test, again = false, solution = () => '', onAnswered = () => {} }) {
  area.innerHTML = `
    <form class="answer-form" autocomplete="off">
      <input class="answer" name="answer" type="text" autocomplete="off" autocorrect="off"
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
    const res = check(input.value, answer, alts);
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
      const d = renderDiff(normalize(text), r.closest);
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
               autocapitalize="off" spellcheck="false" placeholder="Schreib es richtig ab …" aria-label="Richtig abschreiben">
        <button class="btn primary" type="submit">OK</button>
      </form>`;
    const copy = fb.querySelector('.copy-form');
    copy.copy.focus();
    copy.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!copy.copy.value.trim()) { copy.copy.focus(); return; }
      const r = check(copy.copy.value, answer, alts);
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

// --- Schreiben und Diktat ----------------------------------------------------

function writeSides(task) {
  if (task.dir === 'hoeren') {
    const to = englishSide(task.lesson);
    return { from: other(to), to };
  }
  return task.dir === 'ab' ? { from: 'a', to: 'b' } : { from: 'b', to: 'a' };
}

const writeQuestion = {
  describe(task) {
    if (task.dir === 'hoeren') return '🔊 Hören → Englisch';
    const { from, to } = writeSides(task);
    return `${task.lesson.sides[from]} → ${task.lesson.sides[to]}`;
  },
  pair(task) {
    const { from, to } = writeSides(task);
    return task.dir === 'hoeren' ? ['🔊', `${task.item[to]} (${task.item[from]})`] : [task.item[from], task.item[to]];
  },
  render(card, task, api, { test }) {
    const listen = task.dir === 'hoeren';
    const { from, to } = writeSides(task);
    const item = task.item;
    card.innerHTML = `
      ${listen ? speechControls() : `<div class="prompt">${esc(item[from])}</div>`}
      <div class="answer-area"></div>`;
    if (listen) bindSpeechControls(card, item[to]);
    askTyped(card.querySelector('.answer-area'), {
      placeholder: listen ? 'Was hörst du? Auf Englisch …' : `${task.lesson.sides[to]} schreiben …`,
      answer: item[to],
      alts: item[to + 'Alt'],
      api, test, again: task.attempts > 0,
      solution: () => (listen ? `<p class="meaning muted">${esc(item[to])} = ${esc(item[from])}</p>` : ''),
    });
  },
};

// --- Hören und Bedeutung antippen --------------------------------------------

const OPTIONS = 4;

const chooseQuestion = {
  describe: () => '🔊 Hören → Bedeutung',
  pair(task) {
    const en = englishSide(task.lesson);
    return ['🔊', `${task.item[en]} (${task.item[other(en)]})`];
  },
  render(card, task, api, { test }) {
    const en = englishSide(task.lesson);
    const de = other(en);
    const item = task.item;
    // Drei falsche Bedeutungen aus derselben Lektion, keine doppelten.
    // Nicht nehmen: Wörter, die gleich klingen ("you are" = du bist / ihr seid)
    // oder deren Bedeutung hier auch als richtig gilt.
    const sameSound = (it) => it[en].toLowerCase() === item[en].toLowerCase();
    const alsoRight = (m) => (item[de + 'Alt'] ?? []).includes(m);
    const others = shuffle([...new Set(task.lesson.items
      .filter((it) => !sameSound(it))
      .map((it) => it[de])
      .filter((m) => m !== item[de] && !alsoRight(m)))]);
    const opts = shuffle([item[de], ...others.slice(0, OPTIONS - 1)]);
    card.innerHTML = `
      ${speechControls()}
      <p class="muted small">Was bedeutet das Wort?</p>
      <div class="choices">
        ${opts.map((o, i) => `<button class="btn choice" type="button" data-i="${i}">${esc(o)}</button>`).join('')}
      </div>
      <div class="feedback"></div>`;
    bindSpeechControls(card, item[en]);

    card.querySelector('.choices').addEventListener('click', (ev) => {
      const b = ev.target.closest('.choice');
      if (!b || card.dataset.answered) return;
      card.dataset.answered = '1';
      const picked = opts[Number(b.dataset.i)];
      const right = picked === item[de];
      card.querySelectorAll('.choice').forEach((x) => {
        x.disabled = true;
        if (opts[Number(x.dataset.i)] === item[de]) x.classList.add('right');
      });
      if (!right) { b.classList.add('wrong'); api.wrong(picked); }
      const fb = card.querySelector('.feedback');
      fb.innerHTML = `
        <p class="result ${right ? 'good' : 'bad'}">${right ? (task.attempts ? 'Jetzt sitzt es! 👍' : 'Richtig! 🎉') : (test ? 'Leider falsch.' : 'Noch nicht ganz.')}</p>
        <p class="meaning muted">${esc(item[en])} = ${esc(item[de])}</p>
        <div class="actions"><button class="btn primary" data-act="next">Weiter</button></div>`;
      const nextBtn = fb.querySelector('[data-act=next]');
      nextBtn.focus();
      nextBtn.addEventListener('click', () => (right ? api.right() : api.retry()));
    });
  },
};

// --- Lückensatz --------------------------------------------------------------
// Im Wort steht "ex": "I {always} go to school by bus." – die geschweiften Klammern
// markieren die Lücke, "|" trennt erlaubte Varianten: "{I am|I'm} ten."
// "exDe" ist die deutsche Übersetzung des Satzes.

export function parseGap(ex) {
  const m = String(ex).match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (!m) return null;
  const [answer, ...alts] = m[2].split('|').map((s) => s.trim());
  return { before: m[1], after: m[3], answer, alts, full: m[1] + answer + m[3] };
}

const gapQuestion = {
  describe: () => '📝 Lückensatz',
  pair(task) {
    const g = parseGap(task.item.ex);
    return [task.item.exDe ?? '', g?.full ?? ''];
  },
  render(card, task, api, { test }) {
    const g = parseGap(task.item.ex);
    const en = englishSide(task.lesson);
    const de = other(en);
    const item = task.item;
    card.innerHTML = `
      <p class="gap-sentence">${esc(g.before)}<span class="gap">?</span>${esc(g.after)}</p>
      <p class="muted small">Gesucht: <strong>${esc(item[de])}</strong></p>
      <div class="answer-area"></div>`;
    askTyped(card.querySelector('.answer-area'), {
      placeholder: 'Fehlendes Wort auf Englisch …',
      answer: g.answer,
      alts: g.alts,
      api, test, again: task.attempts > 0,
      solution: () => `
        <div class="gap-solution">
          <button class="btn small" type="button" data-act="say" aria-label="Satz vorlesen">🔊</button>
          <div>
            <p class="gap-full">${esc(g.before)}<strong>${esc(g.answer)}</strong>${esc(g.after)}</p>
            ${item.exDe ? `<p class="muted small">${esc(item.exDe)}</p>` : ''}
          </div>
        </div>`,
      onAnswered: () => {
        speak(g.full);
        card.querySelectorAll('[data-act=say]').forEach((b) => b.addEventListener('click', () => speak(g.full)));
      },
    });
  },
};

const QUESTIONS = { ab: writeQuestion, ba: writeQuestion, hoeren: writeQuestion, 'hoeren-wahl': chooseQuestion, satz: gapQuestion };
export const questionFor = (dir) => QUESTIONS[dir];

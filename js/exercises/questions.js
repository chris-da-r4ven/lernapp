// Fragetypen. Jeder Typ zeigt eine Aufgabe an und meldet dem Runden-Ablauf
// (round.js) über api.right / api.wrong / api.retry / api.peek, wie es lief.
//
// Welche Übungsart welchen Fragetyp nutzt, steht in modes.js.
//
//   writeQuestion  – Wort lesen oder hören, Übersetzung bzw. Wort schreiben (ab, ba, hoeren)
//   chooseQuestion – Wort hören, Bedeutung antippen (hoeren-wahl)
//   gapQuestion    – Lückensatz: fehlendes Wort der Lernsprache einsetzen (satz)
//   formQuestion   – Grammatik: richtige Form antippen, z. B. am / is / are (form)
// Mathe-Aufgaben: math.js. Eintippen und Antippen selbst: answer.js.
//
// Ein Fragetyp hat: describe(task) – Zeile über der Aufgabe, pair(task) – [gefragt, Antwort]
// für Bilanz und Fortschritt, render(card, task, api, { test }) – die Aufgabe selbst.

import { esc, shuffle } from '../util.js';
import { speak, speechControls, bindSpeechControls } from '../speech.js';
import { targetSide, otherSide, langOf } from '../lessons.js';
import { askTyped, askChoice } from './answer.js';

export { check } from './answer.js';   // für den Selbsttest

const other = otherSide;
// Antworten der anderen Wörter der Lektion – getippt zählen sie nicht als „Fast richtig“ (where/were).
const othersOf = (task, side) => task.lesson.items.filter((it) => it !== task.item).map((it) => it[side]).filter(Boolean);

// --- Schreiben und Diktat ----------------------------------------------------

function writeSides(task) {
  if (task.dir === 'hoeren') {
    const to = targetSide(task.lesson);
    return { from: other(to), to };
  }
  return task.dir === 'ab' ? { from: 'a', to: 'b' } : { from: 'b', to: 'a' };
}

export const writeQuestion = {
  describe(task) {
    if (task.dir === 'hoeren') return `🔊 Hören → ${task.lesson.sides[targetSide(task.lesson)]}`;
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
    if (listen) bindSpeechControls(card, item[to], langOf(task.lesson, to));
    askTyped(card.querySelector('.answer-area'), {
      placeholder: listen ? `Was hörst du? Auf ${task.lesson.sides[to]} …` : `${task.lesson.sides[to]} schreiben …`,
      answer: item[to],
      alts: item[to + 'Alt'],
      others: othersOf(task, to),
      api, test, again: task.attempts > 0,
      solution: () => (listen ? `<p class="meaning muted">${esc(item[to])} = ${esc(item[from])}</p>` : ''),
    });
  },
};

// --- Hören und Bedeutung antippen --------------------------------------------

export const CHOICE_OPTIONS = 4;   // Antippen: so viele Bedeutungen stehen zur Wahl

export const chooseQuestion = {
  describe: () => '🔊 Hören → Bedeutung',
  pair(task) {
    const en = targetSide(task.lesson);
    return ['🔊', `${task.item[en]} (${task.item[other(en)]})`];
  },
  render(card, task, api, { test }) {
    const en = targetSide(task.lesson);
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
    const opts = shuffle([item[de], ...others.slice(0, CHOICE_OPTIONS - 1)]);
    card.innerHTML = `
      ${speechControls()}
      <p class="muted small">Was bedeutet das Wort?</p>
      <div class="answer-area"></div>`;
    bindSpeechControls(card, item[en], langOf(task.lesson, en));
    askChoice(card.querySelector('.answer-area'), {
      choices: opts, isRight: (o) => o === item[de], api, task, test,
      solution: () => `<p class="meaning muted">${esc(item[en])} = ${esc(item[de])}</p>`,
    });
  },
};

// --- Lückensatz --------------------------------------------------------------
// Im Wort steht "ex": "I {always} go to school by bus." – die geschweiften Klammern
// markieren die Lücke, "|" trennt erlaubte Varianten: "{I am|I'm} ten."
// "exDe" ist die deutsche Übersetzung des Satzes.

export function parseGap(ex) {
  if (!ex) return null;
  const m = String(ex).match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (!m) return null;
  const [answer, ...alts] = m[2].split('|').map((s) => s.trim());
  return { before: m[1], after: m[3], answer, alts, full: m[1] + answer + m[3] };
}

export const gapQuestion = {
  describe: () => '📝 Lückensatz',
  pair(task) {
    const g = parseGap(task.item.ex);
    return [task.item.exDe ?? '', g?.full ?? ''];
  },
  render(card, task, api, { test }) {
    const g = parseGap(task.item.ex);
    const en = targetSide(task.lesson);
    const de = other(en);
    const lang = langOf(task.lesson, en);
    const item = task.item;
    card.innerHTML = `
      <p class="gap-sentence">${esc(g.before)}<span class="gap">?</span>${esc(g.after)}</p>
      <p class="muted small">Gesucht: <strong>${esc(item[de])}</strong></p>
      <div class="answer-area"></div>`;
    askTyped(card.querySelector('.answer-area'), {
      placeholder: `Fehlendes Wort auf ${task.lesson.sides[en]} …`,
      answer: g.answer,
      alts: g.alts,
      others: othersOf(task, en),
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
        speak(g.full, lang);
        card.querySelectorAll('[data-act=say]').forEach((b) => b.addEventListener('click', () => speak(g.full, lang)));
      },
    });
  },
};


// --- Grammatik: richtige Form antippen ----------------------------------------
// Wort mit "ex": "Tom {is} my brother." und "choices": ["am", "is", "are"].

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

export const formQuestion = {
  describe: () => '✏️ Richtige Form',
  pair(task) {
    const g = parseGap(task.item.ex);
    return [task.item.exDe ?? '', g?.full ?? ''];
  },
  render(card, task, api, { test }) {
    const item = task.item;
    const g = parseGap(item.ex);
    const atStart = !g.before.trim();
    const choices = (item.choices ?? ['am', 'is', 'are']).map((c) => (atStart ? cap(c) : c));
    const same = (c) => c.toLowerCase() === g.answer.toLowerCase();
    card.innerHTML = `
      <p class="gap-sentence">${esc(g.before)}<span class="gap">?</span>${esc(g.after)}</p>
      ${item.exDe ? `<p class="muted small">${esc(item.exDe)}</p>` : ''}
      <div class="answer-area"></div>`;
    askChoice(card.querySelector('.answer-area'), {
      choices, isRight: same, api, task, test, compact: true,
      onAnswered: (right) => {
        const gap = card.querySelector('.gap');
        gap.textContent = g.answer;
        gap.classList.add(right ? 'gap-right' : 'gap-wrong');
        speak(g.full, langOf(task.lesson));
      },
    });
  },
};

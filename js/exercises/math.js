// Mathe-Aufgaben (Lektionsart „mathe“, Übungsarten „rechnen“ und „experte“).
// Eintrag: "a" Aufgabe, "b" Lösung, optional "bAlt" (weitere richtige Schreibweisen),
// "choices" (Antwort antippen statt eintippen, z. B. ["<", ">"]), "level" (Stufe, levels.js),
// eine Grafik – "line" (Zahlenstrahl, numberline.js), "chart" oder "tally" (Diagramm,
// Strichliste, charts.js) – und "why" (Erklärung, erscheint nach dem Antworten).

import { esc } from '../util.js';
import { levelInfo } from '../levels.js';
import { askTyped, askChoice } from './answer.js';
import { numberLine } from './numberline.js';
import { chart, tallyTable } from './charts.js';

// 48 000 = 48000 = 48.000; xliv = XLIV
export const mathNorm = (s) => String(s).normalize('NFC').replace(/[\s. ]/g, '').toUpperCase();
const isNumber = (s) => /^[\d\s.]+$/.test(s);

// Grafik zur Aufgabe (Zahlenstrahl, Diagramm oder Strichliste).
const figure = (item) => (item.line ? numberLine(item.line) : '') + (item.chart ? chart(item.chart) : '') + (item.tally ? tallyTable(item.tally) : '');

export const mathQuestion = {
  // Stufe sichtbar machen: 🟢 Basis · 🔵 Fortgeschritten · 🟣 Experte
  describe: (task) => (task.item.level ? `${levelInfo(task.item).icon} ${levelInfo(task.item).name}` : '✏️ Aufgabe'),
  pair: (task) => [task.item.a, task.item.b],
  render(card, task, api, { test }) {
    const item = task.item;
    const lv = item.level ? levelInfo(item) : null;
    const why = () => (item.why ? `<p class="meaning muted">💡 ${esc(item.why)}</p>` : '');
    card.innerHTML = `
      ${lv ? `<div class="level-tag lv${item.level}">${lv.icon} ${esc(lv.name)}</div>` : ''}
      <div class="prompt math-q">${esc(item.a)}</div>
      ${figure(item)}
      <div class="answer-area"></div>`;
    const area = card.querySelector('.answer-area');
    if (item.choices) {
      askChoice(area, {
        choices: item.choices, isRight: (c) => mathNorm(c) === mathNorm(item.b),
        api, task, test, compact: item.choices.length <= 3, solution: why,
      });
    } else {
      askTyped(area, {
        placeholder: 'Lösung …', answer: item.b, alts: item.bAlt, norm: mathNorm, numeric: isNumber(item.b),
        api, test, again: task.attempts > 0, solution: why,
      });
    }
  },
};

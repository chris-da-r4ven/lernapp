// Serie (Tage am Stück) mit Tagesziel und Rettungstag.
//
// Regeln:
// - Ein Tag zählt, wenn an ihm Aufgaben im Wert von mindestens DAY_GOAL gelöst wurden.
//   Jede Aufgabe zählt mit dem Gewicht ihrer Übungsart (Schreiben 1, Antippen 0,2 …),
//   auch wenn sie falsch war – Bemühen zählt, Durchtippen nicht.
// - Ein verpasster Tag lässt die Serie noch nicht reißen: Am Tag danach ist sie
//   „in Gefahr“. Wer an diesem Tag das eigene Tagesziel plus das, was gestern
//   gefehlt hat, schafft, rettet den verpassten Tag – er zählt dann mit.
// - Zwei verpasste Tage hintereinander: Die Serie ist gerissen.
//
// Alles wird aus den gespeicherten Tageswerten berechnet, nichts extra gespeichert.

import { dayKey, addDays } from './util.js';

export const DAY_GOAL = 10;

// Ältere Tage (vor der Gewichtung) haben kein "e": dort zählt jede Antwort voll.
export const dayValue = (x) => (x ? (x.e != null ? x.e / 10 : x.right + x.wrong) : 0);
const words = (days, d) => dayValue(days[dayKey(d)]);

// Für jeden Tag bis heute: zählt er (ok) und wurde er gerettet (rescued)?
function evaluate(days, today) {
  const keys = Object.keys(days).sort();
  const ok = new Map();
  const rescued = new Set();
  if (!keys.length) return { ok, rescued };
  const [y, m, d] = keys[0].split('-').map(Number);
  let cur = new Date(y, m - 1, d);
  let prevOk = false;
  while (dayKey(cur) <= dayKey(today)) {
    const k = dayKey(cur);
    const n = words(days, cur);
    let isOk = n >= DAY_GOAL;
    // Heute kann noch nicht gerettet werden – der Tag läuft ja noch.
    if (!isOk && prevOk && k !== dayKey(today)) {
      const next = addDays(cur, 1);
      if (words(days, next) >= DAY_GOAL + (DAY_GOAL - n)) {
        isOk = true;
        rescued.add(k);
      }
    }
    ok.set(k, isOk);
    prevOk = isOk;
    cur = addDays(cur, 1);
  }
  return { ok, rescued };
}

function countBack(ok, from) {
  let n = 0;
  let d = new Date(from);
  while (ok.get(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

// state:
//   'none'    – noch nie ein Tagesziel geschafft
//   'active'  – Serie läuft (heute schon geschafft oder noch bis heute Abend Zeit)
//   'danger'  – gestern verpasst, heute kann die Serie gerettet werden
//   'broken'  – Serie gerissen
// count:     Länge der Serie (bei 'danger' die Serie, die gerettet werden kann)
// todayDone: heutiges Tagesziel (bzw. Rettungsziel) erreicht
// need:      wie viele Wörter heute insgesamt nötig sind (10, beim Retten mehr)
export function streakInfo(days, today = new Date()) {
  const { ok, rescued } = evaluate(days, today);
  const t = dayKey(today);
  const yesterday = addDays(today, -1);
  const todayWords = words(days, today);
  const base = { todayWords, rescued };

  const before = addDays(today, -2);
  const canRescue = !ok.get(dayKey(yesterday)) && ok.get(dayKey(before));
  if (ok.get(t) && !canRescue) {
    return { ...base, state: 'active', count: countBack(ok, today), todayDone: true, need: DAY_GOAL };
  }
  if (ok.get(dayKey(yesterday))) {
    return { ...base, state: 'active', count: countBack(ok, yesterday), todayDone: false, need: DAY_GOAL };
  }
  if (canRescue) {
    const need = DAY_GOAL + (DAY_GOAL - words(days, yesterday));
    return { ...base, state: 'danger', count: countBack(ok, before), todayDone: false, need };
  }
  const everOk = [...ok.values()].some(Boolean);
  return { ...base, state: everOk ? 'broken' : 'none', count: 0, todayDone: false, need: DAY_GOAL };
}

// Stimmung von Fanny aus der Serie.
export function mood(info) {
  // Am Rettungstag schon das normale Tagesziel geschafft: nicht mehr traurig.
  if (info.state === 'danger' && info.todayWords >= DAY_GOAL) return 'neutral';
  if (info.state === 'danger' || info.state === 'broken') return 'sad';
  if (info.state === 'active' && info.count >= 2) return 'happy';
  return 'neutral';
}

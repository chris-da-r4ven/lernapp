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
// - Joker 🃏 (setzen die Eltern für verpasste Tage): Die Tage zählen nicht mit, reißen die Serie aber
//   nicht – wenn der erste Tag danach das Rettungsziel (2 × Tagesziel) schafft. Ist dieser Tag heute,
//   ist die Serie „in Gefahr“ und kann heute gerettet werden.
//
// Alles wird aus den gespeicherten Tageswerten berechnet, nichts extra gespeichert.

import { dayKey, addDays } from './util.js';

export const DAY_GOAL = 10;

// Ältere Tage (vor der Gewichtung) haben kein "e": dort zählt jede Antwort voll.
export const dayValue = (x) => (x ? (x.e != null ? x.e / 10 : x.right + x.wrong) : 0);
const words = (days, d) => dayValue(days[dayKey(d)]);

export const JOKER_GOAL = 2 * DAY_GOAL;

// Für jeden Tag bis heute: zählt er (ok: true), hält ein Joker die Serie (ok: 'joker'), reißt sie (false)?
// rescued: gerettete Tage (🛟), jokered: per Joker überbrückte Tage (🃏).
function evaluate(days, today, jokers = {}) {
  const keys = Object.keys(days).sort();
  const ok = new Map();
  const rescued = new Set();
  const jokered = new Set();
  if (!keys.length) return { ok, rescued, jokered };
  const t = dayKey(today);
  const isJoker = (k) => Object.hasOwn(jokers, k) && k < t;
  const [y, m, d] = keys[0].split('-').map(Number);
  let cur = new Date(y, m - 1, d);
  let prevOk = false;
  while (dayKey(cur) <= dayKey(today)) {
    const k = dayKey(cur);
    const n = words(days, cur);
    let isOk = n >= DAY_GOAL;
    // Joker: gilt, wenn der erste Tag nach der Joker-Lücke das Rettungsziel schafft – oder dieser Tag heute ist.
    if (!isOk && prevOk && isJoker(k)) {
      let r = addDays(cur, 1);
      while (isJoker(dayKey(r))) r = addDays(r, 1);
      if (dayKey(r) === t || words(days, r) >= JOKER_GOAL) {
        ok.set(k, 'joker');
        jokered.add(k);
        cur = addDays(cur, 1);
        continue;   // prevOk bleibt: die Serie läuft weiter
      }
    }
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
  return { ok, rescued, jokered };
}

// Länge der Serie bis „from“: Joker-Tage halten sie, zählen aber nicht mit.
function countBack(ok, from) {
  let n = 0;
  let d = new Date(from);
  while (ok.get(dayKey(d))) {
    if (ok.get(dayKey(d)) === true) n++;
    d = addDays(d, -1);
  }
  return n;
}

// Für die Eltern: Ist eine Serie gerissen, aber noch per Joker zu retten? Dann die verpassten Tage
// (vom letzten geschafften Tag bis gestern, höchstens 7) und wie lang die Serie war.
export function jokerOffer(days, today = new Date(), jokers = {}) {
  // Auch wenn heute schon geübt wurde (dann läuft eine neue Serie ab 1) – Hauptsache, gestern fehlt
  // und es ist keine normale Rettung (ein verpasster Tag) möglich.
  if (streakInfo(days, today, jokers).state === 'danger') return null;
  const { ok } = evaluate(days, today, jokers);
  if (ok.get(dayKey(addDays(today, -1)))) return null;
  const missed = [];
  let d = addDays(today, -1);
  while (!ok.get(dayKey(d)) && missed.length < 8) { missed.unshift(dayKey(d)); d = addDays(d, -1); }
  if (!ok.get(dayKey(d)) || missed.length > 7) return null;
  return { missed, count: countBack(ok, d) };
}

// state:
//   'none'    – noch nie ein Tagesziel geschafft
//   'active'  – Serie läuft (heute schon geschafft oder noch bis heute Abend Zeit)
//   'danger'  – gestern verpasst, heute kann die Serie gerettet werden
//   'broken'  – Serie gerissen
// count:     Länge der Serie (bei 'danger' die Serie, die gerettet werden kann)
// todayDone: heutiges Tagesziel (bzw. Rettungsziel) erreicht
// need:      wie viele Wörter heute insgesamt nötig sind (10, beim Retten mehr)
export function streakInfo(days, today = new Date(), jokers = {}) {
  const { ok, rescued, jokered } = evaluate(days, today, jokers);
  const t = dayKey(today);
  const yesterday = addDays(today, -1);
  const todayWords = words(days, today);
  const base = { todayWords, rescued, jokered };

  // Gestern per Joker überbrückt: heute ist der Rettungstag.
  if (ok.get(dayKey(yesterday)) === 'joker') {
    const done = todayWords >= JOKER_GOAL;
    return { ...base, state: done ? 'active' : 'danger', joker: !done, count: countBack(ok, done ? today : yesterday), todayDone: done, need: JOKER_GOAL };
  }

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

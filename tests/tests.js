// Selbsttest der Regel-Logik. Aufruf: <app>/tests/ im Browser öffnen.
// Auf dieser Seite arbeitet store.js mit einem eigenen Profil (lernapp.p.test.progress) –
// der echte Lernstand des Geräts wird nie angefasst. Das prüft der letzte Test.

import { streakInfo, mood, DAY_GOAL } from '../js/streak.js';
import { mergeStates } from '../js/merge.js';
import { check, parseGap } from '../js/exercises/questions.js';
import { levelFor, glitterFor } from '../js/pet.js';
import { record, roundBonus, buildRound } from '../js/srs.js';
import { getState, replaceState, migrateLessons, addTestResult, itemState, addPoints, addDayStat, profileId } from '../js/store.js';
import { medalStatus } from '../js/medal.js';
import { unitOf, lessonKey } from '../js/lessons.js';
import { deviceId } from '../js/device.js';
import { MODES } from '../js/exercises/modes.js';
import { modesFor, tasksFor, modeById } from '../js/exercises/registry.js';
import { kindOf, targetSide, towardTarget, langOf, KINDS, isSupported } from '../js/lessons.js';
import { APP_VERSION } from '../js/version.js';
import { dayKey } from '../js/util.js';
import { sanitizeState, SCHEMA, LEGACY_DEVICE } from '../js/validate.js';

const results = [];
let group = '';
const section = (name) => { group = name; };
async function test(name, fn) {
  try { await fn(); results.push({ group, name, ok: true }); }
  catch (e) { results.push({ group, name, ok: false, detail: e.message }); }
}
function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what} erwartet ${b}, war ${a}`);
}
function ok(cond, what) { if (!cond) throw new Error(what); }

const T = new Date(2026, 10, 10, 12);
const key = (off) => dayKey(new Date(2026, 10, 10 + off));
const days = (o) => Object.fromEntries(Object.entries(o).map(([off, v]) =>
  [key(+off), typeof v === 'number' ? { right: v, wrong: 0 } : v]));
const empty = () => ({ items: {}, days: {}, points: 0, pet: null, tests: {}, resetAt: 0 });

const REAL_KEYS = ['lernapp.progress', 'lernapp.p.standard.progress'];
const realBefore = REAL_KEYS.map((k) => localStorage.getItem(k));
const original = JSON.parse(JSON.stringify(getState()));
try {
  // --- Serie --------------------------------------------------------------------
  section('Serie & Tagesziel');
  await test('leer: keine Serie, Fanny neutral', () => {
    const s = streakInfo({}, T); eq(s.state, 'none'); eq(mood(s), 'neutral');
  });
  await test('10 Schreib-Aufgaben heute: Serie 1, geschafft', () => {
    const s = streakInfo(days({ 0: { right: 8, wrong: 2, e: 100 } }), T);
    eq([s.state, s.count, s.todayDone], ['active', 1, true]);
  });
  await test('49 Antipp-Aufgaben (4,9) reichen nicht', () => {
    const s = streakInfo(days({ 0: { right: 49, wrong: 0, e: 98 } }), T); eq(s.todayDone, false);
  });
  await test('50 Antipp-Aufgaben (= 10) reichen', () => {
    const s = streakInfo(days({ 0: { right: 50, wrong: 0, e: 100 } }), T); eq(s.todayDone, true);
  });
  await test('alte Tage ohne Gewichtung zählen jede Antwort', () => {
    const s = streakInfo(days({ '-1': 10, 0: 10 }), T); eq([s.count, s.todayDone], [2, true]); eq(mood(s), 'happy');
  });
  await test('ein verpasster Tag: in Gefahr, Rettung braucht 10 + Fehlmenge', () => {
    const s = streakInfo(days({ '-3': 10, '-2': 10, '-1': 3 }), T);
    eq([s.state, s.count, s.need], ['danger', 2, 17]); eq(mood(s), 'sad');
  });
  await test('Rettung geschafft: verpasster Tag zählt mit', () => {
    const s = streakInfo(days({ '-3': 10, '-2': 10, '-1': 3, 0: 17 }), T);
    eq([s.state, s.count], ['active', 4]); ok(s.rescued.has(key(-1)), 'gestern nicht als gerettet markiert');
  });
  await test('zwei verpasste Tage: Serie gerissen', () => {
    eq(streakInfo(days({ '-4': 10, '-3': 10 }), T).state, 'broken');
  });
  await test(`Tagesziel ist ${DAY_GOAL}`, () => eq(DAY_GOAL, 10));

  // --- Zusammenführen -------------------------------------------------------------
  section('Sicherung zusammenführen');
  const it = (box, h) => ({ box, due: 0, right: box, wrong: 0, wrongs: [], last: Date.UTC(2026, 10, 8, h) });
  await test('neu verbinden: pro Wort gewinnt der neuere Stand, nichts geht verloren', () => {
    const m = mergeStates({ items: { a: it(3, 15), b: it(2, 14) }, points: 500 }, { items: { a: it(1, 10), c: it(4, 9) }, points: 300 });
    eq([m.items.a.box, !!m.items.b, m.items.c.box, m.points], [3, true, 4, 500]);
  });
  await test('Zurücksetzen von außen gewinnt gegen Älteres', () => {
    const m = mergeStates({ items: { a: it(3, 15), b: it(2, 14) }, points: 500 }, { items: { a: it(1, 10) }, points: 300, resetAt: Date.UTC(2026, 10, 8, 16) });
    eq([m.items.a.box, !!m.items.b, m.points], [1, false, 300]);
  });
  await test('nach dem Zurücksetzen Geübtes bleibt', () => {
    const m = mergeStates({ items: { a: it(2, 17) } }, { items: { a: it(1, 10) }, resetAt: Date.UTC(2026, 10, 8, 16) });
    eq(m.items.a.last, Date.UTC(2026, 10, 8, 17));
  });
  await test('Statistik am Gerät zurückgesetzt: alter Stand kommt nicht zurück', () => {
    const m = mergeStates({ items: {}, points: 0, resetAt: Date.UTC(2026, 10, 8, 18) }, { items: { a: it(3, 15) }, points: 900 });
    eq([Object.keys(m.items).length, m.points], [0, 0]);
  });
  await test('Tests werden ohne Doppelte vereinigt', () => {
    const m = mergeStates({ tests: { x: [{ day: '2026-11-07', pct: 95 }] } }, { tests: { x: [{ day: '2026-11-07', pct: 95 }, { day: '2026-11-08', pct: 90 }] } });
    eq(m.tests.x.length, 2);
  });

  // --- Antworten prüfen -------------------------------------------------------------
  section('Antworten prüfen');
  await test('„Freund / Freundin“: beide Teile einzeln richtig', () => {
    ok(check('Freund', 'Freund / Freundin').ok && check('Freundin', 'Freund / Freundin').ok, 'Teil nicht akzeptiert');
  });
  await test('Varianten (Alt) und Satzzeichen am Ende', () => {
    ok(check('listen', 'to listen', ['listen']).ok, 'Variante');
    ok(check('Can you help me', 'Can you help me?').ok, 'Fragezeichen');
  });
  await test('Apostroph-Varianten gelten gleich', () => ok(check('I’m', "I'm").ok, 'typografischer Apostroph'));
  await test('nur Groß/klein falsch wird erkannt', () => {
    const r = check('monday', 'Monday'); eq([r.ok, r.caseOnly], [false, true]);
  });
  await test('Tippfehler: nächste richtige Schreibweise wird gezeigt', () => eq(check('alwys', 'always').closest, 'always'));
  await test('Lücke mit Varianten', () => {
    const g = parseGap("{I am|I'm} ten."); eq([g.answer, g.alts, g.full], ['I am', ["I'm"], 'I am ten.']);
  });
  await test('Satz ohne Lücke ergibt nichts (kein Absturz)', () => { eq(parseGap('No gap here.'), null); eq(parseGap(undefined), null); });

  // --- Sternchen und Stufen ---------------------------------------------------------
  section('Sternchen, Stufen, Tagesziel-Gewicht');
  await test('Glitzer-Stufen 100 / 300 / 1000 / 4500', () => eq([0, 99, 100, 300, 1000, 4500].map(levelFor), [1, 1, 2, 3, 5, 10]));
  await test('Stufe 1 ohne Glitzer, ab Stufe 2 Sternchen', () => eq([glitterFor(1).sparkles > 0, glitterFor(2).sparkles > 0], [false, true]));
  await test('Rundenbonus nach Gewicht', () => eq([roundBonus([1, 1]), roundBonus([0.2, 0.2]), roundBonus([1.2])], [50, 10, 60]));
  await test('Sternchen pro Wort: Schreiben 5/3, Antippen mindestens 1', () => {
    replaceState(empty());
    eq(record('t/a/x|ab', { correct: true, firstTry: true, weight: 1 }), 5);
    eq(record('t/a/y|ab', { correct: true, firstTry: false, weight: 1 }), 3);
    eq(record('t/a/z|hoeren-wahl', { correct: true, firstTry: true, weight: 0.2 }), 1);
  });
  await test('Tagesziel: Schreiben zählt 1, Antippen 0,2, auch falsche Antworten', () => {
    replaceState(empty());
    record('t/a/x|ab', { correct: true, firstTry: true, effort: 1 });
    record('t/a/y|ab', { correct: false, effort: 1 });
    for (let i = 0; i < 5; i++) record(`t/a/z${i}|hoeren-wahl`, { correct: true, firstTry: true, effort: 0.2 });
    eq(getState().days[dayKey()].e, 30);
  });
  await test('Karteikasten: richtig → Fach hoch, falsch → Fach 1', () => {
    replaceState(empty());
    record('t/a/x|ab', { correct: true, firstTry: true }); record('t/a/x|ab', { correct: true, firstTry: true });
    eq(itemState('t/a/x|ab').box, 2);
    record('t/a/x|ab', { correct: false }); eq(itemState('t/a/x|ab').box, 1);
  });
  await test('Runde: höchstens 15, fällige zuerst', () => {
    replaceState(empty());
    const entries = Array.from({ length: 30 }, (_, i) => ({ item: { b: 'w' + i }, key: `t/a/w${i}|ab` }));
    eq(buildRound(entries).length, 15);
    eq(buildRound(entries, true).length, 30);
  });

  // --- Spielstand prüfen ------------------------------------------------------------
  section('Spielstand prüfen (validate.js)');
  await test('kein Objekt → unbrauchbar', () => { eq(sanitizeState(null), null); eq(sanitizeState('x'), null); eq(sanitizeState([]), null); });
  await test('Sternchen als Text (z. B. eingeschleustes HTML) → 0', () =>
    eq(sanitizeState({ points: '<img src=x onerror=alert(1)>' }).state.points, 0));
  await test('kaputte Einträge fliegen raus, gute bleiben', () => {
    const r = sanitizeState({ items: { ok: { box: 2, due: 1, right: 2, wrong: 0, last: 5 }, bad: 'x', bad2: { box: 9 } },
      days: { '2026-11-08': { right: 3, wrong: 1, e: 40 }, 'gestern': { right: 1 } } });
    eq([Object.keys(r.state.items), Object.keys(r.state.days), r.dropped], [['ok'], ['2026-11-08'], 3]);
  });
  await test('falsche Typen werden ersetzt statt abzustürzen', () => {
    const r = sanitizeState({ items: null, days: null, tests: { x: 'kaputt', y: [{ day: '2026-11-08', pct: 95 }, { day: 'x', pct: 1 }] } });
    eq([r.state.items, r.state.days, r.state.tests], [{}, {}, { y: [{ day: '2026-11-08', pct: 95 }] }]);
  });
  await test('unbrauchbare Sicherung wird beim Zusammenführen als leer behandelt', () => {
    const m = mergeStates({ items: { a: it(3, 15) }, points: 40 }, 'Müll');
    eq([m.items.a.box, m.points], [3, 40]);
  });
  await test('replaceState lehnt Unbrauchbares ab, Stand bleibt', () => {
    replaceState({ ...empty(), points: 77 });
    eq(replaceState('kaputt'), false); eq(getState().points, 77);
  });

  // --- Mehrere Geräte & Format 2 ------------------------------------------------------
  section('Mehrere Geräte & Format');
  await test('alter Stand (ohne v) wird verlustfrei umgewandelt: Werte zählen als Gerät „alt“', () => {
    const r = sanitizeState({ points: 1045, days: { '2026-11-08': { right: 30, wrong: 4, e: 210 } } }).state;
    eq([r.v, r.points, r.pointsBy, r.days['2026-11-08'].right, r.days['2026-11-08'].e, Object.keys(r.days['2026-11-08'].by)],
      [SCHEMA, 1045, { [LEGACY_DEVICE]: 1045 }, 30, 210, [LEGACY_DEVICE]]);
  });
  await test('Stand im neuen Format bleibt beim Prüfen gleich', () => {
    const a = sanitizeState({ v: 2, pointsBy: { gA: 10, gB: 5 }, days: { '2026-11-08': { by: { gA: { right: 3, wrong: 1, e: 30, s: { englisch: 30 } } } } } }).state;
    eq(sanitizeState(a).state, a);
    eq([a.points, a.days['2026-11-08'].s], [15, { englisch: 30 }]);
  });
  await test('zwei Geräte üben zwischen zwei Sicherungen: Sternchen und Tageswerte addieren sich', () => {
    const base = { v: 2, pointsBy: { alt: 100 }, days: {} };
    const tablet = { ...base, pointsBy: { alt: 100, gA: 20 }, days: { '2026-11-08': { by: { gA: { right: 5, wrong: 0, e: 50 } } } } };
    const handy = { ...base, pointsBy: { alt: 100, gB: 7 }, days: { '2026-11-08': { by: { gB: { right: 2, wrong: 1, e: 30 } } } } };
    const m = mergeStates(tablet, handy);
    eq([m.points, m.days['2026-11-08'].right, m.days['2026-11-08'].wrong, m.days['2026-11-08'].e], [127, 7, 1, 80]);
    eq(mergeStates(m, handy).points, 127, 'nochmal zusammenführen zählt nicht doppelt');
  });
  await test('neueres Format wird erkannt (Sicherung lehnt es ab)', () => {
    eq([sanitizeState({ v: SCHEMA + 1 }).newer, sanitizeState({ v: SCHEMA }).newer, sanitizeState({}).newer], [true, false, false]);
  });
  await test('Sternchen und Tageswerte zählen beim eigenen Gerät, pro Fach', () => {
    replaceState({ ...empty(), points: 50 });         // alter Stand → Gerät „alt“
    addPoints(3); addDayStat(true, 1, 'englisch'); addDayStat(false, 0.2, 'englisch');
    const st = getState(); const d = st.days[dayKey()];
    eq([st.points, st.pointsBy[deviceId()], st.pointsBy[LEGACY_DEVICE]], [53, 3, 50]);
    eq([d.right, d.wrong, d.e, d.s, d.by[deviceId()].right], [1, 1, 12, { englisch: 12 }, 1]);
  });
  await test('Selbsttest läuft im eigenen Profil', () => eq(profileId(), 'test'));

  // --- Medaille und Umzüge ----------------------------------------------------------
  section('Medaille & Umzüge');
  await test('2× ≥ 90 % an verschiedenen Tagen = Medaille', () => {
    replaceState({ ...empty(), tests: { 'e/l': [{ day: '2026-01-01', pct: 95 }] } });
    addTestResult('e/l', 90); eq(medalStatus('e/l').medal, true);
  });
  await test('2× ≥ 90 % am selben Tag = noch keine Medaille', () => {
    replaceState(empty()); addTestResult('e/l', 100); addTestResult('e/l', 100);
    eq([medalStatus('e/l').medal, medalStatus('e/l').goodDays], [false, 1]);
  });
  await test('Umzug: Lernstand zieht in die neue Lektion, neuerer Stand gewinnt', () => {
    replaceState({ ...empty(), items: { 'e/alt/w|ab': it(3, 15), 'e/neu/w|ab': it(1, 10), 'e/alt/v|ab': it(2, 9) } });
    migrateLessons('e', { alt: 'neu' });
    const k = Object.keys(getState().items).sort();
    eq(k, ['e/neu/v|ab', 'e/neu/w|ab']); eq(getState().items['e/neu/w|ab'].box, 3);
  });

  await test('Bilanz-Einheit: Wörter, Sätze oder gemischt Aufgaben', () => {
    eq([unitOf([{ kind: 'vokabeln' }]), unitOf([{ kind: 'grammatik' }]), unitOf([{ kind: 'vokabeln' }, { kind: 'grammatik' }])],
      [['Wort', 'Wörter'], ['Satz', 'Sätze'], ['Aufgabe', 'Aufgaben']]);
    eq(lessonKey('englisch', { id: 'u1' }), 'englisch/u1');
  });

  // --- Übungsarten --------------------------------------------------------------------
  section('Übungsarten (modes.js)');
  await test('ids eindeutig, Pflichtfelder vorhanden', () => {
    eq(new Set(MODES.map((m) => m.id)).size, MODES.length, 'eindeutige ids');
    for (const m of MODES) {
      for (const f of ['kinds', 'group', 'label', 'short', 'weight', 'learnOrder', 'question']) ok(m[f] != null, `${m.id}: ${f} fehlt`);
      for (const f of ['describe', 'pair', 'render']) ok(typeof m.question[f] === 'function', `${m.id}: question.${f} fehlt`);
      for (const k of m.kinds) ok(KINDS[k], `${m.id}: unbekannte Lektionsart ${k}`);
      ok(m.weight > 0, `${m.id}: Gewicht`);
    }
  });
  await test('Lern-Reihenfolge eindeutig', () => eq(new Set(MODES.map((m) => m.learnOrder)).size, MODES.length));
  await test('vereinbarte Gewichte (Sternchen und Tagesziel)', () => eq(
    Object.fromEntries(MODES.map((m) => [m.id, m.weight])),
    { ab: 1, ba: 1, hoeren: 1.2, 'hoeren-wahl': 0.2, satz: 0.8, form: 0.3 },
  ));
  await test('Lernstand-Kennungen unverändert (ab, ba, hoeren, hoeren-wahl, satz, form)', () =>
    ok(['ab', 'ba', 'hoeren', 'hoeren-wahl', 'satz', 'form'].every((id) => modeById(id)), 'Kennung fehlt'));

  await test('unbekannte Lektionsart wird ausgeblendet, alte Lektionen ohne kind gehen weiter', () => {
    eq([isSupported({ kind: 'quiz', items: [] }), isSupported({ items: [] }), isSupported({ kind: 'grammatik', items: [] })], [false, true, true]);
  });

  // --- Inhalte --------------------------------------------------------------------------
  section('Inhalte (content/)');
  const idx = await (await fetch('../content/index.json', { cache: 'no-store' })).json();
  await test(`Inhalte passen zu dieser App (minApp ${idx.minApp} ≤ ${APP_VERSION})`, () => ok((idx.minApp ?? 0) <= APP_VERSION, 'Inhalte brauchen eine neuere App'));
  await test('tools/inhalte.py kennt dieselben Übungsarten und Lektionsarten wie die App', () => {
    eq(idx.app?.modes, MODES.map((m) => m.id).sort(), 'Übungsarten');
    eq(idx.app?.kinds, Object.keys(KINDS).sort(), 'Lektionsarten');
  });
  for (const s of idx.subjects) {
    for (const l of s.lessons) {
      const lesson = await (await fetch(`../content/${l.file}`, { cache: 'no-store' })).json();
      await test(`${s.id}/${l.id}: Übungsarten und Aufgaben in Ordnung`, () => {
        ok(KINDS[kindOf(lesson)], 'Lektionsart');
        ok(['a', 'b'].includes(targetSide(lesson)), 'Lernsprache');
        ok(langOf(lesson), 'Sprache');
        eq(new Set(lesson.items.map((i) => i.id)).size, lesson.items.length, 'eindeutige Wort-IDs');
        ok(lesson.items.every((i) => i.id), 'jedes Wort hat eine id');
        const modes = modesFor(lesson);
        ok(modes.length > 0, 'keine Übungsart');
        for (const m of modes) {
          const tasks = tasksFor(s.id, lesson, m.id);
          ok(tasks.length > 0, `${m.id}: keine Aufgaben`);
          for (const t of tasks) {
            const p = m.question.pair(t);
            ok(Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === 'string'), `${m.id}/${t.item.id}: pair()`);
            if (m.id === 'satz' || m.id === 'form') ok(parseGap(t.item.ex), `${m.id}/${t.item.id}: Lücke`);
          }
        }
        if (KINDS[kindOf(lesson)].testable) ok(['ab', 'ba'].includes(towardTarget(lesson)), 'Testrichtung');
      });
    }
  }
  section('Schutz des echten Lernstands');
  await test('Selbsttest hat den echten Lernstand nicht angefasst', () =>
    eq(REAL_KEYS.map((k) => localStorage.getItem(k)), realBefore));
} finally {
  replaceState(original);
  try { localStorage.removeItem('lernapp.p.test.progress'); localStorage.removeItem('lernapp.test.progress'); } catch { /* egal */ }
}

// --- Ausgabe ------------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
const out = document.getElementById('out');
const groups = [...new Set(results.map((r) => r.group))];
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
out.innerHTML = `
  <p class="sum ${failed.length ? 'bad' : 'ok'}">${failed.length ? `❌ ${failed.length} von ${results.length} Tests fehlgeschlagen` : `✅ Alle ${results.length} Tests bestanden`}</p>
  ${groups.map((g) => `<h2>${esc(g)}</h2><ul>${results.filter((r) => r.group === g).map((r) =>
    `<li class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'} ${esc(r.name)}${r.detail ? `<div class="detail">${esc(r.detail)}</div>` : ''}</li>`).join('')}</ul>`).join('')}`;
window.testResults = { total: results.length, failed: failed.map((r) => `${r.group}: ${r.name} – ${r.detail}`) };

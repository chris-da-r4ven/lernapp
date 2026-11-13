// Fachseite: Lektionen nach Gruppen (z. B. „Schule & ich“, „Feiertage“, „Grammatik“).
// Lektionen mit Medaille 🏅 rutschen in ihrer Gruppe nach unten in „Kannst du schon gut“.
// Jede Lektion ist eine Stallbox: oben offen = offen, ganz zu = die nächste (Geheimnis-Feld).

import { getSubject, getLesson } from '../content.js';
import { starsFor } from '../srs.js';
import { masteryOf, kindInfo, kindOf } from '../lessons.js';
import { lessonMedal, MEDAL_RULE, testReady } from '../medal.js';
import { esc, stars } from '../util.js';
import { etappenFor, progress, lessonAccess } from '../path.js';

export function subjectView(el, sid) {
  const subject = getSubject(sid);
  if (!subject) { location.hash = '#/'; return; }

  // Lektionen nacheinander: offen, Geheimnis-Feld (die nächste) oder noch unsichtbar.
  const access = lessonAccess(sid, subject.lessons.map((l) => getLesson(sid, l.id)).filter(Boolean));
  // Gruppen in der Reihenfolge, in der sie im Inhaltsverzeichnis vorkommen.
  const groups = new Map();
  for (const l of subject.lessons) {
    const lesson = getLesson(sid, l.id);
    if (!lesson) continue;
    const a = access.get(l.id);
    if (a === 'hidden') continue;
    if (a === 'secret') {
      // Geheimnis-Feld an seinem Platz: Vorgänger = die Lektion davor in der Reihenfolge
      const i = subject.lessons.indexOf(l);
      const g = l.group ?? 'Lektionen';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push({ secret: true, prev: i > 0 ? subject.lessons[i - 1].title : null, medal: { medal: false } });
      continue;
    }
    const g = l.group ?? 'Lektionen';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ l, lesson, medal: lessonMedal(sid, lesson) });
  }

  const testLabel = [...groups.values()].flat().filter((x) => x.lesson).map((x) => kindInfo(x.lesson)).find((k) => k.testable)?.testLabel;

  // Aktuelle Lektion: die erste offene, deren Lernweg noch nicht geschafft ist
  const nowId = subject.lessons.find((l) => {
    const lesson = getLesson(sid, l.id);
    if (!lesson || access.get(l.id) !== 'open') return false;
    const way = progress(etappenFor(sid, lesson));
    return way.total > 0 && !way.complete;
  })?.id;

  // Stallbox: Tür oben offen = Lektion offen (ihr Symbol schaut heraus), ganz zu = kommt als Nächstes.
  const secretTile = ({ prev }) => `
      <div class="stall locked" role="img" aria-label="Nächste Lektion, noch verschlossen">
        <div class="stall-beam"><span class="stall-plate">? ? ?</span></div>
        <div class="stall-top closed"><span class="stall-q">?</span></div>
        <div class="stall-bottom"></div>
        <div class="stall-hay"><div style="width:0"></div></div>
        <div class="stall-foot">${prev ? `Öffnet sich nach „${esc(prev)}“` : 'Öffnet sich bald'}</div>
      </div>`;
  const tile = (x) => {
    if (x.secret) return secretTile(x);
    const { l, lesson, medal } = x;
    const m = masteryOf(sid, lesson);
    const way = progress(etappenFor(sid, lesson));
    const share = way.total ? way.done / way.total : m;
    const foot = way.complete ? '🎀 Lernweg geschafft' : way.total ? `Etappe ${way.done + 1} von ${way.total}` : `${Math.round(m * 100)} % sicher`;
    return `
      <a class="stall${l.id === nowId ? ' now' : ''}${medal.medal ? ' has-medal' : ''}" href="#/lektion/${encodeURIComponent(sid)}/${encodeURIComponent(l.id)}">
        <div class="stall-beam"><span class="stall-plate${/\S{15,}/u.test(l.title) ? ' long' : ''}">${esc(l.title)}</span></div>
        <div class="stall-top" aria-hidden="true">${esc(lessonIcon(lesson))}</div>
        <div class="stall-bottom" aria-hidden="true">${way.complete ? '<span class="stall-badge">🎀</span>' : ''}${medal.medal ? '<span class="stall-badge medal">🏅</span>' : ''}</div>
        <div class="stall-hay" aria-hidden="true"><div style="width:${Math.round(share * 100)}%"></div></div>
        <div class="stall-foot"><span>${foot}</span>${stars(starsFor(m))}</div>
        ${testReady(sid, lesson) ? '<div class="stall-foot ready-hint">📝 Bereit für den Test!</div>' : ''}
      </a>`;
  };

  el.innerHTML = `
    <a class="back" href="#/">← Start</a>
    <div class="fach-banner${Object.hasOwn(BANNERS, sid) ? ` ${BANNERS[sid]}` : ''}"><img src="${bannerFor(sid)}" alt=""><h1>${esc(subject.icon ?? '')} ${esc(subject.name)}</h1></div>
    <p class="muted small">${esc(MEDAL_RULE)}</p>
    ${[...groups].map(([name, list]) => {
      const open = list.filter((x) => !x.medal.medal);
      const done = list.filter((x) => x.medal.medal);
      return `
        <h2 class="stall-group">${esc(name)}</h2>
        <section class="stalls">${open.map(tile).join('')}</section>
        ${done.length ? `
          <details class="mastered"${open.length ? '' : ' open'}>
            <summary>🏅 Kannst du schon gut (${done.length})</summary>
            <section class="stalls">${done.map(tile).join('')}</section>
          </details>` : ''}`;
    }).join('')}
    <div class="actions">
      <a class="btn" href="#/test/${encodeURIComponent(sid)}">📝 Test-Modus${testLabel ? ` – ${esc(testLabel)}` : ''}</a>
    </div>`;
}

// Fächer mit eigenem Banner (img/banner-<fach>.svg aus tools/hofkarte), sonst der Hof. Feste Liste:
// Bildadressen nie aus Inhaltsdaten.
const BANNERS = { englisch: 'banner-own', mathe: 'banner-own' };
export const bannerFor = (sid) => (Object.hasOwn(BANNERS, sid) ? `img/banner-${sid}.svg` : 'img/hof-neutral.svg');

// Symbol der Lektion (Feld "icon"), sonst nach Art
const KIND_ICON = { vokabeln: '📖', mathe: '🔢', grammatik: '🧩' };
export const lessonIcon = (lesson) => (typeof lesson.icon === 'string' && lesson.icon ? lesson.icon : KIND_ICON[kindOf(lesson)] ?? '📖');

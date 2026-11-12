// Schwierigkeitsstufen von Aufgaben – ohne Abhängigkeiten, damit srs.js und lessons.js sie nutzen können.
//
//   1 Basis – zum Aufwärmen, höchstens WARMUP pro Runde
//   2 Fortgeschritten – das Niveau der Lektion
//   3 Experte – über das Buch hinaus, nur auf Wunsch (eigene Übungsart „experte“),
//     zählt nicht für Test, Medaille und „sicher“
// factor: Denkaufwand der Stufe (weights.js) – Grundlage für Sternchen und Tagesziel, wenn die Aufgabe
// keinen eigenen "denken"-Wert hat.
export const LEVELS = {
  1: { name: 'Basis', icon: '🟢', factor: 0.5 },
  2: { name: 'Fortgeschritten', icon: '🔵', factor: 1 },
  3: { name: 'Experte', icon: '🟣', factor: 1.5 },
};
export const WARMUP = 2;
export const levelOf = (item) => (LEVELS[item?.level] ? item.level : 2);
export const levelInfo = (item) => LEVELS[levelOf(item)];
export const hasLevels = (lesson) => Boolean(lesson?.items?.some((it) => it.level));
export const isBasic = (item) => levelOf(item) === 1;

// Runde mit Aufwärmen: höchstens WARMUP Basis-Aufgaben vorneweg, dann die anspruchsvolleren.
// Basis füllt nur auf, wenn sonst zu wenig da ist. Für Lektions-Runden (srs.js) und „Jetzt üben“.
// ordered: Kandidaten in Wunsch-Reihenfolge (jeweils mit .item), size: gewünschte Rundengröße.
export function withWarmup(ordered, size) {
  const basic = (e) => isBasic(e.item);
  const warm = ordered.filter(basic).slice(0, WARMUP);
  const round = [...warm, ...ordered.filter((e) => !basic(e))].slice(0, size);
  if (round.length < size) round.push(...ordered.filter((e) => basic(e) && !warm.includes(e)).slice(0, size - round.length));
  return round;
}

// Schwierigkeitsstufen von Aufgaben – ohne Abhängigkeiten, damit srs.js und lessons.js sie nutzen können.
//
//   1 Basis – zum Aufwärmen, höchstens WARMUP pro Runde
//   2 Fortgeschritten – das Niveau der Lektion
//   3 Experte – über das Buch hinaus, nur auf Wunsch (eigene Übungsart „experte“),
//     zählt nicht für Test, Medaille und „sicher“
// factor: Sternchen und Tagesziel im Verhältnis zu Stufe 2.
export const LEVELS = {
  1: { name: 'Basis', icon: '🟢', factor: 0.5 },
  2: { name: 'Fortgeschritten', icon: '🔵', factor: 1 },
  3: { name: 'Experte', icon: '🟣', factor: 1.5 },
};
export const WARMUP = 2;
export const levelOf = (item) => (LEVELS[item?.level] ? item.level : 2);
export const levelInfo = (item) => LEVELS[levelOf(item)];
export const hasLevels = (lesson) => Boolean(lesson?.items?.some((it) => it.level));

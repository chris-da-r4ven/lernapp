// Platzhalter für das Tier. Aussehen, Name und Wachstumsstufen
// werden später gemeinsam mit dem Kind festgelegt und hier eingesetzt.

export const POINTS_PER_LEVEL = 100;

export function petStatus(points, pet) {
  return {
    name: pet?.name ?? null,
    level: Math.floor(points / POINTS_PER_LEVEL) + 1,
    progress: (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL,
    toNext: POINTS_PER_LEVEL - (points % POINTS_PER_LEVEL),
  };
}

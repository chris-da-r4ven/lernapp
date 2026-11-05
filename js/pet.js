// Das Tier der App. Aussehen und Name hat das Kind festgelegt.
// Wachstumsstufen sind noch offen und werden gemeinsam mit dem Kind entwickelt.

export const PET = {
  name: 'Fanny',
  image: 'img/fanny.webp',
  imageFull: 'img/fanny-full.webp',
  alt: 'Fanny, ein Apfelschimmel mit rosa Mähne, roten Schleifen und Glitzerhalfter',
};

export const POINTS_PER_LEVEL = 100;

export function petStatus(points) {
  return {
    ...PET,
    level: Math.floor(points / POINTS_PER_LEVEL) + 1,
    progress: (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL,
    toNext: POINTS_PER_LEVEL - (points % POINTS_PER_LEVEL),
  };
}

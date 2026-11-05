// Das Tier der App. Aussehen und Name hat das Kind festgelegt.
//
// Zwei unabhängige Dinge:
// - Stimmung (glücklich / neutral / leicht traurig) kommt von der Serie → eigenes Bild je Stimmung.
// - Glitzer kommt von der Stufe (Punkte) → per Code über das Bild gelegt, geht nie verloren.

export const PET = {
  name: 'Fanny',
  alt: 'Fanny, ein Apfelschimmel mit rosa Mähne, roten Schleifen und Glitzerhalfter',
  // Neue Bilder: hier eintragen und in sw.js in die Liste aufnehmen.
  images: {
    happy:   { portrait: 'img/fanny-happy.webp', full: 'img/fanny-happy-full.webp' },
    neutral: { portrait: 'img/fanny.webp',       full: 'img/fanny-full.webp' },
    sad:     { portrait: 'img/fanny-sad.webp',   full: 'img/fanny-sad-full.webp' },
  },
};

// Jede Stufe braucht 100 Punkte mehr als die vorige:
// Stufe 2 ab 100, 3 ab 300, 4 ab 600, 5 ab 1000, 10 ab 4500 Punkten.
const STEP = 100;
export const levelStart = (level) => (STEP / 2) * (level - 1) * level;

export function levelFor(points) {
  let level = 1;
  while (levelStart(level + 1) <= points) level++;
  return level;
}

// Ab dieser Stufe wird der Glitzer nicht mehr prächtiger.
export const MAX_GLITTER_LEVEL = 12;

// Wie Fanny auf jeder Stufe glitzert.
export function glitterFor(level) {
  const l = Math.min(level, MAX_GLITTER_LEVEL);
  return {
    level: l,
    sparkles: l <= 1 ? 0 : Math.min(4 + (l - 2) * 2, 22), // Anzahl Sternchen
    size: l >= 5 ? 1.35 : 1,                              // größere Sternchen ab Stufe 5
    glow: l >= 4,                                         // weiches Leuchten ab Stufe 4
    color: l >= 9 ? 'rainbow' : l >= 6 ? 'gold' : 'silver',
    ring: l >= 7,                                         // schimmernder Rand ab Stufe 7
  };
}

export function petStatus(points, mood) {
  const level = levelFor(points);
  const from = levelStart(level);
  const to = levelStart(level + 1);
  return {
    name: PET.name,
    alt: PET.alt,
    mood,
    image: PET.images[mood].portrait,
    imageFull: PET.images[mood].full,
    level,
    progress: (points - from) / (to - from),
    toNext: to - points,
    glitter: glitterFor(level),
  };
}

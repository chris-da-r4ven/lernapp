// Fanny mit Glitzer – auf der Startseite und bei der Rundenbilanz.

import { esc } from '../util.js';

// Bild mit Glitzer. Fanny ist freigestellt: unten schneidet der Kreis sie ab,
// oben ragen Ohren und Mähne heraus. Die Sternchen sitzen fest verteilt um das Porträt,
// damit sie nicht bei jedem Öffnen der Seite woanders sind.
export function portrait(pet) {
  const g = pet.glitter;
  const sparkles = [];
  for (let i = 0; i < g.sparkles; i++) {
    const angle = i * 137.5 - 60;            // goldener Winkel → gleichmäßig verteilt
    const r = 44 + ((i * 7) % 5) * 2.5;       // Abstand zur Mitte in % der Fläche
    const x = 50 + r * Math.cos((angle * Math.PI) / 180);
    const y = 50 + r * Math.sin((angle * Math.PI) / 180);
    const hue = (i * 47) % 360;
    sparkles.push(`<span class="sparkle" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--d:${((i * 0.37) % 2.4).toFixed(2)}s;--h:${hue}">✦</span>`);
  }
  const cls = ['pet-portrait', `glitter-${g.color}`, g.glow ? 'glow' : '', g.ring ? 'ring' : '']
    .filter(Boolean).join(' ');
  return `
    <span class="${cls}" style="--sparkle-size:${g.size}">
      <span class="pet-disc"></span>
      <span class="pet-pop"><img class="pet-img" src="${esc(pet.image)}" alt="${esc(pet.alt)}" width="132" height="198"></span>
      <span class="sparkles" aria-hidden="true">${sparkles.join('')}</span>
    </span>`;
}

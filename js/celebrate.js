// Kurzer Jubel: Karte mit Konfetti über der Seite. Antippen schließt.
// Ohne Bewegung bei „Bewegung reduzieren“ (CSS).

import { esc } from './util.js';

const COLORS = ['#f5b400', '#e5484d', '#4f6cf7', '#1f9d55', '#f28bb8', '#ffffff'];

// iconHtml: fertiges HTML statt des Emoji-Icons (z. B. der Siegerkranz).
export function celebrate({ icon = '🏆', iconHtml = '', title, text = '', button = 'Juhu! 🎉' }) {
  document.querySelector('.celebrate')?.remove();
  const bits = Array.from({ length: 36 }, (_, i) => {
    const left = Math.round(Math.random() * 100);
    const delay = (Math.random() * 0.8).toFixed(2);
    const dur = (2.2 + Math.random() * 1.6).toFixed(2);
    const rot = Math.round(Math.random() * 360);
    return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></i>`;
  }).join('');
  const box = document.createElement('div');
  box.className = 'celebrate';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', title);
  box.innerHTML = `
    <div class="confetti" aria-hidden="true">${bits}</div>
    <div class="celebrate-card">
      <div class="celebrate-icon" aria-hidden="true">${iconHtml || esc(icon)}</div>
      <h2>${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
      <button class="btn primary" type="button">${esc(button)}</button>
    </div>`;
  const close = () => box.remove();
  box.addEventListener('click', (ev) => { if (ev.target === box || ev.target.closest('button')) close(); });
  document.body.append(box);
  box.querySelector('button').focus();
}

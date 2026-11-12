export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lokales Datum als YYYY-MM-DD (nicht UTC, sonst springt der Tag abends um).
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

let toastTimer;
export function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

export function stars(n, max = 3) {
  return `<span class="stars" aria-label="${n} von ${max} Sternen">` +
    `<span class="on">${'★'.repeat(n)}</span><span class="off">${'★'.repeat(max - n)}</span></span>`;
}

// Zahl mit höchstens einer Nachkommastelle, deutsch: 5.55 → „5,6“, 10 → „10“.
export const fmt1 = (x) => (Math.round(x * 10) / 10).toLocaleString('de-DE');

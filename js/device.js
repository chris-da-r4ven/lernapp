// Kennung dieses Geräts (zufällig, einmal erzeugt, nur auf dem Gerät gespeichert).
// Damit zählen Sternchen und Übungszeiten pro Gerät – beim Zusammenführen mehrerer Geräte
// wird summiert statt überschrieben, es geht nichts verloren.

const KEY = 'lernapp.geraet';
let id = null;

export function deviceId() {
  if (id) return id;
  try {
    id = localStorage.getItem(KEY);
    if (!id) {
      id = 'g' + (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 10);
      localStorage.setItem(KEY, id);
    }
  } catch {
    id = id ?? 'g-ohne-speicher';
  }
  return id;
}

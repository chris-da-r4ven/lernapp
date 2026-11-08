// Seitenwechsel ohne Import-Kreis: app.js meldet hier seine render-Funktion an,
// andere Teile (Inhalte-Update, Sicherung) können neu zeichnen lassen, ohne app.js zu importieren.

let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const rerender = () => renderer();

// Mitten in einer Übung die Seite nicht neu zeichnen.
export const practicing = () => /^#\/(ueben|jetzt|test)\//.test(location.hash + '/');

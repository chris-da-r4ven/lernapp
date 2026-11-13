// Funktionsstand der App für Inhalte („was kann diese App anzeigen?“).
// Hochzählen, wenn neue Lektionsarten (lessons.js KINDS), Übungsarten (modes.js) oder neue
// Felder in Lektionen dazukommen. tools/inhalte.py schreibt diesen Wert als "minApp" in
// content/index.json – ein Gerät mit älterer App behält dann seine bisherigen Inhalte, bis
// die neue App da ist (Updates der App kommen über sw.js).
export const APP_VERSION = 5;

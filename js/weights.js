// Schwere einer Aufgabe = Antwortform × Denkaufwand – für alle Fächer und Übungsarten gleich.
// Daraus ergeben sich Sternchen (srs.pointsFor) und der Beitrag zum Tagesziel 🎯 (store.addDayStat).
//
// Antwortform: wie viel Arbeit die Antwort ist und wie viel Raten hilft
//   Eintippen 1 · Hören + schreiben (Diktat) 1,2 · Antippen aus k Antworten: 1 − 1/k
//   (2 Antworten 0,5 · 3 Antworten 0,67 · 4 Antworten 0,75 – der Rate-Vorteil ist herausgerechnet)
//
// Denkaufwand: was im Kopf passieren muss
//   erkennen 0,3 (Gehörtes einer Bedeutung zuordnen) · routine 0,5 (Regel anwenden, z. B. am/is/are)
//   kontext 0,8 (abrufen mit Hilfe, Lückensatz) · abrufen 1 (Vokabel schreiben, ein Denkschritt)
//   schritte 1,5 (mehrere Schritte) · knobeln 2 (Transfer, Knobelaufgabe)
// Mathe: ohne Angabe aus der Stufe (levels.js: Basis 0,5 · Fortgeschritten 1 · Experte 1,5),
// einzelne Aufgaben mit "denken": 2 (Knobeln) o. Ä. in der Lektionsdatei.
//
// Gegenprobe (so war es vorher vereinbart): Schreiben 1, Diktat 1,2, Lückensatz 0,8,
// Hören → antippen 0,75 × 0,3 ≈ 0,2, am/is/are 0,67 × 0,5 ≈ 0,3.

export const ANSWER = { tippen: 1, diktat: 1.2 };
export const choiceFactor = (k) => (k >= 2 ? 1 - 1 / k : 1);

export const THINK = { erkennen: 0.3, routine: 0.5, kontext: 0.8, abrufen: 1, schritte: 1.5, knobeln: 2 };
export const THINK_VALUES = Object.values(THINK);

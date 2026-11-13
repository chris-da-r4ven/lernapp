# Plan: Lernweg mit Etappen auf Fannys Hof

Stand: 13.11.2026 · Version 3 – geprüft von Pädagoge, Architekt, Engineer und Security, Befunde eingearbeitet.
Entscheidungen von Chris (13.11.): Turnier direkt nach der letzten Etappe, Öffnen nur durch Eltern, Knobel-Parcours gleichwertig.

## 1. Ziel

Heute entscheidet die App im Hintergrund, was geübt wird („Jetzt üben“, Übungsart-Knöpfe pro Lektion).
Künftig sieht das Kind **wo es steht, was als Nächstes kommt und wie lange es dauert**:

- Jede Lektion ist ein **Lernweg aus Etappen** (je 8–12 Aufgaben, 3–5 Minuten), nacheinander empfohlen.
- Nach je 2 geschafften Etappen gibt es eine **⚡ Blitzrunde** (schnell, antippen, höchstens 2 auf Vorrat).
- **🌳 Ausritt (Auffrischen)** ersetzt „Jetzt üben“: nur Wiederholungen, keine neuen Wörter.
- Lektionen eines Fachs werden **nacheinander freigeschaltet**. Die nächste ist ein **Geheimnis-Feld**.
  Streng von alt nach neu; Eltern können Lektionen vorher öffnen (Chris, 13.11.: keine Ausnahme für die neueste).
- Bildliche Folie: **Fannys Reiterhof**. Eine Lektion ist ein Tag auf dem Hof, Etappen sind Stationen mit steigendem
  Anspruch. Klartext steht immer daneben. Die Grafik ist Kulisse, nie Bedingung fürs Verstehen.

Leitlinien: fordern ja, langweilen nein · Mischen statt Blöcke · Abruf vor Wiedererkennen · kurze Erfolgsmomente
erlaubt, nicht Hauptkost · keine Uhr, keine Bestenliste · keine weiteren Belohnungs-Währungen · Sprache der Befähigung
(„Wenn du X geschafft hast, öffnet sich …“ statt „Schaff erst X“).

## 2. Etappen: nach Wortgruppe, gemischt

**Vokabeln** (Beispiel Halloween, 11 Wörter → 3 Etappen + Turnier):

| Etappe | Station | Inhalt |
|---|---|---|
| 1 | 🪮 Pflege | Gruppe A (5–6 Wörter): jedes Wort erkennen (hören → antippen), gleich danach abrufen (DE→EN schreiben) |
| 2… | 🎠 Dressur | nächste Gruppe wie oben + 2–3 Wörter aus der vorigen Gruppe in anderer Form (EN→DE, Diktat) |
| n | 🐎 Springen | alle Gruppen gemischt: Lückensatz, Diktat, EN→DE, DE→EN |
| Turnier | 🏆 | alle Wörter DE→EN ohne Hilfe (= Test-Modus, zählt als Medaillen-Test) |
| ggf. | 🔁 Nachtraining | nur die im Turnier falschen Wörter, in anderer Form; entfällt ab 90 % |

- Gruppen: feste Größe 5–6 in Datei-Reihenfolge, eine zu kleine Restgruppe geht in die vorige. 30 Wörter → 5 Gruppen
  + 2× Springen + Turnier = 8 Etappen (Obergrenze).
- Ohne Sprachausgabe (oder < 4 Wörter) entfällt das Erkennen: Die Wörter werden direkt abgerufen (umgesetzt in R2;
  eine Text-Auswahl als Ersatz wäre eine neue Übungsart – später, falls nötig).
- **Mathe:** Gruppe = Abschnitt der Aufgabenliste (8–10 Aufgaben), ab Etappe 2 werden 2–3 frühere beigemischt.
  🌿 Koppel (Basis) nur, solange die Basis-Aufgaben nicht sicher sind – zählt nicht im „x von n“.
  🟣 **Knobel-Parcours** (Experte) sichtbar und gleichwertig neben dem Weg, ab der ersten geschafften Etappe offen.
- **Grammatik:** Pflege/Dressur = Form antippen (dazu 2 Sätze der vorigen Gruppe selbst eintippen);
  Springen = Form **selbst eintippen** (neue Übungsart `form-tippen`, eigener Lernstand, nie mit `form`
  desselben Satzes in einer Runde).
- **Etappe geschafft** = Runde zu Ende gespielt (falsche Aufgaben kommen in derselben Runde wieder, auch nach
  „Nochmal ansehen“). Durchfallen geht nicht. Abbruch → Etappe beginnt beim nächsten Mal neu.
- **„Frei üben“ hakt keine Etappen ab** (zählt aber für Karteikasten, Sternchen, Tagesziel).

## 3. Schnellweg für schon Gelerntes

- **Einmalige Übernahme** beim ersten Start der neuen App: Wörter, deren bestes Abruf-Fach (Schreiben, Diktat,
  Lückensatz bzw. Mathe/Grammatik: ihre Übungsart) ≥ 2 ist, gelten als gelernt – gespeichert, nicht live abgeleitet.
- Danach aktiv: Knopf **„Ich kann das schon – zeig’s mir“**. Kurze gemischte Probe in Abrufform; zählt normal
  (Karteikasten, Tagesziel). Alles auf Anhieb richtig → Etappe geschafft. Sonst geht es direkt mit der Etappe weiter,
  die richtig gelösten Wörter fallen dort weg (nur für diese eine Runde, kein Teilstand).

## 4. Rechtschreibung

- **Fast richtig:** Abstand genau 1 zu irgendeiner akzeptierten Schreibweise (fehlender, zusätzlicher, falscher oder
  **vertauschter** Buchstabe; auch nur Groß/Klein, mit eigenem Text): „Fast! Ein Buchstabe stimmt nicht – findest du ihn?“
  Ein Versuch zum Selbstkorrigieren. Korrigiert → zählt richtig, **Fach bleibt** (kein Aufstieg, kein Absturz).
  Nicht bei: Mathe, Test/Turnier/Probe, Wörtern unter 4 Buchstaben, Eingabe = Antwort eines anderen Worts der Lektion.
- **Anschauen – Abdecken – Schreiben:** Nach einem Fehler Lösung 3 s zeigen (Fehlerstelle markiert, Eingabe gesperrt,
  kein Fokus → Tastatur verdeckt nichts), dann ausblenden und aus dem Gedächtnis schreiben. Knöpfe „Hab’s mir gemerkt“
  (früher ausblenden) und „Nochmal ansehen“. Ohne Animation bei „Bewegung reduzieren“.
- Keine Auswahl-Aufgaben mit falschen Schreibweisen. Keine zusätzliche Liste von Fehlschreibungen.

## 5. Lektionen nacheinander freischalten

Reihenfolge = `order` im Inhaltsverzeichnis. Eine Lektion ist **offen**, wenn
1. sie die erste ihres Fachs ist, oder der Lernweg der vorigen geschafft ist (alle Etappen, Turnier, ggf. Nachtraining), oder
2. ~~sie die neueste des Fachs ist (Feld `neu`)~~ – gestrichen (Chris, 13.11.): streng von alt nach neu, oder
3. sie schon Lernstand hat (nichts wird wieder zugesperrt), oder
4. die Eltern sie unter „Für Eltern“ geöffnet haben (eigener Bereich, optisch getrennt von Sicherung und Zurücksetzen).
   Kein Kind-Knopf zum Selbst-Öffnen (Chris, 13.11.) – nach der ersten Woche anhand der Rückmeldungen prüfen.

Nur die **nächste** gesperrte Lektion erscheint als Geheimnis-Feld (ohne Titel).

## 6. Turnier

- Öffnet direkt nach der letzten Etappe (Chris, 13.11.).
- Ergebnis neutral („9 von 11 sitzen schon“). Falsche Wörter → Etappe „Nachtraining“. Ab 90 % entfällt sie.
- Lernweg geschafft = alle Etappen + Turnier + ggf. Nachtraining → 🎀 Schleife, nächste Lektion öffnet sich.

## 7. ⚡ Blitzrunde

- 8 Antipp-Aufgaben aus geschafften Etappen. **Keine Uhr.** Kulisse Rennbahn (nur CSS-Bewegung, „Bewegung
  reduzieren“ beachtet), Fanny galoppiert pro richtiger Antwort ein Stück.
- Vorrat: 1 pro 2 geschaffte Etappen, höchstens 2. Gespeichert als Liste gespielter Blitzrunden mit Zeitpunkt;
  der Vorrat wird chronologisch nachgerechnet (Obergrenze wirkt laufend, auch über mehrere Geräte).

## 8. 🌳 Ausritt (statt „Jetzt üben“)

- Fällige Wiederholungen aller schon geübten Wörter (Fach > 0), die wackeligsten zuerst. Neue Wörter nur über den Lernweg.
- Pro Wort eine andere Übungsart als beim letzten Mal, Abruf bevorzugt. Höchstens 2 gleiche Übungsarten hintereinander,
  wenn möglich (bei wenigen fälligen Wörtern Ausweichregel: dann eben gleich). Fächer gemischt.
- `#/jetzt` leitet auf den Ausritt um.

## 9. Seiten und Belohnung

- **Startseite:** Fanny-Karte. Groß **„Weiter: Halloween · Etappe 2 (Dressur)“**, daneben ⚡ (wenn verdient) und
  🌳 Ausritt („7 Wörter sind wieder dran“).
- **Fachseite:** „2 von 4 Etappen“, 🎀 = Lernweg geschafft, 🏅 = sicher beherrscht, Geheimnis-Feld, Test-Modus bleibt.
- **Lektionsseite:** Hofkarte, Karte der nächsten Etappe (Was · wie viele · ca. Minuten · Antwortform · „Los geht’s“ ·
  „Ich kann das schon“), Knobel-Parcours, Blitzrunde, Liste aller Etappen. Zugeklappt: Wörter, **„Frei üben“**.
- **Nach einer Etappe:** Bilanz + „Etappe geschafft – jetzt kannst du: …“. Schleife und Medaille einmal kurz erklärt.
  Rückmeldung (Spaß/weitergebracht) mit Rundenart (etappe/blitz/ausritt/probe/turnier/frei).

## 10. Technik

**Module**
- `js/path.js` – reine Logik ohne DOM und Speicherzugriff (Lernstand und Datum als Parameter, im Browser-Selbsttest
  prüfbar): `groupsOf`, `etappenFor(lesson, {canSpeak})`, `tasksForEtappe`, `progress`, `nextEtappe`, `isOpen`,
  `secretNext`, `turnierAllowed`, `needsRetry`, `blitzAvailable`, `quickPass`, `migrateLearned`.
- `js/ausritt.js` ersetzt `practice-now.js`.
- `round.js` bleibt generisch, bekommt `kind` und `onComplete({ mistakes, firstTry, total })` (aufgerufen vor der
  Bilanz). Die Seite speichert den Lernweg-Stand (kein Zyklus round ↔ path). Das bisherige `test` wird in einzelne
  Schalter getrennt (Wiederholen, Hilfe, Test speichern). `requeue`: wiederholte Aufgabe nicht direkt neben die
  andere Aufgabe desselben Worts.
- `srs.record(…, { hold: true })`: richtig, Fach bleibt (für „Fast richtig“).
- `diff.js`: `nearMiss` mit Vertauschung (Damerau/OSA), weil die heutige Distanz Vertauschung als 2 zählt.
- Neue Route `#/etappe/<fach>/<lektion>/<n>`; `#/ueben/…` bleibt für „Frei üben“.

**Speicherformat SCHEMA 3** (validate.js, merge.js, Tests):
- `path`: `{ "<fach>/<lektion>": { learned: { <wort-id>: ms }, mix: { "springen-1": ms, "nach-<ms>": ms },
  turnier: { day, at }, retry: [wort-ids] } }`
  - Gespeichert wird **pro Wort**, nicht pro Etappe: Gruppen werden abgeleitet (gelernte Wörter in Datei-Reihenfolge
    = geschaffte Gruppen, dann die ungelernten = offene). Dadurch stören neue oder umsortierte Wörter nicht, und
    „geschafft bleibt geschafft“ gilt von selbst.
  - Springen-Kennung = Nummer + Wortzahl (`springen-1-11`). Kommen neue Wörter dazu, ist das Springen mit den neuen
    Wörtern wieder offen (umgesetzt in R2, einfacher als ein zusätzliches Springen; Geschafftes bei den Gruppen bleibt).
  - Zusammenführen: Vereinigung, frühester Zeitpunkt gewinnt; `retry` vom Turnier mit dem neueren `at`.
- `opened`: `{ "<fach>/<lektion>": at }` – von den Eltern geöffnet; Vereinigung, frühester Zeitpunkt.
- `blitz`: `[{ id, at }]` – Vereinigung nach id (wie `feedback`).
- `feedback[].art` (Rundenart) ergänzen.
- „Alles zurücksetzen“ löscht `path`, `opened`, `blitz` mit (wie den übrigen Lernstand); `mergeAfterReset` regelt sie ausdrücklich.
- `store.migrateLessons` zieht `path` und `opened` mit um.

**Absicherung (Security)**
- Schlüssel von `path`/`opened` nur nach festem Muster (`fach/lektion`), Wort- und Etappen-IDs nach `ID`;
  `__proto__`, `constructor`, `prototype` ablehnen; Nachschlagen nur über eigene Schlüssel (`Object.hasOwn`).
  Dieselbe Regel nachträglich für `items` und `tests`. Test mit `{"path":{"__proto__":…}}`.
- Grenzen: ≤ 300 Lektionen, ≤ 500 Wörter je Lektion, `retry` ≤ 100, `blitz` ≤ 500.
- `tools/inhalte.py`: Fach-, Lektions- und Wort-IDs gegen dasselbe Muster prüfen; `hof` nur aus fester Liste.
- Hofkarte nur aus berechneten Zahlen und festen Thema-Tabellen, keine Inhaltstexte im SVG.
- Zeitgeber (3 s, Rennbahn) prüfen beim Auslösen, ob ihr Element noch da ist.
- Formatwechsel ist eine Einbahnstraße: Nach dem Release mit SCHEMA 3 nur noch vorwärts korrigieren, nie
  zurückrollen (ältere App könnte sonst nichts mehr speichern). Eltern-Ansicht zeigt den Hinweis „Stand aus neuerer
  App“ deutlich.
- Datenschutz: kein Lernprofil, keine Diagnose in Repo, Plan, Code oder Commit-Texten. Auswertung der Rückmeldungen
  nur lokal bzw. im privaten Sicherungs-Repo. Hinweis in der Eltern-Ansicht: Die Sicherung behält ihren Verlauf
  (auch nach „Zurücksetzen“).

**Hofkarte**
- Hintergrund je Thema weiter in Python bauen (`tools/hofkarte/hof2.py`, aufgeteilt in Hintergrund und
  Stationskoordinaten) und als `img/hof-<thema>.svg` + Koordinaten (JSON) einchecken (~26 KB, gzip ~4 KB).
- JS zeichnet nur die Ebene darüber: Pfad, Stationen mit Zustand, Pixel-Fanny. Vorlagen auf **8 Stationen** erweitern.
- Thema aus `"hof"` in der Lektion (neutral, halloween, schule), sonst neutral. Karte `aria-hidden`.

## 11. Releases (je: bauen, Selbsttest, Vorschau prüfen, committen, Push nach Freigabe)

| Release | Inhalt | Aufwand |
|---|---|---|
| R0 | Commit 0d315a0 (Rückmeldung nach jeder Runde) pushen | – |
| R1 | **Rechtschreibung**: Fast richtig (`nearMiss`, `hold`), Anschauen–Abdecken–Schreiben. Unabhängig, ohne Formatwechsel | M |
| R2 | **Lernweg-Kern** (ein Release, weil SCHEMA 3 nicht ohne sichtbaren Nutzen kommen soll und „Jetzt üben“ sonst am Lernweg vorbei neue Wörter einführt): path.js, SCHEMA 3 inkl. Absicherung, einmalige Übernahme, Etappen-Runden, neue Lektionsseite (ohne Karte), „Frei üben“, Startseite mit Weiter-Knopf, Ausritt statt „Jetzt üben“, `form-tippen` | L |
| R3 | Reihenfolge der Lektionen, Geheimnis-Feld, Öffnen durch Eltern; Turnier, Nachtraining, Probe „Ich kann das schon“ | L |
| R4 | ⚡ Blitzrunde mit Rennbahn | M |
| R5 | Hofkarte (statischer Hintergrund + JS-Ebene, 8 Stationen) und Pixel-Fanny | M |
| R6 | Nach einer Woche: Rückmeldungen nach Rundenart auswerten, Etappengröße/Turnier-Tag nachjustieren | S |

R2 intern in Schritten bauen und einzeln committen (Logik + Tests → Runde → Seiten), aber erst zusammen pushen.
APP_VERSION erhöhen in R2 (neue Übungsart `form-tippen`, Feld `neu`) und in R5 (Feld `hof`).

## 12. Entscheidungen

Entschieden (Chris, 13.11.): Turnier direkt nach der letzten Etappe · kein Selbst-Öffnen durch das Kind ·
Knobel-Parcours gleichwertig neben dem Weg.

Offen:
1. **R0:** Rückmeldung nach jeder Runde jetzt pushen?
2. Namen (Etappe, Stationen, Blitzrunde, Ausritt, Schleife) – mit der Tochter abstimmen.

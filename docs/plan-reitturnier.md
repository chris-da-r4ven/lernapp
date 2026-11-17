# Plan: Reitturnier (Vorbereitung auf einen Test in der Schule)

Stand 17.11. – geprüft (Pädagoge, Architekt); Befunde in Abschnitt 10 eingearbeitet. Arbeitstitel „Reitturnier“; die letzte Etappe
einer Lektion heißt seit 9d8b89a „Probe“ (vorher „Turnier“). Namen darf die Tochter ändern.

## 1. Ziel

Ein Test in der Schule steht an (Vokabeltest, Klassenarbeit). Die App soll wissen, welche Lektionen
drankommen und wann – und die Tage bis dahin gezielt nutzen, verteilt statt am Vorabend.

## 2. Entscheidungen (Chris, 17.11.)

1. **Anlegen darf auch die Tochter selbst**, auch mit Lektionen, die noch gesperrt sind. Das Turnier
   öffnet nichts: Gesperrte Lektionen sind der Anlass, Papa Bescheid zu sagen. Öffnen bleibt bei den Eltern.
2. **Mit Datum.**
3. **Mehrere Turniere gleichzeitig** (auch im selben Fach).
4. Inszenierung als **Reitturnier**: Lektionen = Hindernisse, danach eine Schleife.

## 3. Ablauf aus Sicht der Tochter

1. **Eintragen:** Fachseite → „📅 Reitturnier eintragen“ → Datum (ab heute), Lektionen ankreuzen. Alle
   Lektionen des Fachs sind wählbar; gesperrte mit 🔒 und Titel (sie muss sie benennen können).
   Bearbeiten und Löschen über dasselbe Formular.
2. **Turnierplakat auf der Startseite** (pro anstehendem Turnier, das nächste zuerst, höchstens 2 sichtbar,
   weitere zusammengeklappt): „🏆 Reitturnier Englisch · Do 20.11. · noch 3 Tage“. Darunter jede Lektion
   als Hindernis:
   - grün = sitzt (Anteil „sicher“ ≥ 80 %), gelb = wackelt, weiß = Lernweg noch nicht durch,
   - grau 🔒 = gesperrt: „Noch zu – sag Papa Bescheid“.
   Knopf **„Turniertraining“** (siehe 5.).
3. **Am Tag davor:** zusätzlich **„Generalprobe“** – alle Wörter der offenen Turnierlektionen einmal ohne
   Hilfe, Ergebnis in Prozent wie im Test-Modus.
4. **Am Turniertag:** „Heute ist Reitturnier – viel Glück! 🍀“ (Training bleibt möglich).
5. **Danach** (ab dem Tag nach dem Turnier, bis sie antwortet, höchstens 14 Tage): „Wie lief dein
   Reitturnier?“ → Schleife wählen: 🥇 super · 🎀 gut · 💪 war schwer. Keine Note. Schleifen sammeln sich
   auf der Fortschritt-Seite an der **Schleifenwand**.

## 4. Was sich sonst ändert (bis zum Turniertag)

- **Weiter-Karte:** Offene Turnierlektionen mit unfertigem Lernweg haben Vorrang (nächstes Turnier zuerst).
- **Ausritt:** Wörter der Turnierlektionen werden bevorzugt (bis zu 2/3 der Runde). Zusätzlich dürfen
  Turnierwörter dran sein, die laut Karteikasten erst *nach* dem Turniertag fällig wären („vor dem
  Turnier noch einmal sehen“) – aber nur einmal in den letzten 3 Tagen davor.
- **Fachseite:** Stallboxen der Turnierlektionen tragen ein 🏆-Schild mit Datum.
- **Für Eltern:** Liste der Turniere (wer es angelegt hat, Datum, Lektionen). Gesperrte Lektionen eines
  Turniers mit Knopf „öffnen“. Löschen.

## 5. Turniertraining (die strenge Variante)

Eine Runde (12 Aufgaben) nur aus den offenen Turnierlektionen:
- nur schon gelernte Wörter (im Lernweg gelernt oder Fach > 0) – neue Wörter kommen weiter über die Etappen;
- die wackeligsten zuerst (niedriges Fach, Fehler zuletzt), dann der Rest gemischt;
- abrufen (eintippen) bevorzugt, wechselnde Übungsarten wie im Ausritt;
- zählt normal für Karteikasten, Sternchen, Tagesziel; hakt keine Etappe ab.
Ist in den Turnierlektionen noch nichts gelernt, verweist das Plakat auf die erste Etappe.

## 6. Daten (Spielstand, kein neues SCHEMA)

```
exams: [{ id, sid, date: "JJJJ-MM-TT", lessons: [<lektions-id>], by: "kind" | "eltern",
          at, ribbon?: "super" | "gut" | "schwer", deleted?: true }]
```
- `id`: Gerät + Zeitpunkt (wie Blitzrunde). `at`: letzte Änderung (Anlegen, Bearbeiten, Schleife, Löschen).
- Zusammenführen: pro `id` gewinnt das neuere `at`; Löschen = `deleted: true` (Grabstein), damit ein
  gelöschtes Turnier nicht aus der Sicherung zurückkommt. Grabsteine nach 60 Tagen entfernen.
- Prüfen: id-Muster, sid/Lektions-IDs nach LESSON_ID, Datum, `by` und `ribbon` aus fester Liste,
  höchstens 30 Lektionen pro Turnier, höchstens 100 Einträge.
- Zurücksetzen: Turniere bleiben (sie sind Planung, kein Lernstand)? → **offene Frage an Architekt**.

## 7. Module

- `js/exams.js` (neu, ohne DOM): aktive Turniere, Zustand pro Hindernis, Tage bis zum Turnier, Auswahl fürs
  Training, Ausritt-Gewichtung, Schleife fällig?
- `js/views/exam-edit.js` (neu): Formular `#/reitturnier/neu/<fach>`, `#/reitturnier/<id>`.
- `js/views/home.js`: Plakat(e), Schleifen-Frage; Weiter-Karte mit Vorrang.
- `js/ausritt.js`: Gewichtung und „vor dem Turnier noch einmal“.
- `js/views/subject.js`: Knopf „Reitturnier eintragen“, 🏆-Schild.
- `js/views/parents.js`: Turnierliste mit Öffnen/Löschen.
- `js/views/stats.js`: Schleifenwand.
- Generalprobe: eigener Rundenaufruf mit `test: true`, **ohne** `saveTest` (siehe offene Frage 2).
- `validate.js`, `merge.js`, `store.js`, Tests.

## 8. Offene Fragen

1. Bleiben Turniere beim „Statistik zurücksetzen“ erhalten?
2. Soll die Generalprobe als Test zählen (Medaille, und damit die Probe-Etappe der Lektionen abhaken)?
   Entwurf: nein – sie ist eine Probe für das echte Turnier, kein Lernweg-Schritt.
3. Wie viel Vorrang verträgt der Lernweg der *anderen* Lektionen in der Turnierwoche?
4. Ab wie vielen Tagen vorher wird das Plakat „dringend“ (Farbe, Hinweis)? Entwurf: ab 3 Tagen.

## 9. Releases

- **T1:** Daten (exams), Eintragen/Bearbeiten/Löschen, Plakat mit Hindernissen, Eltern-Liste mit Öffnen,
  🏆-Schild, Vorrang Weiter-Karte. (≈ ½ Tag)
- **T2:** Turniertraining, Generalprobe, Ausritt-Gewichtung, Schleife + Schleifenwand. (≈ ½ Tag)

## 10. Prüfung (17.11.) – Änderungen am Plan

**Pädagoge**
- Generalprobe **ab 3 Tagen vorher** (nicht nur am Vortag), danach direkt eine Runde nur mit den Fehlwörtern.
  Fehler wirken im Karteikasten (tun sie: Testrunden zeichnen auf).
- Turniertraining **gemischt**: etwa ⅔ wackelig, ⅓ sicher, mit einem sicheren Wort beginnen.
- Training: Schreibweise wie im Test (Richtung Deutsch → Englisch bevorzugt), Fehlerstellen markieren.
- Gesperrte Lektionen **sofort nach dem Anlegen** deutlich melden („sag Papa Bescheid“), nicht erst kurz vorher.
- Kein Alarm nach starrer Tageszahl; „eng“ nur bei echtem Rückstand (weiße/gesperrte Hindernisse, wenige
  Tage), sonst positiv („noch 2 Trainingstage“). Bei Rückstand führt das Plakat direkt in die nächste Etappe.
- Grün erst, wenn in der Turnierwoche ein Abruf gelungen ist (nicht nur „80 % sicher“ aus dem Karteikasten).
- Generalprobe als „17 von 20 sitzen – diese 3 üben wir noch“, nicht nur Prozent.
- Drei gleichwertige Schleifen (🥇 super · 🎀 gut · 💪 Mutschleife), keine Zählung an der Schleifenwand.
- Andere Lektionen bleiben in der Turnierwoche sichtbar und wählbar; Ausritt hält sie mit ⅓ warm.

**Architekt**
- Generalprobe: **zählt nicht** als Test (Entscheidung Chris, 17.11.) – braucht in round.js eine Option `record: false` für Testergebnis/Medaille; Karteikasten zeichnet weiter auf. Rückmeldung mit eigener Rundenart „generalprobe“.
  `test: true` ohnehin; hakt die Probe-Etappe ab, kann die nächste Lektion öffnen, zählt für die Medaille).
- `exams` bleiben beim Zurücksetzen (wie `feedback`): `mergeAfterReset` ohne `since`, `resetProgress` übernimmt sie.
- Zusammenführen: neueres `at` gewinnt, bei Gleichstand Entscheidung nach Inhalt (beide Richtungen gleich).
  Schleife mit eigenem `ribbonAt`.
- Aufräumen nach Turnierdatum (> 60 Tage vorbei), Einträge mit Schleife bleiben; Limit fest sortiert.
- T1 prüft schon das **ganze** Format (inkl. `ribbon`, `deleted`), sonst verwirft ein T1-Gerät T2-Daten.
- `migrateLessons` benennt Lektions-IDs in `exams` mit um; `empty()`, `sanitizeState`, `mergeSame` ergänzen.
- Adressen unter `#/reitturnier/…`, `reitturnier` in `nav.practicing`; Route `neu` vor `<id>`; neue Dateien in SHELL.
- Im Code durchgehend `exam` (nie „turnier“ – das ist intern die Probe-Etappe).
- `exams.js` rein (Parameter `now`); Ausritt filtert nach dem Cache über den Wort-Präfix, höchstens 8
  Turnierwörter, „einmal in den letzten 3 Tagen“ über `st.last`; `dueSummary` mit derselben Regel.
- `lessonAccess` fürs Plakat einmal pro Fach berechnen.
- Aufwand T1 eher ein knapper Tag.

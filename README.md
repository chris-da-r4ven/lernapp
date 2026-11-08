# LernApp

Lern-App fürs Tablet (Android), zuerst für Englisch-Vokabeln, erweiterbar auf andere Fächer.
Läuft als PWA: einmal im Browser öffnen, „Zum Startbildschirm hinzufügen“, danach offline nutzbar.
Beim Start und per Knopf „Neue Inhalte suchen“ holt sie neue Lektionen.

## Neue Inhalte

Siehe **[INHALTE.md](INHALTE.md)** – Vorlage, Tabellen-Entwurf, `tools/inhalte.py neu|pruefen|bauen`.
`content/index.json` wird von `python3 tools/inhalte.py bauen` erzeugt, nicht von Hand ändern.

### Format einer Lektion (`type: "pairs"`)

```json
{
  "id": "unit1",
  "title": "Unit 1",
  "group": "Schule & ich",
  "order": 10,
  "type": "pairs",
  "sides": { "a": "Deutsch", "b": "Englisch" },
  "exercises": ["write"],
  "items": [
    { "id": "friend", "a": "der Freund / die Freundin", "b": "friend" },
    { "id": "to go", "a": "gehen", "b": "to go", "bAlt": ["go"] }
  ]
}
```

- `a` / `b`: die beiden Seiten. Abgefragt wird in beide Richtungen.
- `aAlt` / `bAlt`: weitere Schreibweisen, die als richtig zählen.
- Enthält eine Seite `/` (z. B. „Freund / Freundin“), zählt auch jeder Teil einzeln.
- `id` pro Wort: feste Kennung für den Lernstand. **Nie ändern** – auch wenn `a`/`b` korrigiert werden.
  Neue Wörter bekommen als `id` ihr englisches Wort (einmal gesetzt, bleibt es so).
- `ex` / `exDe`: Beispielsatz mit `{Lücke}` (Varianten mit `|`: `{I am|I'm}`) und Übersetzung.
- Lektionen zusammenlegen/umbenennen: beim Fach in `content/index.json` unter `moved` eintragen
  (`{"alteLektion": "neueLektion"}`), dann zieht der Lernstand mit.

## Sicherung des Spielstands

Optional in ein privates GitHub-Repo (`lernapp-daten`, Datei `spielstand.json`), eingerichtet unter
Fortschritt → Für Eltern. Gerät und Sicherung werden zusammengeführt (`js/merge.js`): pro Wort gewinnt
der neuere Eintrag. Ein Zurücksetzen gewinnt gegen alles Ältere – dafür steht im Stand `resetAt`.

**Auf eine frühere Uhrzeit zurücksetzen:** `python3 tools/zuruecksetzen.py --bis "2026-11-08 19:00"` zeigt,
was passieren würde; mit `--ausfuehren` wird der Stand von davor als neuer Commit (mit `resetAt` = jetzt)
geschrieben. Die Historie bleibt erhalten. Das Tablet übernimmt ihn beim nächsten Öffnen.

## Betrieb – Checkliste

**Vor jedem Push** (läuft als Git-Hook automatisch, einrichten mit `python3 tools/check.py --hook`):
1. `python3 tools/check.py --fix` – setzt den Cache-Namen (Fingerabdruck der App-Dateien), baut die
   Inhalte, prüft die Offline-Liste. Danach geänderte Dateien committen.
2. `tests/` im Browser (lokal) – alles grün.
3. Neue Lektions- oder Übungsart? Dann `APP_VERSION` in `js/version.js` hochzählen und
   `python3 tools/inhalte.py bauen` – Geräte mit älterer App behalten ihre Inhalte, bis die neue App da ist.

**Nach dem Push:** 2–10 Minuten warten, App auf dem Tablet schließen und öffnen (lädt sich einmal neu).
Unter Fortschritt (ganz unten) App-Stand, Inhalte und „Sicherung“ ansehen.

**Wenn etwas nicht geht:**
- Warnung oben auf der Fortschrittsseite lesen (Sicherung alt, Fehler, Schlüssel läuft ab).
- App alt: `tools/check.py` grün? Online `…/lernapp/sw.js` hat den neuen Cache-Namen?
- Inhalte alt: `…/lernapp/content/index.json` ansehen, in der App „Neue Inhalte suchen“.
- Schlüssel abgelaufen: neuen anlegen, Für Eltern → Trennen → neu verbinden (wird zusammengeführt).
- Stand weg oder falsch: auf dem Tablet nicht weiterüben, dann `tools/zuruecksetzen.py`.
- Browserdaten in Chrome erst löschen, wenn „Sicherung“ aktuell ist.

## Aufbau

```
Inhalte            content/<fach>/<lektion>.json   →  js/content.js (lädt, offline speichern)
Lektionsarten      js/lessons.js    kind (vokabeln, grammatik …), Lernsprache, „sicher“-Anteil
Übungsarten        js/exercises/modes.js   ← EINE Liste, alles andere leitet sich daraus ab
Fragetypen         js/exercises/questions.js   zeigt eine Aufgabe, meldet richtig/falsch
Runde              js/exercises/round.js   Wiederholen, Sternchen, Test, Medaille, Bilanz
Lernstand          js/store.js + js/srs.js (Karteikasten)  →  js/sync.js + js/merge.js (Sicherung)
Seiten             js/views/…   Start, Fach, Lektion, Üben, Jetzt üben, Test, Fortschritt
```

- `js/practice-now.js` – „Jetzt üben“: fällige Wörter aus allen Lektionen und Übungsarten
- `js/medal.js`, `js/streak.js`, `js/pet.js` – Medaille, Serie, Fanny
- `sw.js` – Offline-Cache für die App-Dateien. Neue Dateien dort in `SHELL` eintragen und bei jedem
  Push `CACHE` hochzählen – eine neue Version wird nur komplett aktiv.

### Neue Übungsart (Quiz, Spiel …)

1. **Fragetyp** in `js/exercises/questions.js`: ein Objekt mit `describe(task)` (Zeile über der Aufgabe),
   `pair(task)` (`[gefragt, Antwort]` für Bilanz und Fortschritt) und `render(card, task, api, { test })`.
   Beim Antworten `api.wrong(eingabe)` melden, danach `api.right()` bzw. `api.retry()` aufrufen.
   Wiederholen, Sternchen, Test-Modus und Bilanz übernimmt der Runden-Ablauf.
2. **Eintrag in `js/exercises/modes.js`**: `id` (nie wieder ändern – Teil des Lernstands), `kinds`,
   `group`, `label`, `short`, `weight` (Sternchen, Schreiben = 1), `learnOrder`, ggf. `speech`,
   `minItems`, `usable(item)`, `question`. Knöpfe, Adressen, Sternchen, „Jetzt üben“, Markierungen
   und Fortschritt kommen automatisch.
3. **Braucht sie eine neue Art von Inhalt** (z. B. Lesetext mit Fragen): Lektionsart in
   `js/lessons.js` (`KINDS`) ergänzen; die Felder der Einträge in `INHALTE.md` beschreiben und in
   `tools/inhalte.py` prüfen. Das Werkzeug liest gültige Übungs- und Lektionsarten aus dem App-Code.
4. Neue Dateien in `sw.js` (`SHELL`) eintragen.

Eine Lektion bekommt automatisch alle Übungsarten ihrer Art, die auf dem Gerät gehen und für die es
passende Einträge gibt. Mit `"modes": ["ab", "satz"]` in der Lektion lässt sich das einschränken.

## Selbsttest

`tests/` im Browser öffnen (lokal `http://localhost:8766/tests/`, online `…/lernapp/tests/`): prüft Serie,
Tagesziel, Zusammenführen der Sicherung, Antwort-Prüfung, Sternchen, Medaille, Umzüge, Übungsarten und
alle Inhalte. **Nach jeder Änderung an der Logik laufen lassen.** Neue Regeln bekommen einen Test in
`tests/tests.js`. Die Seite arbeitet mit einem eigenen Test-Speicher, der echte Lernstand bleibt unberührt.

## Lokal testen

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

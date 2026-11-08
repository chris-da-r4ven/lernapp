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

**Auf eine frühere Uhrzeit zurücksetzen:** passenden Commit in `lernapp-daten` suchen, dessen
`spielstand.json` nehmen, im `state` `resetAt` auf den jetzigen Zeitpunkt (ms seit 1970) setzen und als
neuen Commit schreiben (nie force-push). Das Tablet übernimmt den Stand beim nächsten Öffnen.

## Aufbau

- `js/content.js` – lädt und speichert Inhalte (offline)
- `js/store.js` – Lernstand im Browser (localStorage)
- `js/srs.js` – Karteikasten-Wiederholung (Fach 1–5, ab Fach 3 „sicher“)
- `js/exercises/` – Übungsarten; neue in `registry.js` eintragen
- `js/views/` – Seiten: Start, Fach, Lektion, Üben, Fortschritt
- `js/pet.js` – Platzhalter fürs Tier (wird mit dem Kind gestaltet)
- `sw.js` – Offline-Cache für die App-Dateien. Neue Dateien dort in `SHELL` eintragen und bei jedem
  Push `CACHE` hochzählen – eine neue Version wird nur komplett aktiv.

## Lokal testen

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

# Neue Inhalte in die LernApp bringen

Der Weg von der Vokabelseite bis aufs Tablet – immer gleich.

## 1. Vorlage liefern

Fotos oder Screenshots aus dem Vokabelheft, Buch oder von Arbeitsblättern schicken – dazu,
in welche Gruppe die Wörter gehören (z. B. „Schule & ich“, „Feiertage“, „Grammatik“) oder ob es
eine neue Gruppe ist.

Regeln dabei:
- **Öffentliches Repo:** Buch- und Arbeitsblatt-Texte nicht wörtlich übernehmen. Einzelne Wörter sind
  in Ordnung, Beispielsätze schreiben wir selbst.
- **Schreibfehler** aus dem Heft werden korrigiert und gemeldet (das Kind soll die richtige Form lernen).
- Eine Lektion hat höchstens etwa **30 Wörter**. Größere Themen werden geteilt.

## 2. Entwurf als Tabelle

Eine Zeile pro Wort, Spalten mit Tabulator getrennt:

```
englisch	deutsch	Beispielsatz mit {Lücke}	Übersetzung	Merkmale
pumpkin	der Kürbis	The {pumpkin} is orange.	Der Kürbis ist orange.
to sing	singen	We {sing} songs at Christmas.	Wir singen an Weihnachten Lieder.	schwer
present	das Geschenk / das Präsent	This {present} is for you.	Dieses Geschenk ist für dich.	bAlt=gift
```

- Mehrere deutsche Bedeutungen mit ` / ` trennen – jede gilt einzeln als richtig.
- Artikel (der/die/das, a/an, to) muss das Kind nicht mitschreiben – das ergänzt das Werkzeug.
- Lücke: genau eine `{…}` im Satz, Varianten mit `|`: `{I am|I'm} ten.`
- Merkmale (mit Komma): `schwer` (kommt zuerst dran), `aAlt=…|…`, `bAlt=…|…` (weitere richtige
  Schreibweisen), bei Grammatik `choices=am|is|are`.
- Grammatik: ein Satz pro Zeile, englische Spalte = ganzer Satz, Lücke = gesuchte Form.

## 3. Lektion anlegen, prüfen, bauen

```bash
python3 tools/inhalte.py neu englisch weihnachten --titel "Weihnachten" --gruppe "Feiertage" --datei entwurf.tsv
python3 tools/inhalte.py bauen
```

- `neu` legt `content/englisch/weihnachten.json` an (nie überschreiben, Reihenfolge ans Ende) und setzt
  `"neu": "JJJJ-MM-TT"` – die neueste Lektion eines Fachs ist in der App immer offen, auch wenn der
  Lernweg der vorigen noch nicht geschafft ist.
  Grammatik: `--grammatik` dazu.
- `bauen` prüft alles, ergänzt IDs und Varianten, baut `content/index.json` und erhöht die
  Inhalts-Version nur, wenn sich wirklich etwas geändert hat. Bei Fehlern wird nichts gebaut.
- Nur prüfen: `python3 tools/inhalte.py pruefen`.

## 4. Kontrolle und hochladen

- Einmal in der Vorschau öffnen (Lektion ansehen, eine Runde üben).
- Committen und pushen. Das Tablet holt die neuen Inhalte beim nächsten Start
  (oder per „Neue Inhalte suchen“).

## Mathe-Lektionen

Lektionsart `"kind": "mathe"` (ohne `sides`): `a` ist die Aufgabe, `b` die Lösung. Jeder Eintrag braucht
eine feste `id` (die Lösung allein ist nicht eindeutig). Aufgaben selbst schreiben – nicht aus dem Buch
abschreiben, nur das Thema und die Art der Aufgabe übernehmen.

```json
{ "id": "vor-184", "a": "Wie heißt der Vorgänger von 184?", "b": "183", "why": "Der Vorgänger ist um 1 kleiner." }
{ "id": "cmp-47-74", "a": "Setze < oder > ein: 47 ☐ 74", "b": "<", "choices": ["<", ">"] }
{ "id": "strahl-8", "a": "Auf welche Zahl zeigt der Pfeil?", "b": "8",
  "line": { "from": 0, "to": 40, "step": 2, "label": 10, "arrow": 8 } }
```

- `why` – Erklärung, erscheint nach dem Antworten (vor allem bei Fehlern hilfreich).
- `choices` – Antwort antippen statt eintippen (zählt 0,3 statt 1 fürs Tagesziel).
- `line` – Zahlenstrahl: Ausschnitt `from`–`to`, Striche im Abstand `step`, beschriftet sind
  die Vielfachen von `label`, `arrow` (optional) zeigt auf eine Zahl. Das Werkzeug prüft, dass der
  Pfeil auf einem Strich liegt und zur Lösung passt.
- Beim Eintippen sind Leerzeichen, Tausenderpunkte und Groß/klein egal (48 000 = 48000, xliv = XLIV).
- `chart` – Diagramm: `{"type": "saeulen" | "balken" | "bild", "title": "…", "labels": [...], "values": [...],
  "step": 2, "axis": "Anzahl Kinder"}`; beim Bilddiagramm `"symbol": "🚗", "per": 10` (ein Symbol = 10,
  halbe Symbole werden halb gezeichnet).
- `level` – Schwierigkeit: `1` Basis (🟢, zum Aufwärmen, höchstens 2 pro Runde, Denkaufwand 0,5),
  `2` Fortgeschritten (🔵, Standard, Niveau E), `3` Experte (🟣, über das Buch hinaus, eigener Knopf
  „Experten-Aufgaben“, nicht im Ausritt, Test und Medaille, Denkaufwand 1,5). Pro Lektion grob:
  wenige Basis, viele Fortgeschritten, ein paar Experte.
- `denken` – Denkaufwand, wenn er von der Stufe abweicht: `0.3` erkennen, `0.5` Routine, `0.8` mit Hilfe,
  `1` ein Schritt, `1.5` mehrere Schritte, `2` Knobeln. Schwere (Sternchen, Tagesziel) = Antwortform × Denkaufwand,
  Antwortform: Eintippen 1, Antippen aus k Antworten 1 − 1/k (siehe `js/weights.js`).
- `tally` – Strichliste: `[["Hund", 7], ["Katze", 12]]`, gezeichnet in Fünferbündeln.

## Ändern, zusammenlegen, umbenennen

- **Wörter korrigieren:** `a`, `b`, Sätze dürfen geändert werden. Die `id` eines Worts **nie** ändern –
  an ihr hängt der Lernstand. `bauen` warnt, wenn IDs verschwinden.
- **Lektionen zusammenlegen oder umbenennen:** in `content/<fach>/_fach.json` unter `moved`
  eintragen (`"alteLektion": "neueLektion"`), dann zieht der Lernstand mit.
- **Reihenfolge und Gruppe:** in der Lektion `order` (10, 20, 30 …) und `group`.
- **Lektionsart:** `kind` – `vokabeln` (Wortpaare, alle Übungen, Test-Modus) oder `grammatik`
  (Sätze mit Lücke und `choices`, Übung „Richtige Form“). Nur bestimmte Übungsarten:
  `"modes": ["ab", "ba"]`.
- **Andere Sprache:** Die Lernsprache ist die Seite, die nicht Deutsch ist; ihre Stimme kommt aus dem
  Seitennamen (Englisch → en-GB, Französisch → fr-FR …) oder aus `"langs": {"b": "fr-FR"}`.
- **Neues Fach:** Ordner `content/<fach>/` mit `_fach.json` (`id`, `name`, `icon`, `order`).

## Wo was liegt

| Datei | Inhalt | wer ändert |
|---|---|---|
| `content/<fach>/_fach.json` | Name, Symbol, Reihenfolge, Umzüge | von Hand |
| `content/<fach>/<lektion>.json` | eine Lektion mit Wörtern | `neu`, dann von Hand |
| `content/index.json` | Verzeichnis + Version für die App | nur `bauen` |
| `tools/inhalte.py` | Prüfen, Bauen, Anlegen | – |

Die App lädt `content/index.json`, vergleicht die Version und holt bei Änderungen alle Lektionen.
Sie speichert sie auf dem Gerät, damit alles offline funktioniert.

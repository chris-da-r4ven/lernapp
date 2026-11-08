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

- `neu` legt `content/englisch/weihnachten.json` an (nie überschreiben, Reihenfolge ans Ende).
  Grammatik: `--grammatik` dazu.
- `bauen` prüft alles, ergänzt IDs und Varianten, baut `content/index.json` und erhöht die
  Inhalts-Version nur, wenn sich wirklich etwas geändert hat. Bei Fehlern wird nichts gebaut.
- Nur prüfen: `python3 tools/inhalte.py pruefen`.

## 4. Kontrolle und hochladen

- Einmal in der Vorschau öffnen (Lektion ansehen, eine Runde üben).
- Committen und pushen. Das Tablet holt die neuen Inhalte beim nächsten Start
  (oder per „Neue Inhalte suchen“).

## Ändern, zusammenlegen, umbenennen

- **Wörter korrigieren:** `a`, `b`, Sätze dürfen geändert werden. Die `id` eines Worts **nie** ändern –
  an ihr hängt der Lernstand. `bauen` warnt, wenn IDs verschwinden.
- **Lektionen zusammenlegen oder umbenennen:** in `content/<fach>/_fach.json` unter `moved`
  eintragen (`"alteLektion": "neueLektion"`), dann zieht der Lernstand mit.
- **Reihenfolge und Gruppe:** in der Lektion `order` (10, 20, 30 …) und `group`.
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

#!/usr/bin/env python3
"""Inhalte der LernApp prüfen, bauen und neu anlegen.

    python3 tools/inhalte.py pruefen        Alle Inhalte prüfen (nichts wird geändert)
    python3 tools/inhalte.py bauen          Prüfen, IDs/Varianten ergänzen, content/index.json bauen,
                                            Version nur erhöhen, wenn sich etwas geändert hat
    python3 tools/inhalte.py neu FACH ID --titel "…" --gruppe "…" [--grammatik] < entwurf.tsv
                                            Neue Lektion aus einem Tabellen-Entwurf anlegen

Aufbau unter content/:
    content/<fach>/_fach.json     Name, Symbol, Reihenfolge, Umzüge ("moved") des Fachs
    content/<fach>/<lektion>.json eine Lektion (Titel, Gruppe, Reihenfolge, Wörter)
    content/index.json            wird von "bauen" erzeugt – nicht von Hand ändern

Tabellen-Entwurf für "neu" (Tabulator-getrennt, eine Zeile pro Wort, # = Kommentar):
    englisch <TAB> deutsch <TAB> Beispielsatz mit {Lücke} <TAB> Übersetzung <TAB> Merkmale
    Merkmale (optional, mit Komma): schwer, bAlt=…|…, aAlt=…|…, choices=am|is|are
"""

import argparse
import datetime
import hashlib
import json
import math
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
INDEX = CONTENT / 'index.json'

def _from_app(path, pattern):
    """Gültige Namen direkt aus dem App-Code lesen – so laufen App und Werkzeug nie auseinander.
    Abgesichert doppelt: Findet das Muster nichts, bricht das Werkzeug ab. Und die gefundenen Namen
    landen in content/index.json ("app"), wo der Selbsttest sie mit der echten Liste der App vergleicht –
    passt das Muster nach einer Umformatierung nicht mehr, fällt das dort sofort auf."""
    text = (ROOT / path).read_text(encoding='utf-8')
    found = set(re.findall(pattern, text, re.M))
    if not found:
        sys.exit(f'{path}: keine Namen gefunden – Muster in tools/inhalte.py anpassen')
    return found


KNOWN_MODES = _from_app('js/exercises/modes.js', r"^\s+id: '([a-z-]+)',")
def _kinds_from_app():
    """Schlüssel der obersten Ebene im Block `export const KINDS = { … };` in js/lessons.js."""
    text = (ROOT / 'js' / 'lessons.js').read_text(encoding='utf-8')
    block = text[text.index('export const KINDS = {'):]
    block = block[:block.index('\n};')]
    found = set(re.findall(r'^  ([a-z]+): \{', block, re.M))
    if not found:
        sys.exit('js/lessons.js: keine Lektionsarten in KINDS gefunden – tools/inhalte.py anpassen')
    return found


KNOWN_KINDS = _kinds_from_app()


def _think_from_app():
    """Erlaubte Werte für "denken" aus js/weights.js (THINK = { name: wert, … })."""
    text = (ROOT / 'js' / 'weights.js').read_text(encoding='utf-8')
    block = text[text.index('export const THINK = {'):]
    found = {float(x) for x in re.findall(r':\s*([0-9.]+)', block[:block.index('}')])}
    if not found:
        sys.exit('js/weights.js: keine Werte in THINK gefunden – tools/inhalte.py anpassen')
    return found


THINK_VALUES = _think_from_app()
DE_ARTICLE = re.compile(r'^(der|die|das|ein|eine) ', re.I)
GAP = re.compile(r'^(.*?)\{([^}]+)\}(.*)$')


# --- Laden -------------------------------------------------------------------

def read_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def write_json(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == text:
        return False
    path.write_text(text, encoding='utf-8')
    return True


def load_subjects():
    """[(fach, [(datei, lektion), …]), …] in Reihenfolge; Ladefehler als Liste."""
    subjects, errors = [], []
    for fach_file in sorted(CONTENT.glob('*/_fach.json')):
        try:
            fach = read_json(fach_file)
        except Exception as e:
            errors.append(f'{rel(fach_file)}: kein gültiges JSON ({e})')
            continue
        lessons = []
        for p in sorted(fach_file.parent.glob('*.json')):
            if p.name.startswith('_'):
                continue
            try:
                lessons.append((p, read_json(p)))
            except Exception as e:
                errors.append(f'{rel(p)}: kein gültiges JSON ({e})')
        lessons.sort(key=lambda x: (x[1].get('order', 9999), x[1].get('id', '')))
        subjects.append((fach, lessons))
    subjects.sort(key=lambda x: (x[0].get('order', 9999), x[0].get('id', '')))
    return subjects, errors


def rel(p):
    return str(Path(p).relative_to(ROOT))


def parse_gap(ex):
    if not isinstance(ex, str):
        return None
    m = GAP.match(ex)
    if not m or '{' in m.group(3):
        return None
    answer, *alts = [s.strip() for s in m.group(2).split('|')]
    return {'answer': answer, 'alts': alts, 'full': m.group(1) + answer + m.group(3)}


# --- Prüfen ------------------------------------------------------------------

def check(subjects):
    """Alle Fächer prüfen. Gemeinsames hier, Besonderes pro Lektionsart (KIND_CHECKS)."""
    errors, warnings = [], []
    for fach, lessons in subjects:
        sid = fach.get('id')
        for key in ('id', 'name'):
            if not fach.get(key):
                errors.append(f'Fach {sid or "?"}: "{key}" fehlt in _fach.json')
        lesson_ids = set()
        english_seen = {}
        for path, l in lessons:
            where = rel(path)
            lid = l.get('id')
            if not lid:
                errors.append(f'{where}: "id" fehlt')
                continue
            if path.stem != lid:
                errors.append(f'{where}: Dateiname muss zur id passen ({lid}.json)')
            if lid in lesson_ids:
                errors.append(f'{where}: Lektion "{lid}" gibt es zweimal')
            lesson_ids.add(lid)
            e, w = check_lesson(where, l)
            errors += e
            warnings += w
            if l.get('kind') == 'vokabeln':
                for it in l.get('items') or []:
                    if it.get('b'):
                        english_seen.setdefault(it['b'].strip().lower(), []).append(lid)
        for b, lids in english_seen.items():
            if len(lids) > 1:
                warnings.append(f'Fach {sid}: "{b}" steht in mehreren Lektionen ({", ".join(lids)})')
        for src, dst in (fach.get('moved') or {}).items():
            if dst not in lesson_ids:
                errors.append(f'Fach {sid}: Umzug "{src}" → "{dst}", aber Lektion "{dst}" gibt es nicht')
            if src in lesson_ids:
                warnings.append(f'Fach {sid}: Umzug von "{src}", aber "{src}" gibt es noch als Lektion')
    warnings += removed_ids(subjects)
    errors += removed_moves(subjects)
    return errors, warnings


def item_label(where, n, it):
    return f'{where} Eintrag {n}' + (f' ({it.get("b")})' if it.get('b') else '')


# Muster wie in js/validate.js (Lernweg-Spielstand): Lektion "<fach>/<lektion>", Wort-IDs.
LESSON_ID = re.compile(r'^[A-Za-z0-9_-]{1,60}$')
WORD_ID = re.compile(r'^[^\x00-\x1f<>|]{1,80}$')
HOF_THEMES = {'neutral', 'halloween', 'schule'}   # wie js/hof-data.js


def check_lesson(where, l):
    """Was für jede Lektion gilt – dann die Prüfung ihrer Art."""
    errors, warnings = [], []
    if 'neu' in l:
        warnings.append(f'{where}: "neu" wird nicht mehr genutzt (Lektionen öffnen sich streng nacheinander) – kann weg')
    if 'icon' in l and not (isinstance(l['icon'], str) and 0 < len(l['icon']) <= 8 and not re.search(r'[<>&"\s]', l['icon'])):
        errors.append(f'{where}: "icon" muss ein kurzes Symbol sein (ein Emoji, z. B. "🎃")')
    if 'hof' in l and l['hof'] not in HOF_THEMES:
        errors.append(f'{where}: "hof" muss eins von {sorted(HOF_THEMES)} sein (Thema der Hofkarte)')
    if not LESSON_ID.match(str(l.get('id', ''))):
        errors.append(f'{where}: "id" darf nur a–z, A–Z, 0–9, - und _ enthalten (höchstens 60 Zeichen)')
    if not l.get('title'):
        errors.append(f'{where}: "title" fehlt')
    for old in ('exercises', 'grammar'):
        if old in l:
            errors.append(f'{where}: "{old}" gibt es nicht mehr – stattdessen "kind" (und ggf. "modes")')
    kind = l.get('kind')
    if kind not in KNOWN_KINDS:
        errors.append(f'{where}: "kind" muss eins von {sorted(KNOWN_KINDS)} sein')
    for mode in l.get('modes', []):
        if mode not in KNOWN_MODES:
            errors.append(f'{where}: unbekannte Übungsart "{mode}" (bekannt: {sorted(KNOWN_MODES)})')
    items = l.get('items') or []
    if not items:
        errors.append(f'{where}: keine Einträge ("items")')
    ids = set()
    for n, it in enumerate(items, 1):
        at = item_label(where, n, it)
        for side in ('a', 'b'):
            if not isinstance(it.get(side), str) or not it[side].strip():
                errors.append(f'{at}: "{side}" fehlt oder ist leer')
        for alt in ('aAlt', 'bAlt'):
            if alt in it and not (isinstance(it[alt], list) and all(isinstance(x, str) for x in it[alt])):
                errors.append(f'{at}: "{alt}" muss eine Liste von Texten sein')
        if 'denken' in it and (not is_num(it['denken']) or it['denken'] not in THINK_VALUES):
            errors.append(f'{at}: "denken" muss einer der Werte {sorted(THINK_VALUES)} sein (js/weights.js)')
        if 'level' in it and (isinstance(it['level'], bool) or it['level'] not in (1, 2, 3)):
            errors.append(f'{at}: "level" muss 1 (Basis), 2 (Fortgeschritten) oder 3 (Experte) sein')
        iid = it.get('id')
        # Wort-IDs stehen im Lernweg-Spielstand (js/validate.js WORD_ID) – sonst ginge Fortschritt verloren.
        wid = iid if iid is not None else it.get('b')
        if isinstance(wid, str) and not WORD_ID.match(wid):
            errors.append(f'{at}: id/b "{wid}" passt nicht als Kennung (höchstens 80 Zeichen, ohne < > | und Steuerzeichen) – "id" setzen')
        if wid in ('__proto__', 'constructor', 'prototype'):
            errors.append(f'{at}: "{wid}" ist als Kennung nicht erlaubt')
        if iid is not None and iid in ids:
            errors.append(f'{at}: id "{iid}" gibt es in der Lektion zweimal')
        ids.add(iid)
    e, w = KIND_CHECKS.get(kind, lambda *_: ([], []))(where, l, items)
    return errors + e, warnings + w


def check_language(where, l, items):
    """Vokabeln und Grammatik: zwei Sprachseiten, Beispielsätze mit Lücke."""
    errors, warnings = [], []
    sides = l.get('sides') or {}
    if not sides.get('a') or not sides.get('b'):
        errors.append(f'{where}: "sides" braucht a und b')
    frames, prompts = {}, {}
    for n, it in enumerate(items, 1):
        at = item_label(where, n, it)
        if it.get('id') is None:
            warnings.append(f'{at}: keine "id" – "bauen" ergänzt sie')
        if 'ex' in it:
            if not parse_gap(it['ex']):
                errors.append(f'{at}: Beispielsatz braucht genau eine {{Lücke}}: "{it["ex"]}"')
            if not it.get('exDe'):
                warnings.append(f'{at}: Beispielsatz ohne Übersetzung ("exDe")')
            g = GAP.match(it['ex'])
            if g:
                frames.setdefault((g.group(1) + '…' + g.group(3)).lower(), []).append(it.get('b'))
        if it.get('a'):
            prompts.setdefault(it['a'].strip().lower(), []).append(it.get('b'))
    for f, bs in frames.items():
        if len(bs) > 1:
            warnings.append(f'{where}: gleicher Lückensatz „{f}“ für {", ".join(map(str, bs))} – Satz abwandeln')
    for p, bs in prompts.items():
        if len(bs) > 1:
            warnings.append(f'{where}: gleiches deutsches Wort "{p}" für {", ".join(map(str, bs))} – beim Abfragen mehrdeutig')
    return errors, warnings


def check_grammar(where, l, items):
    errors, warnings = check_language(where, l, items)
    for n, it in enumerate(items, 1):
        at = item_label(where, n, it)
        g = parse_gap(it.get('ex'))
        choices = it.get('choices')
        if not isinstance(choices, list) or len(choices) < 2:
            errors.append(f'{at}: Grammatik-Satz braucht "choices" (mind. 2)')
        elif g and g['answer'].lower() not in [c.lower() for c in choices]:
            errors.append(f'{at}: Lösung "{g["answer"]}" steht nicht in "choices"')
    return errors, warnings


def check_math_lesson(where, l, items):
    """Mathe: feste ids (die Lösung ist nicht eindeutig), Knöpfe und Grafiken stimmig."""
    errors = []
    for n, it in enumerate(items, 1):
        at = item_label(where, n, it)
        if it.get('id') is None:
            errors.append(f'{at}: Mathe-Aufgaben brauchen eine feste "id"')
        errors += check_math(at, it)
    return errors, []


KIND_CHECKS = {'vokabeln': check_language, 'grammatik': check_grammar, 'mathe': check_math_lesson}


def is_num(x):
    """Zahl, aber kein True/False (bool ist in Python auch eine Zahl)."""
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def math_norm(s):
    """Wie mathNorm in js/exercises/math.js: Tausendertrenner (Punkt/Leerzeichen vor genau drei
    Ziffern) und Leerzeichen weg, sonst Punkt = Komma, Groß/klein egal."""
    s = unicodedata.normalize('NFC', str(s)).strip()
    s = re.sub(r'(\d)[.\s](?=\d{3}(?!\d))', r'\1', s)
    return re.sub(r'\s+', '', s).replace('.', ',').upper()


def num_text(x):
    """Zahl so, wie sie als Lösung geschrieben würde: 8 → "8", 2.5 → "2,5"."""
    return str(int(x)) if float(x).is_integer() else str(x).replace('.', ',')


def on_grid(value, start, step):
    k = (value - start) / step
    return abs(k - round(k)) < 1e-9


def check_math(at, it):
    """Mathe-Aufgabe: Antwort-Knöpfe enthalten die Lösung, Grafiken sind vollständig und
    so, wie die App sie zeichnen kann (charts.js, numberline.js)."""
    out = []
    choices = it.get('choices')
    if choices is not None:
        if not isinstance(choices, list) or len(choices) < 2:
            out.append(f'{at}: "choices" braucht mindestens 2 Antworten')
        elif math_norm(it.get('b', '')) not in [math_norm(c) for c in choices]:
            out.append(f'{at}: Lösung "{it.get("b")}" steht nicht in "choices"')
    chart = it.get('chart')
    if chart is not None:
        kind = chart.get('type')
        labels, values = chart.get('labels') or [], chart.get('values') or []
        if kind not in ('saeulen', 'balken', 'bild'):
            out.append(f'{at}: "chart": type muss saeulen, balken oder bild sein')
        if not labels or len(labels) != len(values) or not all(is_num(v) and v >= 0 for v in values):
            out.append(f'{at}: "chart": labels und values (Zahlen ≥ 0) müssen gleich lang sein')
        elif kind == 'bild':
            per = chart.get('per', 1)
            if not is_num(per) or per <= 0:
                out.append(f'{at}: "chart": "per" muss eine Zahl > 0 sein')
            else:
                for label, v in zip(labels, values):
                    if v % per not in (0, per / 2):
                        out.append(f'{at}: "chart": {label} = {v} lässt sich mit je {per} pro Symbol nicht zeichnen '
                                   '(nur ganze und halbe Symbole)')
        elif kind in ('saeulen', 'balken'):
            step = chart.get('step', 1)
            top = chart.get('max')
            if not is_num(step) or step <= 0:
                out.append(f'{at}: "chart": "step" muss eine Zahl > 0 sein')
            elif top is not None and (not is_num(top) or top <= 0 or not on_grid(top, 0, step)):
                out.append(f'{at}: "chart": "max" muss ein Vielfaches von "step" sein (> 0)')
            else:
                top = top if top is not None else math.ceil(max(values) / step) * step
                if top <= 0:
                    out.append(f'{at}: "chart": alle Werte 0 – nichts zu zeichnen')
                elif top / step > 40:
                    out.append(f'{at}: "chart": zu viele Hilfslinien – größeres "step" wählen')
                if max(values) > top:
                    out.append(f'{at}: "chart": Wert über "max"')
    tally = it.get('tally')
    if tally is not None and not (isinstance(tally, list) and tally and all(
            isinstance(r, list) and len(r) == 2 and isinstance(r[1], int) and not isinstance(r[1], bool)
            and 0 <= r[1] <= 60 for r in tally)):
        out.append(f'{at}: "tally" muss eine Liste von ["Name", Anzahl] sein (Anzahl 0–60)')
    line = it.get('line')
    if line is not None:
        nums = {k: line.get(k) for k in ('from', 'to', 'step')}
        if not all(is_num(v) for v in nums.values()) or nums['step'] <= 0 or nums['to'] <= nums['from']:
            out.append(f'{at}: "line" braucht from < to und step > 0')
        else:
            n = (nums['to'] - nums['from']) / nums['step']
            if not on_grid(nums['to'], nums['from'], nums['step']) or n > 200:
                out.append(f'{at}: "line": (to - from) muss ein Vielfaches von step sein (höchstens 200 Striche)')
            arrow = line.get('arrow')
            if arrow is not None and (not is_num(arrow) or not nums['from'] <= arrow <= nums['to']
                                      or not on_grid(arrow, nums['from'], nums['step'])):
                out.append(f'{at}: "line": Pfeil {arrow} liegt nicht auf einem Strich')
            elif arrow is not None and math_norm(num_text(arrow)) != math_norm(it.get('b', '')):
                out.append(f'{at}: "line": Pfeil zeigt auf {arrow}, Lösung ist aber "{it.get("b")}"')
    return out


def removed_moves(subjects):
    """Fehler, wenn ein Umzug ("moved") gegenüber dem letzten Commit verschwindet oder ein anderes Ziel
    bekommt. Umzüge müssen für immer bleiben: Ein Gerät, das lange nicht geöffnet wurde, braucht sie noch,
    um seinen Lernstand in die neue Lektion mitzunehmen."""
    out = []
    for fach, _ in subjects:
        path = f'content/{fach.get("id")}/_fach.json'
        try:
            old = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
            old_moved = json.loads(old).get('moved') or {}
        except Exception:
            continue
        now = fach.get('moved') or {}
        for src, dst in old_moved.items():
            if now.get(src) != dst:
                out.append(f'{path}: Umzug "{src}" → "{dst}" fehlt oder wurde geändert – Umzüge müssen bleiben '
                           '(sonst verlieren Geräte, die länger nicht offen waren, den Lernstand)')
    return out


def removed_ids(subjects):
    """Warnung, wenn gegenüber dem letzten Commit Wort-IDs verschwinden (Lernstand ginge verloren)."""
    out = []
    now = {}
    for fach, lessons in subjects:
        for path, l in lessons:
            now[rel(path)] = {it.get('id') for it in l.get('items', [])}
    for path, ids in now.items():
        try:
            old = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
            old_ids = {it.get('id', it.get('b')) for it in json.loads(old).get('items', [])}
        except Exception:
            continue
        gone = sorted(i for i in old_ids - ids if i)
        if gone:
            out.append(f'{path}: Wort-IDs entfernt oder geändert ({", ".join(gone)}) – deren Lernstand geht verloren')
    return out


def report(errors, warnings):
    for w in warnings:
        print(f'  Hinweis: {w}')
    for e in errors:
        print(f'  FEHLER:  {e}')
    print(f'{len(errors)} Fehler, {len(warnings)} Hinweise.')


# --- Bauen -------------------------------------------------------------------

def article_free(text, side):
    out = set()
    for part in [p.strip() for p in text.split(' / ')]:
        if side == 'a':
            m = DE_ARTICLE.match(part)
            if m:
                out.add(part[m.end():])
        else:
            for pre in ('to ', 'a ', 'an '):
                if part.lower().startswith(pre):
                    out.add(part[len(pre):])
    return out


def fill(lesson):
    """IDs und artikellose Varianten ergänzen. Bestehende IDs werden nie geändert."""
    items = []
    for it in lesson.get('items', []):
        it = dict(it)
        if 'id' not in it:
            it = {'id': it['b'], **it}
        if lesson.get('kind') in (None, 'vokabeln'):
            for side, alt in (('a', 'aAlt'), ('b', 'bAlt')):
                extra = article_free(it[side], side) - set(it.get(alt, [])) - {it[side]}
                if extra:
                    it[alt] = sorted(set(it.get(alt, [])) | extra)
        items.append(it)
    lesson['items'] = items
    return lesson


def build():
    subjects, load_errors = load_subjects()
    errors, warnings = check(subjects)
    errors = load_errors + errors
    report(errors, warnings)
    if errors:
        print('Nichts gebaut – erst die Fehler beheben.')
        return 1

    changed_files = []
    index_subjects = []
    for fach, lessons in subjects:
        entry = {k: v for k, v in fach.items() if k != 'order'}
        entry['lessons'] = []
        for path, l in lessons:
            l = fill(l)
            if write_json(path, l):
                changed_files.append(rel(path))
            le = {'id': l['id'], 'title': l['title'], 'file': f'{fach["id"]}/{path.name}'}
            if l.get('group'):
                le['group'] = l['group']
            entry['lessons'].append(le)
        index_subjects.append(entry)

    # Fingerabdruck aller Inhalte: nur wenn er sich ändert, gibt es eine neue Version.
    h = hashlib.sha256()
    h.update(json.dumps(index_subjects, ensure_ascii=False, sort_keys=True).encode())
    for fach, lessons in subjects:
        for path, _ in lessons:
            h.update(path.read_bytes())
    digest = h.hexdigest()[:16]

    old = read_json(INDEX) if INDEX.exists() else {}
    version = old.get('version', 0)
    updated = old.get('updated')
    if old.get('hash') != digest:
        version += 1
        updated = datetime.date.today().isoformat()
    # Inhalte brauchen mindestens den Funktionsstand der App, mit der sie gebaut wurden.
    min_app = int(re.search(r'APP_VERSION = (\d+)', (ROOT / 'js' / 'version.js').read_text()).group(1))
    if old.get('minApp') != min_app:
        version = max(version, old.get('version', 0) + 1)
        updated = datetime.date.today().isoformat()
    index = {'version': version, 'updated': updated, 'hash': digest, 'minApp': min_app,
             'app': {'modes': sorted(KNOWN_MODES), 'kinds': sorted(KNOWN_KINDS)},   # für den Selbsttest
             'subjects': index_subjects}
    if write_json(INDEX, index):
        changed_files.append(rel(INDEX))

    print(f'Inhalte Version {version} (Stand {updated}).')
    print('Geändert: ' + (', '.join(changed_files) if changed_files else 'nichts'))
    return 0


# --- Neue Lektion aus Tabellen-Entwurf ---------------------------------------

def new_lesson(args):
    fach_dir = CONTENT / args.fach
    if not (fach_dir / '_fach.json').exists():
        print(f'Fach "{args.fach}" gibt es nicht (content/{args.fach}/_fach.json fehlt).')
        return 1
    path = fach_dir / f'{args.id}.json'
    if path.exists():
        print(f'{rel(path)} gibt es schon – nichts überschrieben.')
        return 1
    orders = [read_json(p).get('order', 0) for p in fach_dir.glob('*.json') if not p.name.startswith('_')]
    source = open(args.datei, encoding='utf-8') if args.datei else sys.stdin
    items = []
    for raw in source:
        line = raw.rstrip('\n')
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        cols = [c.strip() for c in line.split('\t')] + [''] * 5
        en, de, ex, ex_de, flags = cols[:5]
        it = {'id': en, 'a': de, 'b': en}
        if ex:
            it['ex'] = ex
        if ex_de:
            it['exDe'] = ex_de
        for flag in [f.strip() for f in flags.split(',') if f.strip()]:
            if flag == 'schwer':
                it['hard'] = True
            elif '=' in flag:
                k, v = flag.split('=', 1)
                if k in ('aAlt', 'bAlt', 'choices'):
                    it[k] = [x.strip() for x in v.split('|') if x.strip()]
        if args.grammatik:
            it['id'] = f's{len(items) + 1}'
            it.setdefault('choices', ['am', 'is', 'are'])
        items.append(it)
    lesson = {'id': args.id, 'title': args.titel}
    if args.gruppe:
        lesson['group'] = args.gruppe
    lesson['order'] = (max(orders) if orders else 0) + 10
    lesson['kind'] = 'grammatik' if args.grammatik else 'vokabeln'
    lesson.update({'sides': {'a': 'Deutsch', 'b': 'Englisch'}})
    lesson['items'] = items
    write_json(path, fill(lesson))
    print(f'{rel(path)} angelegt: {len(items)} Einträge. Jetzt "bauen" ausführen.')
    return 0


def main():
    ap = argparse.ArgumentParser(description='Inhalte der LernApp prüfen und bauen.')
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('pruefen', help='alle Inhalte prüfen')
    sub.add_parser('bauen', help='prüfen, ergänzen, index.json bauen')
    n = sub.add_parser('neu', help='neue Lektion aus Tabellen-Entwurf')
    n.add_argument('fach')
    n.add_argument('id')
    n.add_argument('--titel', required=True)
    n.add_argument('--gruppe')
    n.add_argument('--grammatik', action='store_true')
    n.add_argument('--datei', help='Entwurf aus Datei statt von der Eingabe')
    args = ap.parse_args()

    if args.cmd == 'pruefen':
        subjects, load_errors = load_subjects()
        errors, warnings = check(subjects)
        report(load_errors + errors, warnings)
        return 1 if load_errors or errors else 0
    if args.cmd == 'bauen':
        return build()
    return new_lesson(args)


if __name__ == '__main__':
    sys.exit(main())

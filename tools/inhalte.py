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
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
INDEX = CONTENT / 'index.json'

LESSON_TYPES = {'pairs'}


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
KNOWN_KINDS = _from_app('js/lessons.js', r"^\s+([a-z]+): \{ unit:")
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
            if not l.get('title'):
                errors.append(f'{where}: "title" fehlt')
            if l.get('type') not in LESSON_TYPES:
                errors.append(f'{where}: unbekannter type "{l.get("type")}"')
            sides = l.get('sides') or {}
            if not sides.get('a') or not sides.get('b'):
                errors.append(f'{where}: "sides" braucht a und b')
            for old in ('exercises', 'grammar'):
                if old in l:
                    errors.append(f'{where}: "{old}" gibt es nicht mehr – stattdessen "kind" (und ggf. "modes")')
            if l.get('kind') not in KNOWN_KINDS:
                errors.append(f'{where}: "kind" muss eins von {sorted(KNOWN_KINDS)} sein')
            for mode in l.get('modes', []):
                if mode not in KNOWN_MODES:
                    errors.append(f'{where}: unbekannte Übungsart "{mode}" (bekannt: {sorted(KNOWN_MODES)})')
            items = l.get('items') or []
            if not items:
                errors.append(f'{where}: keine Wörter ("items")')
            grammar = l.get('kind') == 'grammatik'
            math = l.get('kind') == 'mathe'
            ids, prompts = set(), {}
            for n, it in enumerate(items, 1):
                at = f'{where} Wort {n}' + (f' ({it.get("b")})' if it.get('b') else '')
                for side in ('a', 'b'):
                    if not isinstance(it.get(side), str) or not it[side].strip():
                        errors.append(f'{at}: "{side}" fehlt oder ist leer')
                for alt in ('aAlt', 'bAlt'):
                    if alt in it and not (isinstance(it[alt], list) and all(isinstance(x, str) for x in it[alt])):
                        errors.append(f'{at}: "{alt}" muss eine Liste von Texten sein')
                iid = it.get('id')
                if iid is None:
                    warnings.append(f'{at}: keine "id" – "bauen" ergänzt sie')
                elif iid in ids:
                    errors.append(f'{at}: id "{iid}" gibt es in der Lektion zweimal')
                ids.add(iid)
                if 'ex' in it:
                    g = parse_gap(it['ex'])
                    if not g:
                        errors.append(f'{at}: Beispielsatz braucht genau eine {{Lücke}}: "{it["ex"]}"')
                    if not it.get('exDe'):
                        warnings.append(f'{at}: Beispielsatz ohne Übersetzung ("exDe")')
                if grammar:
                    g = parse_gap(it.get('ex'))
                    choices = it.get('choices')
                    if not isinstance(choices, list) or len(choices) < 2:
                        errors.append(f'{at}: Grammatik-Satz braucht "choices" (mind. 2)')
                    elif g and g['answer'].lower() not in [c.lower() for c in choices]:
                        errors.append(f'{at}: Lösung "{g["answer"]}" steht nicht in "choices"')
                if it.get('a') and not math:   # Mathe: gleiche Frage, andere Zahlen/Zahlenstrahl
                    prompts.setdefault(it['a'].strip().lower(), []).append(it.get('b'))
                if math:
                    errors += check_math(at, it)
                if it.get('b') and l.get('kind') == 'vokabeln':
                    english_seen.setdefault(it['b'].strip().lower(), []).append(lid)
            frames = {}
            for it in items:
                g = GAP.match(it.get('ex') or '')
                if g:
                    frames.setdefault((g.group(1) + '…' + g.group(3)).lower(), []).append(it.get('b'))
            for f, bs in frames.items():
                if len(bs) > 1:
                    warnings.append(f'{where}: gleicher Lückensatz „{f}“ für {", ".join(map(str, bs))} – Satz abwandeln')
            for p, bs in prompts.items():
                if len(bs) > 1:
                    warnings.append(f'{where}: gleiches deutsches Wort "{p}" für {", ".join(map(str, bs))} – beim Abfragen mehrdeutig')
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


def check_math(at, it):
    """Mathe-Aufgabe: Antwort-Knöpfe enthalten die Lösung, Zahlenstrahl ist vollständig."""
    out = []
    norm = lambda s: re.sub(r'[\s.]', '', str(s)).upper()
    choices = it.get('choices')
    if choices is not None:
        if not isinstance(choices, list) or len(choices) < 2:
            out.append(f'{at}: "choices" braucht mindestens 2 Antworten')
        elif norm(it.get('b', '')) not in [norm(c) for c in choices]:
            out.append(f'{at}: Lösung "{it.get("b")}" steht nicht in "choices"')
    chart = it.get('chart')
    if chart is not None:
        labels, values = chart.get('labels') or [], chart.get('values') or []
        if chart.get('type') not in ('saeulen', 'balken', 'bild'):
            out.append(f'{at}: "chart": type muss saeulen, balken oder bild sein')
        if not labels or len(labels) != len(values) or not all(isinstance(v, (int, float)) and v >= 0 for v in values):
            out.append(f'{at}: "chart": labels und values (Zahlen ≥ 0) müssen gleich lang sein')
        elif chart.get('type') != 'bild':
            step = chart.get('step') or 1
            top = chart.get('max') or -(-max(values) // step) * step
            if top / step > 40:
                out.append(f'{at}: "chart": zu viele Hilfslinien – größeres "step" wählen')
            if max(values) > top:
                out.append(f'{at}: "chart": Wert über "max"')
    tally = it.get('tally')
    if tally is not None and not (isinstance(tally, list) and tally and all(
            isinstance(r, list) and len(r) == 2 and isinstance(r[1], int) and 0 <= r[1] <= 60 for r in tally)):
        out.append(f'{at}: "tally" muss eine Liste von ["Name", Anzahl] sein (Anzahl 0–60)')
    line = it.get('line')
    if line is not None:
        nums = {k: line.get(k) for k in ('from', 'to', 'step')}
        if not all(isinstance(v, (int, float)) for v in nums.values()) or nums['step'] <= 0 or nums['to'] <= nums['from']:
            out.append(f'{at}: "line" braucht from < to und step > 0')
        else:
            n = (nums['to'] - nums['from']) / nums['step']
            if n != int(n) or n > 200:
                out.append(f'{at}: "line": (to - from) muss ein Vielfaches von step sein (höchstens 200 Striche)')
            arrow = line.get('arrow')
            if arrow is not None and (not nums['from'] <= arrow <= nums['to'] or (arrow - nums['from']) % nums['step']):
                out.append(f'{at}: "line": Pfeil {arrow} liegt nicht auf einem Strich')
            if arrow is not None and norm(arrow) != norm(it.get('b', '')):
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
    lesson.update({'type': 'pairs', 'sides': {'a': 'Deutsch', 'b': 'Englisch'}})
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

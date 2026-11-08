#!/usr/bin/env python3
"""Prüfung vor jedem Push – damit auf dem Tablet nie eine halbe oder veraltete App ankommt.

    python3 tools/check.py           prüfen (Exit 1 bei Fehlern)
    python3 tools/check.py --fix     Cache-Namen in sw.js automatisch setzen, Inhalte bauen
    python3 tools/check.py --hook    als Git-Hook einrichten (prüft vor jedem git push)

Geprüft wird:
  1. Jede App-Datei (js/, css/, img/, icons/, index.html, manifest) steht in der Offline-Liste
     (SHELL in sw.js), jeder Eintrag dort existiert und ist in git.
  2. Der Cache-Name in sw.js passt zum Inhalt der App-Dateien (Fingerabdruck) – geändert wird
     er mit --fix. So kann das Hochzählen nicht mehr vergessen werden.
  3. Die Inhalte sind gebaut (tools/inhalte.py bauen ändert nichts mehr).
  4. Hinweis, wenn App-Dateien geändert, aber noch nicht committet sind.
Die Selbsttest-Seite (tests/) läuft im Browser – daran erinnert die Ausgabe.
"""

import hashlib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / 'sw.js'
APP_DIRS = ('js', 'css', 'img', 'icons')
APP_FILES = ('index.html', 'manifest.webmanifest')
CACHE_RE = re.compile(r"^const CACHE = '([^']*)';$", re.M)


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True).stdout


def shell_list(sw_text):
    block = sw_text[sw_text.index('const SHELL = ['):]
    block = block[:block.index('];')]
    return re.findall(r"'([^']+)'", block)


def app_files():
    files = set(APP_FILES)
    for d in APP_DIRS:
        files |= {str(p.relative_to(ROOT)) for p in (ROOT / d).rglob('*') if p.is_file()}
    return files


def fingerprint(sw_text, shell):
    """Name der App-Version aus dem Inhalt aller App-Dateien und von sw.js selbst."""
    h = hashlib.sha256()
    h.update(CACHE_RE.sub("const CACHE = '';", sw_text).encode())
    for f in sorted(x for x in shell if x != './'):
        p = ROOT / f
        if p.exists():
            h.update(f.encode())
            h.update(p.read_bytes())
    return 'lernapp-' + h.hexdigest()[:10]


def main():
    fix = '--fix' in sys.argv
    if '--hook' in sys.argv:
        hook = ROOT / '.git' / 'hooks' / 'pre-push'
        hook.write_text('#!/bin/sh\n# Eingerichtet von tools/check.py – prüft vor jedem Push.\n'
                        'exec python3 "$(git rev-parse --show-toplevel)/tools/check.py"\n')
        hook.chmod(0o755)
        print(f'Git-Hook eingerichtet: {hook.relative_to(ROOT)}')
        return 0

    errors, notes = [], []
    sw_text = SW.read_text(encoding='utf-8')
    shell = shell_list(sw_text)
    tracked = set(git('ls-files').split('\n'))

    # 1. Offline-Liste vollständig?
    for f in sorted(app_files() - set(shell)):
        errors.append(f'{f} fehlt in der Offline-Liste (SHELL in sw.js) – offline würde die App nicht starten')
    for f in shell:
        if f == './':
            continue
        if not (ROOT / f).exists():
            errors.append(f'SHELL-Eintrag {f} gibt es nicht – das Update würde auf dem Tablet scheitern')
        elif f not in tracked:
            errors.append(f'{f} steht in SHELL, ist aber nicht in git – würde nicht hochgeladen')

    # 2. Cache-Name passt zum Inhalt?
    current = CACHE_RE.search(sw_text)
    wanted = fingerprint(sw_text, shell)
    if not current:
        errors.append('In sw.js fehlt die Zeile  const CACHE = \'…\';')
    elif current.group(1) != wanted:
        if fix:
            sw_text = CACHE_RE.sub(f"const CACHE = '{wanted}';", sw_text)
            SW.write_text(sw_text, encoding='utf-8')
            notes.append(f'Cache-Name gesetzt: {wanted}')
        else:
            errors.append(f'Cache-Name passt nicht zu den App-Dateien ({current.group(1)} statt {wanted}) '
                          '– tools/check.py --fix ausführen')

    # 3. Inhalte gebaut?
    before = git('status', '--porcelain', '--', 'content')
    build = subprocess.run([sys.executable, str(ROOT / 'tools' / 'inhalte.py'), 'bauen'],
                           cwd=ROOT, capture_output=True, text=True)
    if build.returncode != 0:
        errors.append('Inhalte haben Fehler:\n' + build.stdout.strip())
    elif git('status', '--porcelain', '--', 'content') != before:
        msg = 'Inhalte waren nicht gebaut – jetzt gebaut, bitte committen'
        (notes if fix else errors).append(msg)

    # 4. Nicht committete App-Änderungen?
    dirty = [l[3:] for l in git('status', '--porcelain').splitlines()
             if l[3:].split('/')[0] in APP_DIRS or l[3:] in APP_FILES or l[3:] == 'sw.js' or l[3:].startswith('content/')]
    if dirty:
        notes.append('Noch nicht committet (gepusht wird nur Committetes): ' + ', '.join(dirty))

    for n in notes:
        print(f'  Hinweis: {n}')
    for e in errors:
        print(f'  FEHLER:  {e}')
    if errors:
        print(f'{len(errors)} Fehler – so nicht pushen.')
        return 1
    print(f'Alles in Ordnung. App-Stand {wanted}. Vor dem Push noch tests/ im Browser laufen lassen.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

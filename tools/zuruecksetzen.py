#!/usr/bin/env python3
"""Spielstand in der Sicherung auf eine frühere Uhrzeit zurücksetzen.

    python3 tools/zuruecksetzen.py --bis "2026-11-08 19:00"              nur anzeigen
    python3 tools/zuruecksetzen.py --bis "2026-11-08 19:00" --ausfuehren  wirklich zurücksetzen

Sucht in der Git-Historie der Sicherung (Repo lernapp-daten) den letzten Stand vor der
Uhrzeit (Ortszeit), setzt darin "resetAt" auf jetzt und schreibt ihn als NEUEN Commit
(die Historie bleibt vollständig erhalten, nichts wird überschrieben). Das Tablet übernimmt
den Stand beim nächsten Öffnen – ein Zurücksetzen gewinnt gegen alles, was vorher geübt wurde.

Braucht die GitHub-Kommandozeile (gh), angemeldet mit Zugriff auf das Repo.
"""

import argparse
import base64
import datetime
import json
import subprocess
import sys

FILE = 'spielstand.json'


def gh(*args, input_=None):
    r = subprocess.run(['gh', 'api', *args], capture_output=True, text=True, input=input_)
    if r.returncode != 0:
        sys.exit(f'GitHub-Fehler: {r.stderr.strip() or r.stdout.strip()}')
    return json.loads(r.stdout) if r.stdout.strip() else None


def read_state(repo, ref):
    meta = gh(f'repos/{repo}/contents/{FILE}?ref={ref}')
    content = meta.get('content') or gh(f'repos/{repo}/git/blobs/{meta["sha"]}')['content']
    data = json.loads(base64.b64decode(content).decode('utf-8'))
    if not isinstance(data, dict) or not isinstance(data.get('state'), dict):
        sys.exit(f'Stand {ref[:7]} ist kein gültiger Spielstand.')
    return meta['sha'], data


def summary(state):
    items = state.get('items') or {}
    days = state.get('days') or {}
    return f'{state.get("points", 0)} Sternchen, {len(items)} Lern-Einträge, {len(days)} Übungstage'


def main():
    ap = argparse.ArgumentParser(description='Spielstand auf eine frühere Uhrzeit zurücksetzen.')
    ap.add_argument('--bis', required=True, help='Ortszeit, z. B. "2026-11-08 19:00"')
    ap.add_argument('--repo', default='chris-da-r4ven/lernapp-daten')
    ap.add_argument('--ausfuehren', action='store_true', help='wirklich zurücksetzen (sonst nur anzeigen)')
    args = ap.parse_args()

    try:
        until_local = datetime.datetime.strptime(args.bis, '%Y-%m-%d %H:%M').astimezone()
    except ValueError:
        sys.exit('Zeit bitte als "JJJJ-MM-TT HH:MM" angeben.')
    until_utc = until_local.astimezone(datetime.timezone.utc)

    def when(c):
        return datetime.datetime.fromisoformat(c['commit']['committer']['date'].replace('Z', '+00:00'))
    # Seite für Seite zurückblättern (neueste zuerst), bis eine Sicherung vor der Uhrzeit kommt.
    target = None
    for page in range(1, 51):
        commits = gh(f'repos/{args.repo}/commits?path={FILE}&per_page=100&page={page}')
        target = next((c for c in commits if when(c) <= until_utc), None)
        if target or len(commits) < 100:
            break
    if not target:
        sys.exit(f'Keine Sicherung vor {args.bis} gefunden.')
    _, old = read_state(args.repo, target['sha'])
    current_sha, current = read_state(args.repo, 'HEAD')

    t_local = when(target).astimezone().strftime('%d.%m.%Y %H:%M')
    print(f'Zurücksetzen auf Stand vom {t_local} ({target["sha"][:7]}: {target["commit"]["message"]})')
    print(f'  jetzt:   {summary(current["state"])}')
    print(f'  danach:  {summary(old["state"])}')
    if not args.ausfuehren:
        print('Nur angezeigt. Zum Ausführen --ausfuehren anhängen.')
        return 0

    state = dict(old['state'])
    state['resetAt'] = int(datetime.datetime.now().timestamp() * 1000)
    body = {
        'message': f'Zurückgesetzt auf Stand vom {t_local}',
        'content': base64.b64encode(json.dumps({'savedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                                 'state': state}, ensure_ascii=False, indent=1).encode()).decode(),
        'sha': current_sha,
    }
    gh('-X', 'PUT', f'repos/{args.repo}/contents/{FILE}', '--input', '-', input_=json.dumps(body))
    print('Erledigt. Das Tablet übernimmt den Stand beim nächsten Öffnen der App.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

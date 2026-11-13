# Banner für die Fachseite Mathe: Reitplatz mit Buchstaben, Zaun als Zahlenstrahl, nummerierte Sprünge,
# Pony am Messstock, Heuballen als Säulendiagramm, Stalltafel mit Strichliste.
# Aufruf: python3 tools/hofkarte/banner_mathe.py  → img/banner-mathe.svg
# Gleiche Maße und Regeln wie banner_englisch.py (Wichtiges in der Mitte, unten links das Namensschild).
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from banner_englisch import pony, bush, BAY, W, H, f, ROOT

FONT = 'font-family="Nunito, sans-serif" font-weight="900"'

def stable(x, y):
    """Stallwand mit Dach, Tor und Tafel (Strichliste: 4 + 1 gebündelt = 5, dazu 3)."""
    out = [f'<rect x="{x}" y="{y - 110}" width="250" height="110" fill="#c9543f"/>',
           f'<polygon points="{x - 14},{y - 108} {x + 125},{y - 160} {x + 264},{y - 108}" fill="#7a3b2e"/>',
           f'<rect x="{x + 20}" y="{y - 70}" width="62" height="70" fill="#6b2f24"/>',
           f'<path d="M{x + 20} {y - 70} L{x + 82} {y} M{x + 82} {y - 70} L{x + 20} {y}" stroke="#8f4636" stroke-width="5"/>']
    bx, by = x + 110, y - 92
    out.append(f'<rect x="{bx}" y="{by}" width="118" height="62" rx="4" fill="#2f4a3a" stroke="#8b5a2b" stroke-width="5"/>')
    chalk = 'stroke="#eef2ea" stroke-width="3" stroke-linecap="round"'
    for k in range(4):   # Fünferbündel
        out.append(f'<line x1="{bx + 14 + k * 9}" y1="{by + 14}" x2="{bx + 14 + k * 9}" y2="{by + 46}" {chalk}/>')
    out.append(f'<line x1="{bx + 8}" y1="{by + 40}" x2="{bx + 50}" y2="{by + 20}" {chalk}/>')
    for k in range(3):
        out.append(f'<line x1="{bx + 66 + k * 9}" y1="{by + 14}" x2="{bx + 66 + k * 9}" y2="{by + 46}" {chalk}/>')
    return ''.join(out)

def hay_chart(x, y, heights):
    """Heuballen gestapelt wie ein Säulendiagramm."""
    out = [f'<line x1="{x - 6}" y1="{y}" x2="{x + len(heights) * 46 + 4}" y2="{y}" stroke="#6b4a2a" stroke-width="3"/>']
    for i, n in enumerate(heights):
        for k in range(n):
            bx, by = x + i * 46, y - (k + 1) * 24
            out.append(f'<rect x="{bx}" y="{by}" width="40" height="22" rx="3" fill="#f2c94c" stroke="#c9a23a" stroke-width="2"/>'
                       f'<line x1="{bx + 6}" y1="{by + 11}" x2="{bx + 34}" y2="{by + 11}" stroke="#c9a23a" stroke-width="2"/>')
    return ''.join(out)

def jump(x, y, no, w=84):
    out = [f'<rect x="{x}" y="{y - 46}" width="7" height="46" fill="#ffffff"/><rect x="{x + w}" y="{y - 46}" width="7" height="46" fill="#ffffff"/>']
    for yy in (y - 36, y - 20):
        for k in range(6):
            col = '#e5484d' if k % 2 == 0 else '#ffffff'
            out.append(f'<rect x="{x + 7 + k * (w - 7) / 6:.0f}" y="{yy}" width="{(w - 7) / 6 + 1:.0f}" height="7" fill="{col}"/>')
    out.append(f'<rect x="{x - 10}" y="{y - 70}" width="26" height="24" rx="3" fill="#ffffff" stroke="#1d2233" stroke-width="2"/>'
               f'<text x="{x + 3}" y="{y - 51}" text-anchor="middle" font-size="18" {FONT} fill="#1d2233">{no}</text>')
    return ''.join(out)

def measure_stick(x, y, height):
    """Messstock: Stange mit Strichen und Querarm auf Widerristhöhe."""
    out = [f'<rect x="{x}" y="{y - height - 18}" width="6" height="{height + 18}" fill="#e8e2d0"/>']
    for k in range(0, height + 1, 10):
        w = 10 if k % 50 == 0 else 6
        out.append(f'<line x1="{x + 6}" y1="{y - k}" x2="{x + 6 + w}" y2="{y - k}" stroke="#5b5650" stroke-width="2"/>')
    out.append(f'<rect x="{x - 46}" y="{y - height - 3}" width="52" height="5" fill="#e8e2d0"/>')
    return ''.join(out)

def arena(x0, x1, y):
    """Reitplatz (Sand) mit niedrigem weißem Zaun und Buchstaben."""
    out = [f'<path d="M{x0} {y} L{x0 + 30} {y - 34} L{x1 - 30} {y - 34} L{x1} {y} Z" fill="#ead3a0"/>',
           f'<path d="M{x0 + 30} {y - 34} L{x1 - 30} {y - 34}" stroke="#ffffff" stroke-width="4"/>',
           f'<path d="M{x0} {y} L{x1} {y}" stroke="#ffffff" stroke-width="5"/>']
    for k, letter in enumerate('KEH'):   # Buchstaben an der hinteren langen Seite
        lx = x0 + 60 + k * (x1 - x0 - 120) / 2
        out.append(f'<rect x="{lx - 13:.0f}" y="{y - 62}" width="26" height="26" rx="3" fill="#ffffff" stroke="#9aa3b5" stroke-width="2"/>'
                   f'<text x="{lx:.0f}" y="{y - 42}" text-anchor="middle" font-size="18" {FONT} fill="#4a2f14">{letter}</text>')
    return ''.join(out)

def number_fence(y, x0=40, step=120, n=10):
    """Zaun als Zahlenstrahl: Pfähle mit 0, 10, 20 …, kleine Striche dazwischen, Pfeil am Ende."""
    x_end = x0 + step * (n - 1) + 70
    out = [f'<rect x="0" y="{y - 14}" width="{W}" height="5" fill="#a0693a"/>',
           f'<line x1="{x0}" y1="{y - 2}" x2="{x_end}" y2="{y - 2}" stroke="#ffffff" stroke-width="3"/>',
           f'<polygon points="{x_end},{y - 9} {x_end + 14},{y - 2} {x_end},{y + 5}" fill="#ffffff"/>']
    for i in range(n):
        px = x0 + i * step
        for k in range(1, 5):   # kleine Striche (Schritt 2)
            tx = px + k * step / 5
            if tx < x_end - 4:
                out.append(f'<line x1="{tx:.0f}" y1="{y - 7}" x2="{tx:.0f}" y2="{y + 3}" stroke="#ffffff" stroke-width="2"/>')
        out.append(f'<rect x="{px - 4}" y="{y - 30}" width="8" height="40" fill="#8b5a2b"/>'
                   f'<rect x="{px - 17}" y="{y - 52}" width="34" height="22" rx="4" fill="#fff7e6" stroke="#5b3a1f" stroke-width="2"/>'
                   f'<text x="{px}" y="{y - 35}" text-anchor="middle" font-size="16" {FONT} fill="#4a2f14">{i * 10}</text>')
    return ''.join(out)

def build():
    g = [f'<rect width="{W}" height="{H}" fill="#bfe3ff"/>']
    for cx, cy, s in [(520, 34, 1.1), (900, 46, 0.9), (1120, 26, 1.0)]:
        g.append(f'<g fill="#ffffff" opacity="0.9"><ellipse cx="{cx}" cy="{cy}" rx="{f(38 * s)}" ry="{f(12 * s)}"/>'
                 f'<ellipse cx="{f(cx + 22 * s)}" cy="{f(cy - 8 * s)}" rx="{f(24 * s)}" ry="{f(12 * s)}"/></g>')
    g.append(f'<path d="M0 150 Q300 132 600 146 T1200 140 V240 H0 Z" fill="#9fd38a"/>')
    for x, y, s in [(330, 150, 0.9), (1150, 146, 1.0), (560, 148, 0.7)]:
        g.append(bush(x, y, s))
    g.append(f'<path d="M0 176 Q400 166 800 174 T1200 170 V240 H0 Z" fill="#7fc672"/>')
    g.append(stable(40, 200))
    g.append(arena(860, 1200, 196))
    g.append(jump(1062, 186, 2, w=56))
    g.append(hay_chart(340, 204, [1, 3, 2]))
    g.append(jump(500, 204, 1))
    g.append(measure_stick(778, 204, 96))
    g.append(pony(700, 206, 3.6, BAY))
    g.append(f'<rect x="0" y="208" width="{W}" height="32" fill="#73bd66"/>')
    g.append(number_fence(232))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{"".join(g)}</svg>\n'

if __name__ == '__main__':
    svg = build()
    (ROOT / 'img' / 'banner-mathe.svg').write_text(svg)
    print('img/banner-mathe.svg', len(svg), 'Bytes')
